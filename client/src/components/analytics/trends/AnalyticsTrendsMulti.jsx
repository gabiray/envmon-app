import React, { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiRefreshCw,
  FiSliders,
  FiBarChart2,
  FiTrendingUp,
  FiLayers,
  FiClock,
  FiMaximize2,
  FiSettings,
} from "react-icons/fi";
import AnalyticsMultiMissionChart from "../charts/AnalyticsMultiMissionChart";

function formatSummaryValue(value, suffix = "", decimals = 3) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(decimals)}${suffix}`;
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

          <div className="mt-0.5 text-xl font-bold leading-none text-base-content">
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

function computeSeriesStats(points = []) {
  const values = points
    .map((point) => Number(point?.y))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return { min: null, max: null, avg: null, delta: null, count: 0 };
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

function normalizeValue(rawValue, values, normalizeMode = "off", offset = 0) {
  const safeOffset = Number.isFinite(Number(offset)) ? Number(offset) : 0;
  const safeRaw = Number(rawValue);

  if (!Number.isFinite(safeRaw)) return null;

  let nextValue = safeRaw;

  if (normalizeMode === "minmax") {
    const min = Math.min(...values);
    const max = Math.max(...values);
    nextValue = max === min ? 0.5 : (safeRaw - min) / (max - min);
  } else if (normalizeMode === "baseline") {
    const baseline = values[0];
    nextValue = safeRaw - baseline;
  }

  return nextValue + safeOffset;
}

function computeDisplayedGlobalStats(
  series = [],
  normalizeMode = "off",
  offsetsBySeries = {},
) {
  const allValues = [];

  for (const item of series) {
    const key = item?.id || item?.label || "series";
    const offset = offsetsBySeries?.[key] ?? 0;
    const points = Array.isArray(item?.points) ? item.points : [];

    const rawValues = points
      .map((point) => Number(point?.y))
      .filter((value) => Number.isFinite(value));

    if (!rawValues.length) continue;

    for (const rawValue of rawValues) {
      const nextValue = normalizeValue(
        rawValue,
        rawValues,
        normalizeMode,
        offset,
      );

      if (Number.isFinite(nextValue)) {
        allValues.push(nextValue);
      }
    }
  }

  if (!allValues.length) {
    return { min: null, max: null, avg: null, delta: null, count: 0 };
  }

  const sum = allValues.reduce((acc, value) => acc + value, 0);

  return {
    min: Math.min(...allValues),
    max: Math.max(...allValues),
    avg: sum / allValues.length,
    delta: null,
    count: allValues.length,
  };
}

function buildDefaultOffsets(series = []) {
  const result = {};
  for (const item of series) {
    const key = item?.id || item?.label;
    if (!key) continue;
    result[key] = 0;
  }
  return result;
}

export default function AnalyticsTrendsMulti({
  missions = [],
  trendSeries = [],
  metric,
  onMetricChange,
  range,
  onRangeChange,
  gpsFilter,
  onGpsFilterChange,
  xAxisMode = "raw",
  onXAxisModeChange = () => {},
  metricOptions = [],
  rangeOptions = [],
  gpsFilterOptions = [],
}) {
  const [chartControlsOpen, setChartControlsOpen] = useState(false);
  const [showLine, setShowLine] = useState(true);
  const [showPoints, setShowPoints] = useState(false);
  const [brushEnabled, setBrushEnabled] = useState(true);
  const [smoothMode, setSmoothMode] = useState("off");
  const [normalizeMode, setNormalizeMode] = useState("off");
  const [offsetsBySeries, setOffsetsBySeries] = useState({});
  const [yMinInput, setYMinInput] = useState("");
  const [yMaxInput, setYMaxInput] = useState("");

  const activeMetric = useMemo(() => {
    return (
      metricOptions.find((option) => option.value === metric) ||
      metricOptions[0] ||
      null
    );
  }, [metric, metricOptions]);

  useEffect(() => {
    setOffsetsBySeries((prev) => {
      const next = buildDefaultOffsets(trendSeries);
      for (const key of Object.keys(next)) {
        if (Number.isFinite(Number(prev?.[key]))) {
          next[key] = Number(prev[key]);
        }
      }
      return next;
    });
  }, [trendSeries]);

  const detectedStats = useMemo(() => {
    return computeDisplayedGlobalStats(
      trendSeries,
      normalizeMode,
      offsetsBySeries,
    );
  }, [trendSeries, normalizeMode, offsetsBySeries]);

  useEffect(() => {
    setYMinInput(formatAxisValue(detectedStats.min));
    setYMaxInput(formatAxisValue(detectedStats.max));
  }, [
    detectedStats.min,
    detectedStats.max,
    metric,
    range,
    gpsFilter,
    normalizeMode,
    offsetsBySeries,
  ]);

  const parsedYMin = Number(yMinInput);
  const parsedYMax = Number(yMaxInput);

  const yMinOverride = Number.isFinite(parsedYMin) ? parsedYMin : null;
  const yMaxOverride = Number.isFinite(parsedYMax) ? parsedYMax : null;

  function handleResetScale() {
    setYMinInput(formatAxisValue(detectedStats.min));
    setYMaxInput(formatAxisValue(detectedStats.max));
  }

  function handleToggleLine() {
    if (showLine && !showPoints) return;
    setShowLine((prev) => !prev);
  }

  function handleTogglePoints() {
    if (showPoints && !showLine) return;
    setShowPoints((prev) => !prev);
  }

  function handleOffsetChange(seriesKey, nextValue) {
    setOffsetsBySeries((prev) => ({
      ...prev,
      [seriesKey]: nextValue,
    }));
  }

  function handleResetOffsets() {
    setOffsetsBySeries(buildDefaultOffsets(trendSeries));
  }

  const displayMode =
    showLine && showPoints
      ? "line_points"
      : showPoints
        ? "points"
        : "line";

  const missionCount = missions?.length || trendSeries?.length || 0;

  const xModeText =
    xAxisMode === "raw"
      ? "the original mission X values"
      : xAxisMode === "progress"
        ? "mission progress"
        : xAxisMode === "distance"
          ? "route distance"
          : "elapsed mission time";

  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 border-b border-base-300 pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-semibold">
            <FiActivity className="text-primary" />
            Mission comparison trends
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            Compare the same metric across multiple missions on a shared chart.
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-base-300 bg-base-200/35 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
          <FiSettings className="text-primary" />
          Selected data
        </div>
        <div className="mt-1 text-sm text-base-content/60">
          Choose the metric, range, normalization and X-axis comparison mode.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-6">
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
            label="Normalization"
            value={normalizeMode}
            onChange={setNormalizeMode}
            options={[
              { value: "off", label: "No normalization" },
              { value: "minmax", label: "Min-max normalization" },
              { value: "baseline", label: "Relative to first value" },
            ]}
          />

          <SelectField
            label="X axis mode"
            value={xAxisMode}
            onChange={onXAxisModeChange}
            options={[
              { value: "raw", label: "Original X values" },
              { value: "time", label: "Elapsed time" },
              { value: "progress", label: "Mission progress (%)" },
              { value: "distance", label: "Route distance" },
            ]}
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
              {activeMetric?.label || "Metric"} comparison
            </div>
            <div className="mt-1 text-sm text-base-content/60">
              {activeMetric?.label || "Metric"}
              {activeMetric?.unit ? ` (${activeMetric.unit})` : ""} compared across{" "}
              {missionCount} selected mission{missionCount === 1 ? "" : "s"} by{" "}
              {xModeText}.
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
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-5 rounded-3xl border border-base-300 bg-base-200/35 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
                    <FiMaximize2 className="text-primary" />
                    Axis calibration
                  </div>
                  <div className="mt-1 text-sm text-base-content/60">
                    Fine-tune the visible Y range for the comparison chart.
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
                {normalizeMode === "off" ? "Detected range" : "Displayed range"}:{" "}
                <span className="font-semibold text-base-content">
                  {formatSummaryValue(
                    detectedStats.min,
                    normalizeMode === "off" && activeMetric?.unit
                      ? ` ${activeMetric.unit}`
                      : "",
                  )}
                </span>
                {" — "}
                <span className="font-semibold text-base-content">
                  {formatSummaryValue(
                    detectedStats.max,
                    normalizeMode === "off" && activeMetric?.unit
                      ? ` ${activeMetric.unit}`
                      : "",
                  )}
                </span>
              </div>
            </div>

            <div className="xl:col-span-7 rounded-3xl border border-base-300 bg-base-200/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-base-content">
                    Mission offsets
                  </div>
                  <div className="mt-1 text-sm text-base-content/60">
                    Use offsets when two missions overlap too closely on the chart.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                  onClick={handleResetOffsets}
                >
                  <FiRefreshCw />
                  Reset offsets
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {trendSeries.map((seriesItem) => {
                  const seriesKey = seriesItem?.id || seriesItem?.label || "series";
                  const stats = computeSeriesStats(seriesItem?.points || []);

                  return (
                    <div
                      key={seriesKey}
                      className="rounded-2xl border border-base-300 bg-base-100 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: seriesItem?.color || "#2563eb" }}
                        />
                        <div className="min-w-0 truncate text-sm font-semibold text-base-content">
                          {seriesItem?.label || seriesKey}
                        </div>
                      </div>

                      <div className="mt-3">
                        <NumberField
                          label="Offset"
                          value={offsetsBySeries?.[seriesKey] ?? 0}
                          onChange={(value) => handleOffsetChange(seriesKey, value)}
                          step="0.01"
                          placeholder="0"
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-base-content/60">
                        <div>
                          <div className="uppercase tracking-wide text-base-content/40">
                            Min
                          </div>
                          <div className="mt-1 font-medium text-base-content">
                            {formatSummaryValue(stats.min)}
                          </div>
                        </div>

                        <div>
                          <div className="uppercase tracking-wide text-base-content/40">
                            Max
                          </div>
                          <div className="mt-1 font-medium text-base-content">
                            {formatSummaryValue(stats.max)}
                          </div>
                        </div>

                        <div>
                          <div className="uppercase tracking-wide text-base-content/40">
                            Avg
                          </div>
                          <div className="mt-1 font-medium text-base-content">
                            {formatSummaryValue(stats.avg)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          {trendSeries?.length ? (
            <AnalyticsMultiMissionChart
              metricLabel={activeMetric?.label || "Metric value"}
              unit={activeMetric?.unit || ""}
              series={trendSeries}
              displayMode={displayMode}
              smoothMode={smoothMode}
              normalizeMode={normalizeMode}
              offsetsBySeries={offsetsBySeries}
              brushEnabled={brushEnabled}
              yMinOverride={yMinOverride}
              yMaxOverride={yMaxOverride}
              valueDecimals={3}
              xAxisMode={xAxisMode}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-base-300 bg-base-200/30 py-16 text-center text-sm text-base-content/55">
              No comparison data available for the selected missions.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <InfoStat
          icon={FiBarChart2}
          label="Minimum"
          value={formatSummaryValue(
            detectedStats.min,
            normalizeMode === "off" && activeMetric?.unit
              ? ` ${activeMetric.unit}`
              : "",
          )}
          hint="Lowest visible value across all compared missions."
        />

        <InfoStat
          icon={FiTrendingUp}
          label="Maximum"
          value={formatSummaryValue(
            detectedStats.max,
            normalizeMode === "off" && activeMetric?.unit
              ? ` ${activeMetric.unit}`
              : "",
          )}
          hint="Highest visible value across all compared missions."
        />

        <InfoStat
          icon={FiLayers}
          label="Average"
          value={formatSummaryValue(
            detectedStats.avg,
            normalizeMode === "off" && activeMetric?.unit
              ? ` ${activeMetric.unit}`
              : "",
          )}
          hint="Mean value computed from all visible mission samples."
        />

        <InfoStat
          icon={FiActivity}
          label="Missions"
          value={missionCount}
          hint="Number of missions currently compared on the chart."
        />

        <InfoStat
          icon={FiClock}
          label="Samples"
          value={detectedStats.count}
          hint="Visible telemetry points included in the comparison."
        />
      </div>
    </section>
  );
}
