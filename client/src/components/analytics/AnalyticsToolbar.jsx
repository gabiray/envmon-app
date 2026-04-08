import React from "react";
import { FiLayers } from "react-icons/fi";

function ToolbarSelect({ label, value, onChange, options = [] }) {
  return (
    <label className="form-control w-full">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>

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

export default function AnalyticsToolbar({
  metric,
  onMetricChange,
  metricOptions = [],
  rangePreset,
  onRangePresetChange,
  rangeOptions = [],
  compareMode,
  onCompareModeChange,
  compareOptions = [],
  smoothing,
  onSmoothingChange,
  smoothingOptions = [],
  gpsFilter,
  onGpsFilterChange,
  gpsFilterOptions = [],
}) {
  return (
    <section className="rounded-3xl border border-base-300 bg-base-100 shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <FiLayers className="text-base" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-semibold text-base-content">
              Filters
            </div>
            <div className="mt-1 text-sm text-base-content/60">
              These controls affect trend, air-quality and mobility analysis.
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <ToolbarSelect
            label="Metric"
            value={metric}
            onChange={onMetricChange}
            options={metricOptions}
          />

          <ToolbarSelect
            label="Time range"
            value={rangePreset}
            onChange={onRangePresetChange}
            options={rangeOptions}
          />

          <ToolbarSelect
            label="Compare mode"
            value={compareMode}
            onChange={onCompareModeChange}
            options={compareOptions}
          />

          <ToolbarSelect
            label="Smoothing"
            value={smoothing}
            onChange={onSmoothingChange}
            options={smoothingOptions}
          />

          <ToolbarSelect
            label="GPS filter"
            value={gpsFilter}
            onChange={onGpsFilterChange}
            options={gpsFilterOptions}
          />
        </div>
      </div>
    </section>
  );
}
