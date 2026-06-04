import React from "react";
import {
  FiActivity,
  FiCamera,
  FiChevronDown,
  FiChevronUp,
  FiLayers,
  FiNavigation,
} from "react-icons/fi";

const METRIC_LABELS = {
  temp_c: "Temperature",
  hum_pct: "Humidity",
  press_hpa: "Pressure",
  gas_ohms: "Gas resistance",
};

const METRIC_UNITS = {
  temp_c: "°C",
  hum_pct: "%",
  press_hpa: "hPa",
  gas_ohms: "Ω",
};

function formatValue(value, metric) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const unit = METRIC_UNITS[metric] || "";
  return `${Number(value).toFixed(2)} ${unit}`.trim();
}

function LayerChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-xs font-medium text-base-content/75">
      <Icon className="text-primary" />
      {label}
    </span>
  );
}

export default function HeatMapLegend({
  layerMode = "none",
  metric = "temp_c",
  heatGrid = null,
  imagePoints = [],
  loading = false,
  errorText = "",
  showCaptures = false,
  collapsed = false,
  onToggleCollapsed = () => {},
}) {
  const showTrack = layerMode === "track" || layerMode === "mixed";
  const showHeatmap = layerMode === "heatmap" || layerMode === "mixed";

  if (!showTrack && !showHeatmap && !showCaptures && !loading && !errorText) {
    return null;
  }

  const metricLabel = METRIC_LABELS[metric] || metric;

  const cellsCount = Array.isArray(heatGrid?.cells) ? heatGrid.cells.length : 0;

  const samplesCount = Array.isArray(heatGrid?.cells)
    ? heatGrid.cells.reduce((sum, cell) => sum + Number(cell?.samples || 0), 0)
    : 0;

  const captureCount = Array.isArray(imagePoints) ? imagePoints.length : 0;

  const minText = formatValue(heatGrid?.value_min, metric);
  const maxText = formatValue(heatGrid?.value_max, metric);

  let summaryText = "No visible layers";

  if (loading) {
    summaryText = "Loading layer data...";
  } else if (errorText) {
    summaryText = "Layer error";
  } else if (showHeatmap) {
    summaryText = `${metricLabel} • ${minText} – ${maxText}`;
  } else if (showTrack && showCaptures) {
    summaryText = `Track • ${captureCount} captures`;
  } else if (showCaptures) {
    summaryText = `${captureCount} capture points`;
  } else if (showTrack) {
    summaryText = "Track visible";
  }

  if (collapsed) {
    return (
      <button
        type="button"
        className={[
          "group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl",
          "border border-base-300/40 bg-base-100/30 p-0 shadow-sm backdrop-blur-md",
          "transition-all duration-300 hover:w-[280px] hover:justify-start hover:bg-base-100/85 hover:px-3",
        ].join(" ")}
        onClick={onToggleCollapsed}
        title="Open legend"
        aria-label="Open map legend"
      >
        <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <FiLayers className="text-base" />
        </div>

        <div className="ml-0 max-w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:max-w-[210px] group-hover:opacity-100">
          <div className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.16em] text-base-content/45">
            Legend
          </div>

          <div className="max-w-[200px] truncate whitespace-nowrap text-sm font-semibold text-base-content">
            {summaryText}
          </div>
        </div>

        {loading ? (
          <span className="absolute right-3 loading loading-spinner loading-xs opacity-0 transition-opacity duration-300 group-hover:opacity-70" />
        ) : (
          <FiChevronDown className="absolute right-3 text-base-content/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        )}
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-base-300 bg-base-100/98 p-3.5 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
            <FiLayers className="text-primary" />
            Map legend
          </div>

          <div className="mt-1 truncate text-xs text-base-content/55">
            {summaryText}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle"
          onClick={onToggleCollapsed}
          title="Minimize legend"
          aria-label="Minimize legend"
        >
          <FiChevronUp />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {showTrack ? <LayerChip icon={FiNavigation} label="Track" /> : null}

        {showHeatmap ? <LayerChip icon={FiActivity} label="Heatmap" /> : null}

        {showCaptures ? <LayerChip icon={FiCamera} label="Captures" /> : null}
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-base-content/60">
          <span className="loading loading-spinner loading-xs" />
          Loading layer data...
        </div>
      ) : null}

      {errorText ? (
        <div className="mt-3 rounded-2xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {errorText}
        </div>
      ) : null}

      {showHeatmap && !loading && !errorText ? (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-base-content/60">
            <FiLayers className="text-base-content/45" />
            {metricLabel}
          </div>

          <div className="mt-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-red-500" />

          <div className="mt-2 flex items-center justify-between gap-4 text-xs text-base-content/65">
            <span>{minText}</span>
            <span>{maxText}</span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-base-content/60">
            <div className="rounded-xl bg-base-200/55 px-2.5 py-2">
              <div className="text-[10px] uppercase tracking-[0.12em] text-base-content/40">
                Cells
              </div>
              <div className="mt-0.5 font-semibold text-base-content/75">
                {cellsCount}
              </div>
            </div>

            <div className="rounded-xl bg-base-200/55 px-2.5 py-2">
              <div className="text-[10px] uppercase tracking-[0.12em] text-base-content/40">
                Samples
              </div>
              <div className="mt-0.5 font-semibold text-base-content/75">
                {samplesCount}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showCaptures && !loading && !errorText ? (
        <div className="mt-2.5 rounded-xl bg-base-200/55 px-2.5 py-2 text-xs text-base-content/65">
          Capture points:{" "}
          <span className="font-semibold text-base-content/80">
            {captureCount}
          </span>
        </div>
      ) : null}

      {showTrack && !showHeatmap && !showCaptures && !loading && !errorText ? (
        <div className="mt-2.5 rounded-xl bg-base-200/55 px-2.5 py-2 text-xs text-base-content/60">
          Mission route is currently displayed.
        </div>
      ) : null}
    </div>
  );
}
