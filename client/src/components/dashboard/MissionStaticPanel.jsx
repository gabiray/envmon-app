import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";

import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCrosshair,
  FiMapPin,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiStopCircle,
  FiX,
} from "react-icons/fi";

import {
  createStartPoint,
  fetchStartPoints,
} from "../../services/startPointsApi";

import MissionStaticLocation, {
  DEFAULT_CENTER,
  MAP_STYLE_URL,
  MAPTILER_KEY,
  createSmallMarkerElement,
  getSourceLabel,
  isValidLocation,
  normalizeLocation,
  toNumberOrNull,
} from "./MissionStaticLocation";

function previousLocationKey(deviceId) {
  return `envmon.static.previousLocation.${deviceId || "default"}`;
}

function normalizeStartPoint(point) {
  return normalizeLocation(point, {
    source: point?.source || "saved",
  });
}

function buildDefaultMissionName(location) {
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

  if (location?.name) {
    return `${location.name} - Static monitoring ${dateStr} ${timeStr}`;
  }

  return `Static monitoring ${dateStr} ${timeStr}`;
}

function readPreviousLocation(deviceId) {
  try {
    const raw = localStorage.getItem(previousLocationKey(deviceId));
    if (!raw) return null;

    return normalizeLocation(JSON.parse(raw), {
      source: "previous",
    });
  } catch {
    return null;
  }
}

function savePreviousLocation(deviceId, location) {
  const normalized = normalizeLocation(location);
  if (!normalized) return;

  localStorage.setItem(
    previousLocationKey(deviceId),
    JSON.stringify({
      id: normalized.id,
      name: normalized.name || "",
      lat: normalized.lat,
      lon: normalized.lon,
      alt_m: normalized.alt_m,
      source: normalized.source || "saved",
    }),
  );
}

function PanelToast({ toast, onClose }) {
  if (!toast) return null;

  const alertClass =
    toast.type === "error"
      ? "alert-error"
      : toast.type === "warning"
        ? "alert-warning"
        : "alert-success";

  const Icon =
    toast.type === "error" || toast.type === "warning"
      ? FiAlertTriangle
      : FiCheckCircle;

  return (
    <div className="toast toast-bottom toast-center z-[9999]">
      <div
        className={`alert ${alertClass} min-w-[320px] max-w-[460px] rounded-2xl shadow-xl`}
      >
        <Icon className="shrink-0" />
        <span className="text-sm">{toast.text}</span>

        <button
          type="button"
          className="btn btn-xs btn-ghost"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function MiniStaticMap({ location, onOpenPicker }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onOpenPickerRef = useRef(onOpenPicker);

  useEffect(() => {
    onOpenPickerRef.current = onOpenPicker;
  }, [onOpenPicker]);

  useEffect(() => {
    if (!MAPTILER_KEY || !mapContainerRef.current || mapRef.current) return;

    const initialCenter = isValidLocation(location)
      ? [Number(location.lon), Number(location.lat)]
      : DEFAULT_CENTER;

    const map = new maptilersdk.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: initialCenter,
      zoom: isValidLocation(location) ? 15.5 : 12,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.on("click", () => {
      onOpenPickerRef.current();
    });

    mapRef.current = map;

    return () => {
      try {
        markerRef.current?.remove();
        map.remove();
      } catch {
        // Ignore cleanup errors.
      }

      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      markerRef.current?.remove();
    } catch {
      // Ignore marker cleanup errors.
    }

    markerRef.current = null;

    if (!isValidLocation(location)) return;

    const center = [Number(location.lon), Number(location.lat)];

    markerRef.current = new maptilersdk.Marker({
      element: createSmallMarkerElement(),
      anchor: "center",
    })
      .setLngLat(center)
      .addTo(map);

    map.flyTo({
      center,
      zoom: 15.8,
      duration: 650,
      essential: true,
    });
  }, [location]);

  if (!MAPTILER_KEY) {
    return (
      <button
        type="button"
        className="grid h-full min-h-[500px] w-full place-items-center rounded-2xl border border-dashed border-base-300 bg-base-200/60 p-5 text-center"
        onClick={onOpenPicker}
      >
        <div>
          <FiMapPin className="mx-auto text-2xl text-base-content/45" />
          <div className="mt-2 text-sm font-semibold">Map unavailable</div>
          <div className="mt-1 text-xs text-base-content/55">
            Set VITE_MAPTILER_KEY to enable map selection.
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="relative block h-full min-h-[500px] w-full overflow-hidden rounded-2xl border border-base-300 bg-base-200 text-left"
      onClick={onOpenPicker}
    >
      <div ref={mapContainerRef} className="h-full min-h-[500px] w-full" />

      <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-base-300 bg-base-100/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
        Click the map to edit the static location.
      </div>
    </button>
  );
}

function SelectedLocationCompact({ location, onEdit }) {
  if (!isValidLocation(location)) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
        onClick={onEdit}
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-base-200 text-base-content/45">
          <FiMapPin />
        </div>

        <div>
          <div className="text-sm font-semibold">No location selected</div>
          <div className="mt-1 text-xs text-base-content/55">
            Choose a saved point, use GPS once, or select a point on the map.
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-base-300 bg-base-100 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
      onClick={onEdit}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <FiMapPin />
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {location.name || "Static location"}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-base-content/55">
            <span>{getSourceLabel(location.source)}</span>

            {location.alt_m !== null && location.alt_m !== undefined ? (
              <>
                <span>•</span>
                <span>{Number(location.alt_m).toFixed(1)} m altitude</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <span className="btn btn-ghost btn-xs rounded-lg">Edit</span>
    </button>
  );
}

export default function MissionStaticPanel({
  selectedDeviceId = "none",
  deviceState = null,
  missionRunning = false,
  busy = false,
  gpsFix = null,
  onLocationChange = () => {},
  onStartMission = async () => ({ ok: false }),
  onStopMission = () => {},
  onAbortMission = () => {},
}) {
  const [missionName, setMissionName] = useState("");
  const [duration, setDuration] = useState(3600);

  const [startPoints, setStartPoints] = useState([]);
  const [startPointsLoading, setStartPointsLoading] = useState(false);
  const [selectedStartPointId, setSelectedStartPointId] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [usePreviousLocation, setUsePreviousLocation] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [modalInitialLocation, setModalInitialLocation] = useState(null);
  const [savingLocation, setSavingLocation] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const liveGpsFix = useMemo(
    () =>
      normalizeLocation(gpsFix || deviceState?.gps?.last_good_fix, {
        source: "gps",
        name: "Device GPS fix",
      }),
    [gpsFix, deviceState],
  );

  const deviceSelected = selectedDeviceId && selectedDeviceId !== "none";
  const hasSelectedLocation = isValidLocation(selectedLocation);

  const canStart =
    deviceSelected && !busy && !missionRunning && hasSelectedLocation;

  const activeMissionName =
    deviceState?.mission_name || deviceState?.mission_id || "Static mission";

  function clearToast() {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast(null);
  }

  function showToast(type, text) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({
      id: Date.now(),
      type,
      text,
    });

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  async function loadStartPoints() {
    if (!deviceSelected) {
      setStartPoints([]);
      setSelectedStartPointId("");
      return;
    }

    setStartPointsLoading(true);

    try {
      const items = await fetchStartPoints(selectedDeviceId);
      setStartPoints(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Failed to load static locations", error);
      setStartPoints([]);
      showToast("error", "Saved locations could not be loaded.");
    } finally {
      setStartPointsLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setMissionName("");
    setSelectedLocation(null);
    setSelectedStartPointId("");
    setUsePreviousLocation(false);
    clearToast();
    loadStartPoints();
  }, [selectedDeviceId]);

  useEffect(() => {
    onLocationChange(hasSelectedLocation ? selectedLocation : null);
  }, [hasSelectedLocation, selectedLocation, onLocationChange]);

  function handleSelectSavedLocation(event) {
    const id = event.target.value;

    setSelectedStartPointId(id);
    setUsePreviousLocation(false);

    if (!id) {
      setSelectedLocation(null);
      return;
    }

    const point = startPoints.find((item) => String(item.id) === String(id));
    const normalized = normalizeStartPoint(point);

    if (!normalized) {
      showToast("error", "Selected location is not valid.");
      return;
    }

    setSelectedLocation({
      ...normalized,
      source: normalized.source || "saved",
    });

    showToast("success", "Saved location selected.");
  }

  function handleUsePreviousLocation(event) {
    const checked = event.target.checked;
    setUsePreviousLocation(checked);

    if (!checked) return;

    const previous = readPreviousLocation(selectedDeviceId);

    if (!previous) {
      setUsePreviousLocation(false);
      showToast("error", "No previous static location saved for this device.");
      return;
    }

    setSelectedLocation({
      ...previous,
      source: "previous",
    });

    if (previous.id) {
      setSelectedStartPointId(String(previous.id));
    } else {
      setSelectedStartPointId("");
    }

    showToast("success", "Previous static location loaded.");
  }

  function handleOpenLocationPicker(initial = null) {
    setModalInitialLocation(initial || selectedLocation || null);
    setLocationModalOpen(true);
  }

  function handleUseGpsOnce() {
    if (!liveGpsFix) {
      showToast("error", "No valid GPS fix available yet.");
      return;
    }

    setModalInitialLocation({
      ...liveGpsFix,
      name: "",
      source: "gps",
    });

    setLocationModalOpen(true);
  }

  async function handleSaveStaticLocation(locationDraft) {
    if (!deviceSelected) {
      showToast("error", "Select a device before saving the location.");
      return;
    }

    const normalized = normalizeLocation(locationDraft);

    if (!normalized) {
      showToast("error", "Choose a valid static location.");
      return;
    }

    setSavingLocation(true);

    try {
      const response = await createStartPoint({
        device_uuid: selectedDeviceId,
        name: locationDraft.name,
        latlng: {
          lat: normalized.lat,
          lng: normalized.lon,
        },
        alt_m: normalized.alt_m,
        source: normalized.source || "manual",
        tags: ["static"],
      });

      const created = response?.item || response?.start_point || response;
      const normalizedCreated = normalizeStartPoint(created);

      setStartPoints((prev) => {
        const filtered = prev.filter(
          (item) => String(item.id) !== String(created.id),
        );

        return [created, ...filtered];
      });

      setSelectedStartPointId(String(created.id));
      setSelectedLocation(normalizedCreated);
      setUsePreviousLocation(false);

      savePreviousLocation(selectedDeviceId, normalizedCreated);

      setLocationModalOpen(false);
      showToast("success", "Static location saved.");
    } catch (error) {
      console.error("Failed to save static location", error);
      showToast("error", "Static location could not be saved.");
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleStartClick() {
    if (!deviceSelected) {
      showToast("error", "Select a device before starting the session.");
      return;
    }

    if (!hasSelectedLocation) {
      showToast("error", "Choose a static location before starting the session.");
      return;
    }

    const payload = {
      mission_name: missionName.trim() || buildDefaultMissionName(selectedLocation),
      duration: Number(duration),
      sample_hz: 1,
      photo_every: 0,
      gps_mode: "off",
      camera_mode: "off",
      location_mode: "fixed",
      fixed_location: {
        lat: Number(selectedLocation.lat),
        lon: Number(selectedLocation.lon),
        alt_m: toNumberOrNull(selectedLocation.alt_m),
      },
      start_point_id: selectedLocation.id || selectedStartPointId || null,
      location_name: selectedLocation.name || "",
    };

    const result = await onStartMission(payload);

    if (!result?.ok) {
      showToast("error", result?.error || "Static mission could not be started.");
      return;
    }

    savePreviousLocation(selectedDeviceId, selectedLocation);
    showToast("success", "Static monitoring session started.");
  }

  return (
    <section className="rounded-box border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <FiCrosshair className="text-lg text-primary" />

            <div>
              <h2 className="text-lg font-semibold">
                Static monitoring session
              </h2>
              <p className="text-sm text-base-content/60">
                Configure the mission and select one fixed monitoring location.
              </p>
            </div>
          </div>

          <span
            className={[
              "badge badge-outline gap-2 rounded-full",
              missionRunning
                ? "border-success/30 text-success"
                : "border-base-content/20 text-base-content/60",
            ].join(" ")}
          >
            <span
              className={[
                "status",
                missionRunning ? "status-success" : "status-neutral",
              ].join(" ")}
            />
            {missionRunning ? "Recording" : "Idle"}
          </span>
        </div>
      </div>

      <div className="grid items-stretch gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,42%)]">
        <div className="flex h-full flex-col gap-4">
          {!missionRunning ? (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <label className="form-control">
                  <div className="label">
                    <span className="label-text">Mission name</span>
                  </div>

                  <input
                    type="text"
                    className="input input-bordered rounded-xl"
                    placeholder={buildDefaultMissionName(selectedLocation)}
                    value={missionName}
                    onChange={(event) => setMissionName(event.target.value)}
                  />
                </label>

                <label className="form-control">
                  <div className="label">
                    <span className="label-text">Duration</span>
                    <span className="label-text-alt">seconds</span>
                  </div>

                  <input
                    type="number"
                    min="10"
                    step="10"
                    className="input input-bordered rounded-xl"
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-base-300 bg-base-200/35 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <FiMapPin />
                  </div>

                  <div>
                    <div className="text-sm font-semibold">
                      Monitoring location
                    </div>
                    <div className="mt-1 text-xs text-base-content/55">
                      Select a saved point, use GPS once, or choose a new point
                      on the map.
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="form-control">
                    <div className="label pb-1">
                      <span className="label-text">Saved location</span>
                    </div>

                    <select
                      className="select select-bordered w-full rounded-xl"
                      value={selectedStartPointId}
                      onChange={handleSelectSavedLocation}
                      disabled={startPointsLoading || startPoints.length === 0}
                    >
                      <option value="">
                        {startPoints.length === 0
                          ? "No saved static locations"
                          : "Choose a saved location"}
                      </option>

                      {startPoints.map((point) => (
                        <option key={point.id} value={point.id}>
                          {point.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline rounded-xl"
                      onClick={handleUseGpsOnce}
                      disabled={!liveGpsFix}
                    >
                      <FiCrosshair />
                      Use GPS once
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary rounded-xl"
                      onClick={() => handleOpenLocationPicker()}
                      disabled={!deviceSelected}
                    >
                      <FiPlus />
                      Choose on map
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline rounded-xl"
                      onClick={loadStartPoints}
                      disabled={startPointsLoading || !deviceSelected}
                    >
                      {startPointsLoading ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <FiRefreshCw />
                      )}
                      Refresh
                    </button>
                  </div>

                  <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-base-300 bg-base-100 px-3 py-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={usePreviousLocation}
                      onChange={handleUsePreviousLocation}
                      disabled={!deviceSelected}
                    />

                    <span>
                      <span className="block text-sm font-medium">
                        Use previous location
                      </span>
                      <span className="block text-xs text-base-content/55">
                        Loads the last static location used for this device.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <SelectedLocationCompact
                location={selectedLocation}
                onEdit={() => handleOpenLocationPicker()}
              />

              {!deviceSelected ? (
                <div className="alert alert-info rounded-2xl">
                  <FiAlertTriangle />
                  <span>Select a static station before starting the session.</span>
                </div>
              ) : null}

              <button
                type="button"
                className="btn btn-primary mt-auto w-full rounded-xl"
                disabled={!canStart}
                onClick={handleStartClick}
              >
                {busy ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <FiPlay />
                )}
                Start static monitoring
              </button>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-success/30 bg-success/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="status status-success mt-1 animate-pulse" />

                  <div>
                    <div className="text-sm font-semibold">
                      Static session is running
                    </div>

                    <div className="mt-1 text-sm text-base-content/65">
                      {activeMissionName}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-base-content/55">
                      <FiClock />
                      <span>
                        Sensor data is being recorded at the selected fixed
                        location.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <SelectedLocationCompact location={selectedLocation} onEdit={() => {}} />

              <div className="mt-auto grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="btn btn-outline rounded-xl"
                  onClick={onStopMission}
                  disabled={busy}
                >
                  {busy ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <FiStopCircle />
                  )}
                  Stop session
                </button>

                <button
                  type="button"
                  className="btn btn-error rounded-xl"
                  onClick={onAbortMission}
                  disabled={busy}
                >
                  {busy ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <FiX />
                  )}
                  Abort session
                </button>
              </div>
            </>
          )}
        </div>

        <div className="h-full">
          <MiniStaticMap
            location={selectedLocation}
            onOpenPicker={() => handleOpenLocationPicker()}
          />
        </div>
      </div>

      <MissionStaticLocation
        open={locationModalOpen}
        initialLocation={modalInitialLocation}
        gpsFix={liveGpsFix}
        saving={savingLocation}
        onClose={() => {
          if (savingLocation) return;
          setLocationModalOpen(false);
        }}
        onSave={handleSaveStaticLocation}
      />

      <PanelToast toast={toast} onClose={clearToast} />
    </section>
  );
}
