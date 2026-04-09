import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { FiLayers, FiRotateCcw } from "react-icons/fi";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

if (MAPTILER_KEY) {
  maptilersdk.config.apiKey = MAPTILER_KEY;
}

const TOPO_STYLE_URL = `https://api.maptiler.com/maps/topo-v4/style.json?key=${MAPTILER_KEY}`;
const TERRAIN_URL = `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`;

const CAMERA_PRESETS = {
  map2d: {
    center: [26.255, 47.651],
    zoom: 12.4,
    pitch: 0,
    bearing: 0,
  },
  map3d: {
    center: [26.255, 47.651],
    zoom: 12.4,
    pitch: 62,
    bearing: 0,
  },
};

function getCameraPreset(mapPerspective) {
  return mapPerspective === "3d" ? CAMERA_PRESETS.map3d : CAMERA_PRESETS.map2d;
}

function getFocusCamera(mapPerspective) {
  if (mapPerspective === "3d") {
    return {
      pitch: 62,
      bearing: 0,
      singleZoom: 15.3,
      padding: 84,
    };
  }

  return {
    pitch: 0,
    bearing: 0,
    singleZoom: 15.1,
    padding: 84,
  };
}

function fitCoords(map, coords, mapPerspective) {
  if (!map || !Array.isArray(coords) || coords.length === 0) return;

  const focus = getFocusCamera(mapPerspective);

  if (coords.length === 1) {
    map.flyTo({
      center: coords[0],
      zoom: focus.singleZoom,
      pitch: focus.pitch,
      bearing: focus.bearing,
      speed: 0.9,
      curve: 1.2,
      essential: true,
    });
    return;
  }

  const bounds = new maptilersdk.LngLatBounds(coords[0], coords[0]);
  coords.forEach((item) => bounds.extend(item));

  map.fitBounds(bounds, {
    padding: focus.padding,
    duration: 1200,
    essential: true,
    pitch: focus.pitch,
    bearing: focus.bearing,
    maxZoom: 16.2,
  });
}

function ensureTerrainSource(map) {
  if (!map.getSource("terrain-rgb")) {
    map.addSource("terrain-rgb", {
      type: "raster-dem",
      url: TERRAIN_URL,
      tileSize: 256,
    });
  }
}

function applyBaseScene(map, mapPerspective) {
  if (!map) return;

  try {
    if (typeof map.enableMercatorProjection === "function") {
      map.enableMercatorProjection();
    } else if (typeof map.setProjection === "function") {
      map.setProjection({ type: "mercator" });
    }
  } catch {}

  try {
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
  } catch {}

  if (mapPerspective === "3d") {
    try {
      ensureTerrainSource(map);
      if (typeof map.setTerrain === "function") {
        map.setTerrain({
          source: "terrain-rgb",
          exaggeration: 1.25,
        });
      }
    } catch {}
  } else {
    try {
      if (typeof map.setTerrain === "function") {
        map.setTerrain(null);
      }
    } catch {}
  }
}

function createPointMarkerElement({
  selected = false,
  pending = false,
  gpsPreview = false,
}) {
  const el = document.createElement("button");
  el.type = "button";
  el.style.width = gpsPreview ? "20px" : pending ? "18px" : "16px";
  el.style.height = gpsPreview ? "20px" : pending ? "18px" : "16px";
  el.style.borderRadius = "999px";
  el.style.border = gpsPreview
    ? "3px solid white"
    : selected
      ? "3px solid white"
      : pending
        ? "2px solid white"
        : "2px solid rgba(255,255,255,0.92)";
  el.style.background = gpsPreview
    ? "#06b6d4"
    : pending
      ? "#f59e0b"
      : selected
        ? "#2563eb"
        : "#ec4899";
  el.style.boxShadow = gpsPreview
    ? "0 0 0 6px rgba(6,182,212,0.20), 0 8px 20px rgba(0,0,0,0.22)"
    : "0 8px 20px rgba(0,0,0,0.22)";
  el.style.cursor = "pointer";
  return el;
}

function createLiveMarkerElement({ connected = true } = {}) {
  const el = document.createElement("div");
  el.style.width = "22px";
  el.style.height = "22px";
  el.style.borderRadius = "999px";
  el.style.border = "3px solid white";
  el.style.background = connected ? "#06b6d4" : "#f59e0b";
  el.style.boxShadow = connected
    ? "0 0 0 8px rgba(6,182,212,0.20), 0 8px 24px rgba(0,0,0,0.25)"
    : "0 0 0 8px rgba(245,158,11,0.18), 0 8px 24px rgba(0,0,0,0.25)";
  return el;
}

function formatTelemetryValue(value, decimals = 2, suffix = "") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function formatTelemetryTime(tsEpoch) {
  if (!tsEpoch) return "—";

  try {
    return new Date(Number(tsEpoch) * 1000).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function MissionDashboardMap({
  startPoints = [],
  selectedStartPointId = null,
  pendingMapPick = null,
  gpsPreviewPoint = null,
  mapPickEnabled = false,
  missionRunning = false,
  liveMapEnabled = false,
  liveConnected = false,
  liveTelemetry = null,
  onMapPick = () => {},
  onSelectStartPoint = () => {},
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const pendingMarkerRef = useRef(null);
  const gpsPreviewMarkerRef = useRef(null);
  const gpsPreviewPopupRef = useRef(null);
  const lastViewRef = useRef(null);

  const liveMarkerRef = useRef(null);
  const liveFocusedRef = useRef(false);

  const [mapPerspective, setMapPerspective] = useState("2d");
  const [mapVersion, setMapVersion] = useState(0);

  const selectedPoint = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId],
  );

  function clearMarkers() {
    markersRef.current.forEach((item) => {
      try {
        item.remove();
      } catch {}
    });
    markersRef.current = [];

    try {
      pendingMarkerRef.current?.remove();
    } catch {}
    pendingMarkerRef.current = null;

    try {
      gpsPreviewPopupRef.current?.remove?.();
    } catch {}
    gpsPreviewPopupRef.current = null;

    try {
      gpsPreviewMarkerRef.current?.remove();
    } catch {}
    gpsPreviewMarkerRef.current = null;

    try {
      liveMarkerRef.current?.remove();
    } catch {}
    liveMarkerRef.current = null;

    liveFocusedRef.current = false;
  }

  useEffect(() => {
    if (!mapNodeRef.current || !MAPTILER_KEY) return;

    clearMarkers();

    const fallbackCamera = getCameraPreset(mapPerspective);
    const previousView = lastViewRef.current;

    const initialCenter = previousView?.center || fallbackCamera.center;
    const initialZoom = previousView?.zoom ?? fallbackCamera.zoom;
    const initialPitch = previousView?.pitch ?? fallbackCamera.pitch;
    const initialBearing = previousView?.bearing ?? fallbackCamera.bearing;

    const map = new maptilersdk.Map({
      container: mapNodeRef.current,
      style: TOPO_STYLE_URL,
      center: initialCenter,
      zoom: initialZoom,
      pitch: initialPitch,
      bearing: initialBearing,
      antialias: true,
      attributionControl: true,
      navigationControl: false,
      geolocateControl: false,
      projection: "mercator",
    });

    map.addControl(
      new maptilersdk.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      "bottom-right",
    );

    map.on("style.load", () => {
      applyBaseScene(map, mapPerspective);

      const targetCamera = getFocusCamera(mapPerspective);

      map.easeTo({
        center: initialCenter,
        zoom: initialZoom,
        pitch: targetCamera.pitch,
        bearing: targetCamera.bearing,
        duration: 850,
        essential: true,
      });

      setMapVersion((prev) => prev + 1);
    });

    map.on("click", (event) => {
      if (!mapPickEnabled) return;

      onMapPick({
        lat: Number(event.lngLat.lat.toFixed(6)),
        lng: Number(event.lngLat.lng.toFixed(6)),
      });
    });

    mapRef.current = map;

    return () => {
      clearMarkers();

      try {
        const center = map.getCenter?.();
        const zoom = map.getZoom?.();
        const pitch = map.getPitch?.();
        const bearing = map.getBearing?.();

        if (center && zoom != null) {
          lastViewRef.current = {
            center: [center.lng, center.lat],
            zoom,
            pitch: pitch ?? 0,
            bearing: bearing ?? 0,
          };
        }
      } catch {}

      try {
        map.remove();
      } catch {}

      mapRef.current = null;
    };
  }, [mapPerspective, mapPickEnabled, onMapPick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const canvas = map.getCanvas?.();
    if (canvas) {
      canvas.style.cursor = mapPickEnabled ? "crosshair" : "";
    }
  }, [mapPickEnabled, mapVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearMarkers();

    for (const point of startPoints) {
      const lat = Number(point?.latlng?.lat);
      const lng = Number(point?.latlng?.lng);

      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

      const selected = point.id === selectedStartPointId;
      const el = createPointMarkerElement({ selected });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectStartPoint(point.id);
      });

      const popup = new maptilersdk.Popup({
        offset: 16,
        closeButton: false,
      }).setHTML(`
        <div style="min-width:160px">
          <div style="font-weight:700; margin-bottom:4px;">${point.name || "Start point"}</div>
          <div style="font-size:12px; opacity:.75;">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
        </div>
      `);

      const marker = new maptilersdk.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    }

    if (pendingMapPick?.lat != null && pendingMapPick?.lng != null) {
      const el = createPointMarkerElement({ pending: true });

      pendingMarkerRef.current = new maptilersdk.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([pendingMapPick.lng, pendingMapPick.lat])
        .addTo(map);
    }

    if (gpsPreviewPoint?.lat != null && gpsPreviewPoint?.lng != null) {
      const el = createPointMarkerElement({ gpsPreview: true });

      const popup = new maptilersdk.Popup({
        offset: 16,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(`
        <div style="min-width:170px">
          <div style="font-weight:700; margin-bottom:4px;">Live GPS preview</div>
          <div style="font-size:12px; opacity:.8;">Lat: ${Number(gpsPreviewPoint.lat).toFixed(6)}</div>
          <div style="font-size:12px; opacity:.8;">Lon: ${Number(gpsPreviewPoint.lng).toFixed(6)}</div>
          <div style="font-size:12px; opacity:.8;">Alt: ${
            gpsPreviewPoint.alt_m != null
              ? `${Number(gpsPreviewPoint.alt_m).toFixed(1)} m`
              : "—"
          }</div>
          <div style="font-size:12px; opacity:.8;">Satellites: ${gpsPreviewPoint.satellites ?? "—"}</div>
          <div style="font-size:12px; opacity:.8;">HDOP: ${
            gpsPreviewPoint.hdop != null
              ? Number(gpsPreviewPoint.hdop).toFixed(2)
              : "—"
          }</div>
        </div>
      `);

      gpsPreviewMarkerRef.current = new maptilersdk.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([gpsPreviewPoint.lng, gpsPreviewPoint.lat])
        .addTo(map);

      gpsPreviewPopupRef.current = popup;

      el.addEventListener("mouseenter", () => {
        try {
          popup
            .setLngLat([gpsPreviewPoint.lng, gpsPreviewPoint.lat])
            .addTo(map);
        } catch {}
      });

      el.addEventListener("mouseleave", () => {
        try {
          popup.remove();
        } catch {}
      });
    }
  }, [
    mapVersion,
    startPoints,
    selectedStartPointId,
    pendingMapPick,
    gpsPreviewPoint,
    onSelectStartPoint,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (gpsPreviewPoint?.lat != null && gpsPreviewPoint?.lng != null) {
      fitCoords(
        map,
        [[gpsPreviewPoint.lng, gpsPreviewPoint.lat]],
        mapPerspective,
      );
      return;
    }

    if (
      selectedPoint?.latlng?.lat != null &&
      selectedPoint?.latlng?.lng != null
    ) {
      fitCoords(
        map,
        [[selectedPoint.latlng.lng, selectedPoint.latlng.lat]],
        mapPerspective,
      );
      return;
    }

    if (pendingMapPick?.lat != null && pendingMapPick?.lng != null) {
      fitCoords(
        map,
        [[pendingMapPick.lng, pendingMapPick.lat]],
        mapPerspective,
      );
      return;
    }

    const coords = startPoints
      .map((p) => {
        const lat = Number(p?.latlng?.lat);
        const lng = Number(p?.latlng?.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return [lng, lat];
      })
      .filter(Boolean);

    if (coords.length > 0) {
      fitCoords(map, coords, mapPerspective);
    }
  }, [
    mapVersion,
    gpsPreviewPoint,
    selectedPoint,
    pendingMapPick,
    startPoints,
    mapPerspective,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!liveMapEnabled || !missionRunning) {
      try {
        liveMarkerRef.current?.remove();
      } catch {}
      liveMarkerRef.current = null;
      liveFocusedRef.current = false;
      return;
    }

    if (liveTelemetry?.lat == null || liveTelemetry?.lon == null) {
      return;
    }

    try {
      liveMarkerRef.current?.remove();
    } catch {}

    const marker = new maptilersdk.Marker({
      element: createLiveMarkerElement({ connected: liveConnected }),
      anchor: "center",
    })
      .setLngLat([Number(liveTelemetry.lon), Number(liveTelemetry.lat)])
      .addTo(map);

    liveMarkerRef.current = marker;

    if (!liveFocusedRef.current) {
      map.flyTo({
        center: [Number(liveTelemetry.lon), Number(liveTelemetry.lat)],
        zoom: 16.2,
        essential: true,
        speed: 0.9,
      });
      liveFocusedRef.current = true;
    }

    return () => {
      try {
        marker.remove();
      } catch {}
      if (liveMarkerRef.current === marker) {
        liveMarkerRef.current = null;
      }
    };
  }, [
    mapVersion,
    liveMapEnabled,
    missionRunning,
    liveConnected,
    liveTelemetry?.lat,
    liveTelemetry?.lon,
  ]);

  function handleReset() {
    const map = mapRef.current;
    if (!map) return;

    const camera = getCameraPreset(mapPerspective);

    map.flyTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      duration: 1400,
      essential: true,
    });
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-base-200">
      {!MAPTILER_KEY ? (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-8">
            <div className="text-lg font-semibold">Map key missing</div>
            <div className="mt-2 text-sm text-base-content/60">
              Add <span className="font-mono">VITE_MAPTILER_KEY</span> in your
              client environment before rendering the Dashboard map.
            </div>
          </div>
        </div>
      ) : (
        <>
          {missionRunning && liveMapEnabled ? (
            <div className="pointer-events-none absolute left-4 right-4 top-4 z-20">
              <div className="rounded-2xl border border-base-300 bg-base-100/92 p-3 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-base-content">
                    Live telemetry
                  </div>

                  <span
                    className={`badge badge-sm ${
                      liveConnected ? "badge-success" : "badge-warning"
                    }`}
                  >
                    {liveConnected ? "Live" : "Reconnecting"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
                  <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-base-content/45">
                      Temp
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatTelemetryValue(liveTelemetry?.temp_c, 1, " °C")}
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-base-content/45">
                      Hum
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatTelemetryValue(liveTelemetry?.hum_pct, 1, " %")}
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-base-content/45">
                      Pressure
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatTelemetryValue(
                        liveTelemetry?.press_hpa,
                        1,
                        " hPa",
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-base-content/45">
                      Gas
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatTelemetryValue(liveTelemetry?.gas_ohms, 0, " Ω")}
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-base-content/45">
                      Satellites
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatTelemetryValue(liveTelemetry?.satellites, 0)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-base-content/45">
                      HDOP
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatTelemetryValue(liveTelemetry?.hdop, 2)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-base-content/45">
                      Alt
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatTelemetryValue(liveTelemetry?.alt_m, 1, " m")}
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-base-content/45">
                      Updated
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatTelemetryTime(liveTelemetry?.ts_epoch)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div ref={mapNodeRef} className="h-full w-full" />
        </>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={[
              "btn btn-sm rounded-xl shadow-sm",
              mapPerspective === "3d"
                ? "btn-primary border-none text-white"
                : "border-base-300 bg-base-100/92 backdrop-blur",
            ].join(" ")}
            onClick={() =>
              setMapPerspective((prev) => (prev === "2d" ? "3d" : "2d"))
            }
            title={mapPerspective === "2d" ? "Switch to 3D" : "Switch to 2D"}
          >
            <FiLayers />
            {mapPerspective === "2d" ? "Switch to 3D" : "Switch to 2D"}
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            className="btn btn-sm rounded-xl border-base-300 bg-base-100 shadow-sm"
            onClick={handleReset}
            title="Reset view"
          >
            <FiRotateCcw />
            Reset
          </button>
        </div>
      </div>

      {mapPickEnabled ? (
        <div className="pointer-events-none absolute left-4 top-20 z-20">
          <div className="pointer-events-auto rounded-2xl border border-warning/30 bg-base-100/92 px-3 py-2 text-xs shadow-lg backdrop-blur">
            Click on the map to place a new fixed location.
          </div>
        </div>
      ) : null}
    </div>
  );
}
