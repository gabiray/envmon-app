import {
  applyGpsFilter,
  buildDenseCellLookup,
  buildDensityMapPoints,
  computeDensityCells,
  computeMovementStats,
  computeStaticStability,
  isFiniteNumber,
  sliceByRange,
} from "./analyticsUtils";

const DEFAULT_SERIES_COLORS = [
  "#2563eb",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
];

function getMissionColor(index) {
  return DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length];
}

function getFilteredTelemetryForMission(telemetryMap, missionId, rangePreset, gpsFilter) {
  const raw = Array.isArray(telemetryMap?.[missionId]) ? telemetryMap[missionId] : [];
  const sliced = sliceByRange(raw, rangePreset);
  return applyGpsFilter(sliced, gpsFilter);
}

function buildAltitudeSeries(mission, telemetry = [], color = "#8b5cf6") {
  const points = telemetry
    .filter((row) => isFiniteNumber(row?.alt_m))
    .map((row, index) => ({
      x: row.ts_epoch ?? index,
      y: Number(row.alt_m),
      ts_epoch: row.ts_epoch ?? null,
      lat: row.lat ?? null,
      lon: row.lon ?? null,
      alt_m: row.alt_m ?? null,
    }));

  if (!points.length) return null;

  return {
    id: `altitude-${mission.mission_id}`,
    label: mission.mission_name || mission.mission_id,
    shortLabel: mission.mission_name || mission.mission_id,
    color,
    points,
  };
}

function summarizeAltitude(telemetry = []) {
  const values = telemetry
    .map((row) => Number(row?.alt_m))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return {
      minAltitude: null,
      maxAltitude: null,
      avgAltitude: null,
      altitudeSpread: null,
      sampleCount: 0,
    };
  }

  const minAltitude = Math.min(...values);
  const maxAltitude = Math.max(...values);
  const avgAltitude = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    minAltitude,
    maxAltitude,
    avgAltitude,
    altitudeSpread: maxAltitude - minAltitude,
    sampleCount: values.length,
  };
}

function summarizeVehicleMission(telemetry = []) {
  const movementStats = computeMovementStats(telemetry);
  const densityCells = computeDensityCells(telemetry);
  const densityLookup = buildDenseCellLookup(densityCells);
  const densityMapPoints = buildDensityMapPoints(telemetry, densityLookup);

  return {
    movementStats,
    densityMapPoints: Array.isArray(densityMapPoints) ? densityMapPoints : [],
  };
}

function clusterSharedDenseZones(zoneItems = [], precision = 3) {
  const grouped = new Map();

  zoneItems.forEach((item) => {
    const lat = Number(item?.lat);
    const lon = Number(item?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const key = `${lat.toFixed(precision)}:${lon.toFixed(precision)}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        lat,
        lon,
        samples: 0,
        missionCount: 0,
        densityScoreSum: 0,
        gasAvgSum: 0,
        gasAvgCount: 0,
        missionIds: new Set(),
      });
    }

    const bucket = grouped.get(key);

    bucket.samples += Number(item?.samples ?? item?.count ?? 0) || 0;
    bucket.densityScoreSum += Number(item?.densityScore ?? item?.score ?? 0) || 0;

    const gasAvg = Number(item?.gasAvg);
    if (Number.isFinite(gasAvg)) {
      bucket.gasAvgSum += gasAvg;
      bucket.gasAvgCount += 1;
    }

    const missionId = item?.missionId;
    if (missionId && !bucket.missionIds.has(missionId)) {
      bucket.missionIds.add(missionId);
      bucket.missionCount += 1;
    }
  });

  return Array.from(grouped.values())
    .map((item) => ({
      key: item.key,
      lat: item.lat,
      lon: item.lon,
      samples: item.samples,
      missionCount: item.missionCount,
      densityScore: item.missionCount > 0
        ? item.densityScoreSum / item.missionCount
        : 0,
      gasAvg: item.gasAvgCount > 0 ? item.gasAvgSum / item.gasAvgCount : null,
    }))
    .sort((a, b) => {
      if (b.missionCount !== a.missionCount) return b.missionCount - a.missionCount;
      return b.samples - a.samples;
    });
}

export function buildProfileMode({ missions = [], sameProfile = false, sameLocation = false, profileType = "" }) {
  if (!sameProfile || !profileType || !missions.length) return "hidden";
  if (missions.length === 1) return "single";
  return sameLocation ? "multi_same_location" : "multi_diff_location";
}

export function buildDroneProfileData({
  missions = [],
  telemetryMap = {},
  rangePreset = "full",
  gpsFilter = "all",
  sameProfile = false,
  sameLocation = false,
  profileType = "",
}) {
  const mode = buildProfileMode({
    missions,
    sameProfile,
    sameLocation,
    profileType,
  });

  if (mode === "hidden") return null;

  const perMission = missions.map((mission, index) => {
    const telemetry = getFilteredTelemetryForMission(
      telemetryMap,
      mission.mission_id,
      rangePreset,
      gpsFilter,
    );

    return {
      mission,
      telemetry,
      color: getMissionColor(index),
      summary: summarizeAltitude(telemetry),
      series: buildAltitudeSeries(mission, telemetry, getMissionColor(index)),
    };
  });

  const comparisonSeries = perMission.map((item) => item.series).filter(Boolean);

  return {
    mode,
    profileType: "drone",
    perMission,
    comparisonSeries,
  };
}

export function buildCarProfileData({
  missions = [],
  telemetryMap = {},
  rangePreset = "full",
  gpsFilter = "all",
  sameProfile = false,
  sameLocation = false,
  profileType = "",
}) {
  const mode = buildProfileMode({
    missions,
    sameProfile,
    sameLocation,
    profileType,
  });

  if (mode === "hidden") return null;

  const perMission = missions.map((mission, index) => {
    const telemetry = getFilteredTelemetryForMission(
      telemetryMap,
      mission.mission_id,
      rangePreset,
      gpsFilter,
    );

    const vehicle = summarizeVehicleMission(telemetry);

    return {
      mission,
      color: getMissionColor(index),
      telemetry,
      movementStats: vehicle.movementStats,
      densityMapPoints: vehicle.densityMapPoints
        .slice(0, 5)
        .map((item) => ({
          ...item,
          missionId: mission.mission_id,
          missionName: mission.mission_name || mission.mission_id,
        })),
    };
  });

  const allZones = perMission.flatMap((item) => item.densityMapPoints || []);
  const sharedZones = sameLocation ? clusterSharedDenseZones(allZones, 3).slice(0, 6) : [];

  return {
    mode,
    profileType: "car",
    perMission,
    sharedZones,
  };
}

export function buildBicycleProfileData(input) {
  const result = buildCarProfileData({
    ...input,
    profileType: "bicycle",
  });

  if (!result) return null;

  return {
    ...result,
    profileType: "bicycle",
  };
}

export function buildStaticProfileData({
  missions = [],
  telemetryMap = {},
  rangePreset = "full",
  gpsFilter = "all",
  sameProfile = false,
  sameLocation = false,
  profileType = "",
}) {
  const mode = buildProfileMode({
    missions,
    sameProfile,
    sameLocation,
    profileType,
  });

  if (mode === "hidden") return null;

  const perMission = missions.map((mission) => {
    const telemetry = getFilteredTelemetryForMission(
      telemetryMap,
      mission.mission_id,
      rangePreset,
      gpsFilter,
    );

    return {
      mission,
      telemetry,
      stability: computeStaticStability(telemetry),
    };
  });

  return {
    mode,
    profileType: "static",
    perMission,
  };
}
