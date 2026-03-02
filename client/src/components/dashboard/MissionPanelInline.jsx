import React, { useMemo } from "react";

export default function MissionPanelInline({
  deviceStatus = "connected",
  startPoints = [],
  selectedStartPointId = null,
  onSelectStartPoint = () => {},
}) {
  const canStart = deviceStatus === "connected" && !!selectedStartPointId;

  const selected = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId]
  );

  return (
    <div className="h-full flex flex-col">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold">Mission control</div>
            <div className="text-xs opacity-60">Set params and select a start point</div>
          </div>
          <div className="badge badge-outline">
            {deviceStatus === "connected"
              ? "Device ready"
              : deviceStatus === "out_of_range"
              ? "Out of range"
              : "Inactive"}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <label className="form-control">
            <div className="label">
              <span className="label-text text-xs opacity-70">Duration (s)</span>
            </div>
            <input className="input input-sm input-bordered" type="number" defaultValue={60} />
          </label>

          <label className="form-control">
            <div className="label">
              <span className="label-text text-xs opacity-70">Sample rate (Hz)</span>
            </div>
            <input className="input input-sm input-bordered" type="number" step="0.1" defaultValue={2} />
          </label>

          <label className="form-control">
            <div className="label">
              <span className="label-text text-xs opacity-70">Photos every (s)</span>
            </div>
            <input className="input input-sm input-bordered" type="number" defaultValue={5} />
          </label>

          <label className="form-control">
            <div className="label">
              <span className="label-text text-xs opacity-70">GPS mode</span>
            </div>
            <select className="select select-sm select-bordered" defaultValue="best_effort">
              <option value="off">off</option>
              <option value="best_effort">best_effort</option>
              <option value="required">required</option>
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-box border border-base-300 bg-base-200 p-4">
          <div className="text-sm font-semibold">Start point</div>
          {selected ? (
            <div className="mt-2">
              <div className="font-semibold">{selected.name}</div>
              <div className="text-xs opacity-60 font-mono mt-1">
                {selected.latlng.lat.toFixed(6)}, {selected.latlng.lng.toFixed(6)}
              </div>
            </div>
          ) : (
            <div className="text-sm opacity-60 mt-2">
              Click on the map to create/select a start point.
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <button className="btn btn-sm btn-primary" disabled={!canStart}>
            Start
          </button>
          <button className="btn btn-sm" disabled={deviceStatus !== "connected"}>
            Stop
          </button>
          <button className="btn btn-sm btn-error btn-outline" disabled={deviceStatus !== "connected"}>
            Abort
          </button>
        </div>
      </div>

      <div className="divider my-5" />

      {/* listă scroll */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Saved start points</div>
        <span className="badge badge-outline">{startPoints.length}</span>
      </div>

      <div className="mt-3 flex-1 min-h-0">
        {startPoints.length === 0 ? (
          <div className="text-sm opacity-60">
            No points yet. Click on the map to add one.
          </div>
        ) : (
          <div className="rounded-box border border-base-300 bg-base-200 overflow-hidden h-full">
            <ul className="menu menu-sm overflow-y-auto max-h-full">
              {startPoints.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={p.id === selectedStartPointId ? "active" : ""}
                    onClick={() => onSelectStartPoint(p.id)}
                  >
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-xs opacity-60 font-mono">
                      {p.latlng.lat.toFixed(4)}, {p.latlng.lng.toFixed(4)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
