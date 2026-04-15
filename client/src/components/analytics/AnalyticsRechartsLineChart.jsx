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
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4f46e5",
];

function formatNumber(value, decimals = 2, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function buildDomain(min, max, paddingPct = 0.12) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return ["auto", "auto"];
  }

  if (min === max) {
    const basePad = Math.abs(min || 1) * 0.08 || 1;
    return [min - basePad, max + basePad];
  }

  const range = max - min;
  const pad = range * Math.max(Number(paddingPct) || 0, 0);

  return [min - pad, max + pad];
}

function normalizeSeries(series = [], offsetStep = 0) {
  return (Array.isArray(series) ? series : []).map((item, index) => {
    const offset = Number(offsetStep || 0) * index;

    return {
      ...item,
      color:
        item?.color ||
        FALLBACK_SERIES_COLORS[index % FALLBACK_SERIES_COLORS.length],
      points: (Array.isArray(item?.points) ? item.points : [])
        .filter(
          (point) =>
            Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y)),
        )
        .map((point) => ({
          ...point,
          x: Number(point.x),
          y: Number(point.y),
          yOriginal: Number(point.y),
          yOffset: Number(point.y) + offset,
        })),
    };
  });
}

function transformSeriesToChartData(series = []) {
  const map = new Map();

  series.forEach((item, seriesIndex) => {
    item.points.forEach((point, pointIndex) => {
      const xKey = String(point.x);

      if (!map.has(xKey)) {
        map.set(xKey, {
          x: point.x,
          __meta: {},
        });
      }

      const row = map.get(xKey);
      const dataKey = item.id || `series_${seriesIndex}`;

      row[dataKey] = point.yOffset;
      row.__meta[dataKey] = {
        color: item.color,
        seriesLabel: item.label || `Series ${seriesIndex + 1}`,
        yOriginal: point.yOriginal,
        yOffset: point.yOffset,
        xOriginal: point.x,
        pointIndex,
        rawPoint: point,
      };
    });
  });

  return Array.from(map.values()).sort((a, b) => a.x - b.x);
}

function defaultTimeFormatter(value) {
  if (!Number.isFinite(Number(value))) return "—";
  const seconds = Number(value);

  if (seconds < 60) return `${seconds.toFixed(1)} s`;

  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)} min`;

  const hours = minutes / 60;
  return `${hours.toFixed(2)} h`;
}

function CustomTooltip({
  active,
  payload,
  label,
  unit,
  valueDecimals,
  xTickFormatter,
}) {
  if (!active || !Array.isArray(payload) || !payload.length) {
    return null;
  }

  const validPayload = payload.filter((entry) => entry && entry.payload);
  if (!validPayload.length) return null;

  const firstMeta =
    validPayload[0]?.payload?.__meta?.[validPayload[0]?.dataKey] || null;

  const rawPoint = firstMeta?.rawPoint || null;

  return (
    <div className="min-w-[240px] rounded-2xl border border-base-300 bg-base-100 px-3 py-3 shadow-xl">
      <div className="text-sm font-semibold text-base-content">
        {xTickFormatter ? xTickFormatter(label) : defaultTimeFormatter(label)}
      </div>

      <div className="mt-1 text-xs text-base-content/55">
        Relative mission time
      </div>

      <div className="mt-3 space-y-2">
        {validPayload.map((entry) => {
          const meta = entry.payload?.__meta?.[entry.dataKey];
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

      {rawPoint ? (
        <div className="mt-3 rounded-xl border border-base-300 bg-base-200/25 px-3 py-3 text-xs">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
            Point details
          </div>

          <div className="space-y-1.5 text-base-content/75">
            <div className="flex justify-between gap-3">
              <span>Latitude</span>
              <span className="font-medium text-base-content">
                {formatNumber(rawPoint.lat, 6)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span>Longitude</span>
              <span className="font-medium text-base-content">
                {formatNumber(rawPoint.lon, 6)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span>Altitude</span>
              <span className="font-medium text-base-content">
                {formatNumber(rawPoint.alt_m, 2, " m")}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span>Fix quality</span>
              <span className="font-medium text-base-content">
                {rawPoint.fix_quality ?? "—"}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span>Satellites</span>
              <span className="font-medium text-base-content">
                {rawPoint.satellites ?? "—"}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span>HDOP</span>
              <span className="font-medium text-base-content">
                {formatNumber(rawPoint.hdop, 2)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
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
  displayMode = "line_points",
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
          {unit ? ` (${unit})` : ""} vs {xLabel.toLowerCase()}
        </div>
      </div>

      <div
        className="rounded-3xl border border-base-300 bg-base-100 p-3"
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 14, right: 18, left: 8, bottom: 14 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />

            <XAxis
              dataKey="x"
              tick={{ fontSize: 11, fill: "rgba(100,116,139,0.95)" }}
              tickFormatter={xTickFormatter || defaultTimeFormatter}
              minTickGap={28}
              stroke="rgba(100,116,139,0.55)"
              label={{
                value: xLabel,
                position: "insideBottom",
                offset: -8,
                fill: "rgba(100,116,139,0.95)",
                fontSize: 11,
              }}
            />

            <YAxis
              domain={finalDomain}
              tick={{ fontSize: 11, fill: "rgba(100,116,139,0.95)" }}
              tickFormatter={(value) => formatNumber(value, valueDecimals)}
              width={64}
              stroke="rgba(100,116,139,0.55)"
              label={{
                value: unit ? `${yLabel} (${unit})` : yLabel,
                angle: -90,
                position: "insideLeft",
                fill: "rgba(100,116,139,0.95)",
                fontSize: 11,
              }}
            />

            <Tooltip
              content={
                <CustomTooltip
                  unit={unit}
                  valueDecimals={valueDecimals}
                  xTickFormatter={xTickFormatter}
                />
              }
            />

            {showLegend ? (
              <Legend
                wrapperStyle={{
                  fontSize: "12px",
                  paddingTop: "8px",
                }}
              />
            ) : null}

            {normalizedSeries.map((item, index) => {
              const dataKey = item.id || `series_${index}`;

              return (
                <Line
                  key={dataKey}
                  type="monotone"
                  dataKey={dataKey}
                  name={item.label || `Series ${index + 1}`}
                  stroke={item.color}
                  strokeWidth={showLines ? lineWidth : 0}
                  dot={
                    showDots
                      ? {
                          r: pointRadius,
                          strokeWidth: 0,
                          fill: item.color,
                        }
                      : false
                  }
                  activeDot={{
                    r: Math.max(pointRadius + 1.5, 4),
                    strokeWidth: 0,
                    fill: item.color,
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
  );
}
