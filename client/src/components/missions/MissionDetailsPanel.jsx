import React from "react";
import {
  FiX,
  FiDownload,
  FiMap,
  FiBarChart2,
  FiEdit2,
  FiTrash2,
  FiNavigation,
  FiCamera,
  FiMapPin,
  FiClock,
  FiCpu,
  FiAlertCircle,
  FiCheckCircle,
  FiSlash,
  FiActivity,
} from "react-icons/fi";

function formatDateTime(epoch) {
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

function formatDuration(startEpoch, endEpoch) {
  if (!startEpoch || !endEpoch) return "—";
  const diffS = Math.round(endEpoch - startEpoch);
  if (diffS < 60) return `${diffS}s`;
  const m = Math.floor(diffS / 60);
  const s = diffS % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function StatusBadge({ status }) {
  const key = String(status || "").toUpperCase();

  const map = {
    COMPLETED: {
      label: "Completed",
      cls: "border-success/30 bg-success/10 text-success",
      Icon: FiCheckCircle,
    },
    ABORTED: {
      label: "Aborted",
      cls: "border-error/30 bg-error/10 text-error",
      Icon: FiSlash,
    },
    ERROR: {
      label: "Error",
      cls: "border-error/30 bg-error/10 text-error",
      Icon: FiAlertCircle,
    },
    RUNNING: {
      label: "Running",
      cls: "border-info/30 bg-info/10 text-info",
      Icon: FiActivity,
    },
  };

  const meta = map[key] || {
    label: status || "Unknown",
    cls: "border-base-300 bg-base-200 text-base-content/70",
    Icon: FiClock,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.cls}`}
    >
      <meta.Icon className="text-[11px]" />
      {meta.label}
    </span>
  );
}

function DetailRow({ label, value, mono = false, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-base-200/70 last:border-0">
      <span className="text-xs font-medium text-base-content/50 shrink-0 w-28">
        {label}
      </span>
      <span
        className={[
          "text-sm text-right text-base-content",
          mono ? "font-mono text-xs break-all" : "font-medium",
        ].join(" ")}
      >
        {children ?? value}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-200/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-base-200">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
          {title}
        </div>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

export default function MissionDetailsPanel({
  mission = null,
  details = null,
  loading = false,
  deviceConnected = false,
  onClose = () => {},
  onOpenHeatmap = () => {},
  onOpenAnalytics = () => {},
  onDownload = () => {},
  onRename = () => {},
  onDelete = () => {},
  onDeleteFromDevice = () => {},
}) {
  if (!mission) return null;

  const locationCoords =
    details?.start?.lat != null && details?.start?.lon != null
      ? `${Number(details.start.lat).toFixed(6)}, ${Number(details.start.lon).toFixed(6)}`
      : mission.location_label !== "Unknown"
      ? mission.location_label
      : null;

  const locationMode =
    mission.location_mode === "fixed"
      ? "Fixed point"
      : mission.location_mode === "gps"
      ? "GPS live"
      : mission.location_mode || "Unknown";

  const canDeleteFromDevice = mission.on_device && deviceConnected;

  return (
    <div className="flex h-full flex-col bg-base-100">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-base-300">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-base-content leading-tight">
            {mission.mission_name}
          </div>
          <div className="mt-1 font-mono text-[11px] text-base-content/40 truncate">
            {mission.mission_id}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle shrink-0"
          aria-label="Close"
        >
          <FiX />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
        {/* Status + Source row */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={mission.status} />
          <span
            className={[
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
              mission.source === "synced"
                ? "border-success/30 bg-success/10 text-success"
                : mission.source === "device"
                ? "border-warning/30 bg-warning/10 text-warning"
                : "border-info/30 bg-info/10 text-info",
            ].join(" ")}
          >
            {mission.source === "synced"
              ? "Synced"
              : mission.source === "device"
              ? "Device only"
              : "Database"}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-200/50 px-4 py-5 text-sm text-base-content/60">
            <span className="loading loading-spinner loading-sm" />
            Loading details...
          </div>
        ) : (
          <>
            {/* General info */}
            <Section title="General">
              <DetailRow label="Profile">{mission.profile_label || "—"}</DetailRow>
              <DetailRow label="Device">{mission.device_uuid ? (
                <span className="text-right">
                  <span className="block">{mission.raw?.device_uuid?.slice(0, 8) || "—"}</span>
                </span>
              ) : "—"}</DetailRow>
              <DetailRow label="Started">{formatDateTime(details?.started_at_epoch ?? mission.date_epoch)}</DetailRow>
              {details?.ended_at_epoch && (
                <DetailRow label="Ended">{formatDateTime(details.ended_at_epoch)}</DetailRow>
              )}
              {details?.started_at_epoch && details?.ended_at_epoch && (
                <DetailRow label="Duration">
                  {formatDuration(details.started_at_epoch, details.ended_at_epoch)}
                </DetailRow>
              )}
              {details?.stop_reason && (
                <DetailRow label="Stop reason">
                  <span className="capitalize">{details.stop_reason.toLowerCase()}</span>
                </DetailRow>
              )}
            </Section>

            {/* Location */}
            <Section title="Location">
              <DetailRow label="Mode">{locationMode}</DetailRow>
              {locationCoords && (
                <DetailRow label="Coordinates" mono>
                  {locationCoords}
                </DetailRow>
              )}
              {details?.start?.alt_m != null && (
                <DetailRow label="Altitude">{Number(details.start.alt_m).toFixed(1)} m</DetailRow>
              )}
            </Section>

            {/* Data */}
            <Section title="Collected data">
              <DetailRow label="Telemetry">
                {details?.telemetry_count != null
                  ? `${details.telemetry_count.toLocaleString()} samples`
                  : "—"}
              </DetailRow>
              <DetailRow label="Images">
                {details?.image_count != null ? `${details.image_count} photos` : "—"}
              </DetailRow>
              <DetailRow label="GPS data">
                <span className={mission.has_gps ? "text-success" : "text-base-content/50"}>
                  {mission.has_gps ? "Available" : "Not recorded"}
                </span>
              </DetailRow>
              <DetailRow label="Photos">
                <span className={mission.has_images ? "text-success" : "text-base-content/50"}>
                  {mission.has_images ? "Available" : "Not recorded"}
                </span>
              </DetailRow>
            </Section>
          </>
        )}

        {/* Mission profile params */}
        {details?.profile && Object.keys(details.profile).length > 0 && (
          <Section title="Mission parameters">
            {details.profile.duration_s != null && (
              <DetailRow label="Duration">{details.profile.duration_s}s</DetailRow>
            )}
            {details.profile.sample_hz != null && (
              <DetailRow label="Sample rate">{details.profile.sample_hz} Hz</DetailRow>
            )}
            {details.profile.camera_mode && (
              <DetailRow label="Camera">
                <span className="capitalize">{details.profile.camera_mode}</span>
              </DetailRow>
            )}
            {details.profile.gps_mode && (
              <DetailRow label="GPS mode">
                <span className="capitalize">{details.profile.gps_mode.replace("_", " ")}</span>
              </DetailRow>
            )}
          </Section>
        )}
      </div>

      {/* Actions footer */}
      <div className="px-5 py-4 border-t border-base-300 space-y-2">
        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-xl gap-1.5"
            onClick={onOpenHeatmap}
          >
            <FiMap className="text-sm" />
            HeatMap
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm rounded-xl gap-1.5"
            onClick={onOpenAnalytics}
          >
            <FiBarChart2 className="text-sm" />
            Analytics
          </button>
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-xl gap-1.5 border border-base-300"
            onClick={onDownload}
          >
            <FiDownload className="text-sm" />
            Download
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-xl gap-1.5 border border-base-300"
            onClick={onRename}
          >
            <FiEdit2 className="text-sm" />
            Rename
          </button>
        </div>

        {/* Danger zone */}
        <div className="pt-1 space-y-1.5">
          {canDeleteFromDevice && (
            <button
              type="button"
              className="btn btn-outline btn-error btn-sm w-full rounded-xl gap-1.5"
              onClick={onDeleteFromDevice}
            >
              <FiTrash2 className="text-sm" />
              Delete from device
            </button>
          )}
          <button
            type="button"
            className={[
              "btn btn-sm w-full rounded-xl gap-1.5",
              mission.in_db
                ? "btn-error btn-outline"
                : "btn-ghost border border-base-300 text-base-content/50 cursor-not-allowed",
            ].join(" ")}
            onClick={mission.in_db ? onDelete : undefined}
            disabled={!mission.in_db}
            title={!mission.in_db ? "Not in database" : "Delete from database"}
          >
            <FiTrash2 className="text-sm" />
            Delete from database
          </button>
        </div>
      </div>
    </div>
  );
}
