import React from "react";
import {
  FiActivity,
  FiCamera,
  FiClock,
  FiImage,
  FiMapPin,
  FiNavigation,
  FiX,
} from "react-icons/fi";

const METRIC_OPTIONS = [
  { value: "temp_c", label: "Temperature (°C)" },
  { value: "hum_pct", label: "Humidity (%)" },
  { value: "press_hpa", label: "Pressure (hPa)" },
  { value: "gas_ohms", label: "Gas resistance (Ω)" },
];

function formatEpoch(epoch) {
  if (!epoch) return "—";

  try {
    return new Date(epoch * 1000).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function CompactInfo({ label, value, icon: Icon = null, mono = false }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {Icon ? <Icon className="text-[12px]" /> : null}
        {label}
      </div>
      <div
        className={`mt-1 text-sm font-semibold text-base-content ${
          mono ? "font-mono break-all" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ActionButton({ active = false, icon: Icon, label, onClick = () => {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "btn btn-sm rounded-xl",
        active
          ? "btn-primary"
          : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
      ].join(" ")}
    >
      <Icon />
      {label}
    </button>
  );
}

export default function HeatMapMissionDetailsCard({
  mission = null,
  layerMode = "none",
  heatmapMetric = "temp_c",
  heatmapCellM = 15,
  onLayerModeChange = () => {},
  onHeatmapMetricChange = () => {},
  onHeatmapCellMChange = () => {},
  onClose = () => {},
}) {
  if (!mission) return null;

  return (
    <div className="rounded-[1.5rem] border border-base-300 bg-base-100/95 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-3 border-b border-base-300 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-base-content md:text-base">
            {mission.missionName}
          </div>
          <div className="mt-1 text-xs text-base-content/60 md:text-sm">
            {mission.deviceName} • {mission.profileLabel || mission.profileType}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm btn-circle"
          onClick={onClose}
          aria-label="Close mission details"
        >
          <FiX />
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
          <CompactInfo
            label="Mission ID"
            value={mission.missionId}
            mono
          />
          <CompactInfo label="Status" value={mission.status || "Unknown"} />
          <CompactInfo
            label="Started"
            value={formatEpoch(mission.startedAtEpoch)}
            icon={FiClock}
          />
          <CompactInfo
            label="Ended"
            value={formatEpoch(mission.endedAtEpoch)}
            icon={FiClock}
          />
          <CompactInfo
            label="GPS"
            value={mission.hasGps ? "Available" : "Missing"}
            icon={FiNavigation}
          />
          <CompactInfo
            label="Images"
            value={mission.hasImages ? "Available" : "Missing"}
            icon={FiImage}
          />
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 xl:grid-cols-[180px_minmax(0,1fr)]">
          <CompactInfo
            label="Location mode"
            value={mission.locationMode || "Unknown"}
            icon={FiMapPin}
          />
          <CompactInfo
            label="Coordinates"
            value={mission.locationLabel}
            mono
            icon={FiMapPin}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ActionButton
            active={layerMode === "track"}
            icon={FiNavigation}
            label="View track"
            onClick={() =>
              onLayerModeChange(layerMode === "track" ? "none" : "track")
            }
          />

          <ActionButton
            active={layerMode === "heatmap"}
            icon={FiActivity}
            label="View heatmap"
            onClick={() =>
              onLayerModeChange(layerMode === "heatmap" ? "none" : "heatmap")
            }
          />

          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-200 px-2.5 py-1 text-xs text-base-content/65">
            <FiCamera className="text-[12px]" />
            {mission.hasImages ? "Camera used" : "No images"}
          </span>
        </div>

        {layerMode === "heatmap" ? (
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-base-300 pt-3 md:grid-cols-[minmax(0,1fr)_130px]">
            <label className="form-control">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                Heatmap metric
              </div>
              <select
                className="select select-bordered w-full rounded-2xl"
                value={heatmapMetric}
                onChange={(e) => onHeatmapMetricChange(e.target.value)}
              >
                {METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                Cell size (m)
              </div>
              <input
                className="input input-bordered w-full rounded-2xl"
                type="number"
                min="2"
                step="1"
                value={heatmapCellM}
                onChange={(e) => onHeatmapCellMChange(Number(e.target.value) || 15)}
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
