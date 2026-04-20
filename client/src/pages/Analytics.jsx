import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiAlertTriangle, FiCpu, FiMapPin, FiRefreshCw } from "react-icons/fi";
import { TbDrone } from "react-icons/tb";
import { MdDirectionsBike } from "react-icons/md";
import { FaCarSide } from "react-icons/fa";

import AnalyticsEmptyState from "../components/analytics/AnalyticsEmptyState";
import AnalyticsHeaderSingle from "../components/analytics/headers/AnalyticsHeaderSingle";
import AnalyticsHeaderMulti from "../components/analytics/headers/AnalyticsHeaderMulti";
import AnalyticsCompatibilityAlerts from "../components/analytics/AnalyticsCompatibilityAlerts";
import AnalyticsTrendsSingle from "../components/analytics/trends/AnalyticsTrendsSingle";
import AnalyticsTrendsMulti from "../components/analytics/trends/AnalyticsTrendsMulti";
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
  computeStaticStability,
  computeTrendSummary,
  formatDurationSeconds,
  formatEpoch,
  formatNumber,
  isFiniteNumber,
  isValidGpsPoint,
  sliceByRange,
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

  return [
    ...new Set(
      csv
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
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
    description: "Mission analytics overview",
  };
}

function normalizeTelemetry(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      ...row,
      ts_epoch: Number(row?.ts_epoch),
      lat: row?.lat != null ? Number(row.lat) : null,
      lon: row?.lon != null ? Number(row.lon) : null,
      alt_m: row?.alt_m != null ? Number(row.alt_m) : null,
      fix_quality: row?.fix_quality != null ? Number(row.fix_quality) : null,
      satellites: row?.satellites != null ? Number(row.satellites) : null,
      hdop: row?.hdop != null ? Number(row.hdop) : null,
      temp_c: row?.temp_c != null ? Number(row.temp_c) : null,
      hum_pct: row?.hum_pct != null ? Number(row.hum_pct) : null,
      press_hpa: row?.press_hpa != null ? Number(row.press_hpa) : null,
      gas_ohms: row?.gas_ohms != null ? Number(row.gas_ohms) : null,
    }))
    .filter((row) => Number.isFinite(row.ts_epoch));
}

function buildLocationLabel(mission) {
  if (!mission) return "Unknown location";

  const explicit = String(mission.location_name || "").trim();
  if (explicit) return explicit;

  const lat = mission?.start?.lat;
  const lon = mission?.start?.lon;

  if (isFiniteNumber(lat) && isFiniteNumber(lon)) {
    return `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`;
  }

  if (mission.location_mode === "fixed") return "Fixed point";
  if (mission.location_mode === "gps") return "GPS";
  return "Unknown location";
}

function buildOverview(mission, telemetry = [], stats = null) {
  if (!mission) return null;

  const gpsValidCount = telemetry.filter((row) => isValidGpsPoint(row)).length;
  const gpsGoodCount = telemetry.filter(
    (row) =>
      isValidGpsPoint(row) &&
      Number(row.fix_quality || 0) > 0 &&
      Number(row.hdop || 99) <= 4,
  ).length;

  return {
    missionId: mission.mission_id,
    missionName: mission.mission_name || mission.mission_id,
    statusText: mission.status || "Unknown",
    startedAtText: formatEpoch(mission.started_at_epoch),
    endedAtText: formatEpoch(mission.ended_at_epoch),
    durationText: formatDurationSeconds(
      computeMissionDuration(mission, telemetry),
    ),
    locationText: buildLocationLabel(mission),
    telemetryCount:
      Number(stats?.samples) ||
      telemetry.length ||
      mission.telemetry_count ||
      0,
    gpsText: `${gpsGoodCount}/${gpsValidCount} good GPS samples`,
    hasImages: Boolean(mission.has_images),
    locationSourceText: mission.location_mode || "unknown",
  };
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildTrendSeriesForMission(
  mission,
  telemetry,
  metric,
  color = "#2563eb",
  xMode = "time", // time | progress | distance
) {
  if (!mission || !Array.isArray(telemetry) || telemetry.length === 0) {
    return null;
  }

  let points = buildMetricSeries(telemetry, metric);

  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  points = points.map((point, index) => {
    const src = telemetry[index] || {};
    return {
      ...point,
      lat: src.lat,
      lon: src.lon,
      alt_m: src.alt_m,
      fix_quality: src.fix_quality,
      satellites: src.satellites,
      hdop: src.hdop,
      ts_epoch: src.ts_epoch,
    };
  });

  if (xMode === "time") {
    const startX = Number(points[0]?.x || 0);
    points = points.map((point) => ({
      ...point,
      x: Number(point.x || 0) - startX,
    }));
  }

  if (xMode === "progress") {
    const firstTs = Number(points[0]?.ts_epoch || 0);
    const lastTs = Number(points[points.length - 1]?.ts_epoch || firstTs);
    const span = lastTs - firstTs;

    points = points.map((point, index) => {
      let progress = 0;

      if (span > 0 && Number.isFinite(Number(point.ts_epoch))) {
        progress = (Number(point.ts_epoch) - firstTs) / span;
      } else if (points.length > 1) {
        progress = index / (points.length - 1);
      }

      return {
        ...point,
        x: progress * 100,
      };
    });
  }

  if (xMode === "distance") {
    let cumulative = 0;

    points = points.map((point, index) => {
      if (index === 0) {
        return { ...point, x: 0 };
      }

      const prev = points[index - 1];

      const canMeasure =
        Number.isFinite(Number(prev?.lat)) &&
        Number.isFinite(Number(prev?.lon)) &&
        Number.isFinite(Number(point?.lat)) &&
        Number.isFinite(Number(point?.lon));

      if (canMeasure) {
        cumulative += haversineMeters(
          Number(prev.lat),
          Number(prev.lon),
          Number(point.lat),
          Number(point.lon),
        );
      }

      return {
        ...point,
        x: cumulative,
      };
    });
  }

  return {
    id: mission.mission_id,
    label: mission.mission_name || mission.mission_id,
    shortLabel:
      mission.mission_name ||
      String(mission.mission_id || "Mission").slice(0, 18),
    color,
    points,
  };
}

function LoadingState() {
  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="flex items-center gap-3 text-sm text-base-content/60">
        <span className="loading loading-spinner loading-sm" />
        Loading analytics...
      </div>
    </section>
  );
}

function ErrorState({ errorText, onRetry }) {
  return (
    <section className="rounded-[2rem] border border-error/30 bg-error/10 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <FiAlertTriangle className="mt-0.5 text-error" />
        <div className="min-w-0">
          <div className="text-base font-semibold text-error">
            Analytics unavailable
          </div>
          <div className="mt-1 text-sm text-base-content/70">{errorText}</div>
          <button
            type="button"
            className="btn btn-sm rounded-xl mt-4"
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

function EmptyState({
  title = "No analytics data available",
  description = "The selected missions could not be loaded or no compatible data is available yet.",
}) {
  return <AnalyticsEmptyState title={title} description={description} />;
}

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const missionIds = useMemo(
    () => parseMissionIds(searchParams),
    [searchParams],
  );

  const [missions, setMissions] = useState([]);
  const [telemetryMap, setTelemetryMap] = useState({});
  const [statsMap, setStatsMap] = useState({});

  const [metric, setMetric] = useState("temp_c");
  const [rangePreset, setRangePreset] = useState("full");
  const [gpsFilter, setGpsFilter] = useState("all");

  const [activeMissionId, setActiveMissionId] = useState("");
  const [singleHeaderExpanded, setSingleHeaderExpanded] = useState(true);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [multiXAxisMode, setMultiXAxisMode] = useState("time");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!missionIds.length) {
        setMissions([]);
        setTelemetryMap({});
        setStatsMap({});
        setActiveMissionId("");
        setErrorText("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorText("");

      try {
        const [missionResults, statsResults, telemetryResults] =
          await Promise.all([
            Promise.all(missionIds.map((id) => fetchAnalyticsMission(id))),
            Promise.all(
              missionIds.map((id) =>
                fetchAnalyticsMissionStats(id).catch(() => null),
              ),
            ),
            Promise.all(
              missionIds.map((id) =>
                fetchAnalyticsMissionTelemetry(id).catch(() => []),
              ),
            ),
          ]);

        if (cancelled) return;

        const loadedMissions = missionResults.filter(Boolean);
        const nextTelemetryMap = {};
        const nextStatsMap = {};

        missionIds.forEach((id, index) => {
          nextTelemetryMap[id] = normalizeTelemetry(
            telemetryResults[index] || [],
          );
          nextStatsMap[id] = statsResults[index] || null;
        });

        setMissions(loadedMissions);
        setTelemetryMap(nextTelemetryMap);
        setStatsMap(nextStatsMap);

        if (loadedMissions.length > 0) {
          setActiveMissionId((prev) => {
            if (
              prev &&
              loadedMissions.some((mission) => mission.mission_id === prev)
            ) {
              return prev;
            }
            return loadedMissions[0].mission_id;
          });
        } else {
          setActiveMissionId("");
        }
      } catch (error) {
        if (cancelled) return;
        setErrorText(error?.message || "Failed to load analytics data.");
        setMissions([]);
        setTelemetryMap({});
        setStatsMap({});
        setActiveMissionId("");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [missionIds, reloadKey]);

  const isSingleMission = missions.length === 1;
  const isMultiMission = missions.length > 1;

  const activeMission = useMemo(() => {
    if (isSingleMission) return missions[0] || null;
    return (
      missions.find((mission) => mission.mission_id === activeMissionId) ||
      missions[0] ||
      null
    );
  }, [missions, activeMissionId, isSingleMission]);

  const profileType = activeMission?.profile_type || null;
  const activeProfileMeta = useMemo(
    () => getProfileMeta(profileType),
    [profileType],
  );

  const allProfileTypes = useMemo(
    () => [
      ...new Set(
        missions.map((mission) => mission.profile_type).filter(Boolean),
      ),
    ],
    [missions],
  );

  const sameProfile = allProfileTypes.length <= 1;

  const allLocationLabels = useMemo(
    () => [...new Set(missions.map((mission) => buildLocationLabel(mission)))],
    [missions],
  );

  const sameLocation = allLocationLabels.length <= 1;

  const activeTelemetryRaw = activeMission
    ? telemetryMap[activeMission.mission_id] || []
    : [];

  const activeTelemetryFiltered = useMemo(() => {
    const sliced = sliceByRange(activeTelemetryRaw, rangePreset);
    return applyGpsFilter(sliced, gpsFilter);
  }, [activeTelemetryRaw, rangePreset, gpsFilter]);

  const activeStats = activeMission
    ? statsMap[activeMission.mission_id] || null
    : null;

  const singleMissionOverview = useMemo(
    () => buildOverview(activeMission, activeTelemetryRaw, activeStats),
    [activeMission, activeTelemetryRaw, activeStats],
  );

  const singleTrendSeries = useMemo(() => {
    if (!activeMission) return [];

    const series = buildTrendSeriesForMission(
      activeMission,
      activeTelemetryFiltered,
      metric,
      "#2563eb",
      false,
    );

    return series ? [series] : [];
  }, [activeMission, activeTelemetryFiltered, metric]);

  const multiMissionSeries = useMemo(() => {
    return missions
      .map((mission, index) => {
        const raw = telemetryMap[mission.mission_id] || [];
        const sliced = sliceByRange(raw, rangePreset);
        const filtered = applyGpsFilter(sliced, gpsFilter);

        return buildTrendSeriesForMission(
          mission,
          filtered,
          metric,
          SERIES_COLORS[index % SERIES_COLORS.length],
          multiXAxisMode,
        );
      })
      .filter(Boolean);
  }, [missions, telemetryMap, rangePreset, gpsFilter, metric, multiXAxisMode]);

  const trendSummary = useMemo(
    () => computeTrendSummary(activeTelemetryFiltered, metric),
    [activeTelemetryFiltered, metric],
  );

  const gpsQuality = useMemo(
    () => computeGpsQuality(activeTelemetryFiltered),
    [activeTelemetryFiltered],
  );

  const movementStats = useMemo(
    () => computeMovementStats(activeTelemetryFiltered),
    [activeTelemetryFiltered],
  );

  const densityCells = useMemo(
    () => computeDensityCells(activeTelemetryFiltered),
    [activeTelemetryFiltered],
  );

  const densityLookup = useMemo(
    () => buildDenseCellLookup(densityCells),
    [densityCells],
  );

  const densityMapPoints = useMemo(
    () => buildDensityMapPoints(activeTelemetryFiltered, densityLookup),
    [activeTelemetryFiltered, densityLookup],
  );

  const distanceSeries = useMemo(
    () => buildDistanceSeries(activeTelemetryFiltered),
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

  const airAnomalies = useMemo(
    () => computeAirAnomalies(activeTelemetryFiltered, metric),
    [activeTelemetryFiltered, metric],
  );

  const baselineComparison = useMemo(
    () => computeBaselineComparison(activeTelemetryFiltered, metric),
    [activeTelemetryFiltered, metric],
  );

  const canShowSpecializedSection = sameProfile && Boolean(profileType);

  const multiActiveProfileMeta = useMemo(() => {
    if (!sameProfile) return null;
    return getProfileMeta(profileType);
  }, [sameProfile, profileType]);

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
          onToggleExpanded={() => setSingleHeaderExpanded((prev) => !prev)}
          overview={singleMissionOverview}
        />
      ) : (
        <AnalyticsHeaderMulti
          missions={missions}
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
          trendSeries={singleTrendSeries}
          trendSummary={trendSummary}
          metric={metric}
          onMetricChange={setMetric}
          range={rangePreset}
          onRangeChange={setRangePreset}
          gpsFilter={gpsFilter}
          onGpsFilterChange={setGpsFilter}
          metricOptions={METRIC_OPTIONS}
          rangeOptions={RANGE_OPTIONS}
          gpsFilterOptions={GPS_FILTER_OPTIONS}
        />
      ) : (
        <AnalyticsTrendsMulti
          missions={missions}
          trendSeries={multiMissionSeries}
          metric={metric}
          onMetricChange={setMetric}
          range={rangePreset}
          onRangeChange={setRangePreset}
          gpsFilter={gpsFilter}
          onGpsFilterChange={setGpsFilter}
          metricOptions={METRIC_OPTIONS}
          rangeOptions={RANGE_OPTIONS}
          gpsFilterOptions={GPS_FILTER_OPTIONS}
        />
      )}

      <AnalyticsInsightsSection
        mission={activeMission}
        metric={metric}
        metricMeta={
          METRIC_OPTIONS.find((item) => item.value === metric) ||
          METRIC_OPTIONS[0]
        }
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
          profileMeta={
            isSingleMission ? activeProfileMeta : multiActiveProfileMeta
          }
          mission={activeMission}
          missions={missions}
          metric={metric}
          metricMeta={
            METRIC_OPTIONS.find((item) => item.value === metric) ||
            METRIC_OPTIONS[0]
          }
          telemetry={activeTelemetryFiltered}
          telemetryMap={telemetryMap}
          sameLocation={sameLocation}
          rangePreset={rangePreset}
          gpsFilter={gpsFilter}
          trendSummary={trendSummary}
          movementStats={movementStats}
          densityMapPoints={densityMapPoints}
          distanceSeries={distanceSeries}
          staticStability={staticStability}
          formatNumber={formatNumber}
          AnalyticsSimpleLineChart={AnalyticsSimpleLineChart}
        />
      ) : null}
    </div>
  );
}
