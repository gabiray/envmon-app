export function formatEpoch(epoch) {
  if (!epoch) return "—";
  try {
    return new Date(Number(epoch) * 1000).toLocaleString("ro-RO", {
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

export function formatDurationSeconds(seconds) {
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

export function formatNumber(value, decimals = 2, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

export function isFiniteNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

export function isValidGpsPoint(point) {
  return (
    isFiniteNumber(point?.lat) &&
    isFiniteNumber(point?.lon) &&
    Number(point?.fix_quality || 0) > 0
  );
}

export function isGoodGpsPoint(point) {
  return (
    isValidGpsPoint(point) &&
    Number(point?.satellites || 0) >= 4 &&
    Number(point?.hdop || 99.99) <= 4
  );
}

export function applyGpsFilter(points, gpsFilter) {
  if (gpsFilter === "all") return points;
  if (gpsFilter === "valid") return points.filter(isValidGpsPoint);
  return points.filter(isGoodGpsPoint);
}

export function sliceByRange(points, rangePreset) {
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

export function smoothMetric(points, metric, smoothing) {
  const windowSize = smoothing === "medium" ? 9 : smoothing === "low" ? 5 : 1;

  if (windowSize <= 1) {
    return points.map((point) => ({ ...point }));
  }

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

export function stdDev(values) {
  if (!Array.isArray(values) || values.length <= 1) return 0;
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
  const variance =
    values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildMetricSeries(points, metric, compareMode = "single") {
  if (!Array.isArray(points) || points.length === 0) return [];

  const firstTs = Number(points[0]?.ts_epoch || 0);
  const denominator = Math.max(points.length - 1, 1);

  return points
    .filter(
      (point) => isFiniteNumber(point?.[metric]) && isFiniteNumber(point?.ts_epoch)
    )
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

export function buildDistanceSeries(points, metric) {
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

export function computeTrendSummary(points, metric) {
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

export function computeMissionDuration(mission) {
  const started = Number(mission?.started_at_epoch || 0);
  const ended = Number(mission?.ended_at_epoch || 0);

  if (started > 0 && ended > 0 && ended >= started) {
    return ended - started;
  }

  const fallback = Number(mission?.profile?.duration_s || 0);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

export function computeGpsQuality(points) {
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

export function computeAirAnomalies(points) {
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

export function computeBaselineComparison(mission, gasSummary) {
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

export function computeDensityCells(points, cellMeters = 35) {
  const valid = points
    .filter(isValidGpsPoint)
    .sort((a, b) => Number(a.ts_epoch || 0) - Number(b.ts_epoch || 0));

  if (valid.length < 2) return [];

  const avgLat =
    valid.reduce((acc, point) => acc + Number(point.lat), 0) / valid.length;

  const metersPerDegLat = 111320;
  const metersPerDegLon =
    111320 * Math.max(Math.cos((avgLat * Math.PI) / 180), 0.000001);

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

export function computeMovementStats(points, stationaryThresholdMps = 1.0) {
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
    stationaryPct:
      totalDurationS > 0 ? (stationaryDurationS / totalDurationS) * 100 : 0,
    avgMovingSpeedMps:
      movingDurationS > 0 ? movingDistanceM / movingDurationS : null,
  };
}

export function buildDenseCellLookup(cells, radius = 4) {
  return new Set(cells.slice(0, radius).map((cell) => cell.key));
}

export function computePointCellKey(
  point,
  referenceLat,
  referenceLon,
  cellMeters = 35
) {
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

export function computeStaticStability(points) {
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

export function buildDensityMapPoints(cells) {
  const top = cells.slice(0, 8);
  if (top.length === 0) return [];

  const minLat = Math.min(...top.map((cell) => cell.centerLat));
  const maxLat = Math.max(...top.map((cell) => cell.centerLat));
  const minLon = Math.min(...top.map((cell) => cell.centerLon));
  const maxLon = Math.max(...top.map((cell) => cell.centerLon));

  return top.map((cell, index) => ({
    ...cell,
    nx:
      maxLon === minLon
        ? 0.5
        : (Number(cell.centerLon) - minLon) / (maxLon - minLon),
    ny:
      maxLat === minLat
        ? 0.5
        : 1 - (Number(cell.centerLat) - minLat) / (maxLat - minLat),
    rank: index + 1,
  }));
}
