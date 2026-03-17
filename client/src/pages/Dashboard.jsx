import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import DeviceHeroBanner from "../components/dashboard/DeviceHeroBanner";
import DeviceStatusPanel from "../components/dashboard/DeviceStatusPanel";
import MissionSyncPanel from "../components/dashboard/MissionSyncPanel";
import MissionMapPanel from "../components/dashboard/MissionMapPanel";

import { useDeviceConnection } from "../hooks/useDeviceConnection";
import { createStartPoint, fetchStartPoints } from "../services/startPointsApi";
import {
  startMission,
  stopMission,
  abortMission,
} from "../services/missionsApi";
import {
  getDeviceMissions,
  getDbMissions,
  importNewMissions,
} from "../services/deviceOpsApi";

function ipFromBaseUrl(baseUrl) {
  try {
    const u = new URL(baseUrl);
    return u.hostname;
  } catch {
    return "None";
  }
}

function buildDefaultMissionName(startPoint) {
  const now = new Date();

  const datePart = now.toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const timePart = now.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (startPoint?.name) {
    return `${startPoint.name} - ${datePart} ${timePart}`;
  }

  return `Mission ${datePart} ${timePart}`;
}

function normalizeMissionRows(deviceMissionIds, dbMissions, activeDevice) {
  const dbMap = new Map(
    (dbMissions || []).map((mission) => [mission.mission_id, mission])
  );

  return (deviceMissionIds || []).map((missionId) => {
    const dbMission = dbMap.get(missionId);

    return {
      mission_id: missionId,
      mission_name: dbMission?.mission_name || missionId,
      started_at_epoch:
        dbMission?.started_at_epoch ??
        dbMission?.created_at_epoch ??
        null,
      profile_type:
        dbMission?.profile_type || activeDevice?.active_profile_type || null,
      profile_label:
        dbMission?.profile_label || activeDevice?.active_profile_label || null,
      has_gps: Boolean(dbMission?.has_gps),
      has_images: Boolean(dbMission?.has_images),
      imported: Boolean(dbMission),
    };
  });
}

function filterMissionRows(rows, search) {
  const q = search.trim().toLowerCase();

  if (!q) return rows;

  return rows.filter((mission) => {
    const missionName = String(mission.mission_name || "").toLowerCase();
    const missionId = String(mission.mission_id || "").toLowerCase();

    return missionName.includes(q) || missionId.includes(q);
  });
}

export default function Dashboard() {
  const { selectedDeviceId, activeDevice } = useOutletContext();

  const {
    uiStatus: deviceStatus,
    deviceState,
    missionRunning,
  } = useDeviceConnection(selectedDeviceId);

  const [startPoints, setStartPoints] = useState([]);
  const [selectedStartPointId, setSelectedStartPointId] = useState(null);

  const [busy, setBusy] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [liveStreamEnabled, setLiveStreamEnabled] = useState(false);

  const [deviceMissionsData, setDeviceMissionsData] = useState({
    missions: [],
    incomplete_missions: [],
  });
  const [dbMissions, setDbMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsImporting, setMissionsImporting] = useState(false);
  const [missionSearch, setMissionSearch] = useState("");
  const [selectedMissionIds, setSelectedMissionIds] = useState([]);

  const metrics = {
    temperature: { value: 25.2, unit: "°C" },
    humidity: { value: 49.7, unit: "%" },
    pressure: { value: 979.6, unit: "hPa" },
    gas: { value: 24.3, unit: "kΩ" },
  };

  useEffect(() => {
    let cancelled = false;

    async function loadStartPoints() {
      if (!selectedDeviceId || selectedDeviceId === "none") {
        setStartPoints([]);
        setSelectedStartPointId(null);
        return;
      }

      const items = await fetchStartPoints(selectedDeviceId);
      if (cancelled) return;

      setStartPoints(items);

      if (items.length === 0) {
        setSelectedStartPointId(null);
        return;
      }

      setSelectedStartPointId((prev) => {
        const stillExists = items.some((item) => item.id === prev);
        return stillExists ? prev : items[0].id;
      });
    }

    loadStartPoints().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [selectedDeviceId]);

  async function refreshMissionSync() {
    if (!selectedDeviceId || selectedDeviceId === "none") {
      setDeviceMissionsData({ missions: [], incomplete_missions: [] });
      setDbMissions([]);
      setSelectedMissionIds([]);
      return;
    }

    setMissionsLoading(true);

    try {
      const [deviceRes, dbRes] = await Promise.all([
        getDeviceMissions(),
        getDbMissions(selectedDeviceId),
      ]);

      setDeviceMissionsData({
        missions: Array.isArray(deviceRes?.missions) ? deviceRes.missions : [],
        incomplete_missions: Array.isArray(deviceRes?.incomplete_missions)
          ? deviceRes.incomplete_missions
          : [],
      });

      setDbMissions(Array.isArray(dbRes) ? dbRes : []);
    } catch (error) {
      console.error("Failed to refresh mission sync panel:", error);
      setDeviceMissionsData({ missions: [], incomplete_missions: [] });
      setDbMissions([]);
    } finally {
      setMissionsLoading(false);
    }
  }

  useEffect(() => {
    refreshMissionSync().catch(console.error);
  }, [selectedDeviceId]);

  const missionRows = useMemo(() => {
    return normalizeMissionRows(
      deviceMissionsData.missions,
      dbMissions,
      activeDevice
    );
  }, [deviceMissionsData.missions, dbMissions, activeDevice]);

  const filteredMissionRows = useMemo(() => {
    return filterMissionRows(missionRows, missionSearch);
  }, [missionRows, missionSearch]);

  useEffect(() => {
    const validIds = new Set(missionRows.map((mission) => mission.mission_id));

    setSelectedMissionIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [missionRows]);

  async function handleAddStartPoint({ name, latlng }) {
    if (!selectedDeviceId || selectedDeviceId === "none") return null;

    const created = await createStartPoint({
      device_uuid: selectedDeviceId,
      name,
      latlng,
    });

    setStartPoints((prev) => [created, ...prev]);

    if (!selectedStartPointId && created?.id) {
      setSelectedStartPointId(created.id);
    }

    return created;
  }

  async function handleStartMission(profile) {
    if (deviceStatus !== "connected") return;

    const sp = startPoints.find((point) => point.id === selectedStartPointId) || null;

    const fixed_location = sp
      ? {
          lat: sp.latlng.lat,
          lon: sp.latlng.lng,
          alt_m: sp.alt_m ?? null,
        }
      : {
          lat: null,
          lon: null,
          alt_m: null,
        };

    const mission_name =
      (profile.mission_name || "").trim() || buildDefaultMissionName(sp);

    setBusy(true);

    try {
      await startMission({
        mission_name,
        duration: profile.duration,
        sample_hz: profile.sample_hz,
        photo_every: profile.photo_every,
        gps_mode: profile.gps_mode,
        camera_mode: "on",
        location_mode: sp ? "fixed" : "gps",
        fixed_location,
      });

      await refreshMissionSync();
    } finally {
      setBusy(false);
    }
  }

  async function handleStopMission() {
    setBusy(true);

    try {
      await stopMission();
      await refreshMissionSync();
    } finally {
      setBusy(false);
    }
  }

  async function handleAbortMission() {
    setBusy(true);

    try {
      await abortMission();
      await refreshMissionSync();
    } finally {
      setBusy(false);
    }
  }

  async function handleRefreshStatus() {
    setBusyStatus(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
    } finally {
      setBusyStatus(false);
    }
  }

  function handleToggleLiveStream() {
    setLiveStreamEnabled((prev) => !prev);
  }

  function handleToggleMission(missionId) {
    setSelectedMissionIds((prev) =>
      prev.includes(missionId)
        ? prev.filter((id) => id !== missionId)
        : [...prev, missionId]
    );
  }

  function handleToggleSelectAllVisible() {
    const visibleSelectableIds = filteredMissionRows
      .filter((mission) => !mission.imported)
      .map((mission) => mission.mission_id);

    const allVisibleSelected =
      visibleSelectableIds.length > 0 &&
      visibleSelectableIds.every((id) => selectedMissionIds.includes(id));

    setSelectedMissionIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleSelectableIds.includes(id));
      }

      return [...new Set([...prev, ...visibleSelectableIds])];
    });
  }

  async function handleImportSelected() {
    if (selectedMissionIds.length === 0) return;

    setMissionsImporting(true);

    try {
      await importNewMissions();
      await refreshMissionSync();
      setSelectedMissionIds([]);
    } catch (error) {
      console.error("Failed to import selected missions:", error);
    } finally {
      setMissionsImporting(false);
    }
  }

  async function handleImportNew() {
    setMissionsImporting(true);

    try {
      await importNewMissions();
      await refreshMissionSync();
      setSelectedMissionIds([]);
    } catch (error) {
      console.error("Failed to import new missions:", error);
    } finally {
      setMissionsImporting(false);
    }
  }

  const heroDevice = useMemo(() => {
    const baseUrl = activeDevice?.base_url || "";

    return {
      nickname:
        activeDevice?.nickname ||
        (selectedDeviceId === "none" ? "None" : "No device selected"),
      hostname:
        activeDevice?.hostname || activeDevice?.info?.hostname || "None",
      uuid:
        activeDevice?.device_uuid ||
        (selectedDeviceId === "none" ? "None" : selectedDeviceId),
      ip: ipFromBaseUrl(baseUrl),
      lastSeenText: activeDevice?.last_seen_epoch ? "Recent" : "None",
    };
  }, [activeDevice, selectedDeviceId]);

  return (
    <div className="flex flex-col gap-4">
      <DeviceHeroBanner status={deviceStatus} device={heroDevice} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
        <div className="xl:col-span-5">
          <DeviceStatusPanel
            activeDevice={activeDevice}
            deviceStatus={deviceStatus}
            deviceState={deviceState}
            liveMetrics={metrics}
            liveStreamEnabled={liveStreamEnabled}
            onToggleLiveStream={handleToggleLiveStream}
            onCheckStatus={handleRefreshStatus}
            checking={busyStatus}
            defaultExpanded={false}
          />
        </div>

        <div className="xl:col-span-7">
          <MissionSyncPanel
            missions={missionRows}
            selectedMissionIds={selectedMissionIds}
            search={missionSearch}
            onSearchChange={setMissionSearch}
            onToggleMission={handleToggleMission}
            onToggleSelectAllVisible={handleToggleSelectAllVisible}
            onRefresh={refreshMissionSync}
            onImportSelected={handleImportSelected}
            onImportNew={handleImportNew}
            loading={missionsLoading}
            importing={missionsImporting}
            canImport={deviceStatus === "connected"}
          />
        </div>
      </div>

      <MissionMapPanel
        deviceStatus={deviceStatus}
        startPoints={startPoints}
        selectedStartPointId={selectedStartPointId}
        onAddStartPoint={handleAddStartPoint}
        onSelectStartPoint={setSelectedStartPointId}
        metrics={metrics}
        missionRunning={Boolean(deviceState?.running) || missionRunning}
        onStartMission={handleStartMission}
        onStopMission={handleStopMission}
        onAbortMission={handleAbortMission}
        busy={busy}
      />
    </div>
  );
}
