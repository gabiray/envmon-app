import React, { useMemo, useState } from "react";
import { FiBarChart2 } from "react-icons/fi";
import AnalyticsRechartsLineChart from "./AnalyticsRechartsLineChart";

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

export default function AnalyticsTrendsMulti({
  missions,
  missionSeries = [],

  metric,
  onMetricChange,

  compareMode,
  onCompareModeChange,

  smoothing,
  onSmoothingChange,

  range,
  onRangeChange,

  gpsFilter,
  onGpsFilterChange,

  metricOptions = [],
  compareOptions = [],
  smoothingOptions = [],
  rangeOptions = [],
  gpsFilterOptions = [],
}) {
  const [displayMode, setDisplayMode] = useState("line");
  const [seriesOffsetMode, setSeriesOffsetMode] = useState("off");
  const [yPaddingPct, setYPaddingPct] = useState(0.12);

  const activeMetric = useMemo(
    () => metricOptions.find((item) => item.value === metric) || null,
    [metricOptions, metric],
  );

  const seriesOffsetStep = useMemo(() => {
    if (seriesOffsetMode === "small") return 0.15;
    if (seriesOffsetMode === "medium") return 0.35;
    if (seriesOffsetMode === "large") return 0.7;
    return 0;
  }, [seriesOffsetMode]);

  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm space-y-5">
      <div>
        <div className="flex items-center gap-2 text-base font-semibold">
          <FiBarChart2 className="text-primary" />
          Comparative trends
        </div>
        <div className="text-sm text-base-content/60 mt-1">
          Compare multiple missions and separate overlapping series when needed
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
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
          value={compareMode}
          onChange={onCompareModeChange}
          options={compareOptions}
        />

        <SelectField
          value={smoothing}
          onChange={onSmoothingChange}
          options={smoothingOptions}
        />

        <SelectField
          value={gpsFilter}
          onChange={onGpsFilterChange}
          options={gpsFilterOptions}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <SelectField
          value={displayMode}
          onChange={setDisplayMode}
          options={[
            { value: "line", label: "Thin lines" },
            { value: "points", label: "Points only" },
            { value: "line_points", label: "Line + points" },
          ]}
        />

        <SelectField
          value={seriesOffsetMode}
          onChange={setSeriesOffsetMode}
          options={[
            { value: "off", label: "No series separation" },
            { value: "small", label: "Small separation" },
            { value: "medium", label: "Medium separation" },
            { value: "large", label: "Large separation" },
          ]}
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
        {missionSeries?.length ? (
          <AnalyticsRechartsLineChart
            title="Comparative trends"
            xLabel={compareMode === "normalized" ? "Relative time" : "Time"}
            yLabel={activeMetric?.label || "Metric value"}
            unit={activeMetric?.unit || ""}
            series={missionSeries}
            height={340}
            displayMode={displayMode}
            lineWidth={1.7}
            pointRadius={2.2}
            yPaddingPct={yPaddingPct}
            showLegend
            seriesOffsetStep={seriesOffsetStep}
          />
        ) : (
          <div className="text-sm text-base-content/50 text-center py-10">
            No comparable data available.
          </div>
        )}
      </div>
    </section>
  );
}
