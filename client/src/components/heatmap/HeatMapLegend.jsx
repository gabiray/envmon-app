import React from "react";
import { FiActivity, FiLayers, FiNavigation } from "react-icons/fi";

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
    <span className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content/80">
      <Icon className="text-primary" />
      {label}
    </span>
  );
}

export default function HeatMapLegend({
  layerMode = "none",
  metric = "temp_c",
  heatGrid = null,
  loading = false,
  errorText = "",
}) {
  const showTrack = layerMode === "track" || layerMode === "mixed";
  const showHeatmap = layerMode === "heatmap" || layerMode === "mixed";

  if (!showTrack && !showHeatmap && !loading && !errorText) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-base-300 bg-base-100/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {showTrack ? (
          <LayerChip icon={FiNavigation} label="Track layer" />
        ) : null}

        {showHeatmap ? (
          <LayerChip icon={FiActivity} label="Heatmap layer" />
        ) : null}
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
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs font-medium text-base-content/60">
            <FiLayers className="text-base-content/45" />
            {METRIC_LABELS[metric] || metric}
          </div>

          <div className="mt-3 h-3 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-red-500" />

          <div className="mt-2 flex items-center justify-between gap-4 text-xs text-base-content/65">
            <span>{formatValue(heatGrid?.value_min, metric)}</span>
            <span>{formatValue(heatGrid?.value_max, metric)}</span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-base-content/60">
            <span>
              Cells: {Array.isArray(heatGrid?.cells) ? heatGrid.cells.length : 0}
            </span>

            <span>
              Samples:{" "}
              {Array.isArray(heatGrid?.cells)
                ? heatGrid.cells.reduce(
                    (sum, cell) => sum + Number(cell?.samples || 0),
                    0
                  )
                : 0}
            </span>
          </div>
        </div>
      ) : null}

      {showTrack && !showHeatmap && !loading && !errorText ? (
        <div className="mt-3 text-xs text-base-content/60">
          The mission route is currently displayed on the globe.
        </div>
      ) : null}

      {layerMode === "mixed" && !loading && !errorText ? (
        <div className="mt-3 text-xs text-base-content/60">
          Track and heatmap are displayed together.
        </div>
      ) : null}
    </div>
  );
}
