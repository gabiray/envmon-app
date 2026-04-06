import React from "react";
import {
  FiBarChart2,
  FiCalendar,
  FiClock,
  FiImage,
  FiLayers,
  FiMap,
  FiMapPin,
  FiNavigation,
  FiX,
} from "react-icons/fi";

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

function formatCoord(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(6);
}

function formatDuration(startEpoch, endEpoch) {
  if (!startEpoch || !endEpoch) return "—";
  const diff = Math.max(0, Number(endEpoch) - Number(startEpoch));
  if (diff < 60) return `${diff}s`;

  const min = Math.floor(diff / 60);
  const sec = diff % 60;
  if (min < 60) return `${min}m ${sec}s`;

  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function locationModeLabel(value) {
  if (value === "gps") return "GPS";
  if (value === "fixed") return "Fixed location";
  if (value === "none") return "None";
  return value || "Unknown";
}

function DetailCard({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-base-content/45">
        {Icon ? <Icon className="text-[13px]" /> : null}
        {label}
      </div>
      <div
        className={`mt-2 text-sm font-medium text-base-content ${
          mono ? "font-mono break-all" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default function MissionDetailsModal({
  open = false,
  mission = null,
  analyticsDisabled = false,
  heatmapDisabled = false,
  onClose = () => {},
  onOpenAnalytics = () => {},
  onOpenHeatmap = () => {},
}) {
  if (!open || !mission) return null;

  const locationLabel =
    mission.locationName ||
    (mission.start?.lat != null && mission.start?.lon != null
      ? `${formatCoord(mission.start.lat)}, ${formatCoord(mission.start.lon)}`
      : "—");

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-4xl rounded-[1.75rem] border border-base-300 bg-base-100 p-0 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-base-300 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-semibold text-base-content">
              <FiLayers className="text-primary" />
              Mission details
            </div>

            <div className="mt-1 truncate text-lg font-semibold text-base-content">
              {mission.missionName || mission.missionId}
            </div>

            <div className="mt-1 text-sm text-base-content/55">
              {mission.profileLabel || mission.profileType || "Mission"}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            aria-label="Close mission details"
          >
            <FiX />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailCard
              label="Mission name"
              value={mission.missionName || "—"}
            />

            <DetailCard
              label="Mission ID"
              value={mission.missionId || "—"}
              mono
            />

            <DetailCard
              icon={FiMapPin}
              label="Device UUID"
              value={mission.deviceUuid || "—"}
              mono
            />

            <DetailCard
              icon={FiCalendar}
              label="Started"
              value={formatEpoch(mission.startedAtEpoch)}
            />

            <DetailCard
              icon={FiCalendar}
              label="Ended"
              value={formatEpoch(mission.endedAtEpoch)}
            />

            <DetailCard
              icon={FiClock}
              label="Duration"
              value={formatDuration(mission.startedAtEpoch, mission.endedAtEpoch)}
            />

            <DetailCard
              icon={FiMapPin}
              label="Location mode"
              value={locationModeLabel(mission.locationMode)}
            />

            <DetailCard
              icon={FiMapPin}
              label="Location"
              value={locationLabel}
              mono={locationLabel !== "—" && !mission.locationName}
            />

            <DetailCard
              icon={FiNavigation}
              label="GPS"
              value={mission.hasGps ? "Available" : "Missing"}
            />

            <DetailCard
              icon={FiImage}
              label="Images"
              value={mission.hasImages ? "Available" : "None"}
            />

            <DetailCard
              label="Status"
              value={mission.status || "—"}
            />

            <DetailCard
              label="Stop reason"
              value={mission.stopReason || "—"}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-base-300 px-6 py-4">
          <button
            type="button"
            className="btn rounded-xl"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="btn rounded-xl border-base-300 bg-base-100"
            onClick={onOpenHeatmap}
            disabled={heatmapDisabled}
          >
            <FiMap />
            {heatmapDisabled ? "Already in HeatMap" : "Open in HeatMap"}
          </button>

          <button
            type="button"
            className="btn btn-primary rounded-xl border-none text-white"
            onClick={onOpenAnalytics}
            disabled={analyticsDisabled}
          >
            <FiBarChart2 />
            Open in Analytics
          </button>
        </div>
      </div>

      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
