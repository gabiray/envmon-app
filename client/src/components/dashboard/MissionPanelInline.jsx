import React, { useMemo, useState } from "react";
import {
  FiPlay,
  FiSquare,
  FiXOctagon,
  FiRadio,
  FiAlertTriangle,
  FiSlash,
} from "react-icons/fi";

function getBadgeMeta(status) {
  if (status === "connected") {
    return {
      label: "Connected",
      tone: "success",
      cls: "badge badge-outline border-success/40 text-success bg-success/5",
      Icon: FiRadio,
      ping: true,
    };
  }
  if (status === "out_of_range") {
    return {
      label: "Out of range",
      tone: "warning",
      cls: "badge badge-outline border-warning/40 text-warning bg-warning/5",
      Icon: FiAlertTriangle,
      ping: false,
    };
  }
  return {
    label: "Inactive",
    tone: "neutral",
    cls: "badge badge-outline border-neutral-content/20 text-neutral-content/80",
    Icon: FiSlash,
    ping: false,
  };
}

function StatusDot({ tone = "neutral", ping = false }) {
  const color =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
      ? "bg-warning"
      : "bg-neutral-content/60";

  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {ping && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-60 animate-ping`}
          aria-hidden="true"
        />
      )}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`}
        aria-hidden="true"
      />
    </span>
  );
}

export default function MissionPanelInline({
  deviceStatus = "inactive",
  startPoints = [],
  selectedStartPointId = null,
  onSelectStartPoint = () => {},

  // Mission lifecycle
  missionRunning = false,
  busy = false,
  onStartMission = () => {},
  onStopMission = () => {},
  onAbortMission = () => {},
}) {
  const selected = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId]
  );

  // Controlled fields (we must collect values for mission start)
  const [duration, setDuration] = useState(60);
  const [sampleHz, setSampleHz] = useState(2);
  const [photoEvery, setPhotoEvery] = useState(5);
  const [gpsMode, setGpsMode] = useState("best_effort");

  const badge = useMemo(() => getBadgeMeta(deviceStatus), [deviceStatus]);
  const BadgeIcon = badge.Icon;

  // Start requires: connected + a selected start point + not running + not busy
  const canStart =
    deviceStatus === "connected" && !!selected && !missionRunning && !busy;

  // Stop/Abort requires: connected + running + not busy
  const canStopAbort =
    deviceStatus === "connected" && missionRunning && !busy;

  // Disable param edits while mission is running or request in-flight
  const lockParams = busy || missionRunning;

  function handleStartClick() {
    if (!canStart) return;
    onStartMission({
      duration: Number(duration),
      sample_hz: Number(sampleHz),
      photo_every: Number(photoEvery),
      gps_mode: gpsMode,
    });
  }

  return (
    <div className="h-full flex flex-col">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Mission control</div>
            <div className="text-xs opacity-60">
              Set params and select a start point
            </div>
          </div>

          <div className={badge.cls}>
            <StatusDot tone={badge.tone} ping={badge.ping} />
            <span className="ml-2 inline-flex items-center gap-2">
              <BadgeIcon />
              {badge.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <label className="form-control">
            <div className="label">
              <span className="label-text text-xs opacity-70">Duration (s)</span>
            </div>
            <input
              className="input input-sm input-bordered"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={lockParams}
            />
          </label>

          <label className="form-control">
            <div className="label">
              <span className="label-text text-xs opacity-70">
                Sample rate (Hz)
              </span>
            </div>
            <input
              className="input input-sm input-bordered"
              type="number"
              step="0.1"
              min={0.1}
              value={sampleHz}
              onChange={(e) => setSampleHz(e.target.value)}
              disabled={lockParams}
            />
          </label>

          <label className="form-control">
            <div className="label">
              <span className="label-text text-xs opacity-70">
                Photos every (s)
              </span>
            </div>
            <input
              className="input input-sm input-bordered"
              type="number"
              min={0}
              value={photoEvery}
              onChange={(e) => setPhotoEvery(e.target.value)}
              disabled={lockParams}
            />
          </label>

          <label className="form-control">
            <div className="label">
              <span className="label-text text-xs opacity-70">GPS mode</span>
            </div>
            <select
              className="select select-sm select-bordered"
              value={gpsMode}
              onChange={(e) => setGpsMode(e.target.value)}
              disabled={lockParams}
            >
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
          <button
            className="btn btn-sm btn-primary"
            disabled={!canStart}
            onClick={handleStartClick}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <FiPlay />
            )}
            Start
          </button>

          <button
            className="btn btn-sm"
            disabled={!canStopAbort}
            onClick={onStopMission}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <FiSquare />
            )}
            Stop
          </button>

          <button
            className="btn btn-sm btn-error btn-outline"
            disabled={!canStopAbort}
            onClick={onAbortMission}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <FiXOctagon />
            )}
            Abort
          </button>
        </div>
      </div>

      <div className="divider my-5" />

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
                    disabled={busy}
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
