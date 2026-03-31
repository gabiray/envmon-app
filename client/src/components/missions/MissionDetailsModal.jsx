import React from "react";
import { FiDownload, FiLayers, FiMap, FiX } from "react-icons/fi";

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

function getProfileLabel(profileType, profiles = []) {
  const found = profiles.find((item) => item.type === profileType);
  return found?.label || profileType || "Unknown";
}

function MissionSourceBadge({ source }) {
  if (source === "synced") {
    return (
      <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
        Synced
      </span>
    );
  }

  if (source === "device") {
    return (
      <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
        Device
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-info/30 bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
      Database
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-base-300/60 py-2 last:border-b-0">
      <span className="text-sm text-base-content/60">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function MissionDetailsModal({
  open = false,
  mission = null,
  details = null,
  loading = false,
  profiles = [],
  onClose = () => {},
  onOpenHeatmap = () => {},
  onOpenAnalytics = () => {},
  onDownload = () => {},
}) {
  if (!open || !mission) return null;

  const resolvedProfile =
    details?.profile_label ||
    mission.profile_label ||
    getProfileLabel(mission.profile_type, profiles);

  const telemetryCount = details?.telemetry_count ?? "—";
  const imageCount = details?.image_count ?? "—";

  const locationLabel =
    details?.start?.lat != null && details?.start?.lon != null
      ? `${Number(details.start.lat).toFixed(5)}, ${Number(details.start.lon).toFixed(5)}`
      : mission.location_label;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-3xl rounded-[28px] border border-base-300 bg-base-100 p-0 shadow-2xl">
        <div className="border-b border-base-300 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-semibold">
                  {mission.mission_name}
                </h3>
                <MissionSourceBadge source={mission.source} />
              </div>

              <p className="mt-1 text-sm text-base-content/60">
                Mission details and quick actions
              </p>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
              aria-label="Close"
            >
              <FiX />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-200 px-4 py-4 text-sm">
              <span className="loading loading-spinner loading-sm" />
              Loading mission details...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-base-300 bg-base-200/50 p-4">
                <div className="mb-3 text-sm font-semibold">General</div>

                <InfoRow label="Mission ID" value={mission.mission_id} />
                <InfoRow label="Profile" value={resolvedProfile} />
                <InfoRow label="Location" value={locationLabel} />
                <InfoRow
                  label="Date"
                  value={formatDateTime(details?.started_at_epoch || mission.date_epoch)}
                />
                <InfoRow label="Status" value={details?.status || mission.status || "—"} />
              </div>

              <div className="rounded-2xl border border-base-300 bg-base-200/50 p-4">
                <div className="mb-3 text-sm font-semibold">Mission data</div>

                <InfoRow label="Telemetry samples" value={telemetryCount} />
                <InfoRow label="Images" value={imageCount} />
                <InfoRow label="GPS" value={mission.has_gps ? "Available" : "No GPS"} />
                <InfoRow
                  label="Photos"
                  value={mission.has_images ? "Available" : "No photos"}
                />
                <InfoRow
                  label="Source"
                  value={
                    mission.source === "synced"
                      ? "Device + Database"
                      : mission.source === "device"
                        ? "Device"
                        : "Database"
                  }
                />
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-primary rounded-2xl px-4"
              onClick={onOpenHeatmap}
            >
              <FiMap />
              Open HeatMap
            </button>

            <button
              type="button"
              className="btn btn-outline rounded-2xl px-4"
              onClick={onOpenAnalytics}
            >
              <FiLayers />
              Open Analytics
            </button>

            <button
              type="button"
              className="btn btn-ghost rounded-2xl px-4"
              onClick={onDownload}
            >
              <FiDownload />
              Download
            </button>
          </div>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  );
}
