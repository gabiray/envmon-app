import React, { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiRefreshCw,
  FiSliders,
  FiDroplet,
  FiMinus,
  FiSettings,
  FiBarChart2,
  FiTrendingUp,
  FiLayers,
  FiClock,
  FiMaximize2,
} from "react-icons/fi";
import AnalyticsSingleMissionChart from "../charts/AnalyticsSingleMissionChart";

function formatSummaryValue(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(3)}${suffix}`;
}

function formatAxisValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "";
  }
  return Number(value).toFixed(3);
}

function SectionLabel({ children }) {
  return (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
      {children}
    </div>
  );
}

function SelectField({ label, value, onChange, options = [] }) {
  return (
    <label className="form-control w-full">
      <SectionLabel>{label}</SectionLabel>
      <select
        className="select select-bordered w-full rounded-xl bg-base-100"
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

function ToggleChip({ active = false, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "btn btn-sm rounded-xl",
        active
          ? "btn-primary border-none text-white"
          : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "0.001",
  placeholder = "",
}) {
  return (
    <label className="form-control w-full">
      <SectionLabel>{label}</SectionLabel>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input input-bordered w-full rounded-xl bg-base-100"
      />
    </label>
  );
}

function buildVisibleSummary(series = []) {
  const firstSeries = Array.isArray(series) ? series[0] : null;
  const points = Array.isArray(firstSeries?.points) ? firstSeries.points : [];

  const values = points
    .map((point) => Number(point?.y))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return {
      min: null,
      max: null,
      avg: null,
      delta: null,
      count: 0,
    };
  }

  const sum = values.reduce((acc, value) => acc + value, 0);

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
    delta: values.length >= 2 ? values[values.length - 1] - values[0] : null,
    count: values.length,
  };
}

function InfoStat({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="text-[1.1rem]" />
        </div>

        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
            {label}
          </div>

          <div className="mt-0.5 text-lg font-bold leading-none text-base-content">
            {value ?? "—"}
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm leading-snug text-base-content/58">
        {hint}
      </div>
    </div>
  );
}

export default function AnalyticsTrendsSingle({
  mission,
  trendSeries = [],
  trendSummary = null,

  metric,
  onMetricChange,

  range,
  onRangeChange,

  gpsFilter,
  onGpsFilterChange,

  metricOptions = [],
  rangeOptions = [],
  gpsFilterOptions = [],
}) {
  const [chartControlsOpen, setChartControlsOpen] = useState(false);
  const [showLine, setShowLine] = useState(true);
  const [showPoints, setShowPoints] = useState(false);
  const [smoothMode, setSmoothMode] = useState("off");
  const [brushEnabled, setBrushEnabled] = useState(true);

  const activeMetric = useMemo(() => {
    return (
      metricOptions.find((option) => option.value === metric) ||
      metricOptions[0] ||
      null
    );
  }, [metric, metricOptions]);

  const mainSeries = trendSeries?.[0] || null;
  const seriesPoints = Array.isArray(mainSeries?.points)
    ? mainSeries.points
    : [];

  const detectedMin = useMemo(() => {
    if (!seriesPoints.length) return null;

    const values = seriesPoints
      .map((point) => Number(point?.y))
      .filter((value) => Number.isFinite(value));

    if (!values.length) return null;
    return Math.min(...values);
  }, [seriesPoints]);

  const detectedMax = useMemo(() => {
    if (!seriesPoints.length) return null;

    const values = seriesPoints
      .map((point) => Number(point?.y))
      .filter((value) => Number.isFinite(value));

    if (!values.length) return null;
    return Math.max(...values);
  }, [seriesPoints]);

  const [yMinInput, setYMinInput] = useState("");
  const [yMaxInput, setYMaxInput] = useState("");

  useEffect(() => {
    setYMinInput(formatAxisValue(detectedMin));
    setYMaxInput(formatAxisValue(detectedMax));
  }, [detectedMin, detectedMax, metric, range, gpsFilter]);

  const parsedYMin = Number(yMinInput);
  const parsedYMax = Number(yMaxInput);

  const yMinOverride = Number.isFinite(parsedYMin) ? parsedYMin : null;
  const yMaxOverride = Number.isFinite(parsedYMax) ? parsedYMax : null;

  function handleResetScale() {
    setYMinInput(formatAxisValue(detectedMin));
    setYMaxInput(formatAxisValue(detectedMax));
  }

  function handleToggleLine() {
    if (showLine && !showPoints) return;
    setShowLine((prev) => !prev);
  }

  function handleTogglePoints() {
    if (showPoints && !showLine) return;
    setShowPoints((prev) => !prev);
  }

  const displayMode =
    showLine && showPoints ? "line_points" : showPoints ? "points" : "line";

  const summary = useMemo(() => {
    if (trendSummary) {
      return {
        ...trendSummary,
        count: seriesPoints.length,
      };
    }
    return buildVisibleSummary(trendSeries);
  }, [trendSummary, trendSeries, seriesPoints.length]);

  const chartSubtitle = `${activeMetric?.label || "Metric"}${activeMetric?.unit ? ` (${activeMetric.unit})` : ""} measured over the selected mission time range`;

  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 border-b border-base-300 pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-semibold">
            <FiActivity className="text-primary" />
            Mission trends
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            Analyze sensor evolution over time for this mission
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-base-300 bg-base-200/35 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
          <FiSettings className="text-primary" />
          Selected data
        </div>
        <div className="mt-1 text-sm text-base-content/60">
          Choose what the chart displays and how the curve is rendered.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <SelectField
            label="Metric"
            value={metric}
            onChange={onMetricChange}
            options={metricOptions}
          />

          <SelectField
            label="Time range"
            value={range}
            onChange={onRangeChange}
            options={rangeOptions}
          />

          <SelectField
            label="GPS filter"
            value={gpsFilter}
            onChange={onGpsFilterChange}
            options={gpsFilterOptions}
          />

          <SelectField
            label="Smoothing"
            value={smoothMode}
            onChange={setSmoothMode}
            options={[
              { value: "off", label: "No smoothing" },
              { value: "soft", label: "Light smoothing" },
              { value: "strong", label: "Strong smoothing" },
            ]}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-base-300 bg-base-100 p-4">
        <div className="flex flex-col gap-4 border-b border-base-300 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-base-content">
              {activeMetric?.label || "Metric"} trend
            </div>
            <div className="mt-1 text-sm text-base-content/60">
              {chartSubtitle}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToggleChip
              active={showLine}
              label="Line"
              onClick={handleToggleLine}
            />

            <ToggleChip
              active={showPoints}
              label="Points"
              onClick={handleTogglePoints}
            />

            <ToggleChip
              active={brushEnabled}
              label="Zoom X"
              onClick={() => setBrushEnabled((prev) => !prev)}
            />

            <button
              type="button"
              className={[
                "btn btn-sm btn-square rounded-xl",
                chartControlsOpen
                  ? "btn-primary border-none text-white"
                  : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
              ].join(" ")}
              onClick={() => setChartControlsOpen((prev) => !prev)}
              aria-label="Toggle chart controls"
              title="Chart controls"
            >
              <FiSliders />
            </button>
          </div>
        </div>

        {chartControlsOpen ? (
          <div className="mt-4 rounded-3xl border border-base-300 bg-base-200/35 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
                  <FiMaximize2 className="text-primary" />
                  Axis calibration
                </div>
                <div className="mt-1 text-sm text-base-content/60">
                  Fine-tune the visible Y range for the selected metric.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                onClick={handleResetScale}
              >
                <FiRefreshCw />
                Reset scale
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <NumberField
                label="Y min"
                value={yMinInput}
                onChange={setYMinInput}
                placeholder="Detected minimum"
              />

              <NumberField
                label="Y max"
                value={yMaxInput}
                onChange={setYMaxInput}
                placeholder="Detected maximum"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-info/20 bg-info/8 px-3 py-3 text-sm text-base-content/70">
              Detected range:{" "}
              <span className="font-semibold text-base-content">
                {formatSummaryValue(
                  detectedMin,
                  activeMetric?.unit ? ` ${activeMetric.unit}` : "",
                )}
              </span>
              {" — "}
              <span className="font-semibold text-base-content">
                {formatSummaryValue(
                  detectedMax,
                  activeMetric?.unit ? ` ${activeMetric.unit}` : "",
                )}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          {trendSeries?.length ? (
            <AnalyticsSingleMissionChart
              title={`${activeMetric?.label || "Metric"} trend`}
              subtitle={chartSubtitle}
              unit={activeMetric?.unit || ""}
              metricLabel={activeMetric?.label || "Metric value"}
              series={trendSeries}
              displayMode={displayMode}
              smoothMode={smoothMode}
              brushEnabled={brushEnabled}
              yMinOverride={yMinOverride}
              yMaxOverride={yMaxOverride}
              valueDecimals={3}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-base-300 bg-base-200/30 py-16 text-center text-sm text-base-content/55">
              No trend data available for this mission.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <InfoStat
          icon={FiBarChart2}
          label="Minimum"
          value={formatSummaryValue(
            summary?.min,
            activeMetric?.unit ? ` ${activeMetric.unit}` : "",
          )}
          hint="Lowest visible value measured in the selected interval."
        />

        <InfoStat
          icon={FiTrendingUp}
          label="Maximum"
          value={formatSummaryValue(
            summary?.max,
            activeMetric?.unit ? ` ${activeMetric.unit}` : "",
          )}
          hint="Highest visible value measured in the selected interval."
        />

        <InfoStat
          icon={FiLayers}
          label="Average"
          value={formatSummaryValue(
            summary?.avg,
            activeMetric?.unit ? ` ${activeMetric.unit}` : "",
          )}
          hint="Mean value computed from all visible samples."
        />

        <InfoStat
          icon={FiActivity}
          label="Delta"
          value={formatSummaryValue(
            summary?.delta,
            activeMetric?.unit ? ` ${activeMetric.unit}` : "",
          )}
          hint="Difference between the first and last visible sample."
        />

        <InfoStat
          icon={FiClock}
          label="Samples"
          value={summary?.count ?? seriesPoints.length ?? 0}
          hint="Number of visible telemetry points used in the chart."
        />
      </div>
    </section>
  );
}
