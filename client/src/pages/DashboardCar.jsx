import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  FiActivity,
  FiChevronDown,
  FiClock,
  FiCrosshair,
  FiMapPin,
  FiNavigation,
  FiRadio,
  FiSlash,
} from "react-icons/fi";

import DeviceCarHeroBanner from "../components/dashboard/DeviceCarHeroBanner";
import DeviceStatusPanel from "../components/dashboard/DeviceStatusPanel";
import MissionSyncPanel from "../components/dashboard/MissionSyncPanel";
import MissionMapPanelCar from "../components/dashboard/MissionMapPanelCar";
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

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function ipFromBaseUrl(baseUrl) {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "None";
  }
}

function buildDefaultCarMissionName(startPoint) {
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
    ? `${startPoint.name} - Car Route ${dateStr} ${timeStr}`
    : `Car Route ${dateStr} ${timeStr}`;
}

function formatNumber(value, decimals = 2, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function formatDurationSince(epochSeconds) {
  if (!epochSeconds) return "—";

  const now = Date.now();
  const then = Number(epochSeconds) * 1000;
  const diffMs = Math.max(0, now - then);

  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ────────────────────────────────────────────────────────────────
// Drive Insights UI
// ────────────────────────────────────────────────────────────────

function InsightCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  mono = false,
}) {
  const toneClasses =
    tone === "success"
      ? "border-success/25 bg-success/8"
      : tone === "info"
        ? "border-info/25 bg-info/8"
        : "border-base-300 bg-base-100";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {Icon ? <Icon className="text-[13px]" /> : null}
        {label}
      </div>
      <div
        className={`mt-1.5 text-sm font-semibold text-base-content ${
          mono ? "font-mono break-all" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function MapControlButton({
  active = false,
  label,
  icon: Icon = null,
  onClick,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={[
        "btn btn-sm rounded-xl shadow-sm transition-all",
        disabled
          ? "cursor-not-allowed border-base-300 bg-base-200 text-base-content/35 shadow-none opacity-70"
          : active
            ? "btn-primary border-none text-white"
            : "border-base-300 bg-base-100 hover:bg-base-200 text-base-content",
      ].join(" ")}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon ? <Icon className="text-sm" /> : null}
      {label}
    </button>
  );
}

function DriveInsights({
  deviceState = null,
  missionRunning = false,
  focusOnVehicle = false,
  onToggleFocus = () => {},
  vehicleFollowMode = "nav2d",
  onChangeFollowMode = () => {},
}) {
  const [expanded, setExpanded] = useState(true);

  const gps = deviceState?.gps || {};
  const fix = gps?.last_good_fix || null;
  const profile = deviceState?.profile || null;

  return (
    <section className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FiActivity className="text-primary" />
              <h2 className="text-base font-semibold">Drive insights</h2>
            </div>

            <p className="mt-1 text-sm text-base-content/60">
              Road telemetry overview and vehicle follow controls
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MapControlButton
              active={focusOnVehicle}
              label={focusOnVehicle ? "Unfocus" : "Focus"}
              icon={focusOnVehicle ? FiSlash : FiCrosshair}
              onClick={() => onToggleFocus(!focusOnVehicle)}
            />

            <MapControlButton
              active={vehicleFollowMode === "nav3d"}
              label={vehicleFollowMode === "nav3d" ? "2D" : "3D"}
              onClick={() =>
                onChangeFollowMode(
                  vehicleFollowMode === "nav3d" ? "nav2d" : "nav3d",
                )
              }
              disabled={!focusOnVehicle}
            />

            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost border border-base-300 bg-base-200 hover:bg-base-300"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label="Toggle drive insights"
            >
              <FiChevronDown
                className={`transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {expanded ? (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InsightCard
                icon={FiRadio}
                label="Session state"
                value={missionRunning ? "Running" : "Idle"}
                tone={missionRunning ? "success" : "default"}
              />

              <InsightCard
                icon={FiNavigation}
                label="GPS fix"
                value={
                  gps?.has_fix
                    ? "Fix acquired"
                    : gps?.has_fix === false
                      ? "No fix"
                      : "Unknown"
                }
                tone={gps?.has_fix ? "success" : "default"}
              />

              <InsightCard
                icon={FiActivity}
                label="Sample rate"
                value={
                  profile?.sample_hz != null ? `${profile.sample_hz} Hz` : "—"
                }
              />

              <InsightCard
                icon={FiActivity}
                label="HDOP"
                value={formatNumber(gps?.hdop)}
                tone="info"
              />

              <InsightCard
                icon={FiMapPin}
                label="Latitude"
                value={formatNumber(fix?.lat, 6)}
                mono
              />

              <InsightCard
                icon={FiMapPin}
                label="Longitude"
                value={formatNumber(fix?.lon, 6)}
                mono
              />

              <InsightCard
                icon={FiNavigation}
                label="Satellites"
                value={gps?.satellites ?? "—"}
              />

              <InsightCard
                icon={FiClock}
                label="Elapsed"
                value={formatDurationSince(deviceState?.since_epoch)}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-info/25 bg-info/8 px-4 py-3 text-sm text-base-content/75">
              Focus keeps the map centered on the live vehicle position when GPS
              is available. Unfocus restores normal manual navigation and resets
              follow mode back to 2D.
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────

export default function DashboardCar() {
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
  const [missionsImporting, setMissionsImporting] = useState(null); // null | "new" | "selected" | "reimport"

  const [missionSearch, setMissionSearch] = useState("");
  const [selectedMissionIds, setSelectedMissionIds] = useState([]);

  const [focusOnVehicle, setFocusOnVehicle] = useState(true);
  const [vehicleFollowMode, setVehicleFollowMode] = useState("nav2d");

  const selectedStartPoint = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId],
  );

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
      nickname: activeDevice.nickname || activeDevice.hostname || "Vehicle",
      hostname: activeDevice.hostname || activeDevice.info?.hostname || null,
      uuid: activeDevice.device_uuid || null,
      ip: ipFromBaseUrl(activeDevice.base_url),
      lastSeenText: activeDevice.last_seen_epoch
        ? new Date(activeDevice.last_seen_epoch * 1000).toLocaleString("ro-RO")
        : null,
    };
  }, [activeDevice, selectedDeviceId]);

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
          activeDevice?.active_profile_label ||
          "Car",
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
        tags,
      });

      setStartPoints((prev) => [created, ...prev]);
      setSelectedStartPointId(created.id);

      return created;
    } catch (error) {
      console.error("Failed to create start point", error);
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
      console.error("Failed to import new missions", error);
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

  async function handleStartMission(formPayload) {
    if (!selectedDeviceId || selectedDeviceId === "none") {
      return { ok: false, error: "Select a device first." };
    }

    setBusy(true);

    try {
      const basePayload = {
        mission_name:
          String(formPayload?.mission_name || "").trim() ||
          buildDefaultCarMissionName(selectedStartPoint),
        duration: Number(formPayload?.duration ?? 180),
        sample_hz: Number(formPayload?.sample_hz ?? 2),
        photo_every: 0,
        gps_mode: String(formPayload?.gps_mode || "required"),
        camera_mode: "off",
        location_mode: String(formPayload?.location_mode || "gps"),
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
      console.error("Failed to start car mission", error);
      return { ok: false, error: "Drive session could not be started." };
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

  function handleOpenMissionControl() {
    navigate("/mission-control");
  }

  return (
    <div className="space-y-6">
      <DeviceCarHeroBanner status={deviceStatus} device={activeDeviceCard} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
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
            loading={missionsLoading}
            importing={missionsImporting}
            canImport={
              selectedDeviceId !== "none" && deviceStatus === "connected"
            }
          />
        </div>
      </div>

      <DriveInsights
        deviceState={deviceState}
        missionRunning={missionRunning}
        focusOnVehicle={focusOnVehicle}
        onToggleFocus={(nextValue) => {
          setFocusOnVehicle(nextValue);
          if (!nextValue) {
            setVehicleFollowMode("nav2d");
          }
        }}
        vehicleFollowMode={vehicleFollowMode}
        onChangeFollowMode={setVehicleFollowMode}
      />

      <MissionMapPanelCar
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
        onOpenMissionControl={handleOpenMissionControl}
        focusOnVehicle={focusOnVehicle}
        vehicleFollowMode={vehicleFollowMode}
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
