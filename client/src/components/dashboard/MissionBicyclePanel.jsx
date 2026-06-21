import React, { useMemo, useState } from "react";
import {
  FiCamera,
  FiChevronDown,
  FiClock,
  FiInfo,
  FiMap,
  FiMapPin,
  FiNavigation,
  FiPlay,
  FiSquare,
  FiXOctagon,
} from "react-icons/fi";
import { MdDirectionsBike } from "react-icons/md";

import LocationPickerPanel from "./LocationPickerPanel";
import MissionMapLibreMap from "../map/MissionDashboardMap";

function getRuntimeMeta(runtimeState) {
  const state = String(runtimeState || "").trim().toUpperCase();

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

function buildDefaultBicycleMissionName(startPoint) {
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
    ? `${startPoint.name} - Bicycle Route ${dateStr} ${timeStr}`
    : `Bicycle Route ${dateStr} ${timeStr}`;
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
          mono ? "break-all font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function formatGpsMode(value) {
  if (value === "off") return "Disabled";
  if (value === "required") return "Required";
  if (value === "best_effort") return "Best effort";
  return "Unknown";
}

function formatCameraMode(value) {
  if (value === "on") return "Enabled";
  if (value === "off") return "Disabled";
  return "Unknown";
}

function BicycleMissionForm({
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
  const [duration, setDuration] = useState(600);
  const [cameraMode, setCameraMode] = useState("off");
  const [gpsMode, setGpsMode] = useState("best_effort");
  const [sampleHz, setSampleHz] = useState(1);
  const [photoEvery, setPhotoEvery] = useState(10);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [errorText, setErrorText] = useState("");

  const runtimeBadge = useMemo(
    () => getRuntimeMeta(runtimeState),
    [runtimeState],
  );

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
        missionName.trim() || buildDefaultBicycleMissionName(selectedStartPoint),
      duration: Number(duration),
      camera_mode: cameraMode,
      gps_mode: gpsMode,
      sample_hz: Number(sampleHz),
      photo_every: cameraMode === "on" ? Number(photoEvery) : 0,
      location_mode: locationMode,
    };

    const result = await onStartMission(payload);

    if (result?.ok) return;

    if (result?.needsGpsLocationName) {
      onRequestGpsLocationName({
        coords: result.coords || null,
        payload,
      });
      return;
    }

    setErrorText(result?.error || "Mission could not be started.");
  }

  return (
    <div className="flex h-full flex-col bg-base-100 p-5">
      <div className="flex items-start justify-between gap-3 border-b border-base-300 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MdDirectionsBike className="text-xl text-primary" />
            <div className="text-base font-semibold text-base-content">
              Bicycle mission control
            </div>
          </div>

          <div className="mt-1 text-sm text-base-content/60">
            Configure a low-speed route mission using GPS or a saved start
            location.
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
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
                <FiInfo />
              </div>

              <div>
                <div className="text-sm font-semibold text-base-content">
                  Bicycle profile note
                </div>
                <div className="mt-1 text-sm leading-6 text-base-content/65">
                  This profile is optimized for 2D route tracking and
                  environmental telemetry collected during bicycle movement.
                  Camera capture is disabled by default to keep missions lighter.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4">
            <label className="form-control w-full">
              <SectionLabel>Mission name</SectionLabel>
              <input
                className="input input-bordered w-full rounded-xl"
                type="text"
                maxLength={120}
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                placeholder="e.g. Park route - Morning survey"
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
                label="GPS mode"
                value={gpsMode}
                onChange={setGpsMode}
                disabled={busy}
                options={[
                  { value: "best_effort", label: "Best effort" },
                  { value: "required", label: "Required" },
                  { value: "off", label: "Off" },
                ]}
              />

              <SelectField
                label="Camera"
                value={cameraMode}
                onChange={setCameraMode}
                disabled={busy}
                options={[
                  { value: "off", label: "Off" },
                  { value: "on", label: "On" },
                ]}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => setAdvancedOpen((prev) => !prev)}
              >
                <div>
                  <div className="text-sm font-semibold text-base-content">
                    Advanced mission settings
                  </div>
                  <div className="mt-0.5 text-xs text-base-content/55">
                    Sample rate and optional photo interval.
                  </div>
                </div>

                <FiChevronDown
                  className={`transition-transform duration-200 ${
                    advancedOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {advancedOpen ? (
                <div className="grid grid-cols-1 gap-4 border-t border-base-300 p-4 sm:grid-cols-2">
                  <NumberField
                    label="Sample Hz"
                    value={sampleHz}
                    onChange={setSampleHz}
                    min={0.1}
                    step="0.1"
                    disabled={busy}
                  />

                  <NumberField
                    label="Photo every (s)"
                    value={photoEvery}
                    onChange={setPhotoEvery}
                    min={1}
                    disabled={busy || cameraMode === "off"}
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
                    <FiMapPin className="text-primary" />
                    Location source
                  </div>

                  <div className="mt-1 text-sm text-base-content/60">
                    {locationMode === "gps"
                      ? "The mission will use live GPS when it starts."
                      : selectedStartPoint
                        ? `Fixed location: ${selectedStartPoint.name}`
                        : "Choose a saved fixed location before starting."}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                  onClick={onOpenLocationPicker}
                  disabled={busy}
                >
                  <FiMap />
                  Choose
                </button>
              </div>
            </div>

            {errorText ? (
              <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {errorText}
              </div>
            ) : null}

            <button
              type="button"
              className="btn btn-primary min-h-12 rounded-2xl"
              onClick={handleStartClick}
              disabled={!canStart}
            >
              {busy ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <FiPlay />
              )}
              Start bicycle mission
            </button>

            {!canStart ? (
              <div className="text-center text-xs text-base-content/50">
                Select a connected device and choose a valid location source to
                start the mission.
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-5 flex flex-1 flex-col">
          <div className="rounded-2xl border border-success/25 bg-success/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-success">
              <span className="status status-success animate-pulse" />
              Bicycle mission running
            </div>

            <div className="mt-2 text-sm leading-6 text-base-content/70">
              The device is collecting environmental telemetry and associating
              measurements with the selected route/location mode.
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <InfoStackRow
              label="Active mission"
              value={activeMissionName}
              mono={Boolean(deviceState?.mission_id)}
              icon={FiNavigation}
            />

            <InfoStackRow
              label="Location mode"
              value={activeLocationMode}
              icon={FiMapPin}
            />

            <InfoStackRow
              label="GPS mode"
              value={formatGpsMode(activeProfile?.gps_mode || gpsMode)}
              icon={FiNavigation}
            />

            <InfoStackRow
              label="Camera"
              value={formatCameraMode(activeProfile?.camera_mode || cameraMode)}
              icon={FiCamera}
            />

            <InfoStackRow
              label="Sample rate"
              value={`${activeProfile?.sample_hz || sampleHz} Hz`}
              icon={FiClock}
            />
          </div>

          <div className="mt-auto grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
            <button
              type="button"
              className="btn btn-warning rounded-2xl"
              onClick={onStopMission}
              disabled={busy}
            >
              {busy ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <FiSquare />
              )}
              Stop
            </button>

            <button
              type="button"
              className="btn btn-error rounded-2xl"
              onClick={onAbortMission}
              disabled={busy}
            >
              <FiXOctagon />
              Abort
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MissionBicyclePanel({
  deviceStatus = "inactive",
  deviceState = null,
  startPoints = [],
  selectedStartPointId = null,
  onAddStartPoint = async () => null,
  onSelectStartPoint = () => {},
  missionRunning = false,
  busy = false,
  onStartMission = async () => ({ ok: false }),
  onStopMission = () => {},
  onAbortMission = () => {},
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("chooser");
  const [locationMode, setLocationMode] = useState("gps");
  const [mapPickEnabled, setMapPickEnabled] = useState(false);
  const [pendingMapPick, setPendingMapPick] = useState(null);
  const [gpsDraftCoords, setGpsDraftCoords] = useState(null);
  const [gpsPendingPayload, setGpsPendingPayload] = useState(null);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerErrorText, setPickerErrorText] = useState("");

  const selectedStartPoint = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId],
  );

  async function handleSavePickedLocation({ name, latlng }) {
    const created = await onAddStartPoint({
      name,
      latlng,
      source: "manual",
      tags: ["fixed", "bicycle"],
    });

    if (created?.id) {
      onSelectStartPoint(created.id);
      setPendingMapPick(null);
      setMapPickEnabled(false);
    }

    return created;
  }

  function openChooserPanel() {
    setPickerErrorText("");
    setPickerMode("chooser");
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    setPickerMode("chooser");
    setMapPickEnabled(false);
    setPendingMapPick(null);
    setPickerErrorText("");
  }

  function handleChooseGpsMode() {
    setLocationMode("gps");
    setPendingMapPick(null);
    setMapPickEnabled(false);
    setPickerMode("chooser");
    setPickerOpen(false);
  }

  function handleChooseFixedMode() {
    setLocationMode("fixed");
  }

  function handleConfirmFixed() {
    if (!selectedStartPoint) return;

    setLocationMode("fixed");
    setPendingMapPick(null);
    setMapPickEnabled(false);
    setPickerOpen(false);
  }

  function handleNeedGpsLocationName({ coords, payload }) {
    setGpsDraftCoords(coords || null);
    setGpsPendingPayload(payload || null);
    setPickerErrorText("");
    setPickerMode("gps-new");
    setPickerOpen(true);
  }

  async function handleSaveGpsNamedLocation(name) {
    if (!gpsPendingPayload) return;

    setPickerBusy(true);
    setPickerErrorText("");

    try {
      const result = await onStartMission({
        ...gpsPendingPayload,
        gps_location_name: name,
      });

      if (result?.ok) {
        setPickerOpen(false);
        setPickerMode("chooser");
        setGpsDraftCoords(null);
        setGpsPendingPayload(null);
        return;
      }

      setPickerErrorText(result?.error || "Mission could not be started.");
    } finally {
      setPickerBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-xl">
      <div className="flex min-h-[620px] flex-col xl:flex-row">
        <div className="w-full shrink-0 border-b border-base-300 bg-base-100 xl:w-[430px] xl:border-b-0 xl:border-r">
          <div className="h-full">
            {pickerOpen ? (
              <div className="h-full overflow-y-auto">
                <LocationPickerPanel
                  mode={pickerMode}
                  locationMode={locationMode}
                  gpsDraftCoords={gpsDraftCoords}
                  startPoints={startPoints}
                  selectedStartPointId={selectedStartPointId}
                  pendingMapPick={pendingMapPick}
                  mapPickEnabled={mapPickEnabled}
                  busy={pickerBusy}
                  errorText={pickerErrorText}
                  onSelectStartPoint={onSelectStartPoint}
                  onChooseGpsMode={handleChooseGpsMode}
                  onChooseFixedMode={handleChooseFixedMode}
                  onToggleMapPick={() => setMapPickEnabled((prev) => !prev)}
                  onClearPendingMapPick={() => setPendingMapPick(null)}
                  onSavePickedLocation={handleSavePickedLocation}
                  onSaveGpsNamedLocation={handleSaveGpsNamedLocation}
                  onConfirmFixed={handleConfirmFixed}
                  onBack={closePicker}
                />
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <BicycleMissionForm
                  runtimeState={deviceState?.state || null}
                  deviceStatus={deviceStatus}
                  deviceState={deviceState}
                  locationMode={locationMode}
                  selectedStartPoint={selectedStartPoint}
                  missionRunning={missionRunning}
                  busy={busy}
                  onOpenLocationPicker={openChooserPanel}
                  onRequestGpsLocationName={handleNeedGpsLocationName}
                  onStartMission={onStartMission}
                  onStopMission={onStopMission}
                  onAbortMission={onAbortMission}
                />
              </div>
            )}
          </div>
        </div>

        <div className="relative min-h-[480px] flex-1 bg-base-200 xl:min-h-0">
          <div className="absolute inset-0">
            <MissionMapLibreMap
              startPoints={startPoints}
              selectedStartPointId={selectedStartPointId}
              pendingMapPick={pendingMapPick}
              mapPickEnabled={
                pickerOpen && locationMode === "fixed" && mapPickEnabled
              }
              onMapPick={setPendingMapPick}
              onSelectStartPoint={(id) => {
                setPendingMapPick(null);
                onSelectStartPoint(id);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
