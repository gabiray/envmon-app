import React, { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiSave, FiX } from "react-icons/fi";

function getTargetText(mission) {
  if (!mission) return "";

  if (mission.source === "synced") {
    return "The name will be updated in the database and on the connected device.";
  }

  if (mission.source === "device") {
    return "The name will be updated only on the connected device.";
  }

  return "The name will be updated only in the local database.";
}

export default function RenameMissionModal({
  open = false,
  mission = null,
  busy = false,
  onClose = () => {},
  onConfirm = () => {},
}) {
  const initialName = useMemo(
    () => mission?.mission_name || mission?.mission_id || "",
    [mission],
  );

  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName(initialName);
    }
  }, [open, initialName]);

  if (!open || !mission) return null;

  const trimmed = name.trim();
  const unchanged = trimmed === String(initialName || "").trim();
  const invalid = !trimmed || unchanged;

  function handleSubmit(event) {
    event.preventDefault();
    if (invalid || busy) return;
    onConfirm(trimmed);
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg rounded-[28px] border border-base-300 bg-base-100 p-0 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-base-300 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FiEdit2 className="text-lg" />
              </span>

              <div>
                <h3 className="text-lg font-semibold text-base-content">
                  Rename mission
                </h3>
                <p className="text-sm text-base-content/55">
                  Choose a clearer name for this mission.
                </p>
              </div>
            </div>
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

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            <div className="rounded-2xl border border-base-300 bg-base-200/40 px-4 py-3">
              <div className="truncate text-sm font-semibold text-base-content">
                {initialName}
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-base-content/40">
                {mission.mission_id}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-base-content/70">
                New mission name
              </span>

              <input
                autoFocus
                type="text"
                className="input input-bordered w-full rounded-2xl"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example: Drone test - campus route"
                disabled={busy}
                maxLength={80}
              />
            </label>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-base-content/45">
              <span>{getTargetText(mission)}</span>
              <span>{trimmed.length}/80</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-base-300 px-6 py-4">
            <button
              type="button"
              className="btn btn-ghost rounded-xl px-4"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary rounded-xl border-none px-4 text-white"
              disabled={invalid || busy}
            >
              {busy ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave />
                  Save name
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  );
}
