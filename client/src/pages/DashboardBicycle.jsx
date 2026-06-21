import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import BicycleHeroBanner from "../components/dashboard/BicycleHeroBanner";
import DeviceStatusPanel from "../components/dashboard/DeviceStatusPanel";
import MissionSyncPanel from "../components/dashboard/MissionSyncPanel";
import MissionBicyclePanel from "../components/dashboard/MissionBicyclePanel";
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

function formatLastSeen(epoch) {
  if (!epoch) return "None";

  try {
    return new Date(epoch * 1000).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "None";
  }
}

function buildDefaultBicycleMissionName(startPoint) {
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
    ? `${startPoint.name} - Bicycle Route ${dateStr} ${timeStr}`
    : `Bicycle Route ${dateStr} ${timeStr}`;
}

export default function DashboardBicycle() {
  const { selectedDeviceId, activeDevice, onDeviceConnected } =
    useOutletContext();

  const {
    uiStatus: deviceStatus,
    deviceState,
    missionRunning,
    refreshStatus,
  } = useDeviceConnection(selectedDeviceId, {
    onConnected: onDeviceConnected,
  });

  const [startPoints, setStartPoints] = useState([]);
  const [selectedStartPointId, setSelectedStartPointId] = useState(null);

  const [busy, setBusy] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [statusExpandSignal, setStatusExpandSignal] = useState(0);

  const [deviceMissionsData, setDeviceMissionsData] = useState({
    missions: [],
    incomplete_missions: [],
    missions_meta: {},
  });

  const [dbMissions, setDbMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsImporting, setMissionsImporting] = useState(null);

  const [missionSearch, setMissionSearch] = useState("");
  const [selectedMissionIds, setSelectedMissionIds] = useState([]);

  const [reimportModalOpen, setReimportModalOpen] = useState(false);
  const [reimportCandidates, setReimportCandidates] = useState([]);

  const selectedStartPoint = useMemo(
    () => startPoints.find((item) => item.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStartPoints() {
      if (!selectedDeviceId || selectedDeviceId === "none") {
        setStartPoints([]);
        setSelectedStartPointId(null);
        return;
      }

      try {
        const items = await fetchStartPoints(selectedDeviceId);

        if (cancelled) return;

        setStartPoints(items);

        setSelectedStartPointId((prev) => {
          if (prev && items.some((item) => item.id === prev)) {
            return prev;
          }

          return items.length > 0 ? items[0].id : null;
        });
      } catch (error) {
        console.error("Failed to load bicycle start points", error);
        setStartPoints([]);
        setSelectedStartPointId(null);
      }
    }

    loadStartPoints();

    return () => {
      cancelled = true;
    };
  }, [selectedDeviceId]);

  async function refreshMissionSync() {
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
      const [deviceRes, dbRes] = await Promise.all([
        getDeviceMissions(),
        getDbMissions(selectedDeviceId),
      ]);

      setDeviceMissionsData({
        missions: deviceRes?.missions || [],
        incomplete_missions: deviceRes?.incomplete_missions || [],
        missions_meta: deviceRes?.missions_meta || {},
      });

      setDbMissions(Array.isArray(dbRes) ? dbRes : []);
    } catch (error) {
      console.error("Failed to refresh bicycle missions", error);
    } finally {
      setMissionsLoading(false);
    }
  }

  useEffect(() => {
    refreshMissionSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  const missionRows = useMemo(() => {
    const dbMap = new Map((dbMissions || []).map((m) => [m.mission_id, m]));
    const metaMap = deviceMissionsData.missions_meta || {};

    return (deviceMissionsData.missions || []).map((missionId) => {
      const dbMission = dbMap.get(missionId);
      const deviceMeta = metaMap[missionId] || {};

      return {
        mission_id: missionId,
        mission_name:
          dbMission?.mission_name || deviceMeta?.mission_name || missionId,
        started_at_epoch:
          dbMission?.started_at_epoch ?? deviceMeta?.started_at_epoch ?? null,
        profile_type:
          dbMission?.profile_type ||
          deviceMeta?.profile_type ||
          activeDevice?.active_profile_type ||
          "bicycle",
        profile_label:
          dbMission?.profile_label ||
          deviceMeta?.profile_label ||
          activeDevice?.active_profile_label ||
          "Bicycle",
        has_gps: Boolean(dbMission?.has_gps || deviceMeta?.has_gps),
        has_images: Boolean(dbMission?.has_images || deviceMeta?.has_images),
        imported: Boolean(dbMission),
      };
    });
  }, [deviceMissionsData, dbMissions, activeDevice]);

  const filteredMissionRows = useMemo(() => {
    const q = missionSearch.trim().toLowerCase();

    if (!q) return missionRows;

    return missionRows.filter(
      (mission) =>
        String(mission.mission_name || "")
          .toLowerCase()
          .includes(q) ||
        String(mission.mission_id || "")
          .toLowerCase()
          .includes(q),
    );
  }, [missionRows, missionSearch]);

  const heroDevice = useMemo(
    () => ({
      nickname:
        activeDevice?.nickname ||
        activeDevice?.active_profile_label ||
        (selectedDeviceId === "none" ? "No device selected" : "Bicycle Device"),
      hostname:
        activeDevice?.hostname || activeDevice?.info?.hostname || "None",
      uuid:
        activeDevice?.device_uuid ||
        (selectedDeviceId && selectedDeviceId !== "none"
          ? selectedDeviceId
          : "None"),
      ip: ipFromBaseUrl(activeDevice?.base_url),
      lastSeenText: formatLastSeen(activeDevice?.last_seen_epoch),
    }),
    [activeDevice, selectedDeviceId],
  );

  async function handleAction(actionFn, ...args) {
    setBusy(true);

    try {
      await actionFn(...args);
      await refreshMissionSync();
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddStartPoint({
    name,
    latlng,
    alt_m = null,
    source = "manual",
    tags = [],
  }) {
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
        tags: Array.from(new Set([...tags, "bicycle"])),
      });

      setStartPoints((prev) => [created, ...prev]);
      setSelectedStartPointId(created.id);

      return created;
    } catch (error) {
      console.error("Failed to create bicycle start point", error);
      return null;
    }
  }

  async function handleImportNew() {
    setMissionsImporting("new");

    try {
      await importNewMissions();
      await refreshMissionSync();
      setSelectedMissionIds([]);
    } catch (error) {
      console.error("Failed to import new bicycle missions", error);
    } finally {
      setMissionsImporting(null);
    }
  }

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
      console.error("Failed to import selected bicycle missions", error);
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
      await refreshMissionSync();

      setSelectedMissionIds([]);
      setReimportCandidates([]);
      setReimportModalOpen(false);
    } catch (error) {
      console.error("Failed to reimport bicycle missions", error);
    } finally {
      setMissionsImporting(null);
    }
  }

  async function handleStartMission(formPayload) {
    if (!selectedDeviceId || selectedDeviceId === "none") {
      return {
        ok: false,
        error: "Select a device first.",
      };
    }

    setBusy(true);

    try {
      const basePayload = {
        mission_name:
          String(formPayload?.mission_name || "").trim() ||
          buildDefaultBicycleMissionName(selectedStartPoint),
        duration: Number(formPayload?.duration ?? 600),
        sample_hz: Number(formPayload?.sample_hz ?? 1),
        photo_every: Number(formPayload?.photo_every ?? 0),
        gps_mode: String(formPayload?.gps_mode || "best_effort"),
        camera_mode: String(formPayload?.camera_mode || "off"),
        location_mode: String(formPayload?.location_mode || "gps"),
      };

      if (basePayload.location_mode === "fixed") {
        if (!selectedStartPoint) {
          return {
            ok: false,
            error: "Choose a fixed location first.",
          };
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

        await refreshMissionSync();
        await refreshStatus();

        return {
          ok: true,
        };
      }

      if (basePayload.location_mode === "gps") {
        const status = await refreshStatus();
        const gpsFix = status?.gps?.last_good_fix || null;

        const hasFix =
          Boolean(status?.gps?.has_fix) &&
          gpsFix?.lat != null &&
          gpsFix?.lon != null;

        if (!hasFix) {
          return {
            ok: false,
            error:
              "GPS fix is not available yet. Check status, wait for a valid fix, then try again.",
          };
        }

        const match = await matchStartPointByCoords({
          device_uuid: selectedDeviceId,
          lat: gpsFix.lat,
          lon: gpsFix.lon,
          radius_m: 25,
        });

        let resolvedLocation = match?.matched ? match.item : null;

        if (!resolvedLocation) {
          const gpsLocationName = String(
            formPayload?.gps_location_name || "",
          ).trim();

          if (!gpsLocationName) {
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

          resolvedLocation = await handleAddStartPoint({
            name: gpsLocationName,
            latlng: {
              lat: gpsFix.lat,
              lng: gpsFix.lon,
            },
            alt_m: gpsFix.alt_m ?? null,
            source: "gps",
            tags: ["gps", "bicycle"],
          });
        } else {
          setSelectedStartPointId(resolvedLocation.id);
        }

        await startMission({
          ...basePayload,
          location_mode: "gps",
        });

        await refreshMissionSync();
        await refreshStatus();

        return {
          ok: true,
          matchedLocation: resolvedLocation,
        };
      }

      return {
        ok: false,
        error: "Unsupported location mode.",
      };
    } catch (error) {
      console.error("Failed to start bicycle mission", error);

      return {
        ok: false,
        error:
          error?.response?.data?.error ||
          error?.message ||
          "Bicycle mission could not be started.",
      };
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckStatus() {
    setBusyStatus(true);

    try {
      const data = await refreshStatus();

      if (data) {
        setStatusExpandSignal((prev) => prev + 1);
      }
    } finally {
      setBusyStatus(false);
    }
  }

  function handleToggleMission(missionId) {
    setSelectedMissionIds((prev) =>
      prev.includes(missionId)
        ? prev.filter((id) => id !== missionId)
        : [...prev, missionId],
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BicycleHeroBanner status={deviceStatus} device={heroDevice} />

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
            onToggleMission={handleToggleMission}
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

      <MissionBicyclePanel
        deviceStatus={deviceStatus}
        deviceState={deviceState}
        startPoints={startPoints}
        selectedStartPointId={selectedStartPointId}
        onAddStartPoint={handleAddStartPoint}
        onSelectStartPoint={setSelectedStartPointId}
        missionRunning={missionRunning}
        busy={busy}
        onStartMission={handleStartMission}
        onStopMission={() => handleAction(stopMission)}
        onAbortMission={() => handleAction(abortMission)}
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
