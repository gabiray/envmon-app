import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiActivity } from "react-icons/fi";

const FALLBACK_SERIES_COLORS = [
  "#2563eb",
  "#ec4899",
  "#16a34a",
  "#f59e0b",
  "#7c3aed",
  "#ef4444",
];

function formatNumber(value, decimals = 2, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function formatEpoch(epoch) {
  if (!epoch) return "—";
  try {
    return new Date(Number(epoch) * 1000).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function isFiniteNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function parseNullableNumber(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-3xl border border-base-300 bg-base-100 shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <Icon className="text-base" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-semibold text-base-content">{title}</div>
            <div className="mt-1 text-sm text-base-content/60">{description}</div>
          </div>
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
      : tone === "success"
        ? "border-success/30 bg-success/10"
        : tone === "error"
          ? "border-error/30 bg-error/10"
          : "border-base-300 bg-base-100";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-base-content">{value}</div>
      {hint ? <div className="mt-1 text-xs text-base-content/60">{hint}</div> : null}
    </div>
  );
}

function TrendTooltip({ hovered, compareMode, metricMeta }) {
  if (!hovered?.point) return null;

  const point = hovered.point;
  const source = point.source || {};

  return (
    <div
      className="pointer-events-none absolute z-20 w-[290px] rounded-2xl border border-base-300 bg-base-100/95 p-3 shadow-xl backdrop-blur"
      style={{
        left: hovered.left,
        top: hovered.top,
        transform: "translate(12px, 12px)",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: hovered.color }}
        />
        <div className="min-w-0 truncate text-sm font-semibold">
          {hovered.seriesLabel}
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-base-content/80">
        <div>
          <span className="font-semibold text-base-content">Recorded:</span>{" "}
          {formatEpoch(source.ts_epoch)}
        </div>

        <div>
          <span className="font-semibold text-base-content">
            {metricMeta?.label || "Metric"}:
          </span>{" "}
          {formatNumber(point.y, 2, metricMeta?.unit ? ` ${metricMeta.unit}` : "")}
        </div>

        <div>
          <span className="font-semibold text-base-content">
            {compareMode === "normalized" ? "Mission progress" : "Elapsed time"}:
          </span>{" "}
          {compareMode === "normalized"
            ? formatNumber(point.x, 1, "%")
            : formatNumber(point.x, 2, " min")}
        </div>

        <div>
          <span className="font-semibold text-base-content">GPS:</span>{" "}
          {isFiniteNumber(source.lat) && isFiniteNumber(source.lon)
            ? `${Number(source.lat).toFixed(5)}, ${Number(source.lon).toFixed(5)}`
            : "No GPS"}
        </div>

        <div>
          <span className="font-semibold text-base-content">Altitude:</span>{" "}
          {formatNumber(source.alt_m, 2, " m")}
        </div>

        <div>
          <span className="font-semibold text-base-content">Temperature:</span>{" "}
          {formatNumber(source.temp_c, 2, " °C")}
        </div>

        <div>
          <span className="font-semibold text-base-content">Humidity:</span>{" "}
          {formatNumber(source.hum_pct, 2, " %")}
        </div>

        <div>
          <span className="font-semibold text-base-content">Pressure:</span>{" "}
          {formatNumber(source.press_hpa, 2, " hPa")}
        </div>

        <div>
          <span className="font-semibold text-base-content">Gas:</span>{" "}
          {formatNumber(source.gas_ohms, 0, " Ω")}
        </div>

        <div>
          <span className="font-semibold text-base-content">Fix:</span>{" "}
          {formatNumber(source.fix_quality, 0)}
          {" · "}
          <span className="font-semibold text-base-content">Sat:</span>{" "}
          {formatNumber(source.satellites, 0)}
          {" · "}
          <span className="font-semibold text-base-content">HDOP:</span>{" "}
          {formatNumber(source.hdop, 2)}
        </div>
      </div>
    </div>
  );
}

function MetricQuickSelect({ metric, onMetricChange, metricOptions = [] }) {
  if (!Array.isArray(metricOptions) || metricOptions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        Metric
      </div>

      <div className="flex flex-wrap gap-2">
        {metricOptions.map((option) => {
          const active = option.value === metric;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onMetricChange(option.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-base-300 bg-base-100 text-base-content hover:bg-base-200"
              }`}
            >
              {option.label}
              {option.unit ? ` (${option.unit})` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SimpleLineChart({
  title,
  xLabel,
  yLabel,
  series,
  unit = "",
  height = 280,
  compareMode = "single",
  metricMeta = null,
  metric = "",
  onMetricChange,
  metricOptions = [],
}) {
  const wrapperRef = useRef(null);

  const [displayMode, setDisplayMode] = useState("line");
  const [yMinInput, setYMinInput] = useState("");
  const [yMaxInput, setYMaxInput] = useState("");
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    setYMinInput("");
    setYMaxInput("");
    setHovered(null);
  }, [metric, compareMode]);

  const safeSeries = Array.isArray(series)
    ? series.filter((item) => Array.isArray(item.points) && item.points.length > 0)
    : [];

  const flat = safeSeries.flatMap((item) => item.points);

  const chartData = useMemo(() => {
    if (flat.length === 0) return null;

    const width = 860;
    const padTop = 18;
    const padRight = 18;
    const padBottom = 30;
    const padLeft = 52;

    let xMin = Math.min(...flat.map((point) => Number(point.x)));
    let xMax = Math.max(...flat.map((point) => Number(point.x)));
    const autoYMin = Math.min(...flat.map((point) => Number(point.y)));
    const autoYMax = Math.max(...flat.map((point) => Number(point.y)));

    const manualYMin = parseNullableNumber(yMinInput);
    const manualYMax = parseNullableNumber(yMaxInput);

    let yMin = manualYMin ?? autoYMin;
    let yMax = manualYMax ?? autoYMax;

    if (xMin === xMax) {
      xMin -= 1;
      xMax += 1;
    }

    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }

    if (yMin > yMax) {
      const temp = yMin;
      yMin = yMax;
      yMax = temp;
    }

    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const mapX = (value) => padLeft + ((value - xMin) / (xMax - xMin)) * innerW;
    const mapY = (value) =>
      padTop + innerH - ((value - yMin) / (yMax - yMin)) * innerH;

    return {
      width,
      padTop,
      padRight,
      padBottom,
      padLeft,
      xMin,
      xMax,
      yMin,
      yMax,
      autoYMin,
      autoYMax,
      mapX,
      mapY,
    };
  }, [flat, height, yMinInput, yMaxInput]);

  if (flat.length === 0 || !chartData) {
    return (
      <div className="space-y-4">
        <MetricQuickSelect
          metric={metric}
          onMetricChange={onMetricChange}
          metricOptions={metricOptions}
        />

        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
          No chart data available.
        </div>
      </div>
    );
  }

  const {
    width,
    padTop,
    padRight,
    padBottom,
    padLeft,
    xMin,
    xMax,
    yMin,
    yMax,
    autoYMin,
    autoYMax,
    mapX,
    mapY,
  } = chartData;

  const ticksY = 4;
  const ticksX = 4;

  function handlePointHover(event, item, point, color) {
    if (!wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();

    setHovered({
      left: event.clientX - rect.left,
      top: event.clientY - rect.top,
      point,
      color,
      seriesLabel: item.label,
    });
  }

  return (
    <div className="space-y-4">
      <MetricQuickSelect
        metric={metric}
        onMetricChange={onMetricChange}
        metricOptions={metricOptions}
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-base-content/55">
            {yLabel}
            {unit ? ` (${unit})` : ""} vs {xLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 xl:w-auto">
          <label className="form-control">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
              Display
            </div>
            <select
              className="select select-bordered select-sm rounded-xl"
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value)}
            >
              <option value="line">Line</option>
              <option value="points">Points</option>
            </select>
          </label>

          <label className="form-control">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
              Y min
            </div>
            <input
              type="number"
              step="any"
              value={yMinInput}
              onChange={(e) => setYMinInput(e.target.value)}
              placeholder={formatNumber(autoYMin, 2)}
              className="input input-bordered input-sm rounded-xl"
            />
          </label>

          <label className="form-control">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
              Y max
            </div>
            <input
              type="number"
              step="any"
              value={yMaxInput}
              onChange={(e) => setYMaxInput(e.target.value)}
              placeholder={formatNumber(autoYMax, 2)}
              className="input input-bordered input-sm rounded-xl"
            />
          </label>

          <button
            type="button"
            className="btn btn-sm rounded-xl xl:self-end"
            onClick={() => {
              setYMinInput("");
              setYMaxInput("");
            }}
          >
            Reset scale
          </button>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="relative rounded-2xl border border-base-300 bg-base-100 p-3"
        onMouseLeave={() => setHovered(null)}
      >
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
                  x={10}
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
                  {formatNumber(value, compareMode === "normalized" ? 0 : 1)}
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
                {displayMode === "line" ? (
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}

                {item.points.map((point, index) => {
                  const x = mapX(Number(point.x));
                  const y = mapY(Number(point.y));

                  return (
                    <g key={`${item.id || seriesIndex}-${index}`}>
                      {displayMode === "points" ? (
                        <circle cx={x} cy={y} r="2.1" fill={color} opacity="0.95" />
                      ) : (
                        <circle cx={x} cy={y} r="1.2" fill={color} opacity="0.55" />
                      )}

                      <circle
                        cx={x}
                        cy={y}
                        r="8"
                        fill="transparent"
                        onMouseEnter={(e) => handlePointHover(e, item, point, color)}
                        onMouseMove={(e) => handlePointHover(e, item, point, color)}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        <TrendTooltip
          hovered={hovered}
          compareMode={compareMode}
          metricMeta={metricMeta}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/60">
        <span>Leave Y min / Y max empty for automatic scaling.</span>
        <span>Hover a point to inspect telemetry and GPS details.</span>
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

function getDeltaTone(delta) {
  const value = Number(delta || 0);
  if (Math.abs(value) < 0.001) return "default";
  return value > 0 ? "warning" : "success";
}

export default function AnalyticsTrendsSection({
  metric,
  onMetricChange,
  metricOptions = [],
  metricMeta,
  compareMode,
  trendSeries = [],
  activeTrendSummary = null,
}) {
  return (
    <SectionCard
      title="Trends"
      description="Evolution of the selected metric over the chosen part of the mission."
      icon={FiActivity}
    >
      <div className="space-y-5">
        <SimpleLineChart
          title={`${metricMeta?.label || "Metric"} trend`}
          xLabel={compareMode === "normalized" ? "Mission progress (%)" : "Elapsed time (min)"}
          yLabel={metricMeta?.label || "Metric"}
          unit={metricMeta?.unit || ""}
          series={trendSeries}
          compareMode={compareMode}
          metricMeta={metricMeta}
          metric={metric}
          onMetricChange={onMetricChange}
          metricOptions={metricOptions}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard
            label="Start"
            value={formatNumber(activeTrendSummary?.start, 2, ` ${metricMeta?.unit || ""}`)}
            hint="First visible value from the current filtered range."
          />

          <StatCard
            label="End"
            value={formatNumber(activeTrendSummary?.end, 2, ` ${metricMeta?.unit || ""}`)}
            hint="Last visible value from the current filtered range."
          />

          <StatCard
            label="Delta"
            value={formatNumber(activeTrendSummary?.delta, 2, ` ${metricMeta?.unit || ""}`)}
            hint="Difference between end and start."
            tone={getDeltaTone(activeTrendSummary?.delta)}
          />

          <StatCard
            label="Average"
            value={formatNumber(activeTrendSummary?.avg, 2, ` ${metricMeta?.unit || ""}`)}
            hint="Mean value of all visible points."
          />

          <StatCard
            label="Volatility"
            value={formatNumber(
              activeTrendSummary?.volatility,
              2,
              ` ${metricMeta?.unit || ""}`
            )}
            hint="How much the values vary around the average."
          />

          <StatCard
            label="Trend"
            value={activeTrendSummary?.trendLabel || "—"}
            hint="Overall direction inferred from delta and variability."
          />
        </div>
      </div>
    </SectionCard>
  );
}
