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

function flattenSeriesToChartData(series = []) {
  const byX = new Map();

  for (const item of series) {
    const dataKey = item?.id || item?.label || "series";
    const points = Array.isArray(item?.points) ? item.points : [];

    for (const point of points) {
      const x = Number(point?.x);
      if (!Number.isFinite(x)) continue;

      if (!byX.has(x)) {
        byX.set(x, {
          x,
          elapsed_min: x,
          ts_epoch: point?.ts_epoch ?? null,
          lat: point?.lat ?? null,
          lon: point?.lon ?? null,
          alt_m: point?.alt_m ?? null,
          satellites: point?.satellites ?? null,
          hdop: point?.hdop ?? null,
          fix_quality: point?.fix_quality ?? null,
        });
      }

      const row = byX.get(x);
      row[dataKey] = isFiniteNumber(point?.y) ? Number(point.y) : null;

      if (point?.ts_epoch != null) row.ts_epoch = point.ts_epoch;
      if (point?.lat != null) row.lat = point.lat;
      if (point?.lon != null) row.lon = point.lon;
      if (point?.alt_m != null) row.alt_m = point.alt_m;
      if (point?.satellites != null) row.satellites = point.satellites;
      if (point?.hdop != null) row.hdop = point.hdop;
      if (point?.fix_quality != null) row.fix_quality = point.fix_quality;
    }
  }

  return [...byX.values()].sort((a, b) => a.x - b.x);
}

function CustomTooltip({ active, payload, unit = "", valueDecimals = 3 }) {
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
    <div className="min-w-[240px] rounded-2xl border border-base-300 bg-base-100/95 px-3 py-3 shadow-xl backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-wide text-base-content/45">
        Position in mission
      </div>
      <div className="mt-1 text-sm font-semibold text-base-content">
        {formatMinutesLabel(row.elapsed_min)}
      </div>

      <div className="mt-1 text-xs text-base-content/55">
        Timestamp: {formatEpochLabel(row.ts_epoch)}
      </div>

      <div className="mt-3 space-y-2">
        {deduped.map((entry) => (
          <div
            key={entry.dataKey}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-base-content/70">
                {entry.name || entry.dataKey}
              </span>
            </div>

            <span className="font-semibold text-base-content">
              {formatValue(entry.value, valueDecimals, unit ? ` ${unit}` : "")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-base-300 pt-3 text-xs text-base-content/65">
        <div>
          <div className="uppercase tracking-wide text-base-content/40">Lat</div>
          <div className="mt-0.5 font-medium text-base-content">
            {formatValue(row.lat, 6)}
          </div>
        </div>

        <div>
          <div className="uppercase tracking-wide text-base-content/40">Lon</div>
          <div className="mt-0.5 font-medium text-base-content">
            {formatValue(row.lon, 6)}
          </div>
        </div>

        <div>
          <div className="uppercase tracking-wide text-base-content/40">Alt</div>
          <div className="mt-0.5 font-medium text-base-content">
            {formatValue(row.alt_m, 2, " m")}
          </div>
        </div>

        <div>
          <div className="uppercase tracking-wide text-base-content/40">
            Satellites
          </div>
          <div className="mt-0.5 font-medium text-base-content">
            {row.satellites ?? "—"}
          </div>
        </div>

        <div>
          <div className="uppercase tracking-wide text-base-content/40">HDOP</div>
          <div className="mt-0.5 font-medium text-base-content">
            {formatValue(row.hdop, 2)}
          </div>
        </div>

        <div>
          <div className="uppercase tracking-wide text-base-content/40">
            Fix quality
          </div>
          <div className="mt-0.5 font-medium text-base-content">
            {row.fix_quality ?? "—"}
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

export default function AnalyticsSingleMissionChart({
  unit = "",
  metricLabel = "Metric",
  series = [],
  displayMode = "line",
  smoothMode = "off",
  brushEnabled = true,
  yMinOverride = null,
  yMaxOverride = null,
  valueDecimals = 3,
}) {
  const chartData = useMemo(() => flattenSeriesToChartData(series), [series]);
  const curveType = getCurveType(smoothMode);
  const dotConfig = getDotConfig(displayMode);
  const strokeWidth = getStrokeWidth(displayMode);

  const primarySeries = series?.[0] || null;
  const primaryColor = primarySeries?.color || "#2563eb";

  const gradientRgb = useMemo(() => hexToRgb(primaryColor), [primaryColor]);

  const yDomain = useMemo(() => {
    const min = isFiniteNumber(yMinOverride) ? Number(yMinOverride) : "auto";
    const max = isFiniteNumber(yMaxOverride) ? Number(yMaxOverride) : "auto";

    if (min !== "auto" || max !== "auto") {
      return [min, max];
    }

    return ["auto", "auto"];
  }, [yMinOverride, yMaxOverride]);

  return (
    <div className="h-[410px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 14, right: 18, left: 6, bottom: brushEnabled ? 28 : 16 }}
        >
          <defs>
            <linearGradient id="singleMissionAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={`rgba(${gradientRgb.r}, ${gradientRgb.g}, ${gradientRgb.b}, 0.14)`}
              />
              <stop
                offset="100%"
                stopColor={`rgba(${gradientRgb.r}, ${gradientRgb.g}, ${gradientRgb.b}, 0.01)`}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148,163,184,0.22)"
          />

          <XAxis
            dataKey="elapsed_min"
            tickFormatter={formatMinutesLabel}
            minTickGap={28}
            tick={{ fontSize: 11, fill: "rgba(100,116,139,0.95)" }}
            axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
            tickLine={{ stroke: "rgba(148,163,184,0.45)" }}
            label={
              brushEnabled
                ? undefined
                : {
                    value: "Elapsed mission time",
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
            width={76}
            tickFormatter={(value) => formatValue(value, valueDecimals)}
            tick={{ fontSize: 11, fill: "rgba(100,116,139,0.95)" }}
            axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
            tickLine={{ stroke: "rgba(148,163,184,0.45)" }}
            label={{
              value: unit ? `${metricLabel} (${unit})` : metricLabel,
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
              />
            }
          />

          {primarySeries && displayMode !== "points" ? (
            <Area
              type={curveType}
              dataKey={primarySeries.id || primarySeries.label || "series"}
              stroke="none"
              fill="url(#singleMissionAreaFill)"
              fillOpacity={1}
              isAnimationActive={false}
              connectNulls
              legendType="none"
              tooltipType="none"
            />
          ) : null}

          {series.map((item) => {
            const dataKey = item?.id || item?.label || "series";

            return (
              <Line
                key={dataKey}
                type={curveType}
                dataKey={dataKey}
                name={item.label || dataKey}
                stroke={item.color || "#2563eb"}
                strokeWidth={strokeWidth}
                dot={dotConfig}
                activeDot={{ r: 4.5 }}
                connectNulls
                isAnimationActive={false}
              />
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
              dataKey="elapsed_min"
              height={28}
              stroke="#2563eb"
              travellerWidth={10}
              tickFormatter={formatMinutesLabel}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
