import React from "react";

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

export default function AnalyticsSimpleLineChart({
  title,
  xLabel,
  yLabel,
  series = [],
  unit = "",
  height = 260,
}) {
  const safeSeries = Array.isArray(series)
    ? series.filter((item) => Array.isArray(item.points) && item.points.length > 0)
    : [];

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
  const mapY = (value) =>
    padTop + innerH - ((value - yMin) / (yMax - yMin)) * innerH;

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
            const color =
              item.color ||
              FALLBACK_SERIES_COLORS[seriesIndex % FALLBACK_SERIES_COLORS.length];

            const path = item.points
              .map((point, index) => {
                const x = mapX(Number(point.x));
                const y = mapY(Number(point.y));
                return `${index === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ");

            return (
              <g key={item.id || `${item.label}-${seriesIndex}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {item.points.map((point, index) => {
                  const x = mapX(Number(point.x));
                  const y = mapY(Number(point.y));

                  return (
                    <circle
                      key={`${item.id || seriesIndex}-${index}`}
                      cx={x}
                      cy={y}
                      r="3.2"
                      fill={color}
                      opacity="0.9"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {safeSeries.length > 1 ? (
        <div className="flex flex-wrap items-center gap-3">
          {safeSeries.map((item, index) => {
            const color =
              item.color ||
              FALLBACK_SERIES_COLORS[index % FALLBACK_SERIES_COLORS.length];

            return (
              <div
                key={item.id || item.label}
                className="flex items-center gap-2 text-xs text-base-content/70"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
