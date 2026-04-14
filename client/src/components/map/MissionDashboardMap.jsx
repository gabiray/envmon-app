import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

import { FiLayers, FiRotateCcw } from "react-icons/fi";
import { FaCarSide } from "react-icons/fa";
import { createRoot } from "react-dom/client";

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
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "28px";
  wrapper.style.height = "28px";
  wrapper.style.pointerEvents = "none";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";

  // keyframes adăugate o singură dată
  if (!document.getElementById("live-marker-pulse-style")) {
    const style = document.createElement("style");
    style.id = "live-marker-pulse-style";
    style.textContent = `
      @keyframes liveMarkerPulse {
        0% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 0.75;
        }
        70% {
          transform: translate(-50%, -50%) scale(2.1);
          opacity: 0;
        }
        100% {
          transform: translate(-50%, -50%) scale(2.1);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const pulse = document.createElement("div");
  pulse.style.position = "absolute";
  pulse.style.left = "50%";
  pulse.style.top = "50%";
  pulse.style.width = "24px";
  pulse.style.height = "24px";
  pulse.style.borderRadius = "999px";
  pulse.style.background = connected
    ? "rgba(37,99,235,0.32)"
    : "rgba(245,158,11,0.32)";
  pulse.style.boxShadow = connected
    ? "0 0 0 1px rgba(37,99,235,0.18)"
    : "0 0 0 1px rgba(245,158,11,0.18)";
  pulse.style.animation = "liveMarkerPulse 1.5s ease-out infinite";
  pulse.style.zIndex = "0";

  const pin = document.createElement("div");
  pin.style.position = "relative";
  pin.style.width = "24px";
  pin.style.height = "24px";
  pin.style.borderRadius = "999px";
  pin.style.border = "2px solid white";
  pin.style.background = connected ? "#2563eb" : "#f59e0b";
  pin.style.boxShadow = connected
    ? "0 8px 20px rgba(37,99,235,0.28)"
    : "0 8px 20px rgba(245,158,11,0.28)";
  pin.style.display = "flex";
  pin.style.alignItems = "center";
  pin.style.justifyContent = "center";
  pin.style.zIndex = "2";
  pin.style.boxSizing = "border-box";

  const tail = document.createElement("div");
  tail.style.position = "absolute";
  tail.style.left = "50%";
  tail.style.bottom = "3px";
  tail.style.width = "9px";
  tail.style.height = "9px";
  tail.style.background = connected ? "#2563eb" : "#f59e0b";
  tail.style.borderRight = "2px solid white";
  tail.style.borderBottom = "2px solid white";
  tail.style.transform = "translateX(-50%) rotate(45deg)";
  tail.style.borderBottomRightRadius = "2px";
  tail.style.zIndex = "1";
  tail.style.boxSizing = "border-box";

  const iconWrap = document.createElement("div");
  iconWrap.style.display = "flex";
  iconWrap.style.alignItems = "center";
  iconWrap.style.justifyContent = "center";
  iconWrap.style.width = "18px";
  iconWrap.style.height = "18px";
  iconWrap.style.color = "white";

  const root = createRoot(iconWrap);
  root.render(<FaCarSide size={14} />);

  pin.appendChild(iconWrap);
  wrapper.appendChild(pulse);
  wrapper.appendChild(tail);
  wrapper.appendChild(pin);

  return wrapper;
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
  focusOnVehicle = false,
  vehicleFollowMode = "nav2d",
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

  function clearStaticMarkers() {
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
  }

  function clearAllMarkers() {
    clearStaticMarkers();

    try {
      liveMarkerRef.current?.remove();
    } catch {}
    liveMarkerRef.current = null;

    liveFocusedRef.current = false;
  }

  useEffect(() => {
    if (!mapNodeRef.current || !MAPTILER_KEY) return;

    clearAllMarkers();

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
      clearAllMarkers();

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

    clearStaticMarkers();

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

    if (focusOnVehicle) return;

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
    focusOnVehicle,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const lat = Number(liveTelemetry?.lat);
    const lon = Number(liveTelemetry?.lon);

    if (
      !focusOnVehicle ||
      !liveMapEnabled ||
      Number.isNaN(lat) ||
      Number.isNaN(lon)
    ) {
      try {
        liveMarkerRef.current?.remove();
      } catch {}
      liveMarkerRef.current = null;
      liveFocusedRef.current = false;
      return;
    }

    try {
      liveMarkerRef.current?.remove();
    } catch {}

    const marker = new maptilersdk.Marker({
      element: createLiveMarkerElement({ connected: liveConnected }),
      anchor: "center",
    })
      .setLngLat([lon, lat])
      .addTo(map);

    liveMarkerRef.current = marker;

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
    focusOnVehicle,
    liveMapEnabled,
    liveConnected,
    liveTelemetry?.lat,
    liveTelemetry?.lon,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const lat = Number(liveTelemetry?.lat);
    const lon = Number(liveTelemetry?.lon);

    if (
      !focusOnVehicle ||
      !liveConnected ||
      Number.isNaN(lat) ||
      Number.isNaN(lon)
    ) {
      liveFocusedRef.current = false;
      return;
    }

    const center = [lon, lat];

    if (vehicleFollowMode === "nav3d") {
      if (mapPerspective !== "3d") {
        setMapPerspective("3d");
        return;
      }

      map.easeTo({
        center,
        zoom: 16.4,
        pitch: 64,
        bearing: 0,
        duration: liveFocusedRef.current ? 800 : 1100,
        essential: true,
      });
    } else {
      if (mapPerspective !== "2d") {
        setMapPerspective("2d");
        return;
      }

      map.easeTo({
        center,
        zoom: 16.2,
        pitch: 0,
        bearing: 0,
        duration: liveFocusedRef.current ? 700 : 1000,
        essential: true,
      });
    }

    liveFocusedRef.current = true;
  }, [
    focusOnVehicle,
    vehicleFollowMode,
    liveConnected,
    liveTelemetry?.lat,
    liveTelemetry?.lon,
    mapPerspective,
  ]);

  function handleReset() {
    const map = mapRef.current;
    if (!map) return;

    liveFocusedRef.current = false;

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
        <div ref={mapNodeRef} className="h-full w-full" />
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
