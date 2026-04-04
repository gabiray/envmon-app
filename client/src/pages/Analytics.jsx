import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiActivity,
  FiAlertTriangle,
  FiClock,
  FiCpu,
  FiImage,
  FiLayers,
  FiMapPin,
  FiNavigation,
  FiRefreshCw,
} from "react-icons/fi";
import { TbDrone } from "react-icons/tb";
import { MdDirectionsBike } from "react-icons/md";
import { FaCarSide } from "react-icons/fa";

import {
  buildMissionImageUrl,
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

function formatEpoch(epoch) {
  if (!epoch) return "—";
  try {
    return new Date(epoch * 1000).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDurationSeconds(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "—";

  const total = Math.round(value);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatNumber(value, decimals = 2, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function getMetricMeta(metric) {
  return METRIC_OPTIONS.find((m) => m.value === metric) || METRIC_OPTIONS[0];
}

function isFiniteNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function isValidGpsPoint(point) {
  return (
    isFiniteNumber(point?.lat) &&
    isFiniteNumber(point?.lon) &&
    Number(point?.fix_quality || 0) > 0
  );
}

function isGoodGpsPoint(point) {
  return (
    isValidGpsPoint(point) &&
    Number(point?.satellites || 0) >= 4 &&
    Number(point?.hdop || 99.99) <= 4
  );
}

function applyGpsFilter(points, gpsFilter) {
  if (gpsFilter === "all") return points;
  if (gpsFilter === "valid") return points.filter(isValidGpsPoint);
  return points.filter(isGoodGpsPoint);
}

function sliceByRange(points, rangePreset) {
  if (!Array.isArray(points) || points.length <= 2 || rangePreset === "full") {
    return points;
  }

  const n = points.length;
  const first25End = Math.max(2, Math.floor(n * 0.25));
  const middleStart = Math.floor(n * 0.25);
  const middleEnd = Math.max(middleStart + 2, Math.ceil(n * 0.75));
  const last25Start = Math.max(0, Math.floor(n * 0.75));

  if (rangePreset === "first25") return points.slice(0, first25End);
  if (rangePreset === "middle50") return points.slice(middleStart, middleEnd);
  if (rangePreset === "last25") return points.slice(last25Start);

  return points;
}

function smoothMetric(points, metric, smoothing) {
  const windowSize =
    smoothing === "medium" ? 9 : smoothing === "low" ? 5 : 1;

  if (windowSize <= 1) return points.map((p) => ({ ...p }));

  const radius = Math.floor(windowSize / 2);

  return points.map((point, index) => {
    let sum = 0;
    let count = 0;

    for (let i = index - radius; i <= index + radius; i += 1) {
      if (i < 0 || i >= points.length) continue;
      const value = Number(points[i]?.[metric]);
      if (!Number.isFinite(value)) continue;
      sum += value;
      count += 1;
    }

    return {
      ...point,
      [metric]: count > 0 ? sum / count : point?.[metric],
    };
  });
}

function stdDev(values) {
  if (!Array.isArray(values) || values.length <= 1) return 0;
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildMetricSeries(points, metric, compareMode = "single") {
  if (!Array.isArray(points) || points.length === 0) return [];

  const firstTs = Number(points[0]?.ts_epoch || 0);
  const denominator = Math.max(points.length - 1, 1);

  return points
    .filter((point) => isFiniteNumber(point?.[metric]) && isFiniteNumber(point?.ts_epoch))
    .map((point, index) => {
      const y = Number(point[metric]);
      const x =
        compareMode === "normalized"
          ? (index / denominator) * 100
          : (Number(point.ts_epoch) - firstTs) / 60;

      return {
        x,
        y,
        source: point,
      };
    });
}

function buildDistanceSeries(points, metric) {
  const valid = points.filter(
    (point) =>
      isFiniteNumber(point?.[metric]) &&
      isValidGpsPoint(point) &&
      isFiniteNumber(point?.ts_epoch)
  );

  if (valid.length === 0) return [];

  let cumulative = 0;
  const output = [];

  for (let i = 0; i < valid.length; i += 1) {
    if (i > 0) {
      cumulative += haversineMeters(
        Number(valid[i - 1].lat),
        Number(valid[i - 1].lon),
        Number(valid[i].lat),
        Number(valid[i].lon)
      );
    }

    output.push({
      x: cumulative,
      y: Number(valid[i][metric]),
      source: valid[i],
    });
  }

  return output;
}

function computeTrendSummary(points, metric) {
  const values = points
    .map((point) => Number(point?.[metric]))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return {
      start: null,
      end: null,
      delta: null,
      deltaPct: null,
      min: null,
      max: null,
      avg: null,
      volatility: null,
      trendLabel: "No data",
    };
  }

  const start = values[0];
  const end = values[values.length - 1];
  const delta = end - start;
  const deltaPct = start !== 0 ? (delta / start) * 100 : null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((acc, value) => acc + value, 0) / values.length;
  const volatility = stdDev(values);

  let trendLabel = "Stable";
  if (Math.abs(delta) > Math.abs(avg || 1) * 0.05) {
    trendLabel = delta > 0 ? "Rising" : "Falling";
  }
  if ((volatility || 0) > Math.abs(avg || 1) * 0.12) {
    trendLabel = `${trendLabel} / Variable`;
  }

  return { start, end, delta, deltaPct, min, max, avg, volatility, trendLabel };
}

function computeMissionDuration(mission) {
  const started = Number(mission?.started_at_epoch || 0);
  const ended = Number(mission?.ended_at_epoch || 0);

  if (started > 0 && ended > 0 && ended >= started) {
    return ended - started;
  }

  const fallback = Number(mission?.profile?.duration_s || 0);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

function computeGpsQuality(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return {
      total: 0,
      valid: 0,
      good: 0,
      validPct: 0,
      goodPct: 0,
      avgSatellites: null,
      avgHdop: null,
    };
  }

  const total = points.length;
  const validPoints = points.filter(isValidGpsPoint);
  const goodPoints = points.filter(isGoodGpsPoint);

  const satellites = validPoints
    .map((point) => Number(point?.satellites))
    .filter((value) => Number.isFinite(value));

  const hdops = validPoints
    .map((point) => Number(point?.hdop))
    .filter((value) => Number.isFinite(value));

  return {
    total,
    valid: validPoints.length,
    good: goodPoints.length,
    validPct: total > 0 ? (validPoints.length / total) * 100 : 0,
    goodPct: total > 0 ? (goodPoints.length / total) * 100 : 0,
    avgSatellites:
      satellites.length > 0
        ? satellites.reduce((acc, value) => acc + value, 0) / satellites.length
        : null,
    avgHdop:
      hdops.length > 0
        ? hdops.reduce((acc, value) => acc + value, 0) / hdops.length
        : null,
  };
}

function computeAirAnomalies(points) {
  const rows = points.filter((point) => isFiniteNumber(point?.gas_ohms));
  const values = rows.map((point) => Number(point.gas_ohms));

  if (values.length < 6) {
    return { intervals: [], mean: null, std: null };
  }

  const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
  const std = stdDev(values);

  if (!Number.isFinite(std) || std <= 0) {
    return { intervals: [], mean, std };
  }

  const threshold = mean - std * 1.25;
  const intervals = [];
  let current = null;

  rows.forEach((point) => {
    const value = Number(point.gas_ohms);
    const isAnomaly = value <= threshold;

    if (isAnomaly) {
      if (!current) {
        current = {
          startTs: point.ts_epoch,
          endTs: point.ts_epoch,
          count: 0,
          minValue: value,
          latSum: 0,
          lonSum: 0,
          coordCount: 0,
        };
      }

      current.endTs = point.ts_epoch;
      current.count += 1;
      current.minValue = Math.min(current.minValue, value);

      if (isFiniteNumber(point.lat) && isFiniteNumber(point.lon)) {
        current.latSum += Number(point.lat);
        current.lonSum += Number(point.lon);
        current.coordCount += 1;
      }
    } else if (current) {
      if (current.count >= 2) {
        intervals.push({
          ...current,
          lat:
            current.coordCount > 0 ? current.latSum / current.coordCount : null,
          lon:
            current.coordCount > 0 ? current.lonSum / current.coordCount : null,
          durationS: Math.max(
            0,
            Number(current.endTs || 0) - Number(current.startTs || 0)
          ),
        });
      }
      current = null;
    }
  });

  if (current && current.count >= 2) {
    intervals.push({
      ...current,
      lat: current.coordCount > 0 ? current.latSum / current.coordCount : null,
      lon: current.coordCount > 0 ? current.lonSum / current.coordCount : null,
      durationS: Math.max(
        0,
        Number(current.endTs || 0) - Number(current.startTs || 0)
      ),
    });
  }

  return { intervals, mean, std };
}

function computeBaselineComparison(mission, gasSummary) {
  const baseline = Number(mission?.meta?.bme_baseline?.gas_baseline_ohms);
  if (!Number.isFinite(baseline) || !Number.isFinite(gasSummary?.avg)) {
    return null;
  }

  const delta = gasSummary.avg - baseline;
  const deltaPct = baseline !== 0 ? (delta / baseline) * 100 : null;

  return {
    baseline,
    avg: gasSummary.avg,
    delta,
    deltaPct,
  };
}

function computeDensityCells(points, cellMeters = 35) {
  const valid = points
    .filter(isValidGpsPoint)
    .sort((a, b) => Number(a.ts_epoch || 0) - Number(b.ts_epoch || 0));

  if (valid.length < 2) return [];

  const avgLat =
    valid.reduce((acc, point) => acc + Number(point.lat), 0) / valid.length;

  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.max(Math.cos((avgLat * Math.PI) / 180), 0.000001);

  const dLat = cellMeters / metersPerDegLat;
  const dLon = cellMeters / metersPerDegLon;

  const minLat = Math.min(...valid.map((point) => Number(point.lat)));
  const minLon = Math.min(...valid.map((point) => Number(point.lon)));

  const cells = new Map();

  for (let i = 0; i < valid.length; i += 1) {
    const point = valid[i];
    const row = Math.floor((Number(point.lat) - minLat) / dLat);
    const col = Math.floor((Number(point.lon) - minLon) / dLon);
    const key = `${row}:${col}`;

    if (!cells.has(key)) {
      cells.set(key, {
        key,
        count: 0,
        firstTs: point.ts_epoch,
        lastTs: point.ts_epoch,
        latSum: 0,
        lonSum: 0,
      });
    }

    const cell = cells.get(key);
    cell.count += 1;
    cell.lastTs = point.ts_epoch;
    cell.latSum += Number(point.lat);
    cell.lonSum += Number(point.lon);
  }

  return Array.from(cells.values())
    .map((cell) => ({
      ...cell,
      centerLat: cell.latSum / cell.count,
      centerLon: cell.lonSum / cell.count,
      dwellS: Math.max(0, Number(cell.lastTs || 0) - Number(cell.firstTs || 0)),
    }))
    .sort((a, b) => {
      if (b.dwellS !== a.dwellS) return b.dwellS - a.dwellS;
      return b.count - a.count;
    });
}

function computeMovementStats(points, stationaryThresholdMps = 1.0) {
  const valid = points
    .filter(isValidGpsPoint)
    .sort((a, b) => Number(a.ts_epoch || 0) - Number(b.ts_epoch || 0));

  if (valid.length < 2) {
    return {
      totalDistanceM: 0,
      totalDurationS: 0,
      stationaryDurationS: 0,
      stationaryPct: 0,
      avgMovingSpeedMps: null,
    };
  }

  let totalDistanceM = 0;
  let totalDurationS = 0;
  let stationaryDurationS = 0;
  let movingDistanceM = 0;
  let movingDurationS = 0;

  for (let i = 1; i < valid.length; i += 1) {
    const prev = valid[i - 1];
    const curr = valid[i];

    const dt = Number(curr.ts_epoch || 0) - Number(prev.ts_epoch || 0);
    if (!Number.isFinite(dt) || dt <= 0) continue;

    const distanceM = haversineMeters(
      Number(prev.lat),
      Number(prev.lon),
      Number(curr.lat),
      Number(curr.lon)
    );

    const speedMps = distanceM / dt;

    totalDurationS += dt;
    totalDistanceM += distanceM;

    if (speedMps < stationaryThresholdMps) {
      stationaryDurationS += dt;
    } else {
      movingDurationS += dt;
      movingDistanceM += distanceM;
    }
  }

  return {
    totalDistanceM,
    totalDurationS,
    stationaryDurationS,
    stationaryPct: totalDurationS > 0 ? (stationaryDurationS / totalDurationS) * 100 : 0,
    avgMovingSpeedMps:
      movingDurationS > 0 ? movingDistanceM / movingDurationS : null,
  };
}

function buildDenseCellLookup(cells, radius = 4) {
  const set = new Set(cells.slice(0, radius).map((cell) => cell.key));
  return set;
}

function computePointCellKey(point, referenceLat, referenceLon, cellMeters = 35) {
  if (!isValidGpsPoint(point)) return null;

  const metersPerDegLat = 111320;
  const metersPerDegLon =
    111320 * Math.max(Math.cos((referenceLat * Math.PI) / 180), 0.000001);

  const dLat = cellMeters / metersPerDegLat;
  const dLon = cellMeters / metersPerDegLon;

  const row = Math.floor((Number(point.lat) - referenceLat) / dLat);
  const col = Math.floor((Number(point.lon) - referenceLon) / dLon);

  return `${row}:${col}`;
}

function computeStaticStability(points) {
  const metrics = ["temp_c", "hum_pct", "press_hpa", "gas_ohms"];

  return metrics.map((metric) => {
    const values = points
      .map((point) => Number(point?.[metric]))
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) {
      return { metric, avg: null, std: null, cvPct: null };
    }

    const avg = values.reduce((acc, value) => acc + value, 0) / values.length;
    const std = stdDev(values);
    const cvPct = avg !== 0 ? (std / Math.abs(avg)) * 100 : null;

    return { metric, avg, std, cvPct };
  });
}

function buildDensityMapPoints(cells) {
  const top = cells.slice(0, 8);
  if (top.length === 0) return [];

  const minLat = Math.min(...top.map((cell) => cell.centerLat));
  const maxLat = Math.max(...top.map((cell) => cell.centerLat));
  const minLon = Math.min(...top.map((cell) => cell.centerLon));
  const maxLon = Math.max(...top.map((cell) => cell.centerLon));

  return top.map((cell, index) => ({
    ...cell,
    nx:
      maxLon === minLon ? 0.5 : (Number(cell.centerLon) - minLon) / (maxLon - minLon),
    ny:
      maxLat === minLat ? 0.5 : 1 - (Number(cell.centerLat) - minLat) / (maxLat - minLat),
    rank: index + 1,
  }));
}

function SectionCard({ title, description, icon: Icon, right = null, children }) {
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
      <div className="mt-2 text-lg font-semibold text-base-content">{value}</div>
      {hint ? <div className="mt-1 text-xs text-base-content/55">{hint}</div> : null}
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
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

function SelectControl({ label, value, onChange, options }) {
  return (
    <label className="form-control w-full">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <select
        className="select select-bordered rounded-xl w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
        <p className="mt-2 max-w-xl text-sm text-base-content/60">{description}</p>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="rounded-3xl border border-base-300 bg-base-100">
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-10">
        <span className="loading loading-spinner loading-md text-primary" />
        <div className="text-sm text-base-content/60">Loading analytics data...</div>
      </div>
    </section>
  );
}

function SimpleLineChart({
  title,
  xLabel,
  yLabel,
  series,
  unit = "",
  height = 260,
}) {
  const safeSeries = Array.isArray(series) ? series.filter((item) => item.points.length > 0) : [];
  const flat = safeSeries.flatMap((item) => item.points);

  if (flat.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
        No chart data available.
      </div>
    );
  }

  const width = 860;
  const padTop = 18;
  const padRight = 18;
  const padBottom = 30;
  const padLeft = 44;

  let xMin = Math.min(...flat.map((point) => Number(point.x)));
  let xMax = Math.max(...flat.map((point) => Number(point.x)));
  let yMin = Math.min(...flat.map((point) => Number(point.y)));
  let yMax = Math.max(...flat.map((point) => Number(point.y)));

  if (xMin === xMax) {
    xMin -= 1;
    xMax += 1;
  }

  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const mapX = (value) => padLeft + ((value - xMin) / (xMax - xMin)) * innerW;
  const mapY = (value) => padTop + innerH - ((value - yMin) / (yMax - yMin)) * innerH;

  const ticksY = 4;
  const ticksX = 4;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-base-content/55">
          {yLabel}
          {unit ? ` (${unit})` : ""} vs {xLabel}
        </div>
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {Array.from({ length: ticksY + 1 }).map((_, index) => {
            const value = yMin + ((yMax - yMin) * index) / ticksY;
            const y = mapY(value);
            return (
              <g key={`y-${index}`}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={y}
                  y2={y}
                  stroke="rgba(148,163,184,0.18)"
                  strokeWidth="1"
                />
                <text
                  x={8}
                  y={y + 4}
                  fontSize="11"
                  fill="rgba(100,116,139,0.9)"
                >
                  {formatNumber(value, 1)}
                </text>
              </g>
            );
          })}

          {Array.from({ length: ticksX + 1 }).map((_, index) => {
            const value = xMin + ((xMax - xMin) * index) / ticksX;
            const x = mapX(value);
            return (
              <g key={`x-${index}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={padTop}
                  y2={height - padBottom}
                  stroke="rgba(148,163,184,0.12)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="rgba(100,116,139,0.9)"
                >
                  {formatNumber(value, xMax <= 100 ? 0 : 1)}
                </text>
              </g>
            );
          })}

          <line
            x1={padLeft}
            x2={width - padRight}
            y1={height - padBottom}
            y2={height - padBottom}
            stroke="rgba(100,116,139,0.7)"
            strokeWidth="1.2"
          />
          <line
            x1={padLeft}
            x2={padLeft}
            y1={padTop}
            y2={height - padBottom}
            stroke="rgba(100,116,139,0.7)"
            strokeWidth="1.2"
          />

          {safeSeries.map((item, seriesIndex) => {
            const color = item.color || SERIES_COLORS[seriesIndex % SERIES_COLORS.length];
            const path = item.points
              .map((point, index) => {
                const x = mapX(Number(point.x));
                const y = mapY(Number(point.y));
                return `${index === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ");

            return (
              <g key={item.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {item.points.length > 0 ? (
                  <>
                    <circle
                      cx={mapX(Number(item.points[0].x))}
                      cy={mapY(Number(item.points[0].y))}
                      r="3.25"
                      fill={color}
                    />
                    <circle
                      cx={mapX(Number(item.points[item.points.length - 1].x))}
                      cy={mapY(Number(item.points[item.points.length - 1].y))}
                      r="3.25"
                      fill={color}
                    />
                  </>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2">
        {safeSeries.map((item, index) => (
          <div
            key={item.id}
            className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color || SERIES_COLORS[index % SERIES_COLORS.length] }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
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

function DroneImagesPanel({ missionId, images, telemetry }) {
  const [selectedImageId, setSelectedImageId] = useState(null);

  useEffect(() => {
    setSelectedImageId(images?.[0]?.id || null);
  }, [images]);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) || null,
    [images, selectedImageId]
  );

  const correlatedTelemetry = useMemo(() => {
    if (!selectedImage || !Array.isArray(telemetry) || telemetry.length === 0) return null;

    let best = null;
    let bestDelta = Number.POSITIVE_INFINITY;

    telemetry.forEach((point) => {
      const delta = Math.abs(Number(point.ts_epoch || 0) - Number(selectedImage.ts_epoch || 0));
      if (delta < bestDelta) {
        best = point;
        bestDelta = delta;
      }
    });

    return best;
  }, [selectedImage, telemetry]);

  if (!Array.isArray(images) || images.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
        No images available for this mission.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
        {selectedImage ? (
          <img
            src={buildMissionImageUrl(missionId, selectedImage.id)}
            alt={selectedImage.filename}
            className="h-[320px] w-full rounded-xl object-cover"
          />
        ) : null}

        {selectedImage ? (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                Image time
              </div>
              <div className="mt-1 font-medium">{formatEpoch(selectedImage.ts_epoch)}</div>
            </div>

            <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                Coordinates
              </div>
              <div className="mt-1 font-medium">
                {isFiniteNumber(selectedImage.lat) && isFiniteNumber(selectedImage.lon)
                  ? `${Number(selectedImage.lat).toFixed(5)}, ${Number(selectedImage.lon).toFixed(5)}`
                  : "No GPS"}
              </div>
            </div>

            {correlatedTelemetry ? (
              <>
                <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Temperature
                  </div>
                  <div className="mt-1 font-medium">
                    {formatNumber(correlatedTelemetry.temp_c, 2, " °C")}
                  </div>
                </div>

                <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Gas resistance
                  </div>
                  <div className="mt-1 font-medium">
                    {formatNumber(correlatedTelemetry.gas_ohms, 0, " Ω")}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
        <div className="mb-3 text-sm font-semibold">Image timeline</div>
        <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {images.map((image) => {
            const active = image.id === selectedImageId;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImageId(image.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-primary/40 bg-primary/10"
                    : "border-base-300 bg-base-100 hover:bg-base-200"
                }`}
              >
                <div className="h-14 w-18 overflow-hidden rounded-lg bg-base-200">
                  <img
                    src={buildMissionImageUrl(missionId, image.id)}
                    alt={image.filename}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{image.filename}</div>
                  <div className="mt-1 text-xs text-base-content/55">
                    {formatEpoch(image.ts_epoch)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [searchParams] = useSearchParams();

  const missionIds = useMemo(() => parseMissionIds(searchParams), [searchParams]);

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
          })
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
          current && missionItems.some((mission) => mission.mission_id === current)
            ? current
            : missionItems[0]?.mission_id || null
        );
      } catch (error) {
        if (cancelled) return;
        setErrorText(
          error?.response?.data?.error ||
            error?.message ||
            "Failed to load analytics data."
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
    () => missions.find((mission) => mission.mission_id === activeMissionId) || null,
    [missions, activeMissionId]
  );

  const profileTypes = useMemo(
    () => [...new Set(missions.map((mission) => mission.profile_type).filter(Boolean))],
    [missions]
  );

  const sameProfile = profileTypes.length <= 1;
  const profileType = sameProfile ? profileTypes[0] || activeMission?.profile_type || null : null;
  const profileMeta = getProfileMeta(profileType);

  const activeTelemetryRaw = activeMissionId ? telemetryById[activeMissionId] || [] : [];
  const activeTelemetrySliced = useMemo(
    () => sliceByRange(activeTelemetryRaw, rangePreset),
    [activeTelemetryRaw, rangePreset]
  );
  const activeTelemetryFiltered = useMemo(
    () => applyGpsFilter(activeTelemetrySliced, gpsFilter),
    [activeTelemetrySliced, gpsFilter]
  );
  const activeTelemetrySmoothed = useMemo(
    () => smoothMetric(activeTelemetryFiltered, metric, smoothing),
    [activeTelemetryFiltered, metric, smoothing]
  );

  const activeStats = activeMissionId ? statsById[activeMissionId] : null;
  const activeImages = activeMissionId ? imagesById[activeMissionId] || [] : [];

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
  }, [missions, telemetryById, rangePreset, gpsFilter, metric, smoothing, compareMode]);

  const activeTrendSummary = useMemo(
    () => computeTrendSummary(activeTelemetrySmoothed, metric),
    [activeTelemetrySmoothed, metric]
  );

  const activeGpsQuality = useMemo(
    () => computeGpsQuality(activeTelemetryRaw),
    [activeTelemetryRaw]
  );

  const gasTelemetryBase = useMemo(
    () => sliceByRange(activeTelemetryRaw, rangePreset),
    [activeTelemetryRaw, rangePreset]
  );

  const gasTrendSummary = useMemo(
    () => computeTrendSummary(gasTelemetryBase, "gas_ohms"),
    [gasTelemetryBase]
  );

  const airAnomalies = useMemo(
    () => computeAirAnomalies(gasTelemetryBase),
    [gasTelemetryBase]
  );

  const baselineComparison = useMemo(
    () => computeBaselineComparison(activeMission, gasTrendSummary),
    [activeMission, gasTrendSummary]
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
    () => computeMovementStats(activeTelemetryRaw, activeMission?.profile_type === "car" ? 1.2 : 0.9),
    [activeMission, activeTelemetryRaw]
  );

  const staticStability = useMemo(
    () => computeStaticStability(activeTelemetrySliced),
    [activeTelemetrySliced]
  );

  const compareOverview = useMemo(() => {
    if (missions.length === 0) return null;

    const samples = missions.reduce((acc, mission) => {
      return acc + Number(statsById[mission.mission_id]?.samples || 0);
    }, 0);

    const durations = missions
      .map((mission) => computeMissionDuration(mission))
      .filter((value) => Number.isFinite(value));

    const images = missions.reduce((acc, mission) => acc + Number(mission.image_count || 0), 0);

    return {
      missionCount: missions.length,
      samples,
      totalDurationS: durations.reduce((acc, value) => acc + value, 0),
      imageCount: images,
    };
  }, [missions, statsById]);

  const denseTop = densityCells.slice(0, 5);

  const carDenseGasComparison = useMemo(() => {
    if (activeMission?.profile_type !== "car" || densityCells.length === 0) return null;

    const valid = activeTelemetryRaw.filter(
      (point) => isFiniteNumber(point?.gas_ohms) && isValidGpsPoint(point)
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
        ? denseValues.reduce((acc, value) => acc + value, 0) / denseValues.length
        : null;

    const movingAvg =
      movingValues.length > 0
        ? movingValues.reduce((acc, value) => acc + value, 0) / movingValues.length
        : null;

    return { denseAvg, movingAvg };
  }, [activeMission, densityCells, activeTelemetryRaw]);

  const droneAltitudeSeries = useMemo(() => {
    if (activeMission?.profile_type !== "drone") return [];
    const rows = activeTelemetrySliced.filter((point) => isFiniteNumber(point?.alt_m));
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
            <Badge>{activeMission.location_mode || "Location mode unknown"}</Badge>
            <Badge>{activeMission.has_gps ? "GPS available" : "GPS limited"}</Badge>
            <Badge>{activeMission.has_images ? "Images available" : "No images"}</Badge>
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
              <profileMeta.Icon className="text-primary text-lg" />
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
                <div className="mt-1 font-medium">{formatEpoch(activeMission.started_at_epoch)}</div>
              </div>
              <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Ended
                </div>
                <div className="mt-1 font-medium">{formatEpoch(activeMission.ended_at_epoch)}</div>
              </div>
              <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Status
                </div>
                <div className="mt-1 font-medium">{activeMission.status || "Unknown"}</div>
              </div>
              <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Location
                </div>
                <div className="mt-1 font-medium">{activeMission.location_name || "Unnamed"}</div>
              </div>
            </div>

            {!sameProfile ? (
              <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-3 text-sm text-warning">
                Advanced profile interpretation is shown only for missions with the same profile. Core trends and quality sections still work.
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Filters"
        description="These controls affect trend, air-quality and mobility analysis."
        icon={FiLayers}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SelectControl
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={METRIC_OPTIONS.map((option) => ({
              value: option.value,
              label: `${option.label} (${option.unit})`,
            }))}
          />

          <SelectControl
            label="Time range"
            value={rangePreset}
            onChange={setRangePreset}
            options={RANGE_OPTIONS}
          />

          <SelectControl
            label="Compare mode"
            value={compareMode}
            onChange={setCompareMode}
            options={COMPARE_OPTIONS}
          />

          <SelectControl
            label="Smoothing"
            value={smoothing}
            onChange={setSmoothing}
            options={SMOOTH_OPTIONS}
          />

          <SelectControl
            label="GPS filter"
            value={gpsFilter}
            onChange={setGpsFilter}
            options={GPS_FILTER_OPTIONS}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Overview"
        description="Quick context for the active mission and the current selection."
        icon={FiCpu}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Duration"
            value={formatDurationSeconds(computeMissionDuration(activeMission))}
            hint={missions.length > 1 ? `Selected set: ${formatDurationSeconds(compareOverview?.totalDurationS)}` : ""}
          />
          <StatCard
            label="Samples"
            value={String(activeStats?.samples || 0)}
            hint={missions.length > 1 ? `Selected set: ${compareOverview?.samples || 0}` : ""}
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

      <SectionCard
        title="Trends"
        description="Evolution of the selected metric over the chosen part of the mission."
        icon={FiActivity}
      >
        <div className="space-y-5">
          <SimpleLineChart
            title={`${getMetricMeta(metric).label} trend`}
            xLabel={compareMode === "normalized" ? "Mission progress (%)" : "Elapsed time (min)"}
            yLabel={getMetricMeta(metric).label}
            unit={getMetricMeta(metric).unit}
            series={trendSeries}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              label="Start"
              value={formatNumber(activeTrendSummary.start, 2, ` ${getMetricMeta(metric).unit}`)}
            />
            <StatCard
              label="End"
              value={formatNumber(activeTrendSummary.end, 2, ` ${getMetricMeta(metric).unit}`)}
            />
            <StatCard
              label="Delta"
              value={formatNumber(activeTrendSummary.delta, 2, ` ${getMetricMeta(metric).unit}`)}
              tone={
                Math.abs(Number(activeTrendSummary.delta || 0)) < 0.001
                  ? "default"
                  : Number(activeTrendSummary.delta) > 0
                  ? "warning"
                  : "success"
              }
            />
            <StatCard
              label="Average"
              value={formatNumber(activeTrendSummary.avg, 2, ` ${getMetricMeta(metric).unit}`)}
            />
            <StatCard
              label="Volatility"
              value={formatNumber(activeTrendSummary.volatility, 2, ` ${getMetricMeta(metric).unit}`)}
            />
            <StatCard
              label="Trend"
              value={activeTrendSummary.trendLabel}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Air quality"
        description="Gas resistance anomalies, suspect periods and baseline comparison."
        icon={FiAlertTriangle}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <div className="space-y-5">
            <SimpleLineChart
              title="Gas resistance indicator"
              xLabel="Elapsed time (min)"
              yLabel="Gas resistance"
              unit="Ω"
              series={[
                {
                  id: "gas",
                  label: activeMission.mission_name || activeMission.mission_id,
                  color: "#2563eb",
                  points: buildMetricSeries(
                    smoothMetric(gasTelemetryBase, "gas_ohms", smoothing),
                    "gas_ohms",
                    "single"
                  ),
                },
              ]}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Mission avg"
                value={formatNumber(gasTrendSummary.avg, 0, " Ω")}
              />
              <StatCard
                label="Lowest value"
                value={formatNumber(gasTrendSummary.min, 0, " Ω")}
                tone="warning"
              />
              <StatCard
                label="Anomaly intervals"
                value={String(airAnomalies.intervals.length)}
                hint="Persistent low-gas episodes"
                tone={airAnomalies.intervals.length > 0 ? "warning" : "success"}
              />
              <StatCard
                label="Longest suspect period"
                value={formatDurationSeconds(
                  Math.max(...airAnomalies.intervals.map((item) => item.durationS), 0)
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="text-sm font-semibold">Baseline comparison</div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Baseline gas
                  </div>
                  <div className="mt-1 font-medium">
                    {baselineComparison
                      ? formatNumber(baselineComparison.baseline, 0, " Ω")
                      : "No baseline"}
                  </div>
                </div>

                <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Relative delta
                  </div>
                  <div className="mt-1 font-medium">
                    {baselineComparison
                      ? formatNumber(baselineComparison.deltaPct, 1, "%")
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="text-sm font-semibold">Suspect periods / areas</div>
              <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {airAnomalies.intervals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-base-300 px-3 py-6 text-center text-sm text-base-content/55">
                    No persistent air-quality anomalies detected in the selected range.
                  </div>
                ) : (
                  airAnomalies.intervals.map((interval, index) => (
                    <div
                      key={`${interval.startTs}-${index}`}
                      className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-warning">
                          Suspect interval #{index + 1}
                        </div>
                        <Badge tone="warning">
                          {formatDurationSeconds(interval.durationS)}
                        </Badge>
                      </div>

                      <div className="mt-2 text-xs text-base-content/70">
                        {formatEpoch(interval.startTs)} → {formatEpoch(interval.endTs)}
                      </div>

                      <div className="mt-2 text-sm text-base-content/80">
                        Lowest gas value: {formatNumber(interval.minValue, 0, " Ω")}
                      </div>

                      {isFiniteNumber(interval.lat) && isFiniteNumber(interval.lon) ? (
                        <div className="mt-1 text-xs text-base-content/60">
                          Approx. area: {Number(interval.lat).toFixed(5)}, {Number(interval.lon).toFixed(5)}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Mobility / density"
        description="Dense GPS areas, stationary time and route concentration."
        icon={FiNavigation}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <DensityMiniMap cells={denseTop} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Stationary time"
                value={formatNumber(movementStats.stationaryPct, 0, "%")}
                hint={formatDurationSeconds(movementStats.stationaryDurationS)}
                tone={movementStats.stationaryPct > 35 ? "warning" : "default"}
              />
              <StatCard
                label="Dense areas"
                value={String(densityCells.length)}
                hint="Grid cells with repeated valid GPS samples"
              />
              <StatCard
                label="Total distance"
                value={formatNumber(movementStats.totalDistanceM / 1000, 2, " km")}
              />
              <StatCard
                label="Avg moving speed"
                value={formatNumber(movementStats.avgMovingSpeedMps, 2, " m/s")}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <div className="text-sm font-semibold">
              {activeMission.profile_type === "car"
                ? "Traffic-like zones"
                : activeMission.profile_type === "bicycle"
                ? "Dense route segments"
                : activeMission.profile_type === "drone"
                ? "Coverage concentration"
                : "Dense sample zones"}
            </div>

            <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {denseTop.length === 0 ? (
                <div className="rounded-xl border border-dashed border-base-300 px-3 py-6 text-center text-sm text-base-content/55">
                  No dense zones could be estimated from the GPS points.
                </div>
              ) : (
                denseTop.map((cell, index) => (
                  <div
                    key={cell.key}
                    className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">Zone #{index + 1}</div>
                      <Badge>{cell.count} samples</Badge>
                    </div>

                    <div className="mt-2 text-xs text-base-content/70">
                      Center: {Number(cell.centerLat).toFixed(5)}, {Number(cell.centerLon).toFixed(5)}
                    </div>

                    <div className="mt-1 text-sm text-base-content/80">
                      Estimated dwell: {formatDurationSeconds(cell.dwellS)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {sameProfile ? (
        <SectionCard
          title="Profile module"
          description="Interpretation adapted to the selected operating profile."
          icon={profileMeta.Icon}
        >
          {activeMission.profile_type === "drone" ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Max altitude"
                  value={formatNumber(
                    Math.max(
                      ...activeTelemetrySliced
                        .map((point) => Number(point?.alt_m))
                        .filter((value) => Number.isFinite(value)),
                      0
                    ),
                    1,
                    " m"
                  )}
                />
                <StatCard
                  label="Image frames"
                  value={String(activeImages.length)}
                  hint="Surveillance imagery available"
                />
                <StatCard
                  label="GPS good points"
                  value={formatNumber(activeGpsQuality.goodPct, 0, "%")}
                />
              </div>

              <SimpleLineChart
                title="Altitude profile"
                xLabel="Elapsed time (min)"
                yLabel="Altitude"
                unit="m"
                series={droneAltitudeSeries}
              />

              <DroneImagesPanel
                missionId={activeMission.mission_id}
                images={activeImages}
                telemetry={activeTelemetryRaw}
              />
            </div>
          ) : null}

          {activeMission.profile_type === "car" ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Stationary ratio"
                  value={formatNumber(movementStats.stationaryPct, 0, "%")}
                  hint="Useful for congestion interpretation"
                />
                <StatCard
                  label="Top dense zones"
                  value={String(denseTop.length)}
                />
                <StatCard
                  label="Traffic interpretation"
                  value={
                    movementStats.stationaryPct > 35
                      ? "Likely congestion"
                      : movementStats.stationaryPct > 15
                      ? "Moderate delays"
                      : "Mostly fluid route"
                  }
                  tone={movementStats.stationaryPct > 35 ? "warning" : "success"}
                />
              </div>

              {carDenseGasComparison ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <StatCard
                    label="Gas in dense zones"
                    value={formatNumber(carDenseGasComparison.denseAvg, 0, " Ω")}
                    hint="Average where dwell concentration is highest"
                  />
                  <StatCard
                    label="Gas while moving"
                    value={formatNumber(carDenseGasComparison.movingAvg, 0, " Ω")}
                    hint="Average outside dense clusters"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {activeMission.profile_type === "static" ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {staticStability.map((item) => {
                  const meta = getMetricMeta(item.metric);
                  return (
                    <StatCard
                      key={item.metric}
                      label={`${meta.label} stability`}
                      value={
                        item.cvPct == null
                          ? "—"
                          : item.cvPct < 2
                          ? "Very stable"
                          : item.cvPct < 5
                          ? "Stable"
                          : "Variable"
                      }
                      hint={
                        item.cvPct == null
                          ? "No data"
                          : `CV ${formatNumber(item.cvPct, 2, "%")}`
                      }
                      tone={item.cvPct != null && item.cvPct > 5 ? "warning" : "success"}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeMission.profile_type === "bicycle" ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Route distance"
                  value={formatNumber(movementStats.totalDistanceM / 1000, 2, " km")}
                />
                <StatCard
                  label="Avg moving speed"
                  value={formatNumber(movementStats.avgMovingSpeedMps, 2, " m/s")}
                />
                <StatCard
                  label="Exposure style"
                  value="Along-route analysis"
                />
              </div>

              <SimpleLineChart
                title={`${getMetricMeta(metric).label} along route`}
                xLabel="Cumulative distance (m)"
                yLabel={getMetricMeta(metric).label}
                unit={getMetricMeta(metric).unit}
                series={bicycleDistanceSeries}
              />
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}
