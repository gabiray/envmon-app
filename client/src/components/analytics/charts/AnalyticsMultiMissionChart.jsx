import React, { useMemo } from "react";
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function formatValue(value, decimals = 3, suffix = "") {
  if (!isFiniteNumber(value)) return "—";
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function formatMinutesLabel(value) {
  if (!isFiniteNumber(value)) return "—";

  const totalMinutes = Number(value);

  if (totalMinutes < 1) {
    return `${Math.round(totalMinutes * 60)}s`;
  }

  return `${totalMinutes.toFixed(2)}m`;
}

function formatEpochLabel(value) {
  if (!isFiniteNumber(value)) return "—";

  try {
    return new Date(Number(value) * 1000).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatXAxisLabel(value, xAxisMode = "time") {
  if (!isFiniteNumber(value)) return "—";

  const num = Number(value);

  if (xAxisMode === "progress") {
    return `${num.toFixed(0)}%`;
  }

  if (xAxisMode === "distance") {
    if (num < 1000) return `${Math.round(num)}m`;
    return `${(num / 1000).toFixed(2)}km`;
  }

  return formatMinutesLabel(num);
}

function getXAxisTitle(xAxisMode = "time") {
  if (xAxisMode === "progress") return "Mission progress";
  if (xAxisMode === "distance") return "Route distance";
  return "Elapsed mission time";
}

function hexToRgb(hex) {
  const safe = String(hex || "").replace("#", "");
  if (safe.length !== 6) {
    return { r: 37, g: 99, b: 235 };
  }

  return {
    r: parseInt(safe.slice(0, 2), 16),
    g: parseInt(safe.slice(2, 4), 16),
    b: parseInt(safe.slice(4, 6), 16),
  };
}

function normalizeSeriesPoints(points = [], normalizeMode = "off", offset = 0) {
  const safeOffset = Number.isFinite(Number(offset)) ? Number(offset) : 0;
  const safePoints = Array.isArray(points) ? points : [];

  const values = safePoints
    .map((point) => Number(point?.y))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return safePoints.map((point) => ({
      ...point,
      y_raw: Number.isFinite(Number(point?.y)) ? Number(point.y) : null,
      y_display: null,
    }));
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const baseline = values[0];

  return safePoints.map((point) => {
    const rawValue = Number(point?.y);

    if (!Number.isFinite(rawValue)) {
      return {
        ...point,
        y_raw: null,
        y_display: null,
      };
    }

    let nextValue = rawValue;

    if (normalizeMode === "minmax") {
      nextValue = max === min ? 0.5 : (rawValue - min) / (max - min);
    } else if (normalizeMode === "baseline") {
      nextValue = rawValue - baseline;
    }

    nextValue += safeOffset;

    return {
      ...point,
      y_raw: rawValue,
      y_display: nextValue,
    };
  });
}

function transformSeries(
  series = [],
  normalizeMode = "off",
  offsetsBySeries = {},
) {
  return series.map((item) => {
    const key = item?.id || item?.label || "series";

    return {
      ...item,
      points: normalizeSeriesPoints(
        item?.points || [],
        normalizeMode,
        offsetsBySeries?.[key] ?? 0,
      ),
    };
  });
}

function downsamplePoints(points = [], maxPoints = 450) {
  if (!Array.isArray(points) || points.length <= maxPoints) {
    return points;
  }

  const result = [];
  const step = Math.ceil(points.length / maxPoints);

  for (let i = 0; i < points.length; i += step) {
    result.push(points[i]);
  }

  const last = points[points.length - 1];
  if (result[result.length - 1] !== last) {
    result.push(last);
  }

  return result;
}

function flattenSeriesToChartData(series = [], maxPointsPerSeries = 450) {
  const byX = new Map();

  for (const item of series) {
    const dataKey = item?.id || item?.label || "series";
    const displayLabel = item?.shortLabel || item?.label || dataKey;
    const displayColor = item?.color || "#2563eb";
    const rawPoints = Array.isArray(item?.points) ? item.points : [];
    const points = downsamplePoints(rawPoints, maxPointsPerSeries);

    for (const point of points) {
      const x = Number(point?.x);
      if (!Number.isFinite(x)) continue;

      if (!byX.has(x)) {
        byX.set(x, {
          x,
          xValue: x,
          ts_epoch: point?.ts_epoch ?? null,
          lat: point?.lat ?? null,
          lon: point?.lon ?? null,
          alt_m: point?.alt_m ?? null,
        });
      }

      const row = byX.get(x);

      row[dataKey] = isFiniteNumber(point?.y_display)
        ? Number(point.y_display)
        : null;

      row[`${dataKey}__raw`] = isFiniteNumber(point?.y_raw)
        ? Number(point.y_raw)
        : isFiniteNumber(point?.y)
          ? Number(point.y)
          : null;

      row[`${dataKey}__label`] = displayLabel;
      row[`${dataKey}__color`] = displayColor;

      if (point?.ts_epoch != null) row.ts_epoch = point.ts_epoch;
      if (point?.lat != null) row.lat = point.lat;
      if (point?.lon != null) row.lon = point.lon;
      if (point?.alt_m != null) row.alt_m = point.alt_m;
    }
  }

  return [...byX.values()].sort((a, b) => a.x - b.x);
}

function CustomTooltip({
  active,
  payload,
  unit = "",
  valueDecimals = 3,
  normalizeMode = "off",
  xAxisMode = "time",
}) {
  if (!active || !payload?.length) return null;

  const row = payload?.[0]?.payload || {};

  const deduped = [];
  const seen = new Set();

  for (const entry of payload) {
    const key = `${entry.dataKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  return (
    <div className="min-w-[280px] max-w-[360px] rounded-2xl border border-base-300 bg-base-100/95 px-3 py-3 shadow-xl backdrop-blur">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        Position in comparison
      </div>

      <div className="mt-1 text-base font-semibold text-base-content">
        {formatXAxisLabel(row.xValue, xAxisMode)}
      </div>

      <div className="mt-1 text-xs text-base-content/55">
        Timestamp: {formatEpochLabel(row.ts_epoch)}
      </div>

      <div className="mt-3 space-y-2">
        {deduped.map((entry) => {
          const rawValue = row?.[`${entry.dataKey}__raw`];
          const displayLabel =
            row?.[`${entry.dataKey}__label`] || entry.name || entry.dataKey;

          return (
            <div
              key={entry.dataKey}
              className="rounded-xl border border-base-300 bg-base-100 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-base-100"
                    style={{
                      backgroundColor:
                        row?.[`${entry.dataKey}__color`] ||
                        entry.color ||
                        "#2563eb",
                    }}
                  />
                  <span className="truncate text-sm font-medium text-base-content/75">
                    {displayLabel}
                  </span>
                </div>

                <span
                  className="shrink-0 text-base font-semibold"
                  style={{
                    color:
                      row?.[`${entry.dataKey}__color`] ||
                      entry.color ||
                      "#2563eb",
                  }}
                >
                  {formatValue(entry.value, valueDecimals)}
                </span>
              </div>

              {normalizeMode !== "off" ? (
                <div className="mt-1 pl-5 text-xs text-base-content/55">
                  Raw value:{" "}
                  {formatValue(rawValue, valueDecimals, unit ? ` ${unit}` : "")}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-base-300 pt-3 text-xs">
        <div>
          <div className="uppercase tracking-wide text-base-content/40">
            Lat
          </div>
          <div className="mt-0.5 font-medium text-base-content/75">
            {formatValue(row.lat, 6)}
          </div>
        </div>

        <div>
          <div className="uppercase tracking-wide text-base-content/40">
            Lon
          </div>
          <div className="mt-0.5 font-medium text-base-content/75">
            {formatValue(row.lon, 6)}
          </div>
        </div>

        <div>
          <div className="uppercase tracking-wide text-base-content/40">
            Alt
          </div>
          <div className="mt-0.5 font-medium text-base-content/75">
            {formatValue(row.alt_m, 2, " m")}
          </div>
        </div>
      </div>
    </div>
  );
}

function getCurveType(smoothMode) {
  if (smoothMode === "soft") return "monotone";
  if (smoothMode === "strong") return "natural";
  return "linear";
}

function getStrokeWidth(displayMode) {
  if (displayMode === "points") return 0;
  if (displayMode === "line_points") return 2.25;
  return 2.5;
}

function getDotConfig(displayMode) {
  if (displayMode === "points") {
    return {
      r: 2.8,
      strokeWidth: 1.4,
    };
  }

  if (displayMode === "line_points") {
    return {
      r: 2.4,
      strokeWidth: 1.1,
    };
  }

  return false;
}

export default function AnalyticsMultiMissionChart({
  metricLabel = "Metric",
  unit = "",
  series = [],
  displayMode = "line",
  smoothMode = "off",
  normalizeMode = "off",
  offsetsBySeries = {},
  brushEnabled = true,
  yMinOverride = null,
  yMaxOverride = null,
  valueDecimals = 3,
  xAxisMode = "time",
}) {
  const transformedSeries = useMemo(() => {
    return transformSeries(series, normalizeMode, offsetsBySeries);
  }, [series, normalizeMode, offsetsBySeries]);

  const chartData = useMemo(() => {
    return flattenSeriesToChartData(transformedSeries, 450);
  }, [transformedSeries]);

  const strokeWidth = getStrokeWidth(displayMode);
  const curveType = getCurveType(smoothMode);

  const yDomain = useMemo(() => {
    const min = isFiniteNumber(yMinOverride) ? Number(yMinOverride) : "auto";
    const max = isFiniteNumber(yMaxOverride) ? Number(yMaxOverride) : "auto";

    if (min !== "auto" || max !== "auto") {
      return [min, max];
    }

    return ["auto", "auto"];
  }, [yMinOverride, yMaxOverride]);

  return (
    <div className="h-[440px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{
            top: 14,
            right: 18,
            left: 6,
            bottom: brushEnabled ? 28 : 16,
          }}
        >
          <defs>
            {transformedSeries.map((item, index) => {
              const gradientId = `multiGradient-${index}`;
              const rgb = hexToRgb(item?.color || "#2563eb");

              return (
                <linearGradient
                  key={gradientId}
                  id={gradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`}
                  />
                  <stop
                    offset="100%"
                    stopColor={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.01)`}
                  />
                </linearGradient>
              );
            })}
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148,163,184,0.22)"
          />

          <XAxis
            dataKey="xValue"
            tickFormatter={(value) => formatXAxisLabel(value, xAxisMode)}
            minTickGap={28}
            tick={{ fontSize: 11, fill: "rgba(100,116,139,0.95)" }}
            axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
            tickLine={{ stroke: "rgba(148,163,184,0.45)" }}
            label={
              brushEnabled
                ? undefined
                : {
                    value: getXAxisTitle(xAxisMode),
                    position: "insideBottom",
                    offset: -8,
                    style: {
                      fill: "rgba(100,116,139,0.95)",
                      fontSize: 12,
                    },
                  }
            }
          />

          <YAxis
            domain={yDomain}
            width={82}
            tickFormatter={(value) => formatValue(value, valueDecimals)}
            tick={{ fontSize: 11, fill: "rgba(100,116,139,0.95)" }}
            axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
            tickLine={{ stroke: "rgba(148,163,184,0.45)" }}
            label={{
              value:
                normalizeMode === "off"
                  ? unit
                    ? `${metricLabel} (${unit})`
                    : metricLabel
                  : `${metricLabel} (normalized)`,
              angle: -90,
              position: "insideLeft",
              style: {
                fill: "rgba(100,116,139,0.95)",
                fontSize: 12,
                textAnchor: "middle",
              },
            }}
          />

          <Tooltip
            content={
              <CustomTooltip
                unit={unit}
                valueDecimals={valueDecimals}
                normalizeMode={normalizeMode}
                xAxisMode={xAxisMode}
              />
            }
          />

          {transformedSeries.map((item, index) => {
            const dataKey = item?.id || item?.label || "series";
            const gradientId = `multiGradient-${index}`;
            const pointCount = Array.isArray(item?.points)
              ? item.points.length
              : 0;
            const dotConfig = getDotConfig(displayMode, pointCount);

            return (
              <React.Fragment key={dataKey}>
                {displayMode !== "points" ? (
                  <Area
                    type={curveType}
                    dataKey={dataKey}
                    stroke="none"
                    fill={`url(#${gradientId})`}
                    fillOpacity={1}
                    isAnimationActive={false}
                    connectNulls
                    legendType="none"
                    tooltipType="none"
                  />
                ) : null}

                <Line
                  type={curveType}
                  dataKey={dataKey}
                  name={item.label || dataKey}
                  stroke={item.color || "#2563eb"}
                  strokeWidth={strokeWidth}
                  strokeOpacity={1}
                  dot={dotConfig}
                  activeDot={
                    displayMode === "points"
                      ? false
                      : pointCount > 300
                        ? false
                        : { r: 4.2 }
                  }
                  connectNulls
                  isAnimationActive={false}
                />
              </React.Fragment>
            );
          })}

          {isFiniteNumber(yMinOverride) ? (
            <ReferenceLine
              y={Number(yMinOverride)}
              stroke="rgba(59,130,246,0.45)"
              strokeDasharray="4 4"
            />
          ) : null}

          {isFiniteNumber(yMaxOverride) ? (
            <ReferenceLine
              y={Number(yMaxOverride)}
              stroke="rgba(59,130,246,0.45)"
              strokeDasharray="4 4"
            />
          ) : null}

          {brushEnabled && chartData.length > 12 ? (
            <Brush
              dataKey="xValue"
              height={28}
              stroke="#2563eb"
              travellerWidth={10}
              tickFormatter={(value) => formatXAxisLabel(value, xAxisMode)}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
