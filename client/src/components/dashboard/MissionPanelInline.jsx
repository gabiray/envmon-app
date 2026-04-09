import React, { useMemo, useState } from "react";
import {
  FiCamera,
  FiChevronDown,
  FiClock,
  FiMapPin,
  FiNavigation,
  FiPlay,
  FiSquare,
  FiXOctagon,
} from "react-icons/fi";

function getRuntimeMeta(runtimeState) {
  const state = String(runtimeState || "").trim().toUpperCase();

  if (!state) {
    return {
      label: "Unknown",
      cls: "badge badge-outline border-base-300 bg-base-200 text-base-content/70",
      statusClass: "status status-neutral",
      pulsing: false,
    };
  }

  if (state === "IDLE" || state === "COMPLETED") {
    return {
      label: state === "COMPLETED" ? "Completed" : "Idle",
      cls: "badge badge-outline border-success/35 bg-success/10 text-success",
      statusClass: "status status-success",
      pulsing: false,
    };
  }

  if (state === "RUNNING") {
    return {
      label: "Running",
      cls: "badge badge-outline border-success/35 bg-success/10 text-success",
      statusClass: "status status-success",
      pulsing: true,
    };
  }

  if (state === "ARMING") {
    return {
      label: "Arming",
      cls: "badge badge-outline border-warning/35 bg-warning/10 text-warning",
      statusClass: "status status-warning",
      pulsing: true,
    };
  }

  if (state === "ABORTED" || state === "ERROR") {
    return {
      label: state === "ABORTED" ? "Aborted" : "Error",
      cls: "badge badge-outline border-error/35 bg-error/10 text-error",
      statusClass: "status status-error",
      pulsing: false,
    };
  }

  return {
    label: "Unknown",
    cls: "badge badge-outline border-base-300 bg-base-200 text-base-content/70",
    statusClass: "status status-neutral",
    pulsing: false,
  };
}

function buildDefaultMissionName(startPoint) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = now.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return startPoint?.name
    ? `${startPoint.name} - ${dateStr} ${timeStr}`
    : `Mission ${dateStr} ${timeStr}`;
}

function SectionLabel({ children }) {
  return (
    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step = "1",
  disabled = false,
}) {
  return (
    <label className="form-control w-full">
      <SectionLabel>{label}</SectionLabel>
      <input
        className="input input-bordered w-full rounded-xl"
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}) {
  return (
    <label className="form-control w-full">
      <SectionLabel>{label}</SectionLabel>
      <select
        className="select select-bordered w-full rounded-xl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoStackRow({ label, value, mono = false, icon: Icon = null }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {Icon ? <Icon className="text-[13px]" /> : null}
        {label}
      </div>
      <div
        className={`mt-1.5 text-sm font-semibold text-base-content ${
          mono ? "font-mono break-all" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function formatGpsMode(value) {
  if (value === "off") return "Disabled";
  if (value === "required") return "Enabled (required)";
  if (value === "best_effort") return "Enabled (best effort)";
  return "Unknown";
}

function formatCameraMode(value) {
  if (value === "on") return "Enabled";
  if (value === "off") return "Disabled";
  return "Unknown";
}

export default function MissionPanelInline({
  runtimeState = null,
  deviceStatus = "inactive",
  deviceState = null,
  locationMode = "gps",
  selectedStartPoint = null,
  missionRunning = false,
  busy = false,
  onOpenLocationPicker = () => {},
  onRequestGpsLocationName = () => {},
  onStartMission = async () => ({ ok: false }),
  onStopMission = () => {},
  onAbortMission = () => {},
}) {
  const [missionName, setMissionName] = useState("");
  const [duration, setDuration] = useState(60);
  const [cameraMode, setCameraMode] = useState("on");
  const [gpsMode, setGpsMode] = useState("best_effort");
  const [sampleHz, setSampleHz] = useState(4);
  const [photoEvery, setPhotoEvery] = useState(5);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [errorText, setErrorText] = useState("");

  const runtimeBadge = useMemo(() => getRuntimeMeta(runtimeState), [runtimeState]);

  const canStart =
    deviceStatus === "connected" &&
    !busy &&
    !missionRunning &&
    (locationMode === "gps" || Boolean(selectedStartPoint));

  const activeProfile = deviceState?.profile || null;
  const activeLocationMode = activeProfile?.location_mode || locationMode || "gps";
  const activeMissionName =
    deviceState?.mission_name || deviceState?.mission_id || "—";

  async function handleStartClick() {
    setErrorText("");

    const payload = {
      mission_name:
        missionName.trim() || buildDefaultMissionName(selectedStartPoint),
      duration: Number(duration),
      camera_mode: cameraMode,
      gps_mode: gpsMode,
      sample_hz: Number(sampleHz),
      photo_every: Number(photoEvery),
      location_mode: locationMode,
    };

    const result = await onStartMission(payload);

    if (result?.ok) return;

    if (result?.needsGpsLocationName) {
      onRequestGpsLocationName({ coords: result.coords || null, payload });
      return;
    }

    setErrorText(result?.error || "Mission could not be started.");
  }

  return (
    <div className="flex h-full flex-col bg-base-100 p-5">
      <div className="flex items-start justify-between gap-3 border-b border-base-300 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FiNavigation className="text-primary" />
            <div className="text-base font-semibold text-base-content">
              Mission control
            </div>
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            Configure mission parameters and location source.
          </div>
        </div>

        <div className={runtimeBadge.cls}>
          <span className="inline-flex items-center gap-2">
            <span className="inline-grid shrink-0 *:[grid-area:1/1]">
              {runtimeBadge.pulsing ? (
                <div
                  className={`${runtimeBadge.statusClass} animate-ping`}
                  aria-hidden="true"
                />
              ) : null}
              <div className={runtimeBadge.statusClass} aria-hidden="true" />
            </span>
            {runtimeBadge.label}
          </span>
        </div>
      </div>

      {!missionRunning ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4">
            <label className="form-control w-full">
              <SectionLabel>Mission name</SectionLabel>
              <input
                className="input input-bordered w-full rounded-xl"
                type="text"
                maxLength={120}
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                placeholder="e.g. Parcel A - Morning Scan"
                disabled={busy}
              />
            </label>

            <NumberField
              label="Duration (s)"
              value={duration}
              onChange={setDuration}
              min={1}
              disabled={busy}
            />

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Photo mode"
                value={cameraMode}
                onChange={setCameraMode}
                disabled={busy}
                options={[
                  { value: "on", label: "On" },
                  { value: "off", label: "Off" },
                ]}
              />

              <SelectField
                label="GPS mode"
                value={gpsMode}
                onChange={setGpsMode}
                disabled={busy}
                options={[
                  { value: "off", label: "Off" },
                  { value: "best_effort", label: "Best effort" },
                  { value: "required", label: "Required" },
                ]}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => setAdvancedOpen((prev) => !prev)}
                disabled={busy}
              >
                <div>
                  <div className="text-sm font-semibold text-base-content">
                    Advanced settings
                  </div>
                  <div className="text-xs text-base-content/55">
                    Sampling and capture frequency
                  </div>
                </div>
                <FiChevronDown
                  className={`text-base-content/50 transition-transform duration-200 ${
                    advancedOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {advancedOpen && (
                <div className="grid grid-cols-2 gap-4 border-t border-base-300 px-4 py-4">
                  <NumberField
                    label="Sample rate (Hz)"
                    value={sampleHz}
                    onChange={setSampleHz}
                    min={0.1}
                    step="0.1"
                    disabled={busy}
                  />
                  <NumberField
                    label="Photos every (s)"
                    value={photoEvery}
                    onChange={setPhotoEvery}
                    min={0}
                    step="1"
                    disabled={busy}
                  />
                </div>
              )}
            </div>

            <div>
              <SectionLabel>Location</SectionLabel>
              <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <FiMapPin className="text-primary" />
                      {locationMode === "gps"
                        ? "GPS live location"
                        : selectedStartPoint?.name || "Fixed location"}
                    </div>
                    <div className="mt-2 text-sm text-base-content/65">
                      {locationMode === "gps"
                        ? "Mission start will validate the live GPS fix and reuse a saved place if one exists nearby."
                        : selectedStartPoint
                        ? `${selectedStartPoint.latlng.lat.toFixed(6)}, ${selectedStartPoint.latlng.lng.toFixed(6)}`
                        : "Choose a saved location or create a new one from the map."}
                    </div>
                  </div>

                  <button
                    className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                    onClick={onOpenLocationPicker}
                    disabled={busy}
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>
          </div>

          {errorText ? (
            <div className="mt-4 rounded-2xl border border-error/30 bg-error/10 px-3 py-3 text-sm text-error">
              {errorText}
            </div>
          ) : null}

          <div className="mt-5">
            <button
              className="btn btn-primary w-full rounded-xl px-5"
              disabled={!canStart}
              onClick={handleStartClick}
            >
              {busy ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <FiPlay />
              )}
              Start mission
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 rounded-[1.75rem] border border-base-300 bg-base-200/60 p-4">
            <div className="text-sm font-semibold">Active mission</div>
            <div className="mt-1 text-xs text-base-content/60">
              Mission parameters are locked while the logger is running.
            </div>

            <div className="mt-4 space-y-3">
              <InfoStackRow label="Mission name" value={activeMissionName} />
              <InfoStackRow
                label="Mission id"
                value={deviceState?.mission_id || "—"}
                mono
              />
              <InfoStackRow
                label="Location source"
                value={activeLocationMode === "gps" ? "GPS live" : "Fixed point"}
                icon={FiMapPin}
              />
              <InfoStackRow
                label="Camera"
                value={formatCameraMode(activeProfile?.camera_mode)}
                icon={FiCamera}
              />
              <InfoStackRow
                label="GPS"
                value={formatGpsMode(activeProfile?.gps_mode)}
                icon={FiNavigation}
              />
              <InfoStackRow
                label="Duration"
                value={
                  activeProfile?.duration_s != null
                    ? `${activeProfile.duration_s} s`
                    : "—"
                }
                icon={FiClock}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              className="btn w-full rounded-xl"
              disabled={busy}
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
              className="btn btn-error btn-outline w-full rounded-xl"
              disabled={busy}
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
        </>
      )}
    </div>
  );
}
