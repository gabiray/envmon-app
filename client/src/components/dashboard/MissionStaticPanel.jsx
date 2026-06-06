import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCrosshair,
  FiMapPin,
  FiPlay,
  FiRadio,
  FiSave,
  FiSquare,
  FiStopCircle,
} from "react-icons/fi";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

if (MAPTILER_KEY) {
  maptilersdk.config.apiKey = MAPTILER_KEY;
}

const TOPO_STYLE_URL = `https://api.maptiler.com/maps/topo-v4/style.json?key=${MAPTILER_KEY}`;
const DEFAULT_CENTER = [26.255, 47.651];

function buildStorageKey(deviceId) {
  return `envmon.staticLocation.${deviceId || "default"}`;
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isValidLocation(location) {
  const lat = toNumberOrNull(location?.lat);
  const lon = toNumberOrNull(location?.lon);

  return (
    lat !== null &&
    lon !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function formatCoord(value, decimals = 6) {
  const n = toNumberOrNull(value);
  if (n === null) return "—";
  return n.toFixed(decimals);
}

function buildDefaultMissionName() {
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

  return `Static monitoring ${dateStr} ${timeStr}`;
}

function getLocationLabel(location) {
  if (!isValidLocation(location)) return "No location selected";

  if (location.source === "gps") return "GPS location";
  if (location.source === "previous") return "Previous location";
  if (location.source === "map") return "Map selected location";

  return "Static location";
}

function readSavedLocation(deviceId) {
  try {
    const raw = localStorage.getItem(buildStorageKey(deviceId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!isValidLocation(parsed)) return null;

    return {
      lat: Number(parsed.lat),
      lon: Number(parsed.lon),
      alt_m: toNumberOrNull(parsed.alt_m),
      source: "previous",
    };
  } catch {
    return null;
  }
}

function saveLocation(deviceId, location) {
  if (!isValidLocation(location)) return;

  localStorage.setItem(
    buildStorageKey(deviceId),
    JSON.stringify({
      lat: Number(location.lat),
      lon: Number(location.lon),
      alt_m: toNumberOrNull(location.alt_m),
    }),
  );
}

function makeMarkerElement() {
  const el = document.createElement("div");

  el.className =
    "grid h-8 w-8 place-items-center rounded-full border-2 border-base-100 bg-primary text-primary-content shadow-lg";

  el.innerHTML = `
    <div style="
      width: 10px;
      height: 10px;
      border-radius: 9999px;
      background: currentColor;
      box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.22);
    "></div>
  `;

  return el;
}

function PanelToast({ toast, onClose }) {
  if (!toast) return null;

  const alertClass =
    toast.type === "error"
      ? "alert-error"
      : toast.type === "warning"
        ? "alert-warning"
        : "alert-success";

  return (
    <div className="toast toast-bottom toast-center z-[9999]">
      <div className={`alert ${alertClass} min-w-[320px] shadow-xl`}>
        {toast.type === "error" || toast.type === "warning" ? (
          <FiAlertTriangle />
        ) : (
          <FiCheckCircle />
        )}

        <span>{toast.text}</span>

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

function MiniStaticMap({ selectedLocation, onPickLocation }) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPickLocationRef = useRef(onPickLocation);

  useEffect(() => {
    onPickLocationRef.current = onPickLocation;
  }, [onPickLocation]);

  useEffect(() => {
    if (!MAPTILER_KEY || !mapNodeRef.current || mapRef.current) return;

    const map = new maptilersdk.Map({
      container: mapNodeRef.current,
      style: TOPO_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: 12.2,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(
      new maptilersdk.NavigationControl({
        showCompass: false,
      }),
      "top-right",
    );

    map.on("click", (event) => {
      const lngLat = event.lngLat;

      onPickLocationRef.current({
        lat: Number(lngLat.lat),
        lon: Number(lngLat.lng),
        alt_m: null,
        source: "map",
      });
    });

    mapRef.current = map;

    return () => {
      try {
        markerRef.current?.remove();
        map.remove();
      } catch {
        // Ignore map cleanup errors.
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

    if (!isValidLocation(selectedLocation)) return;

    const center = [Number(selectedLocation.lon), Number(selectedLocation.lat)];

    const marker = new maptilersdk.Marker({
      element: makeMarkerElement(),
      anchor: "center",
    })
      .setLngLat(center)
      .addTo(map);

    markerRef.current = marker;

    map.flyTo({
      center,
      zoom: 15.5,
      pitch: 0,
      bearing: 0,
      duration: 700,
      essential: true,
    });
  }, [selectedLocation]);

  if (!MAPTILER_KEY) {
    return (
      <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-base-300 bg-base-200/60 p-5 text-center">
        <div>
          <FiMapPin className="mx-auto text-2xl text-base-content/50" />
          <div className="mt-2 text-sm font-semibold">Map unavailable</div>
          <div className="mt-1 text-xs text-base-content/55">
            Set VITE_MAPTILER_KEY to enable point selection on map.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-base-300 bg-base-200">
      <div ref={mapNodeRef} className="h-72 w-full" />

      <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-base-300 bg-base-100/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
        Click on the map to choose the fixed station position.
      </div>
    </div>
  );
}

export default function MissionStaticPanel({
  selectedDeviceId = "none",
  deviceStatus = "inactive",
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
  const [sampleHz, setSampleHz] = useState(1);
  const [usePreviousLocation, setUsePreviousLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [toast, setToast] = useState(null);

  const toastTimerRef = useRef(null);

  const hasGpsFix = isValidLocation(gpsFix);
  const hasSelectedLocation = isValidLocation(selectedLocation);

  const canStart =
    deviceStatus === "connected" &&
    !busy &&
    !missionRunning &&
    hasSelectedLocation;

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

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setUsePreviousLocation(false);
    setSelectedLocation(null);
    clearToast();
  }, [selectedDeviceId]);

  useEffect(() => {
    onLocationChange(hasSelectedLocation ? selectedLocation : null);
  }, [hasSelectedLocation, selectedLocation, onLocationChange]);

  function updateLocation(nextLocation, toastText = "") {
    setSelectedLocation(nextLocation);

    if (toastText) {
      showToast("success", toastText);
    }
  }

  function handleUseGpsLocation() {
    if (!hasGpsFix) {
      showToast("error", "No valid GPS fix available yet.");
      return;
    }

    const nextLocation = {
      lat: Number(gpsFix.lat),
      lon: Number(gpsFix.lon),
      alt_m: toNumberOrNull(gpsFix.alt_m),
      source: "gps",
    };

    setUsePreviousLocation(false);
    updateLocation(nextLocation, "GPS location loaded.");
  }

  function handleUsePreviousLocation(event) {
    const checked = event.target.checked;

    setUsePreviousLocation(checked);

    if (!checked) return;

    const saved = readSavedLocation(selectedDeviceId);

    if (!saved) {
      setUsePreviousLocation(false);
      showToast("error", "No previous location saved for this station.");
      return;
    }

    updateLocation(saved, "Previous location loaded.");
  }

  function handleMapPick(location) {
    setUsePreviousLocation(false);
    updateLocation(location, "Map location selected.");
  }

  function handleSaveSelectedLocation() {
    if (!hasSelectedLocation) {
      showToast("error", "Choose a location first.");
      return;
    }

    try {
      saveLocation(selectedDeviceId, selectedLocation);
      showToast("success", "Location saved as previous location.");
    } catch {
      showToast("error", "Could not save previous location.");
    }
  }

  async function handleStartClick() {
    if (!hasSelectedLocation) {
      showToast("error", "Choose a static location before starting the mission.");
      return;
    }

    const payload = {
      mission_name: missionName.trim() || buildDefaultMissionName(),
      duration: Number(duration),
      sample_hz: Number(sampleHz),
      photo_every: 0,
      gps_mode: "off",
      camera_mode: "off",
      location_mode: "fixed",
      fixed_location: {
        lat: Number(selectedLocation.lat),
        lon: Number(selectedLocation.lon),
        alt_m: toNumberOrNull(selectedLocation.alt_m),
      },
    };

    const result = await onStartMission(payload);

    if (!result?.ok) {
      showToast("error", result?.error || "Static mission could not be started.");
      return;
    }

    try {
      saveLocation(selectedDeviceId, selectedLocation);
    } catch {
      // Mission can still start even if local save fails.
    }

    showToast("success", "Static monitoring session started.");
  }

  return (
    <section className="rounded-box border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 px-5 py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <FiRadio className="mt-1 text-lg text-primary" />

            <div>
              <h2 className="text-lg font-semibold">
                Static monitoring session
              </h2>
              <p className="text-sm text-base-content/60">
                Configure the mission and choose the fixed monitoring location.
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

      <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
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
                    placeholder={buildDefaultMissionName()}
                    value={missionName}
                    onChange={(event) => {
                      setMissionName(event.target.value);
                    }}
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
                    onChange={(event) => {
                      setDuration(event.target.value);
                    }}
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-base-300 bg-base-200/45 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      Location source
                    </div>
                    <div className="mt-1 text-xs text-base-content/55">
                      Use GPS once, reuse the last position, or click directly
                      on the map.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline rounded-xl"
                      onClick={handleUseGpsLocation}
                      disabled={!hasGpsFix}
                    >
                      <FiCrosshair />
                      Use GPS
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline rounded-xl"
                      onClick={handleSaveSelectedLocation}
                      disabled={!hasSelectedLocation}
                    >
                      <FiSave />
                      Save location
                    </button>
                  </div>
                </div>

                <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-base-300 bg-base-100 px-3 py-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={usePreviousLocation}
                    onChange={handleUsePreviousLocation}
                    disabled={!selectedDeviceId || selectedDeviceId === "none"}
                  />

                  <span>
                    <span className="block text-sm font-medium">
                      Use previous location
                    </span>
                    <span className="block text-xs text-base-content/55">
                      Loads the last saved static position for this device.
                    </span>
                  </span>
                </label>
              </div>

              <div className="rounded-2xl border border-base-300 bg-base-200/45 p-4">
                <div className="flex items-start gap-3">
                  <FiMapPin className="mt-1 text-lg text-primary" />

                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {getLocationLabel(selectedLocation)}
                    </div>

                    <div className="mt-2 font-mono text-sm text-base-content/70">
                      Lat: {formatCoord(selectedLocation?.lat)}
                      <br />
                      Lon: {formatCoord(selectedLocation?.lon)}
                      <br />
                      Alt: {formatCoord(selectedLocation?.alt_m, 1)} m
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <label className="form-control">
                  <div className="label">
                    <span className="label-text">Sample rate</span>
                    <span className="label-text-alt">Hz</span>
                  </div>

                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    className="input input-bordered rounded-xl"
                    value={sampleHz}
                    onChange={(event) => setSampleHz(event.target.value)}
                  />
                </label>

                <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-base-content/45">
                    Camera
                  </div>
                  <div className="mt-1 text-sm font-semibold">Disabled</div>
                </div>

                <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-base-content/45">
                    Location mode
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    Fixed position
                  </div>
                </div>
              </div>

              {deviceStatus !== "connected" ? (
                <div className="alert alert-info">
                  <FiAlertTriangle />
                  <span>
                    Select an online static station before starting the
                    session.
                  </span>
                </div>
              ) : null}

              <button
                type="button"
                className="btn btn-primary w-full rounded-xl"
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    <FiSquare />
                  )}
                  Abort session
                </button>
              </div>
            </>
          )}
        </div>

        <div className="xl:col-span-5">
          <MiniStaticMap
            selectedLocation={selectedLocation}
            onPickLocation={handleMapPick}
          />
        </div>
      </div>

      <PanelToast toast={toast} onClose={clearToast} />
    </section>
  );
}
