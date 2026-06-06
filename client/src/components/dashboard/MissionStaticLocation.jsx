import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

import {
  FiAlertTriangle,
  FiCrosshair,
  FiMapPin,
  FiSave,
  FiX,
} from "react-icons/fi";

export const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
export const MAP_STYLE_URL = `https://api.maptiler.com/maps/topo-v4/style.json?key=${MAPTILER_KEY}`;
export const DEFAULT_CENTER = [26.255, 47.651];

if (MAPTILER_KEY) {
  maptilersdk.config.apiKey = MAPTILER_KEY;
}

export function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function isValidLocation(location) {
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

export function normalizeLocation(input, fallback = {}) {
  if (!input) return null;

  const lat = toNumberOrNull(input.lat ?? input.latlng?.lat);
  const lon = toNumberOrNull(input.lon ?? input.lng ?? input.latlng?.lng);

  const location = {
    id: input.id ?? fallback.id ?? null,
    name: input.name ?? fallback.name ?? "",
    lat,
    lon,
    alt_m: toNumberOrNull(input.alt_m ?? input.alt ?? fallback.alt_m),
    source: input.source ?? fallback.source ?? "manual",
  };

  return isValidLocation(location) ? location : null;
}

export function getSourceLabel(source) {
  if (source === "gps") return "Device GPS";
  if (source === "map") return "Map selected";
  if (source === "previous") return "Previous location";
  if (source === "saved") return "Saved location";
  if (source === "manual") return "Manual";
  return "Static location";
}

export function createSmallMarkerElement() {
  const marker = document.createElement("div");

  marker.style.width = "22px";
  marker.style.height = "22px";
  marker.style.borderRadius = "9999px";
  marker.style.display = "grid";
  marker.style.placeItems = "center";
  marker.style.background = "var(--color-primary)";
  marker.style.border = "2px solid var(--color-base-100)";
  marker.style.boxShadow = "0 8px 20px rgba(0,0,0,.22)";

  const dot = document.createElement("div");
  dot.style.width = "6px";
  dot.style.height = "6px";
  dot.style.borderRadius = "9999px";
  dot.style.background = "var(--color-primary-content)";

  marker.appendChild(dot);
  return marker;
}

function formatCoord(value) {
  const n = toNumberOrNull(value);
  if (n === null) return "—";
  return n.toFixed(6);
}

function ModalInputField({ label, helper = null, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-base-content/75">
          {label}
        </label>

        {helper ? (
          <span className="text-xs text-base-content/45">{helper}</span>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function CoordinatesPreview({ location, source }) {
  const hasLocation = isValidLocation(location);

  return (
    <ModalInputField
      label="Latitude / Longitude"
      helper={hasLocation ? getSourceLabel(source) : "select on map"}
    >
      <div className="grid grid-cols-2 gap-3">
        <div
          className={[
            "rounded-xl border px-3 py-2.5 shadow-sm transition-colors",
            hasLocation
              ? "border-primary/35 bg-primary/5"
              : "border-base-300 bg-base-100",
          ].join(" ")}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-base-content/45">
            Lat
          </div>

          <div className="mt-1 font-mono text-sm font-semibold text-base-content">
            {formatCoord(location?.lat)}
          </div>
        </div>

        <div
          className={[
            "rounded-xl border px-3 py-2.5 shadow-sm transition-colors",
            hasLocation
              ? "border-primary/35 bg-primary/5"
              : "border-base-300 bg-base-100",
          ].join(" ")}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-base-content/45">
            Lon
          </div>

          <div className="mt-1 font-mono text-sm font-semibold text-base-content">
            {formatCoord(location?.lon)}
          </div>
        </div>
      </div>

      <p
        className={[
          "min-h-4 text-xs transition-colors",
          hasLocation ? "text-success/70" : "text-base-content/45",
        ].join(" ")}
      >
        {hasLocation
          ? "Coordinates are set from the selected monitoring point."
          : "Click on the map to choose the static monitoring point."}
      </p>
    </ModalInputField>
  );
}

function PickerMap({ open, location, onChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const locationRef = useRef(location);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!open || !MAPTILER_KEY || !mapContainerRef.current || mapRef.current) {
      return;
    }

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

      navigationControl: true,
      geolocateControl: false,
      scaleControl: false,
    });

    map.addControl(
      new maptilersdk.NavigationControl({
        showCompass: false,
        showZoom: false,
      }),
      "top-right",
    );

    map.on("click", (event) => {
      onChangeRef.current({
        ...(locationRef.current || {}),
        lat: Number(event.lngLat.lat),
        lon: Number(event.lngLat.lng),
        source: "map",
      });
    });

    mapRef.current = map;

    window.setTimeout(() => {
      try {
        map.resize();
      } catch {
        // Ignore resize errors.
      }
    }, 120);

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
  }, [open]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!isValidLocation(location)) {
      try {
        markerRef.current?.remove();
      } catch {
        // Ignore marker cleanup errors.
      }

      markerRef.current = null;
      return;
    }

    const center = [Number(location.lon), Number(location.lat)];

    if (!markerRef.current) {
      const marker = new maptilersdk.Marker({
        element: createSmallMarkerElement(),
        anchor: "center",
        draggable: true,
      })
        .setLngLat(center)
        .addTo(map);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();

        onChangeRef.current({
          ...(locationRef.current || {}),
          lat: Number(lngLat.lat),
          lon: Number(lngLat.lng),
          source: "map",
        });
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat(center);
    }

    map.flyTo({
      center,
      zoom: 15.8,
      duration: 450,
      essential: true,
    });
  }, [location]);

  if (!MAPTILER_KEY) {
    return (
      <div className="grid h-[430px] place-items-center rounded-2xl border border-dashed border-base-300 bg-base-200/60 p-5 text-center">
        <div>
          <FiMapPin className="mx-auto text-3xl text-base-content/40" />

          <div className="mt-2 text-sm font-semibold">Map unavailable</div>

          <div className="mt-1 max-w-sm text-xs text-base-content/55">
            Set VITE_MAPTILER_KEY to enable map selection.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-base-300 bg-base-200">
      <div ref={mapContainerRef} className="h-[430px] w-full" />

      <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-base-300 bg-base-100/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
        Click on the map or drag the pin to set the monitoring point.
      </div>
    </div>
  );
}

export default function MissionStaticLocation({
  open,
  initialLocation = null,
  gpsFix = null,
  saving = false,
  onClose = () => {},
  onSave = async () => {},
}) {
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [altM, setAltM] = useState("");
  const [source, setSource] = useState("manual");
  const [errorText, setErrorText] = useState("");

  const normalizedGpsFix = useMemo(
    () =>
      normalizeLocation(gpsFix, {
        source: "gps",
        name: "Device GPS",
      }),
    [gpsFix],
  );

  const draftLocation = useMemo(
    () =>
      normalizeLocation({
        name: locationName,
        lat,
        lon,
        alt_m: altM,
        source,
      }),
    [locationName, lat, lon, altM, source],
  );

  useEffect(() => {
    if (!open) return;

    const initial = normalizeLocation(initialLocation);

    setLocationName(initial?.name || "");
    setLat(
      initial?.lat !== null && initial?.lat !== undefined
        ? String(initial.lat)
        : "",
    );
    setLon(
      initial?.lon !== null && initial?.lon !== undefined
        ? String(initial.lon)
        : "",
    );
    setAltM(
      initial?.alt_m !== null && initial?.alt_m !== undefined
        ? String(initial.alt_m)
        : "",
    );
    setSource(initial?.source || "manual");
    setErrorText("");
  }, [open, initialLocation]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving, onClose]);

  function handleMapChange(nextLocation) {
    setLat(
      nextLocation?.lat !== null && nextLocation?.lat !== undefined
        ? String(nextLocation.lat)
        : "",
    );

    setLon(
      nextLocation?.lon !== null && nextLocation?.lon !== undefined
        ? String(nextLocation.lon)
        : "",
    );

    setSource(nextLocation?.source || "map");
    setErrorText("");
  }

  function handleUseGpsFix() {
    if (!normalizedGpsFix) {
      setErrorText("No valid GPS fix available.");
      return;
    }

    setLat(String(normalizedGpsFix.lat));
    setLon(String(normalizedGpsFix.lon));
    setAltM(
      normalizedGpsFix.alt_m !== null && normalizedGpsFix.alt_m !== undefined
        ? String(normalizedGpsFix.alt_m)
        : "",
    );
    setSource("gps");
    setErrorText("");
  }

  async function handleSaveClick() {
    const name = locationName.trim();
    const latNumber = toNumberOrNull(lat);
    const lonNumber = toNumberOrNull(lon);
    const altNumber = toNumberOrNull(altM);

    if (!name) {
      setErrorText("Add a name for this static location.");
      return;
    }

    if (!isValidLocation({ lat: latNumber, lon: lonNumber })) {
      setErrorText("Select the location on the map before saving.");
      return;
    }

    setErrorText("");

    await onSave({
      name,
      lat: latNumber,
      lon: lonNumber,
      alt_m: altNumber,
      source,
    });
  }

  if (!open) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-[96vw] max-w-6xl rounded-[2rem] p-0">
        <div className="flex items-start justify-between gap-4 border-b border-base-300 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FiMapPin />
            </div>

            <div>
              <h3 className="text-base font-semibold">
                Static monitoring location
              </h3>

              <p className="mt-0.5 text-sm text-base-content/55">
                Choose the fixed position and save it for future sessions.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={saving}
            aria-label="Close modal"
          >
            <FiX />
          </button>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 p-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <PickerMap
              open={open}
              location={draftLocation}
              onChange={handleMapChange}
            />
          </div>

          <div className="xl:col-span-4">
            <div className="flex min-h-[430px] flex-col justify-between">
              <div className="space-y-4">
                <ModalInputField label="Location name">
                  <input
                    type="text"
                    className="input input-bordered h-11 w-full rounded-xl text-sm"
                    placeholder="Ex: Parc USV"
                    value={locationName}
                    onChange={(event) => setLocationName(event.target.value)}
                  />
                </ModalInputField>

                <CoordinatesPreview location={draftLocation} source={source} />

                <ModalInputField label="Altitude" helper="optional, meters">
                  <input
                    type="number"
                    step="0.1"
                    className="input input-bordered h-11 w-full rounded-xl font-mono text-sm"
                    placeholder="Optional"
                    value={altM}
                    onChange={(event) => {
                      setAltM(event.target.value);
                      setSource(source === "gps" ? "gps" : "manual");
                    }}
                  />
                </ModalInputField>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-base-content/75">
                      Device GPS
                    </label>

                    <span className="text-xs text-base-content/45">
                      {getSourceLabel(source)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline h-11 w-full rounded-xl"
                    onClick={handleUseGpsFix}
                    disabled={!normalizedGpsFix || saving}
                  >
                    <FiCrosshair />
                    Use device GPS once
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary mt-4 h-11 w-full rounded-xl shadow-md"
                onClick={handleSaveClick}
                disabled={saving}
              >
                {saving ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <FiSave />
                )}
                Save static location
              </button>
            </div>
          </div>
        </div>
      </div>

      {errorText ? (
        <div className="toast toast-bottom toast-center z-[9999] pb-6">
          <div className="alert alert-error min-w-[320px] max-w-[460px] rounded-2xl shadow-2xl">
            <FiAlertTriangle className="shrink-0" />

            <span className="text-sm font-medium">{errorText}</span>

            <button
              type="button"
              className="btn btn-xs btn-circle btn-ghost ml-2"
              onClick={() => setErrorText("")}
              aria-label="Close toast"
            >
              <FiX />
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="modal-backdrop cursor-default"
        onClick={!saving ? onClose : undefined}
        disabled={saving}
        aria-label="Close modal backdrop"
      >
        Close
      </button>
    </div>
  );
}
