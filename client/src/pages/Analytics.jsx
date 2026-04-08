import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiActivity,
  FiAlertTriangle,
  FiCpu,
  FiMapPin,
  FiRefreshCw,
} from "react-icons/fi";
import { TbDrone } from "react-icons/tb";
import { MdDirectionsBike } from "react-icons/md";
import { FaCarSide } from "react-icons/fa";

import AnalyticsToolbar from "../components/analytics/AnalyticsToolbar";
import AnalyticsTrendsSection from "../components/analytics/AnalyticsTrendsSection";
import AnalyticsInsightsSection from "../components/analytics/AnalyticsInsightsSection";
import AnalyticsProfileSection from "../components/analytics/AnalyticsProfileSection";
import AnalyticsSimpleLineChart from "../components/analytics/AnalyticsSimpleLineChart";
import {
  applyGpsFilter,
  buildDenseCellLookup,
  buildDensityMapPoints,
  buildDistanceSeries,
  buildMetricSeries,
  computeAirAnomalies,
  computeBaselineComparison,
  computeDensityCells,
  computeGpsQuality,
  computeMissionDuration,
  computeMovementStats,
  computePointCellKey,
  computeStaticStability,
  computeTrendSummary,
  formatDurationSeconds,
  formatEpoch,
  formatNumber,
  isFiniteNumber,
  isValidGpsPoint,
  sliceByRange,
  smoothMetric,
} from "../utils/analyticsUtils";

import {
  fetchAnalyticsMission,
  fetchAnalyticsMissionImages,
  fetchAnalyticsMissionStats,
  fetchAnalyticsMissionTelemetry,
} from "../services/analyticsApi";

const METRIC_OPTIONS = [
  { value: "temp_c", label: "Temperature", unit: "°C" },
  { value: "hum_pct", label: "Humidity", unit: "%" },
  { value: "press_hpa", label: "Pressure", unit: "hPa" },
  { value: "gas_ohms", label: "Gas resistance", unit: "Ω" },
];

const RANGE_OPTIONS = [
  { value: "full", label: "Full mission" },
  { value: "first25", label: "First 25%" },
  { value: "middle50", label: "Middle 50%" },
  { value: "last25", label: "Last 25%" },
];

const GPS_FILTER_OPTIONS = [
  { value: "all", label: "All points" },
  { value: "valid", label: "Valid GPS only" },
  { value: "good", label: "Good GPS only" },
];

const COMPARE_OPTIONS = [
  { value: "single", label: "Single / overlay" },
  { value: "normalized", label: "Normalized compare" },
];

const SMOOTH_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
];

const SERIES_COLORS = ["#2563eb", "#ec4899", "#22c55e", "#f59e0b", "#8b5cf6"];

function getProfileMeta(type) {
  if (type === "drone") {
    return {
      label: "Drone",
      Icon: TbDrone,
      description: "Aerial missions and geospatial scans",
    };
  }

  if (type === "bicycle") {
    return {
      label: "Bicycle",
      Icon: MdDirectionsBike,
      description: "Light mobile environmental routes",
    };
  }

  if (type === "car") {
    return {
      label: "Car",
      Icon: FaCarSide,
      description: "Road-based monitoring and transport routes",
    };
  }

  if (type === "static") {
    return {
      label: "Static Station",
      Icon: FiMapPin,
      description: "Fixed monitoring node with repeated acquisitions",
    };
  }

  return {
    label: "Unknown profile",
    Icon: FiCpu,
    description: "No profile metadata available",
  };
}

function parseMissionIds(searchParams) {
  const single = (searchParams.get("missionId") || "").trim();
  const multi = (searchParams.get("missionIds") || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const ids = [];
  if (single) ids.push(single);
  ids.push(...multi);

  return [...new Set(ids)];
}

function getMetricMeta(metric) {
  return (
    METRIC_OPTIONS.find((item) => item.value === metric) || METRIC_OPTIONS[0]
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  right = null,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-sm">
      <div className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {Icon ? <Icon className="text-primary" /> : null}
              <h2 className="text-base font-semibold">{title}</h2>
            </div>
            {description ? (
              <p className="mt-1 text-sm text-base-content/60">{description}</p>
            ) : null}
          </div>
          {right}
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
      : tone === "error"
        ? "border-error/30 bg-error/10"
        : tone === "success"
          ? "border-success/30 bg-success/10"
          : "border-base-300 bg-base-100";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-base-content">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-base-content/55">{hint}</div>
      ) : null}
    </div>
  );
}

function Badge({ children, tone = "default" }) {
  const cls =
    tone === "primary"
      ? "border-primary/30 bg-primary/10 text-primary"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning"
        : tone === "success"
          ? "border-success/30 bg-success/10 text-success"
          : "border-base-300 bg-base-200 text-base-content/75";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function MissionTabs({ missions, activeMissionId, onChange }) {
  if (!Array.isArray(missions) || missions.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {missions.map((mission) => {
        const active = mission.mission_id === activeMissionId;

        return (
          <button
            key={mission.mission_id}
            type="button"
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-base-300 bg-base-100 text-base-content hover:bg-base-200"
            }`}
            onClick={() => onChange(mission.mission_id)}
          >
            {mission.mission_name || mission.mission_id}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <section className="rounded-3xl border border-dashed border-base-300 bg-base-100">
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="text-lg font-semibold">{title}</div>
        <p className="mt-2 max-w-xl text-sm text-base-content/60">
          {description}
        </p>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="rounded-3xl border border-base-300 bg-base-100">
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-10">
        <span className="loading loading-spinner loading-md text-primary" />
        <div className="text-sm text-base-content/60">
          Loading analytics data...
        </div>
      </div>
    </section>
  );
}

function DensityMiniMap({ cells }) {
  const points = buildDensityMapPoints(cells);

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
        No dense GPS zones detected.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
      <svg viewBox="0 0 420 220" className="w-full">
        <rect x="0" y="0" width="420" height="220" rx="18" fill="#f8fafc" />
        {points.map((point) => {
          const x = 30 + point.nx * 360;
          const y = 25 + point.ny * 170;
          const radius = 6 + Math.min(point.count, 18) * 0.7;

          return (
            <g key={point.key}>
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill="rgba(37,99,235,0.18)"
                stroke="rgba(37,99,235,0.85)"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#1e293b"
              >
                {point.rank}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Analytics() {
  const [searchParams] = useSearchParams();

  const missionIds = useMemo(
    () => parseMissionIds(searchParams),
    [searchParams],
  );

  const [missions, setMissions] = useState([]);
  const [statsById, setStatsById] = useState({});
  const [telemetryById, setTelemetryById] = useState({});
  const [imagesById, setImagesById] = useState({});
  const [activeMissionId, setActiveMissionId] = useState(null);

  const [metric, setMetric] = useState("temp_c");
  const [rangePreset, setRangePreset] = useState("full");
  const [compareMode, setCompareMode] = useState("single");
  const [smoothing, setSmoothing] = useState("low");
  const [gpsFilter, setGpsFilter] = useState("valid");

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      if (!missionIds.length) {
        setMissions([]);
        setStatsById({});
        setTelemetryById({});
        setImagesById({});
        setActiveMissionId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorText("");

      try {
        const results = await Promise.all(
          missionIds.map(async (missionId) => {
            const [mission, stats, telemetry, images] = await Promise.all([
              fetchAnalyticsMission(missionId),
              fetchAnalyticsMissionStats(missionId),
              fetchAnalyticsMissionTelemetry(missionId),
              fetchAnalyticsMissionImages(missionId),
            ]);

            return { missionId, mission, stats, telemetry, images };
          }),
        );

        if (cancelled) return;

        const missionItems = results
          .map((result) => result.mission)
          .filter(Boolean);
        const nextStats = {};
        const nextTelemetry = {};
        const nextImages = {};

        results.forEach((result) => {
          nextStats[result.missionId] = result.stats || null;
          nextTelemetry[result.missionId] = Array.isArray(result.telemetry)
            ? result.telemetry
            : [];
          nextImages[result.missionId] = Array.isArray(result.images)
            ? result.images
            : [];
        });

        setMissions(missionItems);
        setStatsById(nextStats);
        setTelemetryById(nextTelemetry);
        setImagesById(nextImages);
        setActiveMissionId((current) =>
          current &&
          missionItems.some((mission) => mission.mission_id === current)
            ? current
            : missionItems[0]?.mission_id || null,
        );
      } catch (error) {
        if (cancelled) return;
        setErrorText(
          error?.response?.data?.error ||
            error?.message ||
            "Failed to load analytics data.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [missionIds]);

  const activeMission = useMemo(
    () =>
      missions.find((mission) => mission.mission_id === activeMissionId) ||
      null,
    [missions, activeMissionId],
  );

  const profileTypes = useMemo(
    () => [
      ...new Set(
        missions.map((mission) => mission.profile_type).filter(Boolean),
      ),
    ],
    [missions],
  );

  const sameProfile = profileTypes.length <= 1;
  const profileType = sameProfile
    ? profileTypes[0] || activeMission?.profile_type || null
    : null;
  const profileMeta = getProfileMeta(profileType);

  const activeTelemetryRaw = activeMissionId
    ? telemetryById[activeMissionId] || []
    : [];
  const activeStats = activeMissionId ? statsById[activeMissionId] : null;
  const activeImages = activeMissionId ? imagesById[activeMissionId] || [] : [];

  const activeTelemetrySliced = useMemo(
    () => sliceByRange(activeTelemetryRaw, rangePreset),
    [activeTelemetryRaw, rangePreset],
  );

  const activeTelemetryFiltered = useMemo(
    () => applyGpsFilter(activeTelemetrySliced, gpsFilter),
    [activeTelemetrySliced, gpsFilter],
  );

  const activeTelemetrySmoothed = useMemo(
    () => smoothMetric(activeTelemetryFiltered, metric, smoothing),
    [activeTelemetryFiltered, metric, smoothing],
  );

  const trendSeries = useMemo(() => {
    return missions.map((mission, index) => {
      const rows = telemetryById[mission.mission_id] || [];
      const ranged = sliceByRange(rows, rangePreset);
      const filtered = applyGpsFilter(ranged, gpsFilter);
      const smoothed = smoothMetric(filtered, metric, smoothing);

      return {
        id: mission.mission_id,
        label: mission.mission_name || mission.mission_id,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        points: buildMetricSeries(smoothed, metric, compareMode),
      };
    });
  }, [
    missions,
    telemetryById,
    rangePreset,
    gpsFilter,
    metric,
    smoothing,
    compareMode,
  ]);

  const activeTrendSummary = useMemo(
    () => computeTrendSummary(activeTelemetrySmoothed, metric),
    [activeTelemetrySmoothed, metric],
  );

  const activeGpsQuality = useMemo(
    () => computeGpsQuality(activeTelemetryRaw),
    [activeTelemetryRaw],
  );

  const gasTelemetryBase = useMemo(
    () => sliceByRange(activeTelemetryRaw, rangePreset),
    [activeTelemetryRaw, rangePreset],
  );

  const gasTrendSummary = useMemo(
    () => computeTrendSummary(gasTelemetryBase, "gas_ohms"),
    [gasTelemetryBase],
  );

  const airAnomalies = useMemo(
    () => computeAirAnomalies(gasTelemetryBase),
    [gasTelemetryBase],
  );

  const baselineComparison = useMemo(
    () => computeBaselineComparison(activeMission, gasTrendSummary),
    [activeMission, gasTrendSummary],
  );

  const densityCells = useMemo(() => {
    const cellMeters =
      activeMission?.profile_type === "car"
        ? 40
        : activeMission?.profile_type === "bicycle"
          ? 30
          : activeMission?.profile_type === "drone"
            ? 25
            : 20;

    return computeDensityCells(activeTelemetryRaw, cellMeters);
  }, [activeMission, activeTelemetryRaw]);

  const movementStats = useMemo(
    () =>
      computeMovementStats(
        activeTelemetryRaw,
        activeMission?.profile_type === "car" ? 1.2 : 0.9,
      ),
    [activeMission, activeTelemetryRaw],
  );

  const staticStability = useMemo(
    () => computeStaticStability(activeTelemetrySliced),
    [activeTelemetrySliced],
  );

  const compareOverview = useMemo(() => {
    if (missions.length === 0) return null;

    const samples = missions.reduce(
      (acc, mission) =>
        acc + Number(statsById[mission.mission_id]?.samples || 0),
      0,
    );

    const durations = missions
      .map((mission) => computeMissionDuration(mission))
      .filter((value) => Number.isFinite(value));

    return {
      samples,
      totalDurationS: durations.reduce((acc, value) => acc + value, 0),
    };
  }, [missions, statsById]);

  const denseTop = useMemo(() => densityCells.slice(0, 5), [densityCells]);

  const carDenseGasComparison = useMemo(() => {
    if (activeMission?.profile_type !== "car" || densityCells.length === 0) {
      return null;
    }

    const valid = activeTelemetryRaw.filter(
      (point) => isFiniteNumber(point?.gas_ohms) && isValidGpsPoint(point),
    );
    if (valid.length === 0) return null;

    const refLat = Math.min(...valid.map((point) => Number(point.lat)));
    const refLon = Math.min(...valid.map((point) => Number(point.lon)));
    const denseSet = buildDenseCellLookup(densityCells, 4);

    const denseValues = [];
    const movingValues = [];

    valid.forEach((point) => {
      const key = computePointCellKey(point, refLat, refLon, 40);
      if (key && denseSet.has(key)) {
        denseValues.push(Number(point.gas_ohms));
      } else {
        movingValues.push(Number(point.gas_ohms));
      }
    });

    const denseAvg =
      denseValues.length > 0
        ? denseValues.reduce((acc, value) => acc + value, 0) /
          denseValues.length
        : null;

    const movingAvg =
      movingValues.length > 0
        ? movingValues.reduce((acc, value) => acc + value, 0) /
          movingValues.length
        : null;

    return { denseAvg, movingAvg };
  }, [activeMission, densityCells, activeTelemetryRaw]);

  const droneAltitudeSeries = useMemo(() => {
    if (activeMission?.profile_type !== "drone") return [];

    const rows = activeTelemetrySliced.filter((point) =>
      isFiniteNumber(point?.alt_m),
    );

    return [
      {
        id: "altitude",
        label: "Altitude",
        color: "#2563eb",
        points: buildMetricSeries(rows, "alt_m", "single"),
      },
    ];
  }, [activeMission, activeTelemetrySliced]);

  const bicycleDistanceSeries = useMemo(() => {
    if (activeMission?.profile_type !== "bicycle") return [];

    const rows = smoothMetric(activeTelemetrySliced, metric, smoothing);

    return [
      {
        id: "distance",
        label: getMetricMeta(metric).label,
        color: "#2563eb",
        points: buildDistanceSeries(rows, metric),
      },
    ];
  }, [activeMission, activeTelemetrySliced, metric, smoothing]);

  if (!missionIds.length) {
    return (
      <EmptyState
        title="No mission selected"
        description="Open one mission or select multiple missions from the Missions page and choose Analyze."
      />
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  if (errorText) {
    return (
      <SectionCard
        title="Analytics"
        description="The page could not be loaded."
        icon={FiAlertTriangle}
        right={
          <button
            type="button"
            className="btn btn-sm btn-primary rounded-xl"
            onClick={() => window.location.reload()}
          >
            <FiRefreshCw />
            Retry
          </button>
        }
      >
        <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-4 text-sm text-error">
          {errorText}
        </div>
      </SectionCard>
    );
  }

  if (!activeMission) {
    return (
      <EmptyState
        title="No analytics data available"
        description="The selected mission could not be resolved from the database."
      />
    );
  }

  const ActiveProfileIcon = profileMeta?.Icon || FiCpu;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Mission Analytics"
        description="Time-based trends, air quality indicators, density analysis and profile-specific interpretation."
        icon={FiActivity}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">
              {missions.length === 1
                ? "1 mission selected"
                : `${missions.length} missions selected`}
            </Badge>

            <Badge tone={sameProfile ? "success" : "warning"}>
              {sameProfile ? profileMeta.label : "Mixed profiles"}
            </Badge>

            <Badge>
              {activeMission.location_mode || "Location mode unknown"}
            </Badge>
            <Badge>
              {activeMission.has_gps ? "GPS available" : "GPS limited"}
            </Badge>
            <Badge>
              {activeMission.has_images ? "Images available" : "No images"}
            </Badge>
          </div>
        }
      >
        <div className="space-y-4">
          {missions.length > 1 ? (
            <MissionTabs
              missions={missions}
              activeMissionId={activeMissionId}
              onChange={setActiveMissionId}
            />
          ) : null}

          <div className="rounded-2xl border border-base-300 bg-base-200/50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <ActiveProfileIcon className="text-lg text-primary" />

              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {activeMission.mission_name || activeMission.mission_id}
                </div>
                <div className="text-xs text-base-content/60">
                  {profileMeta.description}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Started
                </div>
                <div className="mt-1 font-medium">
                  {formatEpoch(activeMission.started_at_epoch)}
                </div>
              </div>

              <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Ended
                </div>
                <div className="mt-1 font-medium">
                  {formatEpoch(activeMission.ended_at_epoch)}
                </div>
              </div>

              <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Status
                </div>
                <div className="mt-1 font-medium">
                  {activeMission.status || "Unknown"}
                </div>
              </div>

              <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Location
                </div>
                <div className="mt-1 font-medium">
                  {activeMission.location_name || "Unnamed"}
                </div>
              </div>
            </div>

            {!sameProfile ? (
              <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-3 text-sm text-warning">
                Advanced profile interpretation is shown only for missions with
                the same profile. Core trends and quality sections still work.
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <AnalyticsToolbar
        metric={metric}
        onMetricChange={setMetric}
        metricOptions={METRIC_OPTIONS.map((option) => ({
          value: option.value,
          label: `${option.label} (${option.unit})`,
        }))}
        rangePreset={rangePreset}
        onRangePresetChange={setRangePreset}
        rangeOptions={RANGE_OPTIONS}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
        compareOptions={COMPARE_OPTIONS}
        smoothing={smoothing}
        onSmoothingChange={setSmoothing}
        smoothingOptions={SMOOTH_OPTIONS}
        gpsFilter={gpsFilter}
        onGpsFilterChange={setGpsFilter}
        gpsFilterOptions={GPS_FILTER_OPTIONS}
      />

      <SectionCard
        title="Overview"
        description="Quick context for the active mission and the current selection."
        icon={FiCpu}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Duration"
            value={formatDurationSeconds(computeMissionDuration(activeMission))}
            hint={
              missions.length > 1
                ? `Selected set: ${formatDurationSeconds(compareOverview?.totalDurationS)}`
                : ""
            }
          />

          <StatCard
            label="Samples"
            value={String(activeStats?.samples || 0)}
            hint={
              missions.length > 1
                ? `Selected set: ${compareOverview?.samples || 0}`
                : ""
            }
          />

          <StatCard
            label="Profile"
            value={getProfileMeta(activeMission.profile_type).label}
            hint={activeMission.profile_label || ""}
          />

          <StatCard
            label="GPS quality"
            value={`${formatNumber(activeGpsQuality.goodPct, 0, "%")} good`}
            hint={`${activeGpsQuality.good}/${activeGpsQuality.total} points`}
            tone={activeGpsQuality.goodPct < 40 ? "warning" : "success"}
          />

          <StatCard
            label="Images"
            value={String(activeMission.image_count || 0)}
            hint={activeMission.has_images ? "Available" : "Not recorded"}
          />

          <StatCard
            label="Location mode"
            value={activeMission.location_mode || "Unknown"}
            hint={activeMission.location_name || "No saved location name"}
          />

          <StatCard
            label="Avg temperature"
            value={formatNumber(activeStats?.temp_c?.avg, 2, " °C")}
            hint={`Min ${formatNumber(activeStats?.temp_c?.min, 1)} · Max ${formatNumber(activeStats?.temp_c?.max, 1)}`}
          />

          <StatCard
            label="Avg humidity"
            value={formatNumber(activeStats?.hum_pct?.avg, 2, " %")}
            hint={`Min ${formatNumber(activeStats?.hum_pct?.min, 1)} · Max ${formatNumber(activeStats?.hum_pct?.max, 1)}`}
          />

          <StatCard
            label="Avg pressure"
            value={formatNumber(activeStats?.press_hpa?.avg, 2, " hPa")}
            hint={`Min ${formatNumber(activeStats?.press_hpa?.min, 1)} · Max ${formatNumber(activeStats?.press_hpa?.max, 1)}`}
          />

          <StatCard
            label="Avg gas resistance"
            value={formatNumber(activeStats?.gas_ohms?.avg, 0, " Ω")}
            hint={`Min ${formatNumber(activeStats?.gas_ohms?.min, 0)} · Max ${formatNumber(activeStats?.gas_ohms?.max, 0)}`}
          />
        </div>
      </SectionCard>

      <AnalyticsTrendsSection
        metric={metric}
        onMetricChange={setMetric}
        metricOptions={METRIC_OPTIONS}
        metricMeta={getMetricMeta(metric)}
        compareMode={compareMode}
        trendSeries={trendSeries}
        activeTrendSummary={activeTrendSummary}
      />

      {sameProfile ? (
        <AnalyticsProfileSection
          sameProfile={sameProfile}
          activeMission={activeMission}
          profileMeta={profileMeta}
          activeTelemetrySliced={activeTelemetrySliced}
          activeTelemetryRaw={activeTelemetryRaw}
          activeImages={activeImages}
          activeGpsQuality={activeGpsQuality}
          movementStats={movementStats}
          denseTop={denseTop}
          carDenseGasComparison={carDenseGasComparison}
          staticStability={staticStability}
          metric={metric}
          getMetricMeta={getMetricMeta}
          droneAltitudeSeries={droneAltitudeSeries}
          bicycleDistanceSeries={bicycleDistanceSeries}
          SimpleLineChart={AnalyticsSimpleLineChart}
          DroneImagesPanel={null}
        />
      ) : null}

      {sameProfile ? (
        <AnalyticsInsightsSection
          missionId={activeMission.mission_id}
          activeMission={activeMission}
          telemetry={activeTelemetryRaw}
          images={activeImages}
          airAnomalies={airAnomalies}
          baselineComparison={baselineComparison}
          movementStats={movementStats}
          densityCells={densityCells}
          denseTop={denseTop}
          carDenseGasComparison={carDenseGasComparison}
          DensityMiniMap={DensityMiniMap}
        />
      ) : null}
    </div>
  );
}
