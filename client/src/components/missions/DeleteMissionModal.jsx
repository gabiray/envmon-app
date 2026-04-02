import React, { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiTrash2, FiX } from "react-icons/fi";

function buildOptions(mission, deviceConnected) {
  if (!mission) return [];

  const options = [];

  if (mission.in_db) {
    options.push({
      value: "db",
      label: "Delete from database",
      hint: "Mission will be removed only from local database.",
    });
  }

  if (mission.on_device && deviceConnected) {
    options.push({
      value: "device",
      label: "Delete from device",
      hint: "Mission will be removed only from the connected device.",
    });
  }

  if (mission.source === "synced" && mission.in_db && mission.on_device && deviceConnected) {
    options.unshift({
      value: "both",
      label: "Delete from both",
      hint: "Mission will be removed from database and device.",
    });
  }

  return options;
}

export default function DeleteMissionModal({
  open = false,
  mission = null,
  deviceConnected = false,
  busy = false,
  onClose = () => {},
  onConfirm = () => {},
}) {
  const options = useMemo(
    () => buildOptions(mission, deviceConnected),
    [mission, deviceConnected],
  );

  const [mode, setMode] = useState("");

  useEffect(() => {
    if (open) {
      setMode(options[0]?.value || "");
    }
  }, [open, options]);

  if (!open || !mission) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg rounded-[28px] border border-base-300 bg-base-100 p-0 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-base-300 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-error/10 text-error">
                <FiAlertTriangle className="text-lg" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-base-content">
                  Delete mission
                </h3>
                <p className="text-sm text-base-content/55">
                  Choose how you want to delete this mission.
                </p>
              </div>
            </div>
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

        <div className="px-6 py-5">
          <div className="rounded-2xl border border-base-300 bg-base-200/40 px-4 py-3">
            <div className="truncate text-sm font-semibold text-base-content">
              {mission.mission_name}
            </div>
            <div className="mt-1 truncate font-mono text-[11px] text-base-content/40">
              {mission.mission_id}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {options.map((option) => (
              <label
                key={option.value}
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
                  mode === option.value
                    ? "border-primary bg-primary/5"
                    : "border-base-300 bg-base-100 hover:bg-base-200/40",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="delete-mode"
                  className="radio radio-mdmt-0.5"
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                />

                <div>
                  <div className="text-sm font-medium text-base-content">
                    {option.label}
                  </div>
                  <div className="mt-1 text-xs text-base-content/50">
                    {option.hint}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost rounded-xl px-4"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-error rounded-xl px-4"
              onClick={() => onConfirm(mode)}
              disabled={!mode || busy}
            >
              {busy ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Deleting...
                </>
              ) : (
                <>
                  <FiTrash2 />
                  Delete
                </>
              )}
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
