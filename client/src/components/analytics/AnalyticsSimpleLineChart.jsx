import React, { useMemo } from "react";

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

function buildPath(points, mapX, mapY) {
  if (!Array.isArray(points) || points.length === 0) return "";

  return points
    .map((point, index) => {
      const x = mapX(point.x);
      const y = mapY(point.y);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getVisibleSeries(series = []) {
  return Array.isArray(series)
    ? series.filter(
        (item) =>
          Array.isArray(item.points) &&
          item.points.length > 0 &&
          item.hidden !== true,
      )
    : [];
}

export default function AnalyticsSimpleLineChart({
  title,
  xLabel,
  yLabel,
  series = [],
  unit = "",
  height = 260,

  showLegend = true,
  displayMode = "line", // line | points | line_points
  lineWidth = 2.25,
  pointRadius = 2.75,

  yMinOverride = null,
  yMaxOverride = null,
  yPaddingPct = 0.12,

  seriesOffsetStep = 0,
}) {
  const safeSeries = useMemo(() => getVisibleSeries(series), [series]);

  const offsetSeries = useMemo(() => {
    if (!safeSeries.length) return [];

    return safeSeries.map((item, index) => {
      if (!seriesOffsetStep) return item;

      return {
        ...item,
        points: item.points.map((point) => ({
          ...point,
          y: Number(point.y) + index * Number(seriesOffsetStep),
          originalY: point.y,
        })),
      };
    });
  }, [safeSeries, seriesOffsetStep]);

  const flat = useMemo(
    () => offsetSeries.flatMap((item) => item.points),
    [offsetSeries],
  );

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
  const padBottom = 36;
  const padLeft = 54;

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

  const yRange = yMax - yMin;
  const yPad = yRange * Number(yPaddingPct || 0);

  yMin =
    yMinOverride !== null && yMinOverride !== undefined
      ? Number(yMinOverride)
      : yMin - yPad;

  yMax =
    yMaxOverride !== null && yMaxOverride !== undefined
      ? Number(yMaxOverride)
      : yMax + yPad;

  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const mapX = (value) => padLeft + ((value - xMin) / (xMax - xMin)) * innerW;
  const mapY = (value) =>
    padTop + innerH - ((value - yMin) / (yMax - yMin)) * innerH;

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const t = index / 4;
    const value = yMax - t * (yMax - yMin);
    const y = mapY(value);
    return { value, y };
  });

  const showLine = displayMode === "line" || displayMode === "line_points";
  const showPoints = displayMode === "points" || displayMode === "line_points";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-base-content/55">
            {yLabel}
            {unit ? ` (${unit})` : ""} vs {xLabel}
          </div>
        </div>

        {showLegend ? (
          <div className="flex flex-wrap items-center gap-2">
            {safeSeries.map((item, seriesIndex) => {
              const color =
                item.color ||
                FALLBACK_SERIES_COLORS[
                  seriesIndex % FALLBACK_SERIES_COLORS.length
                ];

              return (
                <div
                  key={item.id || `${item.label}-${seriesIndex}`}
                  className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs text-base-content/75"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="max-w-[180px] truncate">
                    {item.label || `Series ${seriesIndex + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {yTicks.map((tick, index) => (
            <g key={index}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={tick.y}
                y2={tick.y}
                stroke="rgba(148,163,184,0.18)"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="rgba(100,116,139,0.9)"
              >
                {formatNumber(tick.value, 2)}
              </text>
            </g>
          ))}

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

          {offsetSeries.map((item, seriesIndex) => {
            const color =
              item.color ||
              FALLBACK_SERIES_COLORS[seriesIndex % FALLBACK_SERIES_COLORS.length];

            const pathD = buildPath(item.points, mapX, mapY);

            return (
              <g key={item.id || `${item.label}-${seriesIndex}`}>
                {showLine ? (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth={lineWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}

                {showPoints
                  ? item.points.map((point, pointIndex) => (
                      <circle
                        key={`${item.id || seriesIndex}-${pointIndex}`}
                        cx={mapX(point.x)}
                        cy={mapY(point.y)}
                        r={pointRadius}
                        fill={color}
                      />
                    ))
                  : null}
              </g>
            );
          })}

          <text
            x={width / 2}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fill="rgba(100,116,139,0.9)"
          >
            {xLabel}
          </text>

          <text
            x={14}
            y={height / 2}
            textAnchor="middle"
            fontSize="11"
            fill="rgba(100,116,139,0.9)"
            transform={`rotate(-90 14 ${height / 2})`}
          >
            {yLabel}
            {unit ? ` (${unit})` : ""}
          </text>
        </svg>
      </div>
    </div>
  );
}
