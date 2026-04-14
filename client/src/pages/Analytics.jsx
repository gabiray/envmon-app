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

import AnalyticsEmptyState from "../components/analytics/AnalyticsEmptyState";
import AnalyticsHeaderSingle from "../components/analytics/AnalyticsHeaderSingle";
import AnalyticsHeaderMulti from "../components/analytics/AnalyticsHeaderMulti";
import AnalyticsCompatibilityAlerts from "../components/analytics/AnalyticsCompatibilityAlerts";
import AnalyticsTrendsSingle from "../components/analytics/AnalyticsTrendsSingle";
import AnalyticsTrendsMulti from "../components/analytics/AnalyticsTrendsMulti";
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

const SERIES_COLORS = ["#2563eb", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6"];

function parseMissionIds(searchParams) {
  const multiple = searchParams.getAll("missionId").filter(Boolean);

  if (multiple.length > 0) {
    return [...new Set(multiple)];
  }

  const single = searchParams.get("missionId");
  if (single) return [single];

  const csv = searchParams.get("missionIds");
  if (!csv) return [];

  return [...new Set(csv.split(",").map((item) => item.trim()).filter(Boolean))];
}

function getProfileMeta(type) {
  if (type === "drone") {
    return {
      label: "Drone",
      Icon: TbDrone,
      description: "Altitude-aware environmental flight analysis",
    };
  }

  if (type === "bicycle") {
    return {
      label: "Bicycle",
      Icon: MdDirectionsBike,
      description: "Route exposure and movement-based analysis",
    };
  }

  if (type === "car") {
    return {
      label: "Car",
      Icon: FaCarSide,
      description: "Traffic-oriented mobility and environmental analysis",
    };
  }

  if (type === "static") {
    return {
      label: "Static",
      Icon: FiMapPin,
      description: "Stationary monitoring and stability analysis",
    };
  }

  return {
    label: "Unknown",
    Icon: FiCpu,
    description: "Mission analysis",
  };
}

function getMetricMeta(metric) {
  return (
    METRIC_OPTIONS.find((option) => option.value === metric) || METRIC_OPTIONS[0]
  );
}

function buildLocationKey(mission) {
  if (!mission) return null;

  if (mission.location_name) {
    return `name:${String(mission.location_name).trim().toLowerCase()}`;
  }

  const lat = mission?.start?.lat;
  const lon = mission?.start?.lon;

  if (isFiniteNumber(lat) && isFiniteNumber(lon)) {
    return `coord:${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
  }

  return null;
}

function buildLocationLabel(mission) {
  if (!mission) return "Unknown location";

  if (mission.location_name) return mission.location_name;

  const lat = mission?.start?.lat;
  const lon = mission?.start?.lon;

  if (isFiniteNumber(lat) && isFiniteNumber(lon)) {
    return `${formatNumber(lat, 5)}, ${formatNumber(lon, 5)}`;
  }

  return "Unknown location";
}

function buildMissionOverview(mission) {
  if (!mission) return null;

  const durationSeconds = computeMissionDuration(
    mission.started_at_epoch,
    mission.ended_at_epoch,
  );

  const locationMode = String(mission.location_mode || "").trim().toLowerCase();
  const locationSourceText =
    locationMode === "gps"
      ? "Location source: GPS"
      : locationMode === "fixed"
        ? "Location source: Fixed point"
        : locationMode === "none"
          ? "Location source: None"
          : "Location source unknown";

  return {
    startedText: formatEpoch(mission.started_at_epoch),
    endedText: formatEpoch(mission.ended_at_epoch),
    durationText: formatDurationSeconds(durationSeconds),
    statusText: mission.status || "Unknown",
    locationText: buildLocationLabel(mission),
    locationSourceText,
    gpsText: mission.has_gps ? "GPS track available" : "No usable GPS track",
    hasImages: Boolean(mission.has_images),
  };
}

function EmptyState({ title, description }) {
  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="p-8 sm:p-10">
        <div className="flex max-w-xl flex-col items-center justify-center gap-4 text-center mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-base-300 bg-base-200 text-base-content/55">
            <FiActivity className="text-2xl" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-base-content">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-base-content/60">
              {description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="p-8 sm:p-10">
        <div className="flex items-center justify-center gap-3 text-sm text-base-content/60">
          <span className="loading loading-spinner loading-sm" />
          Loading analytics...
        </div>
      </div>
    </section>
  );
}

function ErrorState({ errorText, onRetry }) {
  return (
    <section className="rounded-[2rem] border border-error/30 bg-error/10 shadow-sm">
      <div className="p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-error">
              <FiAlertTriangle />
              <h2 className="text-base font-semibold">Analytics unavailable</h2>
            </div>

            <p className="mt-2 text-sm text-base-content/75">{errorText}</p>
          </div>

          <button
            type="button"
            className="btn btn-sm rounded-xl"
            onClick={onRetry}
          >
            <FiRefreshCw />
            Retry
          </button>
        </div>
      </div>
    </section>
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
  const [activeMissionId, setActiveMissionId] = useState(null);

  const [metric, setMetric] = useState("temp_c");
  const [rangePreset, setRangePreset] = useState("full");
  const [compareMode, setCompareMode] = useState("single");
  const [smoothing, setSmoothing] = useState("low");
  const [gpsFilter, setGpsFilter] = useState("valid");

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [singleHeaderExpanded, setSingleHeaderExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      if (!missionIds.length) {
        setMissions([]);
        setStatsById({});
        setTelemetryById({});
        setActiveMissionId(null);
        setLoading(false);
        setErrorText("");
        return;
      }

      setLoading(true);
      setErrorText("");

      try {
        const results = await Promise.all(
          missionIds.map(async (missionId) => {
            const [mission, stats, telemetry] = await Promise.all([
              fetchAnalyticsMission(missionId),
              fetchAnalyticsMissionStats(missionId),
              fetchAnalyticsMissionTelemetry(missionId),
            ]);

            return { missionId, mission, stats, telemetry };
          }),
        );

        if (cancelled) return;

        const missionItems = results
          .map((result) => result.mission)
          .filter(Boolean);

        const nextStats = {};
        const nextTelemetry = {};

        results.forEach((result) => {
          nextStats[result.missionId] = result.stats || null;
          nextTelemetry[result.missionId] = Array.isArray(result.telemetry)
            ? result.telemetry
            : [];
        });

        setMissions(missionItems);
        setStatsById(nextStats);
        setTelemetryById(nextTelemetry);
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
  }, [missionIds, reloadKey]);

  const isSingleMission = missions.length === 1;
  const isMultiMission = missions.length > 1;

  const activeMission = useMemo(
    () =>
      missions.find((mission) => mission.mission_id === activeMissionId) ||
      missions[0] ||
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

  const activeProfileMeta = useMemo(
    () => getProfileMeta(profileType),
    [profileType],
  );

  const locationKeys = useMemo(
    () => [...new Set(missions.map(buildLocationKey).filter(Boolean))],
    [missions],
  );

  const sameLocation = locationKeys.length <= 1;

  const activeTelemetryRaw = activeMissionId
    ? telemetryById[activeMissionId] || []
    : [];

  const activeStats = activeMissionId ? statsById[activeMissionId] : null;

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

  const singleMissionSeries = useMemo(() => {
    if (!activeMission) return [];

    return [
      {
        id: activeMission.mission_id,
        label: activeMission.mission_name || activeMission.mission_id,
        color: SERIES_COLORS[0],
        points: buildMetricSeries(activeTelemetrySmoothed, metric),
      },
    ];
  }, [activeMission, activeTelemetrySmoothed, metric]);

  const multiMissionSeries = useMemo(() => {
    return missions
      .map((mission, index) => {
        const rows = telemetryById[mission.mission_id] || [];
        const sliced = sliceByRange(rows, rangePreset);
        const filtered = applyGpsFilter(sliced, gpsFilter);
        const smoothed = smoothMetric(filtered, metric, smoothing);
        const points = buildMetricSeries(smoothed, metric);

        if (!points.length) return null;

        return {
          id: mission.mission_id,
          label: mission.mission_name || mission.mission_id,
          color: SERIES_COLORS[index % SERIES_COLORS.length],
          points:
            compareMode === "normalized"
              ? points.map((point, pointIndex, all) => {
                  const firstTs = all[0]?.x ?? 0;
                  return {
                    ...point,
                    x: point.x - firstTs,
                    originalX: point.x,
                    normalizedIndex: pointIndex,
                  };
                })
              : points,
        };
      })
      .filter(Boolean);
  }, [
    missions,
    telemetryById,
    rangePreset,
    gpsFilter,
    metric,
    smoothing,
    compareMode,
  ]);

  const trendSummary = useMemo(
    () => computeTrendSummary(activeTelemetrySmoothed, metric),
    [activeTelemetrySmoothed, metric],
  );

  const gpsQuality = useMemo(
    () => computeGpsQuality(activeTelemetryFiltered),
    [activeTelemetryFiltered],
  );

  const activeMetricMeta = getMetricMeta(metric);

  const movementStats = useMemo(
    () => computeMovementStats(activeTelemetryFiltered),
    [activeTelemetryFiltered],
  );

  const densityCells = useMemo(
    () => computeDensityCells(activeTelemetryFiltered),
    [activeTelemetryFiltered],
  );

  const denseCellLookup = useMemo(
    () => buildDenseCellLookup(densityCells),
    [densityCells],
  );

  const densityMapPoints = useMemo(
    () => buildDensityMapPoints(densityCells),
    [densityCells],
  );

  const distanceSeries = useMemo(
    () => buildDistanceSeries(activeTelemetryFiltered, metric),
    [activeTelemetryFiltered, metric],
  );

  const airAnomalies = useMemo(
    () => computeAirAnomalies(activeTelemetryFiltered),
    [activeTelemetryFiltered],
  );

  const baselineComparison = useMemo(
    () => computeBaselineComparison(activeTelemetryFiltered),
    [activeTelemetryFiltered],
  );

  const staticStability = useMemo(
    () => computeStaticStability(activeTelemetryFiltered),
    [activeTelemetryFiltered],
  );

  const altitudeSeries = useMemo(() => {
    if (activeMission?.profile_type !== "drone") return [];

    return [
      {
        id: "altitude",
        label: "Altitude",
        color: "#8b5cf6",
        points: activeTelemetryFiltered
          .filter((row) => isFiniteNumber(row?.alt_m))
          .map((row, index) => ({
            x: row.ts_epoch ?? index,
            y: Number(row.alt_m),
          })),
      },
    ];
  }, [activeMission, activeTelemetryFiltered]);

  const canShowSpecializedSection = sameProfile && Boolean(profileType);

  const singleMissionOverview = useMemo(
    () => buildMissionOverview(activeMission),
    [activeMission],
  );

  const multiActiveProfileMeta = useMemo(() => {
    if (!sameProfile) return null;
    return getProfileMeta(profileType);
  }, [sameProfile, profileType]);

  const pageTitle = isSingleMission ? "Mission Analytics" : "Mission Comparison";

  function handleRetry() {
    setReloadKey((prev) => prev + 1);
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!missionIds.length) {
    return <AnalyticsEmptyState />;
  }

  if (errorText) {
    return <ErrorState errorText={errorText} onRetry={handleRetry} />;
  }

  if (!missions.length) {
    return (
      <EmptyState
        title="No analytics data available"
        description="The selected missions could not be loaded or no compatible data is available yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      {isSingleMission ? (
        <AnalyticsHeaderSingle
          mission={activeMission}
          profileMeta={activeProfileMeta}
          expanded={singleHeaderExpanded}
          onToggleExpanded={() =>
            setSingleHeaderExpanded((prev) => !prev)
          }
          overview={singleMissionOverview}
        />
      ) : (
        <AnalyticsHeaderMulti
          missions={missions}
          activeMissionId={activeMissionId}
          onChangeActiveMissionId={setActiveMissionId}
          sameProfile={sameProfile}
          sameLocation={sameLocation}
          profileMeta={multiActiveProfileMeta}
        />
      )}

      <AnalyticsCompatibilityAlerts
        isMultiMission={isMultiMission}
        sameProfile={sameProfile}
        sameLocation={sameLocation}
      />

      {isSingleMission ? (
        <AnalyticsTrendsSingle
          mission={activeMission}
          trendSeries={singleMissionSeries}
          trendSummary={trendSummary}
          metric={metric}
          onMetricChange={setMetric}
          range={rangePreset}
          onRangeChange={setRangePreset}
          gpsFilter={gpsFilter}
          onGpsFilterChange={setGpsFilter}
          smoothing={smoothing}
          onSmoothingChange={setSmoothing}
          metricOptions={METRIC_OPTIONS}
          rangeOptions={RANGE_OPTIONS}
          gpsFilterOptions={GPS_FILTER_OPTIONS}
          smoothingOptions={SMOOTH_OPTIONS}
        />
      ) : (
        <AnalyticsTrendsMulti
          missions={missions}
          missionSeries={multiMissionSeries}
          metric={metric}
          onMetricChange={setMetric}
          compareMode={compareMode}
          onCompareModeChange={setCompareMode}
          smoothing={smoothing}
          onSmoothingChange={setSmoothing}
          range={rangePreset}
          onRangeChange={setRangePreset}
          gpsFilter={gpsFilter}
          onGpsFilterChange={setGpsFilter}
          metricOptions={METRIC_OPTIONS}
          compareOptions={COMPARE_OPTIONS}
          smoothingOptions={SMOOTH_OPTIONS}
          rangeOptions={RANGE_OPTIONS}
          gpsFilterOptions={GPS_FILTER_OPTIONS}
        />
      )}

      <AnalyticsInsightsSection
        mission={activeMission}
        metric={metric}
        metricMeta={activeMetricMeta}
        stats={activeStats}
        trendSummary={trendSummary}
        gpsQuality={gpsQuality}
        airAnomalies={airAnomalies}
        baselineComparison={baselineComparison}
        movementStats={movementStats}
        locationLabel={buildLocationLabel(activeMission)}
      />

      {canShowSpecializedSection ? (
        <AnalyticsProfileSection
          profileType={profileType}
          profileMeta={activeProfileMeta}
          mission={activeMission}
          metric={metric}
          metricMeta={activeMetricMeta}
          telemetry={activeTelemetryFiltered}
          trendSummary={trendSummary}
          movementStats={movementStats}
          densityCells={densityCells}
          denseCellLookup={denseCellLookup}
          densityMapPoints={densityMapPoints}
          computePointCellKey={computePointCellKey}
          distanceSeries={distanceSeries}
          altitudeSeries={altitudeSeries}
          staticStability={staticStability}
          isValidGpsPoint={isValidGpsPoint}
          isFiniteNumber={isFiniteNumber}
          formatNumber={formatNumber}
          AnalyticsSimpleLineChart={AnalyticsSimpleLineChart}
        />
      ) : null}

      {!canShowSpecializedSection && isMultiMission ? (
        <section className="rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl border border-base-300 bg-base-200 p-2 text-base-content/60">
                <FiCpu className="text-base" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-semibold text-base-content">
                  Profile-specific analysis hidden
                </h2>
                <p className="mt-1 text-sm leading-6 text-base-content/60">
                  Specialized sections are shown only when all selected missions
                  share the same operating profile.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
