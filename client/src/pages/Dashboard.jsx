import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import DeviceHeroBanner from "../components/dashboard/DeviceHeroBanner";
import DeviceStatusPanel from "../components/dashboard/DeviceStatusPanel";
import MissionSyncPanel from "../components/dashboard/MissionSyncPanel";
import MissionMapPanel from "../components/dashboard/MissionMapPanel";
import ReimportMissionsModal from "../components/dashboard/ReimportMissionsModal";

import { useDeviceConnection } from "../hooks/useDeviceConnection";
import {
  createStartPoint,
  fetchStartPoints,
  matchStartPointByCoords,
} from "../services/startPointsApi";
import {
  startMission,
  stopMission,
  abortMission,
  importNewMissions,
  importSelectedMissions,
} from "../services/missionsApi";
import { getDeviceMissions, getDbMissions } from "../services/deviceOpsApi";

function ipFromBaseUrl(baseUrl) {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "None";
  }
}

function buildDefaultMissionName(startPoint) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = now.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return startPoint?.name
    ? `${startPoint.name} - ${dateStr} ${timeStr}`
    : `Mission ${dateStr} ${timeStr}`;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { selectedDeviceId, activeDevice } = useOutletContext();
  const {
    uiStatus: deviceStatus,
    deviceState,
    missionRunning,
    refreshStatus,
  } = useDeviceConnection(selectedDeviceId);

  const [startPoints, setStartPoints] = useState([]);
  const [selectedStartPointId, setSelectedStartPointId] = useState(null);

  const [busy, setBusy] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [statusExpandSignal, setStatusExpandSignal] = useState(0);

  const [reimportModalOpen, setReimportModalOpen] = useState(false);
  const [reimportCandidates, setReimportCandidates] = useState([]);

  const [deviceMissionsData, setDeviceMissionsData] = useState({
    missions: [],
    incomplete_missions: [],
    missions_meta: {},
  });
  const [dbMissions, setDbMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(false);

  // null | "new" | "selected" | "reimport"
  const [missionsImporting, setMissionsImporting] = useState(null);

  const [missionSearch, setMissionSearch] = useState("");
  const [selectedMissionIds, setSelectedMissionIds] = useState([]);

  const selectedStartPoint = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId],
  );

  useEffect(() => {
    let cancelled = false;

    const loadStartPoints = async () => {
      if (!selectedDeviceId || selectedDeviceId === "none") {
        setStartPoints([]);
        setSelectedStartPointId(null);
        return;
      }

      try {
        const items = await fetchStartPoints(selectedDeviceId);
        if (cancelled) return;

        setStartPoints(items || []);
        setSelectedStartPointId((prev) => {
          if (prev && (items || []).some((p) => p.id === prev)) return prev;
          return items?.[0]?.id || null;
        });
      } catch (error) {
        console.error("Failed to load start points", error);
        if (!cancelled) {
          setStartPoints([]);
          setSelectedStartPointId(null);
        }
      }
    };

    loadStartPoints();
    return () => {
      cancelled = true;
    };
  }, [selectedDeviceId]);

  const refreshMissionSync = async () => {
    if (!selectedDeviceId || selectedDeviceId === "none") {
      setDeviceMissionsData({
        missions: [],
        incomplete_missions: [],
        missions_meta: {},
      });
      setDbMissions([]);
      return;
    }

    setMissionsLoading(true);
    try {
      const [deviceData, dbData] = await Promise.all([
        getDeviceMissions(),
        getDbMissions(selectedDeviceId),
      ]);

      setDeviceMissionsData(
        deviceData || {
          missions: [],
          incomplete_missions: [],
          missions_meta: {},
        },
      );
      setDbMissions(Array.isArray(dbData) ? dbData : []);
    } catch (error) {
      console.error("Failed to refresh mission sync", error);
      setDeviceMissionsData({
        missions: [],
        incomplete_missions: [],
        missions_meta: {},
      });
      setDbMissions([]);
    } finally {
      setMissionsLoading(false);
    }
  };

  useEffect(() => {
    refreshMissionSync();
  }, [selectedDeviceId]);

  const missionRows = useMemo(() => {
    const deviceMissionIds = Array.isArray(deviceMissionsData?.missions)
      ? deviceMissionsData.missions
      : [];

    const missionsMeta = deviceMissionsData?.missions_meta || {};

    const dbMap = new Map(
      (dbMissions || []).map((mission) => [mission.mission_id, mission]),
    );

    return deviceMissionIds.map((missionId) => {
      const dbMission = dbMap.get(missionId);
      const deviceMeta = missionsMeta?.[missionId] || {};

      return {
        mission_id: missionId,
        mission_name:
          dbMission?.mission_name || deviceMeta?.mission_name || missionId,
        started_at_epoch:
          dbMission?.started_at_epoch ?? deviceMeta?.started_at_epoch ?? null,
        profile_type:
          dbMission?.profile_type ||
          deviceMeta?.profile_type ||
          activeDevice?.active_profile_type,
        profile_label:
          dbMission?.profile_label ||
          deviceMeta?.profile_label ||
          activeDevice?.active_profile_label,
        has_gps: Boolean(dbMission?.has_gps),
        has_images: Boolean(dbMission?.has_images),
        imported: Boolean(dbMission),
      };
    });
  }, [deviceMissionsData, dbMissions, activeDevice]);

  const filteredMissionRows = useMemo(() => {
    const q = missionSearch.trim().toLowerCase();
    if (!q) return missionRows;

    return missionRows.filter(
      (m) =>
        String(m.mission_name).toLowerCase().includes(q) ||
        String(m.mission_id).toLowerCase().includes(q),
    );
  }, [missionRows, missionSearch]);

  const handleAction = async (actionFn, ...args) => {
    setBusy(true);
    try {
      await actionFn(...args);
      await refreshMissionSync();
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const handleAddStartPoint = async ({
    name,
    latlng,
    alt_m = null,
    source = "manual",
    tags = [],
  }) => {
    if (!selectedDeviceId || selectedDeviceId === "none") {
      console.error("Cannot create start point without an active device.");
      return null;
    }

    try {
      const created = await createStartPoint({
        device_uuid: selectedDeviceId,
        name,
        latlng,
        alt_m,
        source,
        tags,
      });

      setStartPoints((prev) => [created, ...prev]);
      setSelectedStartPointId(created.id);

      return created;
    } catch (error) {
      console.error("Failed to create start point", error);
      return null;
    }
  };

  const handleImportNew = async () => {
    setMissionsImporting("new");
    try {
      await importNewMissions();
      await refreshMissionSync();
      setSelectedMissionIds([]);
    } catch (error) {
      console.error("Failed to import missions", error);
    } finally {
      setMissionsImporting(null);
    }
  };

  async function handleImportSelected() {
    const selectedRows = filteredMissionRows.filter((mission) =>
      selectedMissionIds.includes(mission.mission_id),
    );

    if (!selectedRows.length) return;

    const alreadyImported = selectedRows.filter((mission) => mission.imported);
    const selectedIds = selectedRows.map((mission) => mission.mission_id);

    if (alreadyImported.length > 0) {
      setReimportCandidates(selectedRows);
      setReimportModalOpen(true);
      return;
    }

    setMissionsImporting("selected");
    try {
      await importSelectedMissions(selectedIds);
      await refreshMissionSync();
      setSelectedMissionIds([]);
    } catch (error) {
      console.error("Failed to import selected missions", error);
    } finally {
      setMissionsImporting(null);
    }
  }

  async function handleConfirmReimport() {
    const ids = reimportCandidates.map((mission) => mission.mission_id);
    if (!ids.length) return;

    setMissionsImporting("reimport");
    try {
      await importSelectedMissions(ids, { overwrite: true });
      setReimportModalOpen(false);
      setReimportCandidates([]);
      setSelectedMissionIds([]);
      await refreshMissionSync();
    } catch (error) {
      console.error("Failed to reimport missions", error);
    } finally {
      setMissionsImporting(null);
    }
  }

  const handleStartMission = async (formPayload) => {
    if (!selectedDeviceId || selectedDeviceId === "none") {
      return { ok: false, error: "Select a device first." };
    }

    setBusy(true);

    try {
      const basePayload = {
        mission_name:
          String(formPayload?.mission_name || "").trim() ||
          buildDefaultMissionName(selectedStartPoint),
        duration: Number(formPayload?.duration ?? 60),
        sample_hz: Number(formPayload?.sample_hz ?? 2),
        photo_every: Number(formPayload?.photo_every ?? 5),
        gps_mode: String(formPayload?.gps_mode || "best_effort"),
        camera_mode: String(formPayload?.camera_mode || "on"),
        location_mode: String(formPayload?.location_mode || "fixed"),
      };

      if (basePayload.location_mode === "fixed") {
        if (!selectedStartPoint) {
          return { ok: false, error: "Choose a fixed location first." };
        }

        await startMission({
          ...basePayload,
          location_mode: "fixed",
          fixed_location: {
            lat: selectedStartPoint.latlng.lat,
            lon: selectedStartPoint.latlng.lng,
            alt_m: selectedStartPoint.alt_m ?? null,
          },
        });

        await refreshStatus();
        return { ok: true };
      }

      if (basePayload.location_mode === "gps") {
        const gpsFix = deviceState?.gps?.last_good_fix;
        const hasFix =
          deviceState?.gps?.has_fix &&
          gpsFix?.lat != null &&
          gpsFix?.lon != null;

        if (!hasFix) {
          return {
            ok: false,
            error: "No valid GPS fix available yet.",
          };
        }

        try {
          const matched = await matchStartPointByCoords({
            device_uuid: selectedDeviceId,
            lat: gpsFix.lat,
            lon: gpsFix.lon,
          });

          if (!matched) {
            return {
              ok: false,
              needsGpsLocationName: true,
              coords: {
                lat: gpsFix.lat,
                lng: gpsFix.lon,
                alt_m: gpsFix.alt_m ?? null,
              },
              payload: basePayload,
            };
          }
        } catch (error) {
          console.error("Failed to match start point by coords", error);
        }

        await startMission({
          ...basePayload,
          location_mode: "gps",
        });

        await refreshStatus();
        return { ok: true };
      }

      return { ok: false, error: "Unsupported location mode." };
    } catch (error) {
      console.error("Failed to start mission", error);
      return { ok: false, error: "Mission could not be started." };
    } finally {
      setBusy(false);
    }
  };

  const handleCheckStatus = async () => {
    setBusyStatus(true);
    try {
      await refreshStatus();
      setStatusExpandSignal((prev) => prev + 1);
    } finally {
      setBusyStatus(false);
    }
  };

  const handleStopMission = () => handleAction(stopMission);
  const handleAbortMission = () => handleAction(abortMission);

  const activeDeviceCard = useMemo(() => {
    if (!activeDevice || selectedDeviceId === "none") {
      return {
        nickname: null,
        hostname: null,
        uuid: null,
        ip: null,
        lastSeenText: null,
      };
    }

    return {
      nickname: activeDevice.nickname || activeDevice.hostname || "Device",
      hostname: activeDevice.hostname || activeDevice.info?.hostname || "None",
      uuid: activeDevice.device_uuid || null,
      ip: ipFromBaseUrl(activeDevice.base_url),
      lastSeenText: activeDevice.last_seen_epoch
        ? new Date(activeDevice.last_seen_epoch * 1000).toLocaleString("ro-RO")
        : "None",
    };
  }, [activeDevice, selectedDeviceId]);

  return (
    <div className="flex flex-col gap-6">
      <DeviceHeroBanner status={deviceStatus} device={activeDeviceCard} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
        <div className="xl:col-span-6">
          <DeviceStatusPanel
            activeDevice={activeDevice}
            deviceStatus={deviceStatus}
            deviceState={deviceState}
            onCheckStatus={handleCheckStatus}
            checking={busyStatus}
            expandSignal={statusExpandSignal}
          />
        </div>

        <div className="xl:col-span-6">
          <MissionSyncPanel
            missions={filteredMissionRows}
            selectedMissionIds={selectedMissionIds}
            search={missionSearch}
            onSearchChange={setMissionSearch}
            onToggleMission={(missionId) =>
              setSelectedMissionIds((prev) =>
                prev.includes(missionId)
                  ? prev.filter((id) => id !== missionId)
                  : [...prev, missionId],
              )
            }
            onRefresh={refreshMissionSync}
            onImportSelected={handleImportSelected}
            onImportNew={handleImportNew}
            loading={missionsLoading}
            importing={missionsImporting}
            canImport={deviceStatus === "connected"}
            defaultExpanded={false}
          />
        </div>
      </div>

      <MissionMapPanel
        deviceStatus={deviceStatus}
        deviceState={deviceState}
        startPoints={startPoints}
        selectedStartPointId={selectedStartPointId}
        onAddStartPoint={handleAddStartPoint}
        onSelectStartPoint={setSelectedStartPointId}
        missionRunning={missionRunning}
        busy={busy}
        onStartMission={handleStartMission}
        onStopMission={handleStopMission}
        onAbortMission={handleAbortMission}
        onOpenMissionControl={() => navigate("/mission-control")}
      />

      <ReimportMissionsModal
        open={reimportModalOpen}
        missions={reimportCandidates}
        busy={missionsImporting === "reimport"}
        onClose={() => {
          if (missionsImporting) return;
          setReimportModalOpen(false);
          setReimportCandidates([]);
        }}
        onConfirm={handleConfirmReimport}
      />
    </div>
  );
}
