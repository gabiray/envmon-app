import React, { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiLayers,
  FiMapPin,
  FiMaximize2,
  FiNavigation,
  FiRefreshCw,
  FiSliders,
  FiTrendingUp,
} from "react-icons/fi";

import AnalyticsSingleMissionChart from "../charts/AnalyticsSingleMissionChart";
import AnalyticsMultiMissionChart from "../charts/AnalyticsMultiMissionChart";
import {
  applyGpsFilter,
  buildDensityMapPoints,
  computeDensityCells,
  computeMovementStats,
  isFiniteNumber,
  isValidGpsPoint,
  sliceByRange,
} from "../../../utils/analyticsUtils";

const SERIES_COLORS = ["#2563eb", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6"];

function formatAxisValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "";
  }
  return Number(value).toFixed(2);
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatElapsedLabel(minutes) {
  if (!Number.isFinite(minutes)) return "—";
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  return `${minutes.toFixed(1)} min`;
}

function buildZoneContext(zone, telemetry = []) {
  const valid = Array.isArray(telemetry)
    ? telemetry
        .filter(isValidGpsPoint)
        .sort((a, b) => Number(a?.ts_epoch || 0) - Number(b?.ts_epoch || 0))
    : [];

  if (
    !valid.length ||
    !Number.isFinite(Number(zone?.lat)) ||
    !Number.isFinite(Number(zone?.lon))
  ) {
    return {
      progressPct: null,
      elapsedMin: null,
      nearestDistanceM: null,
    };
  }

  const firstTs = Number(valid[0]?.ts_epoch || 0);
  const lastTs = Number(valid[valid.length - 1]?.ts_epoch || firstTs);
  const totalSpan = lastTs - firstTs;

  let nearest = null;

  valid.forEach((point, index) => {
    const distanceM = haversineMeters(
      Number(zone.lat),
      Number(zone.lon),
      Number(point.lat),
      Number(point.lon),
    );

    if (!nearest || distanceM < nearest.distanceM) {
      nearest = {
        point,
        index,
        distanceM,
      };
    }
  });

  if (!nearest) {
    return {
      progressPct: null,
      elapsedMin: null,
      nearestDistanceM: null,
    };
  }

  const ts = Number(nearest.point?.ts_epoch || 0);

  let progressPct = null;
  if (totalSpan > 0) {
    progressPct = ((ts - firstTs) / totalSpan) * 100;
  } else if (valid.length > 1) {
    progressPct = (nearest.index / (valid.length - 1)) * 100;
  }

  return {
    progressPct,
    elapsedMin: (ts - firstTs) / 60,
    nearestDistanceM: nearest.distanceM,
  };
}

function getZoneHeadline(zone, index = 0) {
  if (zone?.missionCount > 1) {
    if (index === 0) return "Main shared congestion zone";
    if (index === 1) return "Secondary shared slow area";
    return `Shared zone ${index + 1}`;
  }

  if (index === 0) return "Main congestion zone";
  if (index === 1) return "Secondary slow area";
  return `Zone ${index + 1}`;
}

function buildMissionTelemetry(
  raw = [],
  rangePreset = "full",
  gpsFilter = "all",
) {
  const sliced = sliceByRange(Array.isArray(raw) ? raw : [], rangePreset);
  return applyGpsFilter(sliced, gpsFilter);
}

function buildSpeedSeriesForMission(
  mission,
  telemetry,
  color = "#2563eb",
  xMode = "time", // time | progress
) {
  if (!mission || !Array.isArray(telemetry) || telemetry.length < 2) {
    return null;
  }

  const valid = telemetry
    .filter(isValidGpsPoint)
    .sort((a, b) => Number(a?.ts_epoch || 0) - Number(b?.ts_epoch || 0));

  if (valid.length < 2) return null;

  const firstTs = Number(valid[0]?.ts_epoch || 0);
  const lastTs = Number(valid[valid.length - 1]?.ts_epoch || firstTs);
  const totalSpan = lastTs - firstTs;

  const points = [];

  for (let i = 1; i < valid.length; i += 1) {
    const prev = valid[i - 1];
    const curr = valid[i];

    const dt = Number(curr?.ts_epoch || 0) - Number(prev?.ts_epoch || 0);
    if (!Number.isFinite(dt) || dt <= 0) continue;

    const distanceM = haversineMeters(
      Number(prev.lat),
      Number(prev.lon),
      Number(curr.lat),
      Number(curr.lon),
    );

    const speedMps = distanceM / dt;
    const speedKmh = speedMps * 3.6;

    let xValue = 0;

    if (xMode === "progress") {
      if (totalSpan > 0) {
        xValue = ((Number(curr.ts_epoch) - firstTs) / totalSpan) * 100;
      } else if (valid.length > 1) {
        xValue = (i / (valid.length - 1)) * 100;
      }
    } else {
      xValue = (Number(curr.ts_epoch) - firstTs) / 60;
    }

    points.push({
      x: xValue,
      y: speedKmh,
      ts_epoch: curr.ts_epoch ?? null,
      lat: curr.lat ?? null,
      lon: curr.lon ?? null,
      alt_m: curr.alt_m ?? null,
      fix_quality: curr.fix_quality ?? null,
      satellites: curr.satellites ?? null,
      hdop: curr.hdop ?? null,
    });
  }

  if (!points.length) return null;

  return {
    id: `speed-${mission.mission_id}`,
    label: mission.mission_name || mission.mission_id,
    shortLabel: mission.mission_name || mission.mission_id,
    color,
    points,
  };
}

function buildDensityZones(telemetry = []) {
  const cells = computeDensityCells(telemetry, 35);
  const points = buildDensityMapPoints(cells);

  return points.map((item) => ({
    ...item,
    lat: item.centerLat,
    lon: item.centerLon,
  }));
}

function buildSharedZones(missionRows = [], precision = 4) {
  const buckets = new Map();

  missionRows.forEach((item) => {
    const missionId = item?.mission?.mission_id;
    const missionName = item?.mission?.mission_name || missionId;

    (item?.denseZones || []).forEach((zone) => {
      const lat = Number(zone?.lat);
      const lon = Number(zone?.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const key = `${lat.toFixed(precision)}:${lon.toFixed(precision)}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          lat,
          lon,
          count: 0,
          dwellS: 0,
          missionCount: 0,
          missionIds: new Set(),
          missionNames: [],
        });
      }

      const current = buckets.get(key);
      current.count += Number(zone?.count || 0);
      current.dwellS += Number(zone?.dwellS || 0);

      if (!current.missionIds.has(missionId)) {
        current.missionIds.add(missionId);
        current.missionCount += 1;
        current.missionNames.push(missionName);
      }
    });
  });

  return Array.from(buckets.values())
    .map((item) => ({
      ...item,
      avgDwellS: item.missionCount > 0 ? item.dwellS / item.missionCount : 0,
    }))
    .sort((a, b) => {
      if (b.missionCount !== a.missionCount)
        return b.missionCount - a.missionCount;
      if (b.avgDwellS !== a.avgDwellS) return b.avgDwellS - a.avgDwellS;
      return b.count - a.count;
    })
    .slice(0, 8);
}

function summarizeVehicle(movementStats = {}) {
  const totalDistanceKm = Number.isFinite(movementStats?.totalDistanceM)
    ? movementStats.totalDistanceM / 1000
    : null;

  const avgMovingSpeedKmh = Number.isFinite(movementStats?.avgMovingSpeedMps)
    ? movementStats.avgMovingSpeedMps * 3.6
    : null;

  return {
    totalDistanceKm,
    avgMovingSpeedKmh,
    stationaryPct: movementStats?.stationaryPct ?? null,
    stationaryDurationS: movementStats?.stationaryDurationS ?? null,
  };
}

function SectionCard({
  title,
  description,
  icon: Icon,
  actions = null,
  children,
}) {
  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
              <Icon className="text-base" />
            </div>

            <div className="min-w-0">
              <div className="text-base font-semibold text-base-content">
                {title}
              </div>
              <div className="mt-1 text-sm leading-6 text-base-content/60">
                {description}
              </div>
            </div>
          </div>

          {actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : null}
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

function StatCard({ label, value, hint = "", tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning/10"
      : tone === "success"
        ? "border-success/30 bg-success/10"
        : tone === "info"
          ? "border-info/30 bg-info/10"
          : "border-base-300 bg-base-100";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-base-content">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs leading-5 text-base-content/60">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-base-300 bg-base-100 px-4 py-3">
      <div className="text-sm text-base-content/60">{label}</div>
      <div className="text-sm font-medium text-base-content text-right">
        {value}
      </div>
    </div>
  );
}

function ToggleChip({ active = false, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "btn btn-sm rounded-xl",
        active
          ? "btn-primary border-none text-white"
          : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "0.1",
  placeholder = "",
}) {
  return (
    <label className="form-control w-full">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input input-bordered w-full rounded-xl bg-base-100"
      />
    </label>
  );
}

function AxisControlsPanel({
  yMinInput,
  yMaxInput,
  setYMinInput,
  setYMaxInput,
  handleResetYAxis,
}) {
  return (
    <div className="mt-4 rounded-3xl border border-base-300 bg-base-200/35 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
            <FiMaximize2 className="text-primary" />
            Axis calibration
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            Fine-tune the visible Y range for the mobility chart.
          </div>
        </div>

        <button
          type="button"
          className="btn btn-sm rounded-xl border-base-300 bg-base-100"
          onClick={handleResetYAxis}
        >
          <FiRefreshCw />
          Reset scale
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberField
          label="Y min"
          value={yMinInput}
          onChange={setYMinInput}
          placeholder="Detected minimum"
        />

        <NumberField
          label="Y max"
          value={yMaxInput}
          onChange={setYMaxInput}
          placeholder="Detected maximum"
        />
      </div>
    </div>
  );
}

function ZoneCard({ zone, formatNumber, showMissionNames = false }) {
  const progressPct = zone?.context?.progressPct;
  const elapsedMin = zone?.context?.elapsedMin;
  const nearestDistanceM = zone?.context?.nearestDistanceM;

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-base-content">
            {zone?.headline || `Zone ${zone?.rank || "—"}`}
          </div>

          <div className="mt-1 text-xs text-base-content/55">
            {formatNumber(zone?.lat, 5)}, {formatNumber(zone?.lon, 5)}
          </div>
        </div>

        {zone?.missionCount ? (
          <span className="badge badge-outline">{zone.missionCount} missions</span>
        ) : (
          <span className="badge badge-outline">{zone?.count ?? 0} pts</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <InfoRow
          label="Mission progress"
          value={
            Number.isFinite(progressPct)
              ? `${Math.round(progressPct)} %`
              : "Approx. unknown"
          }
        />
        <InfoRow
          label="Appears near"
          value={formatElapsedLabel(elapsedMin)}
        />
        <InfoRow
          label="Dwell"
          value={formatNumber(zone?.avgDwellS ?? zone?.dwellS, 0, " s")}
        />
        <InfoRow
          label="Samples"
          value={formatNumber(zone?.count, 0)}
        />
      </div>

      {Number.isFinite(nearestDistanceM) ? (
        <div className="mt-3 text-xs text-base-content/60">
          Approximate zone anchor: nearest route point at{" "}
          <span className="font-medium text-base-content">
            {formatNumber(nearestDistanceM, 0, " m")}
          </span>
          .
        </div>
      ) : null}

      {showMissionNames && Array.isArray(zone?.missionNames) && zone.missionNames.length ? (
        <div className="mt-3 text-xs text-base-content/60">
          Seen in: {zone.missionNames.join(", ")}
        </div>
      ) : null}
    </div>
  );
}

function MissionSummaryItem({
  item,
  expanded = false,
  onToggle,
  formatNumber,
}) {
  const missionName =
    item?.mission?.mission_name || item?.mission?.mission_id || "Mission";
  const movement = summarizeVehicle(item?.movementStats);

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-base-200/45"
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-base-content truncate">
            {missionName}
          </div>
          <div className="mt-1 text-xs text-base-content/55 truncate">
            {item?.mission?.mission_id || "—"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="badge badge-outline">
            {item?.denseZones?.length ?? 0} zones
          </span>
          <span className="text-base-content/55">
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-base-300 px-4 py-4 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoRow
              label="Stationary ratio"
              value={formatNumber(movement.stationaryPct, 0, " %")}
            />
            <InfoRow
              label="Stationary duration"
              value={formatNumber(movement.stationaryDurationS, 0, " s")}
            />
            <InfoRow
              label="Avg moving speed"
              value={formatNumber(movement.avgMovingSpeedKmh, 1, " km/h")}
            />
            <InfoRow
              label="Total distance"
              value={formatNumber(movement.totalDistanceKm, 2, " km")}
            />
          </div>

          {item?.denseZones?.length ? (
            <div className="space-y-2">
              {item.denseZones.slice(0, 3).map((zone) => (
                <ZoneCard
                  key={`${item.mission.mission_id}-${zone.key}`}
                  zone={zone}
                  formatNumber={formatNumber}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function CarProfileAnalytics({
  mission = null,
  missions = [],
  telemetry = [],
  telemetryMap = {},
  sameLocation = true,
  rangePreset = "full",
  gpsFilter = "all",
  formatNumber,
}) {
  const isMultiMission = Array.isArray(missions) && missions.length > 1;

  const [singleXAxisMode, setSingleXAxisMode] = useState("time");
  const [multiXAxisMode, setMultiXAxisMode] = useState("progress");
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [chartControlsOpen, setChartControlsOpen] = useState(false);

  const [yMinInput, setYMinInput] = useState("");
  const [yMaxInput, setYMaxInput] = useState("");

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [expandedMap, setExpandedMap] = useState({});

  const singleMovementStats = useMemo(() => {
    return computeMovementStats(Array.isArray(telemetry) ? telemetry : []);
  }, [telemetry]);

  const singleDenseZones = useMemo(() => {
    const safeTelemetry = Array.isArray(telemetry) ? telemetry : [];

    return buildDensityZones(safeTelemetry).map((zone, index) => ({
      ...zone,
      rank: index + 1,
      headline: getZoneHeadline(zone, index),
      context: buildZoneContext(zone, safeTelemetry),
    }));
  }, [telemetry]);

  const singleSeries = useMemo(() => {
    if (!mission) return [];
    const series = buildSpeedSeriesForMission(
      mission,
      Array.isArray(telemetry) ? telemetry : [],
      "#2563eb",
      singleXAxisMode,
    );
    return series ? [series] : [];
  }, [mission, telemetry, singleXAxisMode]);

  const missionRows = useMemo(() => {
    if (!isMultiMission) return [];

    return missions.map((itemMission) => {
      const raw = telemetryMap[itemMission.mission_id] || [];
      const filtered = buildMissionTelemetry(raw, rangePreset, gpsFilter);

      return {
        mission: itemMission,
        telemetry: filtered,
        movementStats: computeMovementStats(filtered),
        denseZones: buildDensityZones(filtered).map((zone, index) => ({
          ...zone,
          rank: index + 1,
          headline: getZoneHeadline(zone, index),
          context: buildZoneContext(zone, filtered),
        })),
      };
    });
  }, [isMultiMission, missions, telemetryMap, rangePreset, gpsFilter]);

  const multiSeries = useMemo(() => {
    if (!isMultiMission) return [];

    return missions
      .map((itemMission, index) => {
        const raw = telemetryMap[itemMission.mission_id] || [];
        const filtered = buildMissionTelemetry(raw, rangePreset, gpsFilter);

        return buildSpeedSeriesForMission(
          itemMission,
          filtered,
          SERIES_COLORS[index % SERIES_COLORS.length],
          multiXAxisMode,
        );
      })
      .filter(Boolean);
  }, [
    isMultiMission,
    missions,
    telemetryMap,
    rangePreset,
    gpsFilter,
    multiXAxisMode,
  ]);

  const offsetsBySeries = useMemo(() => {
    if (!overlayEnabled) return {};

    const result = {};
    multiSeries.forEach((item, index) => {
      result[item.id] = index * 2.5;
    });
    return result;
  }, [overlayEnabled, multiSeries]);

  const sharedZones = useMemo(() => {
    if (!sameLocation) return [];

    return buildSharedZones(missionRows).map((item, index) => ({
      ...item,
      rank: index + 1,
      headline: getZoneHeadline(item, index),
    }));
  }, [sameLocation, missionRows]);

  const overallSummary = useMemo(() => {
    const stationaryPcts = missionRows
      .map((item) => item?.movementStats?.stationaryPct)
      .filter((value) => Number.isFinite(value));

    const speeds = missionRows
      .map((item) => {
        const v = item?.movementStats?.avgMovingSpeedMps;
        return Number.isFinite(v) ? v * 3.6 : null;
      })
      .filter((value) => Number.isFinite(value));

    const distances = missionRows
      .map((item) => {
        const v = item?.movementStats?.totalDistanceM;
        return Number.isFinite(v) ? v / 1000 : null;
      })
      .filter((value) => Number.isFinite(value));

    return {
      maxStationaryPct: stationaryPcts.length
        ? Math.max(...stationaryPcts)
        : null,
      avgSpeedKmh: speeds.length
        ? speeds.reduce((sum, value) => sum + value, 0) / speeds.length
        : null,
      avgDistanceKm: distances.length
        ? distances.reduce((sum, value) => sum + value, 0) / distances.length
        : null,
      sharedZonesCount: sharedZones.length,
    };
  }, [missionRows, sharedZones]);

  const detectedYRange = useMemo(() => {
    const sourceSeries = isMultiMission ? multiSeries : singleSeries;
    const values = sourceSeries
      .flatMap((item) => item?.points || [])
      .map((point) => Number(point?.y))
      .filter((value) => Number.isFinite(value));

    if (!values.length) {
      return { min: null, max: null };
    }

    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [isMultiMission, multiSeries, singleSeries]);

  useEffect(() => {
    setYMinInput(formatAxisValue(detectedYRange.min));
    setYMaxInput(formatAxisValue(detectedYRange.max));
  }, [
    detectedYRange.min,
    detectedYRange.max,
    isMultiMission,
    singleXAxisMode,
    multiXAxisMode,
    rangePreset,
    gpsFilter,
  ]);

  useEffect(() => {
    if (!missionRows.length) {
      setExpandedMap({});
      return;
    }

    setExpandedMap((prev) => {
      const next = {};
      missionRows.forEach((item) => {
        const missionId = item?.mission?.mission_id;
        next[missionId] = prev[missionId] ?? false;
      });
      return next;
    });
  }, [missionRows]);

  const parsedYMin = Number(yMinInput);
  const parsedYMax = Number(yMaxInput);

  const yMinOverride = Number.isFinite(parsedYMin) ? parsedYMin : null;
  const yMaxOverride = Number.isFinite(parsedYMax) ? parsedYMax : null;

  function handleResetYAxis() {
    setYMinInput(formatAxisValue(detectedYRange.min));
    setYMaxInput(formatAxisValue(detectedYRange.max));
  }

  function handleToggleMission(missionId) {
    setExpandedMap((prev) => ({
      ...prev,
      [missionId]: !prev[missionId],
    }));
  }

  function handleExpandAll() {
    const next = {};
    missionRows.forEach((item) => {
      next[item.mission.mission_id] = true;
    });
    setExpandedMap(next);
  }

  function handleCollapseAll() {
    const next = {};
    missionRows.forEach((item) => {
      next[item.mission.mission_id] = false;
    });
    setExpandedMap(next);
  }

  const singleMovement = summarizeVehicle(singleMovementStats);

  if (isMultiMission) {
    return (
      <div className="space-y-5">
        <SectionCard
          title="Car comparison"
          description={
            sameLocation
              ? "Traffic-oriented comparison across car missions from the same location context."
              : "Traffic-oriented comparison across car missions from different locations."
          }
          icon={FiLayers}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Selected missions"
              value={String(missions.length)}
              hint="Car missions in comparison"
              tone="info"
            />
            <StatCard
              label="Max stationary ratio"
              value={formatNumber(overallSummary.maxStationaryPct, 0, " %")}
            />
            <StatCard
              label="Average moving speed"
              value={formatNumber(overallSummary.avgSpeedKmh, 1, " km/h")}
            />
            <StatCard
              label="Average distance"
              value={formatNumber(overallSummary.avgDistanceKm, 2, " km")}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Speed comparison"
          description={
            multiXAxisMode === "progress"
              ? "Missions are normalized on X by progress (0–100%), useful when routes are similar but durations differ."
              : "Missions are aligned by elapsed mission time."
          }
          icon={FiTrendingUp}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <ToggleChip
              active={multiXAxisMode === "progress"}
              label="X: Progress"
              onClick={() => setMultiXAxisMode("progress")}
            />
            <ToggleChip
              active={multiXAxisMode === "time"}
              label="X: Elapsed time"
              onClick={() => setMultiXAxisMode("time")}
            />
            <ToggleChip
              active={overlayEnabled}
              label="Overlay"
              onClick={() => setOverlayEnabled((prev) => !prev)}
            />

            <button
              type="button"
              className={[
                "btn btn-sm btn-square rounded-xl",
                chartControlsOpen
                  ? "btn-primary border-none text-white"
                  : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
              ].join(" ")}
              onClick={() => setChartControlsOpen((prev) => !prev)}
              aria-label="Toggle chart controls"
              title="Chart controls"
            >
              <FiSliders />
            </button>
          </div>

          {chartControlsOpen ? (
            <AxisControlsPanel
              yMinInput={yMinInput}
              yMaxInput={yMaxInput}
              setYMinInput={setYMinInput}
              setYMaxInput={setYMaxInput}
              handleResetYAxis={handleResetYAxis}
            />
          ) : null}

          <div className={chartControlsOpen ? "mt-4" : ""}>
            {multiSeries.length ? (
              <AnalyticsMultiMissionChart
                metricLabel="Speed"
                unit="km/h"
                series={multiSeries}
                displayMode="line"
                smoothMode="off"
                normalizeMode="off"
                offsetsBySeries={offsetsBySeries}
                brushEnabled={true}
                valueDecimals={2}
                xAxisMode={multiXAxisMode}
                yMinOverride={yMinOverride}
                yMaxOverride={yMaxOverride}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
                No speed data available for the selected missions.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Mission mobility summary"
          description="Expandable summary for each selected car mission."
          icon={FiActivity}
          actions={
            <button
              type="button"
              className="btn btn-sm btn-square rounded-xl border-base-300 bg-base-100 text-base-content hover:bg-base-200"
              onClick={() => setSummaryOpen((prev) => !prev)}
              aria-label="Toggle mission summary"
              title="Toggle mission summary"
            >
              {summaryOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>
          }
        >
          {summaryOpen ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-base-content/60">
                  {missionRows.length} mission
                  {missionRows.length === 1 ? "" : "s"} in summary
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                    onClick={handleExpandAll}
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                    onClick={handleCollapseAll}
                  >
                    Collapse all
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {missionRows.map((item) => (
                  <MissionSummaryItem
                    key={item.mission.mission_id}
                    item={item}
                    expanded={Boolean(expandedMap[item.mission.mission_id])}
                    onToggle={() =>
                      handleToggleMission(item.mission.mission_id)
                    }
                    formatNumber={formatNumber}
                  />
                ))}
              </div>
            </>
          ) : null}
        </SectionCard>

        <SectionCard
          title={
            sameLocation ? "Shared congestion zones" : "Dense zones by mission"
          }
          description={
            sameLocation
              ? "Repeated dense zones across selected car missions."
              : "Because locations differ, dense zones should be interpreted separately for each mission."
          }
          icon={FiMapPin}
        >
          {sameLocation ? (
            sharedZones.length ? (
              <div className="space-y-3">
                {sharedZones.map((zone) => (
                  <ZoneCard
                    key={zone.key}
                    zone={zone}
                    formatNumber={formatNumber}
                    showMissionNames={true}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
                No shared congestion zones identified.
              </div>
            )
          ) : (
            <div className="space-y-5">
              {missionRows.map((item) => (
                <div key={item.mission.mission_id} className="space-y-3">
                  <div className="text-sm font-semibold text-base-content">
                    {item.mission.mission_name || item.mission.mission_id}
                  </div>

                  {item.denseZones.length ? (
                    item.denseZones
                      .slice(0, 4)
                      .map((zone) => (
                        <ZoneCard
                          key={`${item.mission.mission_id}-${zone.key}`}
                          zone={zone}
                          formatNumber={formatNumber}
                        />
                      ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-6 text-center text-sm text-base-content/55">
                      No dense zones identified for this mission.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Mobility interpretation"
          description="Context notes for car mission comparison."
          icon={FiNavigation}
        >
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <InfoRow label="Profile" value="Car" />
            <InfoRow
              label="X comparison mode"
              value={
                multiXAxisMode === "progress"
                  ? "Mission progress"
                  : "Elapsed time"
              }
            />
            <InfoRow
              label="Recommended focus"
              value={
                sameLocation
                  ? "Congestion patterns and repeated dense zones"
                  : "Mobility comparison and per-mission dense zones"
              }
            />
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Car analysis"
        description="Traffic-oriented mobility interpretation for the selected mission."
        icon={FiNavigation}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Stationary ratio"
            value={formatNumber(singleMovement.stationaryPct, 0, " %")}
            hint="Useful for identifying congestion"
            tone={
              Number(singleMovement.stationaryPct) > 35
                ? "warning"
                : Number(singleMovement.stationaryPct) > 15
                  ? "info"
                  : "success"
            }
          />
          <StatCard
            label="Stationary duration"
            value={formatNumber(singleMovement.stationaryDurationS, 0, " s")}
            hint="Time spent in low-speed movement"
          />
          <StatCard
            label="Avg moving speed"
            value={formatNumber(singleMovement.avgMovingSpeedKmh, 1, " km/h")}
            hint="Average speed while moving"
          />
          <StatCard
            label="Total distance"
            value={formatNumber(singleMovement.totalDistanceKm, 2, " km")}
            hint="Estimated route distance"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Speed profile"
        description={
          singleXAxisMode === "time"
            ? "Speed over elapsed mission time."
            : "Speed over normalized mission progress (0–100%)."
        }
        icon={FiTrendingUp}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ToggleChip
            active={singleXAxisMode === "time"}
            label="X: Elapsed time"
            onClick={() => setSingleXAxisMode("time")}
          />
          <ToggleChip
            active={singleXAxisMode === "progress"}
            label="X: Progress"
            onClick={() => setSingleXAxisMode("progress")}
          />

          <button
            type="button"
            className={[
              "btn btn-sm btn-square rounded-xl",
              chartControlsOpen
                ? "btn-primary border-none text-white"
                : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
            ].join(" ")}
            onClick={() => setChartControlsOpen((prev) => !prev)}
            aria-label="Toggle chart controls"
            title="Chart controls"
          >
            <FiSliders />
          </button>
        </div>

        {chartControlsOpen ? (
          <AxisControlsPanel
            yMinInput={yMinInput}
            yMaxInput={yMaxInput}
            setYMinInput={setYMinInput}
            setYMaxInput={setYMaxInput}
            handleResetYAxis={handleResetYAxis}
          />
        ) : null}

        <div className={chartControlsOpen ? "mt-4" : ""}>
          {singleSeries.length ? (
            <AnalyticsSingleMissionChart
              metricLabel="Speed"
              unit="km/h"
              series={singleSeries}
              displayMode="line"
              smoothMode="off"
              brushEnabled={true}
              valueDecimals={2}
              yMinOverride={yMinOverride}
              yMaxOverride={yMaxOverride}
              xAxisMode={singleXAxisMode}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
              No speed data available for the selected mission.
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Dense traffic zones"
        description="Areas with repeated samples or prolonged low-speed presence."
        icon={FiMapPin}
      >
        {singleDenseZones.length ? (
          <div className="space-y-3">
            {singleDenseZones.slice(0, 6).map((zone) => (
              <ZoneCard
                key={zone.key}
                zone={zone}
                formatNumber={formatNumber}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
            No dense traffic zones identified for this mission.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Mobility interpretation"
        description="Context notes for route-based car monitoring."
        icon={FiClock}
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <InfoRow label="Profile" value="Car" />
          <InfoRow
            label="Chart X mode"
            value={
              singleXAxisMode === "progress"
                ? "Mission progress"
                : "Elapsed time"
            }
          />
          <InfoRow
            label="Recommended focus"
            value="Congestion, dwell zones and route fluidity"
          />
        </div>
      </SectionCard>
    </div>
  );
}
