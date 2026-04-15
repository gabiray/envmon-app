import React, { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiSettings,
  FiSliders,
} from "react-icons/fi";
import AnalyticsRechartsLineChart from "./AnalyticsRechartsLineChart";

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

function Stat({ label, value, hint = "" }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-base-content">
        {value ?? "—"}
      </div>
      {hint ? (
        <div className="mt-1 text-[11px] text-base-content/45">{hint}</div>
      ) : null}
    </div>
  );
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
  const [showLine, setShowLine] = useState(true);
  const [showPoints, setShowPoints] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const activeMetric = useMemo(() => {
    return (
      metricOptions.find((option) => option.value === metric) ||
      metricOptions[0] ||
      null
    );
  }, [metric, metricOptions]);

  const mainSeries = trendSeries?.[0] || null;
  const seriesPoints = Array.isArray(mainSeries?.points) ? mainSeries.points : [];

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
    showLine && showPoints
      ? "line_points"
      : showPoints
        ? "points"
        : "line";

  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 border-b border-base-300 pb-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-semibold">
            <FiActivity className="text-primary" />
            Mission trends
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            Analyze sensor evolution over time for this mission
          </div>
        </div>

        <button
          type="button"
          className="btn btn-sm rounded-xl border-base-300 bg-base-100 self-start"
          onClick={() => setAdvancedOpen((prev) => !prev)}
        >
          <FiSliders />
          Scale controls
          {advancedOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      <div className="rounded-3xl border border-base-300 bg-base-200/40 p-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SectionLabel>Data</SectionLabel>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            </div>
          </div>

          <div className="xl:col-span-4">
            <SectionLabel>Display</SectionLabel>

            <div className="flex flex-wrap gap-2">
              <ToggleChip
                active={showLine}
                label="Show line"
                onClick={handleToggleLine}
              />

              <ToggleChip
                active={showPoints}
                label="Show points"
                onClick={handleTogglePoints}
              />
            </div>

            <div className="mt-3 text-xs text-base-content/55">
              By default, the chart uses only the line for a cleaner view.
            </div>
          </div>
        </div>

        {advancedOpen ? (
          <div className="mt-5 rounded-3xl border border-base-300 bg-base-100 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
                  <FiSettings className="text-primary" />
                  Axis calibration
                </div>
                <div className="mt-1 text-sm text-base-content/60">
                  Fine-tune the visible Y range for the current metric.
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
      </div>

      <div>
        {trendSeries?.length ? (
          <AnalyticsRechartsLineChart
            title={`${activeMetric?.label || "Metric"} trend`}
            xLabel="Time"
            yLabel={activeMetric?.label || "Metric value"}
            unit={activeMetric?.unit || ""}
            series={trendSeries}
            height={360}
            displayMode={displayMode}
            lineWidth={2.35}
            pointRadius={2.6}
            yMinOverride={yMinOverride}
            yMaxOverride={yMaxOverride}
            yPaddingPct={0.1}
            showLegend={false}
            valueDecimals={3}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-base-300 bg-base-200/30 py-16 text-center text-sm text-base-content/55">
            No trend data available for this mission.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Min"
          value={formatSummaryValue(
            trendSummary?.min,
            activeMetric?.unit ? ` ${activeMetric.unit}` : "",
          )}
        />
        <Stat
          label="Max"
          value={formatSummaryValue(
            trendSummary?.max,
            activeMetric?.unit ? ` ${activeMetric.unit}` : "",
          )}
        />
        <Stat
          label="Average"
          value={formatSummaryValue(
            trendSummary?.avg,
            activeMetric?.unit ? ` ${activeMetric.unit}` : "",
          )}
        />
        <Stat
          label="Delta"
          value={formatSummaryValue(
            trendSummary?.delta,
            activeMetric?.unit ? ` ${activeMetric.unit}` : "",
          )}
          hint="Difference between first and last visible value"
        />
      </div>
    </section>
  );
}
