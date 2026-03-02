import React, { useState } from "react";

export default function StartPointNameModal({
  open,
  latlng,
  onClose,
  onSave,
}) {
  const [name, setName] = useState("");

  if (!open) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-semibold text-lg">Save start point</h3>
        <p className="text-sm opacity-70 mt-1">
          Give this location a name so you can reuse it later.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="form-control">
            <div className="label">
              <span className="label-text text-sm pr-1">Name</span>
            </div>
            <input
              className="input input-bordered"
              placeholder="e.g. Parcel A - North Gate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>

          <div className="rounded-box border border-base-300 bg-base-200 p-3 text-sm">
            <div className="opacity-70">Coordinates</div>
            <div className="font-mono text-xs mt-1">
              {latlng ? `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}` : "—"}
            </div>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!name.trim() || !latlng}
            onClick={() => onSave(name.trim())}
          >
            Save
          </button>
        </div>
      </div>

      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
