import React, { useMemo, useState } from "react";
import { FiActivity } from "react-icons/fi";
import AnalyticsRechartsLineChart from "./AnalyticsRechartsLineChart";

function formatSummaryValue(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(3)}${suffix}`;
}

function Stat({ label, value, hint = "" }) {
  return (
    <div className="rounded-xl border border-base-300 px-3 py-2">
      <div className="text-xs text-base-content/50">{label}</div>
      <div className="text-sm font-semibold">{value ?? "—"}</div>
      {hint ? <div className="mt-1 text-[11px] text-base-content/45">{hint}</div> : null}
    </div>
  );
}

function SelectField({ value, onChange, options = [] }) {
  return (
    <select
      className="select select-bordered w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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

  smoothing,
  onSmoothingChange,

  metricOptions = [],
  rangeOptions = [],
  gpsFilterOptions = [],
  smoothingOptions = [],
}) {
  const [displayMode, setDisplayMode] = useState("line_points");
  const [yMinInput, setYMinInput] = useState("");
  const [yMaxInput, setYMaxInput] = useState("");
  const [yPaddingPct, setYPaddingPct] = useState(0.12);

  const activeMetric = useMemo(
    () => metricOptions.find((item) => item.value === metric) || null,
    [metricOptions, metric],
  );

  const chartSeries = useMemo(() => trendSeries || [], [trendSeries]);

  const yMinOverride =
    String(yMinInput).trim() === "" ? null : Number(yMinInput);
  const yMaxOverride =
    String(yMaxInput).trim() === "" ? null : Number(yMaxInput);

  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold">
            <FiActivity className="text-primary" />
            Mission trends
          </div>
          <div className="text-sm text-base-content/60 mt-1">
            Analyze sensor evolution over time for this mission
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <SelectField
          value={metric}
          onChange={onMetricChange}
          options={metricOptions}
        />

        <SelectField
          value={range}
          onChange={onRangeChange}
          options={rangeOptions}
        />

        <SelectField
          value={gpsFilter}
          onChange={onGpsFilterChange}
          options={gpsFilterOptions}
        />

        <SelectField
          value={smoothing}
          onChange={onSmoothingChange}
          options={smoothingOptions}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <SelectField
          value={displayMode}
          onChange={setDisplayMode}
          options={[
            { value: "line", label: "Thin line" },
            { value: "points", label: "Points only" },
            { value: "line_points", label: "Line + points" },
          ]}
        />

        <input
          className="input input-bordered w-full"
          type="number"
          step="0.001"
          placeholder="Custom Y min"
          value={yMinInput}
          onChange={(e) => setYMinInput(e.target.value)}
        />

        <input
          className="input input-bordered w-full"
          type="number"
          step="0.001"
          placeholder="Custom Y max"
          value={yMaxInput}
          onChange={(e) => setYMaxInput(e.target.value)}
        />

        <select
          className="select select-bordered w-full"
          value={String(yPaddingPct)}
          onChange={(e) => setYPaddingPct(Number(e.target.value))}
        >
          <option value="0.04">Tight Y scale</option>
          <option value="0.08">Medium Y scale</option>
          <option value="0.12">Comfortable Y scale</option>
          <option value="0.2">Wide Y scale</option>
        </select>
      </div>

      <div>
        {chartSeries?.length ? (
          <AnalyticsRechartsLineChart
            title={`${mission?.mission_name || "Mission"} trends`}
            xLabel="Time"
            yLabel={activeMetric?.label || "Metric value"}
            unit={activeMetric?.unit || ""}
            series={chartSeries}
            height={320}
            displayMode={displayMode}
            lineWidth={1.8}
            pointRadius={2.4}
            yMinOverride={yMinOverride}
            yMaxOverride={yMaxOverride}
            yPaddingPct={yPaddingPct}
            showLegend
          />
        ) : (
          <div className="text-sm text-base-content/50 text-center py-10">
            No data available for selected filters.
          </div>
        )}
      </div>

      {trendSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="Min"
            value={formatSummaryValue(
              trendSummary.min,
              activeMetric?.unit ? ` ${activeMetric.unit}` : "",
            )}
            hint="Lowest visible value"
          />
          <Stat
            label="Max"
            value={formatSummaryValue(
              trendSummary.max,
              activeMetric?.unit ? ` ${activeMetric.unit}` : "",
            )}
            hint="Highest visible value"
          />
          <Stat
            label="Avg"
            value={formatSummaryValue(
              trendSummary.avg,
              activeMetric?.unit ? ` ${activeMetric.unit}` : "",
            )}
            hint="Average on visible range"
          />
          <Stat
            label="Δ Change"
            value={formatSummaryValue(
              trendSummary.delta,
              activeMetric?.unit ? ` ${activeMetric.unit}` : "",
            )}
            hint="End minus start"
          />
        </div>
      ) : null}
    </section>
  );
}
