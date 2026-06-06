import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import DeviceStaticHeroBanner from "../components/dashboard/DeviceStaticHeroBanner";
import DeviceStatusPanel from "../components/dashboard/DeviceStatusPanel";
import MissionSyncPanel from "../components/dashboard/MissionSyncPanel";
import ReimportMissionsModal from "../components/dashboard/ReimportMissionsModal";
import StaticLiveStats from "../components/dashboard/StaticLiveStats";
import MissionStaticPanel from "../components/dashboard/MissionStaticPanel";

import { useDeviceConnection } from "../hooks/useDeviceConnection";
import {
  startMission,
  stopMission,
  abortMission,
  importNewMissions,
  importSelectedMissions,
} from "../services/missionsApi";
import { getDeviceMissions, getDbMissions } from "../services/deviceOpsApi";
import api from "../services/api";

function ipFromBaseUrl(baseUrl) {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "None";
  }
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildDeviceStreamUrl() {
  const baseUrl =
    typeof api?.defaults?.baseURL === "string" && api.defaults.baseURL.trim()
      ? api.defaults.baseURL.replace(/\/$/, "")
      : `${window.location.origin}/api`;

  return `${baseUrl}/device/stream`;
}

function getGpsFixFromDeviceState(deviceState) {
  const gps = deviceState?.gps || null;

  if (gps?.last_good_fix?.lat != null && gps?.last_good_fix?.lon != null) {
    return {
      lat: gps.last_good_fix.lat,
      lon: gps.last_good_fix.lon,
      alt_m: gps.last_good_fix.alt_m ?? null,
      fix_quality: gps.last_good_fix.fix_quality ?? gps.fix_quality ?? 0,
      satellites: gps.last_good_fix.satellites ?? gps.satellites ?? 0,
      hdop: gps.last_good_fix.hdop ?? gps.hdop ?? null,
    };
  }

  if (gps?.lat != null && gps?.lon != null) {
    return {
      lat: gps.lat,
      lon: gps.lon,
      alt_m: gps.alt_m ?? null,
      fix_quality: gps.fix_quality ?? 0,
      satellites: gps.satellites ?? 0,
      hdop: gps.hdop ?? null,
    };
  }

  return null;
}

function getStationLocation(selectedStaticLocation, liveTelemetry, deviceState) {
  if (
    selectedStaticLocation?.lat !== null &&
    selectedStaticLocation?.lat !== undefined &&
    selectedStaticLocation?.lon !== null &&
    selectedStaticLocation?.lon !== undefined
  ) {
    return {
      lat: Number(selectedStaticLocation.lat),
      lon: Number(selectedStaticLocation.lon),
      alt_m: toNumberOrNull(selectedStaticLocation.alt_m),
    };
  }

  const gpsFix = getGpsFixFromDeviceState(deviceState);

  const lat = liveTelemetry?.lat ?? gpsFix?.lat ?? null;
  const lon = liveTelemetry?.lon ?? gpsFix?.lon ?? null;
  const alt_m = liveTelemetry?.alt_m ?? gpsFix?.alt_m ?? null;

  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return null;
  }

  return {
    lat: Number(lat),
    lon: Number(lon),
    alt_m: toNumberOrNull(alt_m),
  };
}

function getLatestTelemetry(liveTelemetry, deviceState, stationLocation) {
  if (liveTelemetry) return liveTelemetry;

  return {
    ts_epoch: deviceState?.since_epoch ?? null,
    lat: stationLocation?.lat ?? null,
    lon: stationLocation?.lon ?? null,
    alt_m: stationLocation?.alt_m ?? null,
    fix_quality: deviceState?.gps?.fix_quality ?? 0,
    satellites: deviceState?.gps?.satellites ?? 0,
    hdop: deviceState?.gps?.hdop ?? null,
    temp_c: null,
    hum_pct: null,
    press_hpa: null,
    gas_ohms: null,
  };
}

function getMissionId(item) {
  if (!item) return null;
  if (typeof item === "string") return item;

  return item.mission_id || item.id || null;
}

function normalizeDeviceMission(item, missionsMeta, importedIds) {
  const missionId = getMissionId(item);
  if (!missionId) return null;

  const meta = missionsMeta?.[missionId] || {};
  const source = typeof item === "object" && item !== null ? item : {};

  const merged = {
    ...meta,
    ...source,
  };

  return {
    ...merged,
    mission_id: missionId,
    mission_name: merged.mission_name || merged.name || merged.title || missionId,
    profile_type:
      merged.profile_type ||
      merged.profile?.profile_type ||
      merged.profile?.type ||
      "",
    profile_label:
      merged.profile_label ||
      merged.profile?.profile_label ||
      merged.profile?.label ||
      "",
    started_at_epoch:
      merged.started_at_epoch ||
      merged.created_at_epoch ||
      merged.start_epoch ||
      null,
    imported: importedIds.has(missionId),
  };
}

export default function DashboardStatic() {
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

  const [busy, setBusy] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [statusExpandSignal, setStatusExpandSignal] = useState(0);

  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [streamState, setStreamState] = useState("idle");
  const [selectedStaticLocation, setSelectedStaticLocation] = useState(null);

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
      nickname:
        activeDevice.nickname ||
        activeDevice.hostname ||
        activeDevice.info?.hostname ||
        "Static Station",
      hostname: activeDevice.hostname || activeDevice.info?.hostname || null,
      uuid: activeDevice.device_uuid || null,
      ip: ipFromBaseUrl(activeDevice.base_url),
      lastSeenText: activeDevice.last_seen_epoch
        ? new Date(activeDevice.last_seen_epoch * 1000).toLocaleString("ro-RO")
        : null,
    };
  }, [activeDevice, selectedDeviceId]);

  const gpsFix = useMemo(
    () => getGpsFixFromDeviceState(deviceState),
    [deviceState],
  );

  const stationLocation = useMemo(
    () => getStationLocation(selectedStaticLocation, liveTelemetry, deviceState),
    [selectedStaticLocation, liveTelemetry, deviceState],
  );

  const latestTelemetry = useMemo(
    () => getLatestTelemetry(liveTelemetry, deviceState, stationLocation),
    [liveTelemetry, deviceState, stationLocation],
  );

  useEffect(() => {
    setLiveTelemetry(null);

    if (
      !selectedDeviceId ||
      selectedDeviceId === "none" ||
      deviceStatus !== "connected"
    ) {
      setStreamState("idle");
      return;
    }

    const eventSource = new EventSource(buildDeviceStreamUrl());
    setStreamState("connecting");

    eventSource.addEventListener("open", () => {
      setStreamState("connected");
    });

    eventSource.addEventListener("telemetry_live", (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload && typeof payload === "object") {
          setLiveTelemetry(payload);
          setStreamState("connected");
        }
      } catch {
        // Ignore malformed SSE payloads.
      }
    });

    eventSource.addEventListener("error", () => {
      setStreamState("error");
    });

    return () => {
      eventSource.close();
    };
  }, [selectedDeviceId, deviceStatus]);

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
      console.error("Failed to refresh static mission sync", error);

      setDeviceMissionsData({
        missions: [],
        incomplete_missions: [],
        missions_meta: {},
      });

      setDbMissions([]);
    } finally {
      setMissionsLoading(false);
    }
  }

  useEffect(() => {
    refreshMissionSync();
  }, [selectedDeviceId]);

  const missionRows = useMemo(() => {
    const importedIds = new Set(
      (Array.isArray(dbMissions) ? dbMissions : [])
        .map((mission) => mission?.mission_id)
        .filter(Boolean),
    );

    const missions = Array.isArray(deviceMissionsData?.missions)
      ? deviceMissionsData.missions
      : [];

    const metaMap = deviceMissionsData?.missions_meta || {};

    return missions
      .map((item) => normalizeDeviceMission(item, metaMap, importedIds))
      .filter(Boolean)
      .sort((a, b) => (b.started_at_epoch || 0) - (a.started_at_epoch || 0));
  }, [deviceMissionsData, dbMissions]);

  const filteredMissionRows = useMemo(() => {
    const q = missionSearch.trim().toLowerCase();

    if (!q) return missionRows;

    return missionRows.filter((mission) => {
      const haystack = [
        mission.mission_id,
        mission.mission_name,
        mission.profile_type,
        mission.profile_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [missionRows, missionSearch]);

  async function handleCheckStatus() {
    setBusyStatus(true);

    try {
      await refreshStatus();
      setStatusExpandSignal((prev) => prev + 1);
    } finally {
      setBusyStatus(false);
    }
  }

  async function handleAction(action) {
    setBusy(true);

    try {
      await action();
      await refreshStatus();
      await refreshMissionSync();
    } finally {
      setBusy(false);
    }
  }

  async function handleStartStaticMission(payload) {
    if (!selectedDeviceId || selectedDeviceId === "none") {
      return {
        ok: false,
        error: "Select a device first.",
      };
    }

    setBusy(true);

    try {
      await startMission({
        ...payload,
        camera_mode: "off",
        photo_every: 0,
        location_mode: "fixed",
        gps_mode: "off",
      });

      await refreshStatus();
      await refreshMissionSync();

      return { ok: true };
    } catch (error) {
      console.error("Failed to start static mission", error);

      return {
        ok: false,
        error:
          error?.response?.data?.error ||
          error?.message ||
          "Static mission could not be started.",
      };
    } finally {
      setBusy(false);
    }
  }

  async function handleImportNew() {
    setMissionsImporting("new");

    try {
      await importNewMissions();
      setSelectedMissionIds([]);
      await refreshMissionSync();
    } catch (error) {
      console.error("Failed to import new missions", error);
    } finally {
      setMissionsImporting(null);
    }
  }

  async function handleImportSelected() {
    const selectedRows = missionRows.filter((mission) =>
      selectedMissionIds.includes(mission.mission_id),
    );

    if (!selectedRows.length) return;

    const alreadyImported = selectedRows.filter((mission) => mission.imported);
    const selectedIds = selectedRows
      .map((mission) => mission.mission_id)
      .filter(Boolean);

    if (alreadyImported.length > 0) {
      setReimportCandidates(selectedRows);
      setReimportModalOpen(true);
      return;
    }

    setMissionsImporting("selected");

    try {
      await importSelectedMissions(selectedIds);
      setSelectedMissionIds([]);
      await refreshMissionSync();
    } catch (error) {
      console.error("Failed to import selected missions", error);
    } finally {
      setMissionsImporting(null);
    }
  }

  async function handleConfirmReimport() {
    const ids = reimportCandidates
      .map((mission) => mission.mission_id)
      .filter(Boolean);

    if (!ids.length) {
      setReimportModalOpen(false);
      setReimportCandidates([]);
      return;
    }

    setMissionsImporting("reimport");

    try {
      await importSelectedMissions(ids, { overwrite: true });
      setSelectedMissionIds([]);
      setReimportModalOpen(false);
      setReimportCandidates([]);
      await refreshMissionSync();
    } catch (error) {
      console.error("Failed to reimport missions", error);
    } finally {
      setMissionsImporting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <DeviceStaticHeroBanner
        status={deviceStatus}
        device={activeDeviceCard}
        stationLocation={stationLocation}
      />

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

      <StaticLiveStats
        telemetry={latestTelemetry}
        status={deviceState}
        location={stationLocation}
        missionRunning={missionRunning}
        streamState={streamState}
      />

      <MissionStaticPanel
        selectedDeviceId={selectedDeviceId}
        deviceStatus={deviceStatus}
        deviceState={deviceState}
        missionRunning={missionRunning}
        busy={busy}
        gpsFix={gpsFix}
        onLocationChange={setSelectedStaticLocation}
        onStartMission={handleStartStaticMission}
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
