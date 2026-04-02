import React from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiCamera,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit2,
  FiMap,
  FiMapPin,
  FiSlash,
  FiTrash2,
  FiX,
} from "react-icons/fi";

function formatDate(epoch) {
  if (!epoch) return "—";
  try {
    return new Date(epoch * 1000).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatTime(epoch) {
  if (!epoch) return "—";
  try {
    return new Date(epoch * 1000).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function formatDateTime(epoch) {
  if (!epoch) return "—";
  try {
    return new Date(epoch * 1000).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function formatDuration(startEpoch, endEpoch) {
  if (!startEpoch || !endEpoch) return "—";

  const diff = Math.max(0, Math.round(endEpoch - startEpoch));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatCoords(lat, lon, digits = 5) {
  if (lat == null || lon == null) return "Coordinates unavailable";
  return `${Number(lat).toFixed(digits)}, ${Number(lon).toFixed(digits)}`;
}

function getSourceMeta(source) {
  if (source === "synced") {
    return {
      label: "Synced",
      cls: "border-success/25 bg-success/10 text-success",
    };
  }

  if (source === "device") {
    return {
      label: "Device",
      cls: "border-warning/25 bg-warning/10 text-warning",
    };
  }

  return {
    label: "Database",
    cls: "border-info/25 bg-info/10 text-info",
  };
}

function getStatusMeta(status) {
  const key = String(status || "").toUpperCase();

  const map = {
    COMPLETED: {
      label: "Completed",
      cls: "border-success/25 bg-success/10 text-success",
      Icon: FiCheckCircle,
    },
    ABORTED: {
      label: "Aborted",
      cls: "border-error/25 bg-error/10 text-error",
      Icon: FiSlash,
    },
    ERROR: {
      label: "Error",
      cls: "border-error/25 bg-error/10 text-error",
      Icon: FiAlertCircle,
    },
    RUNNING: {
      label: "Running",
      cls: "border-info/25 bg-info/10 text-info",
      Icon: FiActivity,
    },
  };

  return (
    map[key] || {
      label: status || "Unknown",
      cls: "border-base-300 bg-base-200 text-base-content/65",
      Icon: FiClock,
    }
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-[22px] border border-base-300 bg-base-200/35">
      <div className="border-b border-base-300 px-5 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
          {title}
        </div>
      </div>
      <div className="px-5 py-2">{children}</div>
    </section>
  );
}

function Row({ label, value, mono = false, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-base-200/80 py-3 last:border-b-0">
      <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-base-content/45">
        {label}
      </span>

      <div
        className={[
          "min-w-0 text-right text-sm text-base-content",
          mono ? "font-mono text-[12px] break-all" : "font-medium",
        ].join(" ")}
      >
        {children ?? value}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-[20px] border border-base-300 bg-base-100 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-base-content">{value}</div>
      {hint ? <div className="mt-1 text-xs text-base-content/45">{hint}</div> : null}
    </div>
  );
}

export default function MissionDetailsModal({
  open = false,
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
}) {
  if (!open || !mission) return null;

  const sourceMeta = getSourceMeta(mission.source);
  const statusMeta = getStatusMeta(details?.status || mission.status);
  const StatusIcon = statusMeta.Icon;

  const startedEpoch =
    details?.started_at_epoch ||
    mission.date_epoch ||
    mission.raw?.started_at_epoch ||
    mission.raw?.created_at_epoch ||
    null;

  const endedEpoch = details?.ended_at_epoch || mission.raw?.ended_at_epoch || null;

  const locationTitle =
    mission.location_label && mission.location_label !== "Unknown"
      ? mission.location_label
      : mission.location_mode === "fixed"
        ? "Fixed point"
        : mission.location_mode === "gps"
          ? "GPS location"
          : "Unknown location";

  const lat = details?.start?.lat ?? mission.raw?.start?.lat ?? null;
  const lon = details?.start?.lon ?? mission.raw?.start?.lon ?? null;
  const alt = details?.start?.alt_m ?? mission.raw?.start?.alt_m ?? null;

  const canDeleteFromDevice = mission.on_device && deviceConnected;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-5xl rounded-[30px] border border-base-300 bg-base-100 p-0 shadow-2xl">
        <div className="border-b border-base-300 px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-semibold text-base-content sm:text-2xl">
                  {mission.mission_name}
                </h3>

                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${sourceMeta.cls}`}
                >
                  {sourceMeta.label}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusMeta.cls}`}
                >
                  <StatusIcon className="text-[11px]" />
                  {statusMeta.label}
                </span>
              </div>

              <div className="mt-2 font-mono text-[12px] text-base-content/40">
                {mission.mission_id}
              </div>

              <p className="mt-2 text-sm text-base-content/55">
                Mission overview, collected data and quick actions.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost shrink-0"
              onClick={onClose}
              aria-label="Close"
            >
              <FiX />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-92px)] overflow-y-auto px-6 py-6 sm:px-7 custom-scrollbar">
          {loading ? (
            <div className="flex items-center gap-3 rounded-[22px] border border-base-300 bg-base-200/45 px-4 py-5 text-sm text-base-content/60">
              <span className="loading loading-spinner loading-sm" />
              Loading mission details...
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Telemetry"
                  value={details?.telemetry_count ?? "—"}
                  hint="Recorded samples"
                />
                <StatCard
                  label="Images"
                  value={details?.image_count ?? "—"}
                  hint="Captured photos"
                />
                <StatCard
                  label="Duration"
                  value={formatDuration(startedEpoch, endedEpoch)}
                  hint="Mission runtime"
                />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
                <div className="space-y-5">
                  <Section title="General">
                    <Row label="Profile" value={mission.profile_label || mission.profile_type || "—"} />
                    <Row label="Date" value={formatDate(startedEpoch)} />
                    <Row label="Time" value={formatTime(startedEpoch)} />
                    <Row label="Started" value={formatDateTime(startedEpoch)} />
                    {endedEpoch ? (
                      <Row label="Ended" value={formatDateTime(endedEpoch)} />
                    ) : null}
                    {details?.stop_reason ? (
                      <Row label="Stop reason">
                        <span className="capitalize">
                          {String(details.stop_reason).toLowerCase()}
                        </span>
                      </Row>
                    ) : null}
                  </Section>

                  <Section title="Location">
                    <Row label="Name" value={locationTitle} />
                    <Row label="Coords" mono value={formatCoords(lat, lon)} />
                    {alt != null ? (
                      <Row label="Altitude" value={`${Number(alt).toFixed(1)} m`} />
                    ) : null}
                    <Row
                      label="Mode"
                      value={
                        mission.location_mode === "fixed"
                          ? "Fixed"
                          : mission.location_mode === "gps"
                            ? "GPS"
                            : "Unknown"
                      }
                    />
                  </Section>
                </div>

                <div className="space-y-5">
                  <Section title="Collected data">
                    <Row label="GPS data">
                      <span className={mission.has_gps ? "text-success" : "text-base-content/50"}>
                        {mission.has_gps ? "Available" : "Not recorded"}
                      </span>
                    </Row>

                    <Row label="Photos">
                      <span className={mission.has_images ? "text-success" : "text-base-content/50"}>
                        {mission.has_images ? "Available" : "Not recorded"}
                      </span>
                    </Row>

                    <Row label="Source" value={sourceMeta.label} />
                    <Row label="Status" value={statusMeta.label} />
                  </Section>

                  {details?.profile && Object.keys(details.profile).length > 0 ? (
                    <Section title="Mission parameters">
                      {details.profile.duration_s != null ? (
                        <Row label="Duration" value={`${details.profile.duration_s}s`} />
                      ) : null}

                      {details.profile.sample_hz != null ? (
                        <Row label="Rate" value={`${details.profile.sample_hz} Hz`} />
                      ) : null}

                      {details.profile.camera_mode ? (
                        <Row label="Camera">
                          <span className="capitalize">{details.profile.camera_mode}</span>
                        </Row>
                      ) : null}

                      {details.profile.gps_mode ? (
                        <Row label="GPS mode">
                          <span className="capitalize">
                            {String(details.profile.gps_mode).replaceAll("_", " ")}
                          </span>
                        </Row>
                      ) : null}
                    </Section>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[24px] border border-base-300 bg-base-200/30 p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Quick actions
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <button
                    type="button"
                    className="btn btn-primary rounded-2xl justify-start px-4"
                    onClick={onOpenHeatmap}
                  >
                    <FiMap />
                    Open HeatMap
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline rounded-2xl justify-start px-4"
                    onClick={onOpenAnalytics}
                  >
                    <FiBarChart2 />
                    Open Analytics
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost border border-base-300 rounded-2xl justify-start px-4"
                    onClick={onDownload}
                  >
                    <FiDownload />
                    Download ZIP
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost border border-base-300 rounded-2xl justify-start px-4"
                    onClick={onRename}
                  >
                    <FiEdit2 />
                    Rename mission
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline btn-error rounded-2xl justify-start px-4"
                    onClick={onDelete}
                  >
                    <FiTrash2 />
                    Delete mission
                  </button>

                  {canDeleteFromDevice ? (
                    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/55">
                      This mission also exists on the connected device.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/45">
                      Device-side actions are unavailable right now.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
