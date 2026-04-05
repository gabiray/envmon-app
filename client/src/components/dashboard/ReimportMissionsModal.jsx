import React from "react";
import { FiAlertTriangle, FiRefreshCw, FiX } from "react-icons/fi";

export default function ReimportMissionsModal({
  open = false,
  missions = [],
  busy = false,
  onClose = () => {},
  onConfirm = () => {},
}) {
  if (!open) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl rounded-3xl border border-base-300 bg-base-100 p-0 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-base-300 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-semibold">
              <FiAlertTriangle className="text-warning" />
              Reimport existing missions?
            </div>
            <p className="mt-1 text-sm text-base-content/60">
              The selected mission{missions.length === 1 ? "" : "s"} already exist
              in the database. Reimporting will update the stored mission data.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-3 text-sm font-medium text-base-content/70">
            Missions to update:
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-base-300 bg-base-200/30 p-2 custom-scrollbar">
            {missions.map((mission) => (
              <div
                key={mission.mission_id}
                className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3"
              >
                <div className="truncate text-sm font-semibold">
                  {mission.mission_name || mission.mission_id}
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-base-content/55">
                  {mission.mission_id}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-base-content/75">
            Existing mission metadata, telemetry points and images from the database
            will be replaced with the newly imported version.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-base-300 px-6 py-4">
          <button
            type="button"
            className="btn rounded-xl"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary rounded-xl text-white border-none"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <FiRefreshCw />
            )}
            Reimport and update
          </button>
        </div>
      </div>
    </dialog>
  );
}
