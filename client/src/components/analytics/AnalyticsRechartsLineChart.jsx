import React, { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
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

function formatNumber(value, decimals = 3, suffix = "") {
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
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
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
    return [minValue - 1, maxValue + 1];
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
          item.color || FALLBACK_SERIES_COLORS[index % FALLBACK_SERIES_COLORS.length],
        points: item.points.map((point) => ({
          ...point,
          yOriginal: Number(point.y),
          yOffset: Number(point.y) + offset,
        })),
      };
    });
}

function transformSeriesToRechartsData(series = []) {
  const map = new Map();

  series.forEach((seriesItem) => {
    const key = seriesItem.id || seriesItem.label;

    seriesItem.points.forEach((point, pointIndex) => {
      const pointKey = `${point.x}-${pointIndex}`;

      if (!map.has(pointKey)) {
        map.set(pointKey, {
          __x: point.x,
          __order: pointIndex,
        });
      }

      const row = map.get(pointKey);
      row[key] = point.yOffset;
      row[`__meta_${key}`] = {
        ...point,
        seriesId: key,
        seriesLabel: seriesItem.label,
        color: seriesItem.color,
      };
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.__x === b.__x) return a.__order - b.__order;
    return a.__x - b.__x;
  });
}

function buildAllYValues(series = []) {
  return series.flatMap((item) =>
    item.points
      .map((point) => Number(point.yOffset))
      .filter((value) => Number.isFinite(value)),
  );
}

function CustomTooltip({ active, payload, unit = "", xLabel = "Time" }) {
  if (!active || !payload || !payload.length) return null;

  const firstMeta = payload[0]?.payload;
  const rawX = firstMeta?.__x;

  return (
    <div className="min-w-[220px] rounded-2xl border border-base-300 bg-base-100 px-3 py-3 shadow-lg">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/45">
        Hover details
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-start justify-between gap-4">
          <span className="text-base-content/55">{xLabel}</span>
          <span className="text-right font-medium text-base-content">
            {formatEpochLabel(rawX)}
          </span>
        </div>

        {payload.map((entry) => {
          const meta = entry?.payload?.[`__meta_${entry.dataKey}`];
          if (!meta) return null;

          return (
            <div
              key={entry.dataKey}
              className="mt-2 rounded-xl border border-base-300 bg-base-200/35 px-2.5 py-2"
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="font-semibold text-base-content">
                  {meta.seriesLabel}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-base-content/55">Value</span>
                  <span className="text-right font-medium text-base-content">
                    {formatNumber(meta.yOriginal, 3, unit ? ` ${unit}` : "")}
                  </span>
                </div>

                {meta.lat !== undefined && meta.lat !== null ? (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-base-content/55">Latitude</span>
                    <span className="text-right font-medium text-base-content">
                      {formatNumber(meta.lat, 6)}
                    </span>
                  </div>
                ) : null}

                {meta.lon !== undefined && meta.lon !== null ? (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-base-content/55">Longitude</span>
                    <span className="text-right font-medium text-base-content">
                      {formatNumber(meta.lon, 6)}
                    </span>
                  </div>
                ) : null}

                {meta.alt_m !== undefined && meta.alt_m !== null ? (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-base-content/55">Altitude</span>
                    <span className="text-right font-medium text-base-content">
                      {formatNumber(meta.alt_m, 1, " m")}
                    </span>
                  </div>
                ) : null}
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
  displayMode = "line", // line | points | line_points
  lineWidth = 2,
  pointRadius = 2.5,

  yMinOverride = null,
  yMaxOverride = null,
  yPaddingPct = 0.12,

  seriesOffsetStep = 0,
}) {
  const normalizedSeries = useMemo(
    () => normalizeSeries(series, seriesOffsetStep),
    [series, seriesOffsetStep],
  );

  const chartData = useMemo(
    () => transformSeriesToRechartsData(normalizedSeries),
    [normalizedSeries],
  );

  const yValues = useMemo(
    () => buildAllYValues(normalizedSeries),
    [normalizedSeries],
  );

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
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-base-content">{title}</div>
          <div className="text-xs text-base-content/55">
            {yLabel}
            {unit ? ` (${unit})` : ""} vs {xLabel}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer>
            <LineChart
              data={chartData}
              margin={{ top: 14, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />

              <XAxis
                dataKey="__x"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => {
                  const numeric = Number(value);
                  if (!Number.isFinite(numeric)) return "—";
                  return numeric > 10_000_000_000
                    ? new Date(numeric).toLocaleTimeString("ro-RO", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : new Date(numeric * 1000).toLocaleTimeString("ro-RO", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });
                }}
                minTickGap={24}
              />

              <YAxis
                domain={finalDomain}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatNumber(value, 2)}
                width={64}
              />

              <Tooltip
                content={
                  <CustomTooltip
                    unit={unit}
                    xLabel={xLabel}
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

              <ReferenceLine y={0} stroke="rgba(100,116,139,0.3)" />

              {normalizedSeries.map((seriesItem) => {
                const dataKey = seriesItem.id || seriesItem.label;

                return (
                  <Line
                    key={dataKey}
                    type="monotone"
                    dataKey={dataKey}
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
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
