import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

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
import {
  getDeviceMissions,
  getDbMissions,
} from "../services/deviceOpsApi";

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
  const [missionsImporting, setMissionsImporting] = useState(false);
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

        setStartPoints(items);
        setSelectedStartPointId((prev) => {
          if (prev && items.some((item) => item.id === prev)) return prev;
          return items.length > 0 ? items[0].id : null;
        });
      } catch (err) {
        console.error("Failed to load start points", err);
      }
    };

    loadStartPoints();

    return () => {
      cancelled = true;
    };
  }, [selectedDeviceId]);

  const refreshMissionSync = async () => {
    if (!selectedDeviceId || selectedDeviceId === "none") return;

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
      console.error("Failed to refresh missions", error);
    } finally {
      setMissionsLoading(false);
    }
  };

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
    setMissionsImporting(true);
    try {
      await importNewMissions();
      await refreshMissionSync();
      setSelectedMissionIds([]);
    } catch (error) {
      console.error("Failed to import missions", error);
    } finally {
      setMissionsImporting(false);
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

    setBusy(true);
    try {
      await importSelectedMissions(selectedIds);
      await refreshMissionSync();
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmReimport() {
    const ids = reimportCandidates.map((mission) => mission.mission_id);
    if (!ids.length) return;

    setBusy(true);
    try {
      await importSelectedMissions(ids, { overwrite: true });
      setReimportModalOpen(false);
      setReimportCandidates([]);
      await refreshMissionSync();
    } finally {
      setBusy(false);
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

        await refreshMissionSync();
        await refreshStatus();
        return { ok: true };
      }

      const status = await refreshStatus();
      const fix = status?.gps?.last_good_fix || null;
      const hasFix =
        Boolean(status?.gps?.has_fix) && fix?.lat != null && fix?.lon != null;

      if (!hasFix) {
        return {
          ok: false,
          error:
            "GPS fix is not available yet. Check status, wait for a valid fix, then try again.",
        };
      }

      const match = await matchStartPointByCoords({
        device_uuid: selectedDeviceId,
        lat: fix.lat,
        lon: fix.lon,
        radius_m: 20,
      });

      let resolvedLocation = match?.item || null;

      if (!resolvedLocation) {
        const gpsLocationName = String(
          formPayload?.gps_location_name || "",
        ).trim();

        if (!gpsLocationName) {
          return {
            ok: false,
            needsGpsLocationName: true,
            coords: {
              lat: fix.lat,
              lng: fix.lon,
              alt_m: fix.alt_m ?? null,
            },
          };
        }

        resolvedLocation = await handleAddStartPoint({
          name: gpsLocationName,
          latlng: { lat: fix.lat, lng: fix.lon },
          alt_m: fix.alt_m ?? null,
          source: "gps",
          tags: ["gps"],
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
    } catch (error) {
      return {
        ok: false,
        error:
          error?.response?.data?.error ||
          error?.message ||
          "Mission could not be started.",
      };
    } finally {
      setBusy(false);
    }
  };

  const heroDevice = useMemo(
    () => ({
      nickname:
        activeDevice?.nickname ||
        (selectedDeviceId === "none" ? "None" : "No device selected"),
      hostname:
        activeDevice?.hostname || activeDevice?.info?.hostname || "None",
      uuid: activeDevice?.device_uuid || selectedDeviceId,
      ip: ipFromBaseUrl(activeDevice?.base_url),
      lastSeenText: activeDevice?.last_seen_epoch ? "Recent" : "None",
    }),
    [activeDevice, selectedDeviceId],
  );

  return (
    <div className="flex flex-col gap-6">
      <DeviceHeroBanner status={deviceStatus} device={heroDevice} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
        <div className="xl:col-span-6">
          <DeviceStatusPanel
            activeDevice={activeDevice}
            deviceStatus={deviceStatus}
            deviceState={deviceState}
            onCheckStatus={async () => {
              setBusyStatus(true);
              try {
                const data = await refreshStatus();
                if (data) setStatusExpandSignal((prev) => prev + 1);
              } finally {
                setBusyStatus(false);
              }
            }}
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
            onToggleMission={(id) =>
              setSelectedMissionIds((prev) =>
                prev.includes(id)
                  ? prev.filter((item) => item !== id)
                  : [...prev, id],
              )
            }
            onRefresh={refreshMissionSync}
            onImportSelected={handleImportSelected}
            onImportNew={handleImportNew}
            loading={busy}
            importing={busy}
            canImport={
              selectedDeviceId !== "none" && deviceStatus === "connected"
            }
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
        onStartMission={handleStartMission}
        onStopMission={() => handleAction(stopMission)}
        onAbortMission={() => handleAction(abortMission)}
        busy={busy}
      />

      <ReimportMissionsModal
        open={reimportModalOpen}
        missions={reimportCandidates}
        busy={busy}
        onClose={() => {
          if (busy) return;
          setReimportModalOpen(false);
          setReimportCandidates([]);
        }}
        onConfirm={handleConfirmReimport}
      />
    </div>
  );
}
