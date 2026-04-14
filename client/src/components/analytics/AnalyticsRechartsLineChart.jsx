import React, { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const FALLBACK_SERIES_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
];

function formatNumber(value, decimals = 2, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function formatEpochLabel(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const numeric = Number(value);
  const epochMs = numeric > 10_000_000_000 ? numeric : numeric * 1000;

  try {
    return new Date(epochMs).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function buildDomain(minValue, maxValue, paddingPct = 0.12) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return ["auto", "auto"];
  }

  if (minValue === maxValue) {
    if (minValue === 0) return [-1, 1];
    const delta = Math.max(Math.abs(minValue) * 0.2, 1);
    return [minValue - delta, maxValue + delta];
  }

  const range = maxValue - minValue;
  const pad = range * paddingPct;

  return [minValue - pad, maxValue + pad];
}

function normalizeSeries(series = [], seriesOffsetStep = 0) {
  return (Array.isArray(series) ? series : [])
    .filter(
      (item) =>
        item &&
        Array.isArray(item.points) &&
        item.points.length > 0 &&
        item.hidden !== true,
    )
    .map((item, index) => {
      const offset = Number(seriesOffsetStep || 0) * index;

      return {
        ...item,
        color:
          item.color ||
          FALLBACK_SERIES_COLORS[index % FALLBACK_SERIES_COLORS.length],
        dataKey: item.id || item.label || `series_${index}`,
        points: item.points.map((point) => ({
          ...point,
          yOriginal: Number(point.y),
          yOffset: Number(point.y) + offset,
        })),
      };
    });
}

function transformSeriesToChartData(series = []) {
  const rows = new Map();

  series.forEach((seriesItem) => {
    seriesItem.points.forEach((point, index) => {
      const key = `${point.x}-${index}`;

      if (!rows.has(key)) {
        rows.set(key, {
          __x: point.x,
          __label: point.label || null,
          __order: index,
        });
      }

      const row = rows.get(key);
      row[seriesItem.dataKey] = point.yOffset;
      row[`__meta_${seriesItem.dataKey}`] = {
        ...point,
        color: seriesItem.color,
        seriesLabel: seriesItem.label,
      };
    });
  });

  return Array.from(rows.values()).sort((a, b) => {
    if (a.__x === b.__x) return a.__order - b.__order;
    return a.__x - b.__x;
  });
}

function CustomTooltip({
  active,
  payload,
  unit = "",
  xLabel = "Time",
  valueDecimals = 2,
}) {
  if (!active || !payload || !payload.length) return null;

  const baseRow = payload[0]?.payload;
  const displayX = baseRow?.__label || formatEpochLabel(baseRow?.__x);

  return (
    <div className="min-w-[220px] rounded-2xl border border-base-300 bg-base-100 px-3 py-3 shadow-lg">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/45">
        Details
      </div>

      <div className="mb-2 flex items-start justify-between gap-3 text-xs">
        <span className="text-base-content/55">{xLabel}</span>
        <span className="text-right font-medium text-base-content">
          {displayX}
        </span>
      </div>

      <div className="space-y-2">
        {payload.map((entry) => {
          const meta = entry?.payload?.[`__meta_${entry.dataKey}`];
          if (!meta) return null;

          return (
            <div
              key={entry.dataKey}
              className="rounded-xl border border-base-300 bg-base-200/35 px-2.5 py-2"
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="text-sm font-semibold text-base-content">
                  {meta.seriesLabel}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 text-xs">
                <span className="text-base-content/55">Value</span>
                <span className="text-right font-medium text-base-content">
                  {formatNumber(
                    meta.yOriginal,
                    valueDecimals,
                    unit ? ` ${unit}` : "",
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsRechartsLineChart({
  title = "",
  xLabel = "Time",
  yLabel = "Value",
  series = [],
  unit = "",
  height = 320,

  showLegend = true,
  displayMode = "line_points", // line | points | line_points
  lineWidth = 2.25,
  pointRadius = 3,

  yMinOverride = null,
  yMaxOverride = null,
  yPaddingPct = 0.12,

  seriesOffsetStep = 0,
  valueDecimals = 2,
  xTickFormatter = null,
}) {
  const normalizedSeries = useMemo(
    () => normalizeSeries(series, seriesOffsetStep),
    [series, seriesOffsetStep],
  );

  const chartData = useMemo(
    () => transformSeriesToChartData(normalizedSeries),
    [normalizedSeries],
  );

  const yValues = useMemo(() => {
    return normalizedSeries.flatMap((item) =>
      item.points
        .map((point) => Number(point.yOffset))
        .filter((value) => Number.isFinite(value)),
    );
  }, [normalizedSeries]);

  if (!chartData.length) {
    return (
      <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
        No chart data available.
      </div>
    );
  }

  const computedMin = yValues.length ? Math.min(...yValues) : null;
  const computedMax = yValues.length ? Math.max(...yValues) : null;

  const finalDomain =
    yMinOverride !== null || yMaxOverride !== null
      ? [
          yMinOverride !== null ? Number(yMinOverride) : "auto",
          yMaxOverride !== null ? Number(yMaxOverride) : "auto",
        ]
      : buildDomain(computedMin, computedMax, Number(yPaddingPct || 0.12));

  const showDots = displayMode === "points" || displayMode === "line_points";
  const showLines = displayMode === "line" || displayMode === "line_points";

  return (
    <div className="space-y-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-base-content">{title}</div>
        <div className="text-xs text-base-content/55">
          {yLabel}
          {unit ? ` (${unit})` : ""} vs {xLabel}
        </div>
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer>
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.22} />

              <XAxis
                dataKey="__x"
                tick={{ fontSize: 11 }}
                minTickGap={20}
                tickFormatter={(value, index) => {
                  const row = chartData[index];
                  if (row?.__label) return row.__label;
                  if (typeof xTickFormatter === "function") {
                    return xTickFormatter(value);
                  }
                  return String(value);
                }}
              />

              <YAxis
                domain={finalDomain}
                allowDecimals={valueDecimals > 0}
                tick={{ fontSize: 11 }}
                width={52}
                tickFormatter={(value) => formatNumber(value, valueDecimals)}
              />

              <Tooltip
                content={
                  <CustomTooltip
                    unit={unit}
                    xLabel={xLabel}
                    valueDecimals={valueDecimals}
                  />
                }
              />

              {showLegend ? (
                <Legend
                  wrapperStyle={{
                    fontSize: "12px",
                    paddingTop: "6px",
                  }}
                />
              ) : null}

              {normalizedSeries.map((seriesItem) => (
                <Line
                  key={seriesItem.dataKey}
                  type="monotone"
                  dataKey={seriesItem.dataKey}
                  name={seriesItem.label}
                  stroke={seriesItem.color}
                  strokeWidth={showLines ? lineWidth : 0}
                  dot={
                    showDots
                      ? {
                          r: pointRadius,
                          strokeWidth: 0,
                          fill: seriesItem.color,
                        }
                      : false
                  }
                  activeDot={{
                    r: Math.max(pointRadius + 2, 5),
                    fill: seriesItem.color,
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
