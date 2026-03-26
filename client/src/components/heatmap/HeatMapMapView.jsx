import React, { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { FiGlobe, FiLayers, FiRotateCcw, FiX } from "react-icons/fi";

import HeatMapLegend from "./HeatMapLegend";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const STYLE_3D_URL = `https://api.maptiler.com/maps/019d0124-8989-7808-b02b-a8df305b92f3/style.json?key=${MAPTILER_KEY}`;
const TERRAIN_URL = `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`;

const INITIAL_CAMERA = {
  center: [18, 42],
  zoom: 1.55,
  pitch: 68,
  bearing: -25,
};

const TRACK_SOURCE_ID = "heatmap-track-source";
const TRACK_LAYER_ID = "heatmap-track-layer";
const TRACK_POINTS_SOURCE_ID = "heatmap-track-points-source";
const TRACK_POINTS_CIRCLE_LAYER_ID = "heatmap-track-points-circle-layer";
const TRACK_POINTS_LABEL_LAYER_ID = "heatmap-track-points-label-layer";

const HEAT_SOURCE_ID = "heatmap-cells-source";
const HEAT_FILL_LAYER_ID = "heatmap-cells-fill-layer";
const HEAT_LINE_LAYER_ID = "heatmap-cells-line-layer";

function getDisplayName(device) {
  if (!device) return "No device";
  return (
    device.nickname || device.hostname || device.info?.hostname || "Device"
  );
}

function formatHeatValue(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(2);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fitCoords(map, coords) {
  if (!map || !coords.length) return;

  if (coords.length === 1) {
    map.flyTo({
      center: coords[0],
      zoom: 15,
      pitch: 58,
      speed: 0.9,
      curve: 1.2,
      essential: true,
    });
    return;
  }

  const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
  coords.forEach((item) => bounds.extend(item));

  map.fitBounds(bounds, {
    padding: 90,
    duration: 1200,
    essential: true,
  });
}

function hasLayerSafe(map, layerId) {
  if (!map || !layerId) return false;

  try {
    const style = typeof map.getStyle === "function" ? map.getStyle() : null;
    if (!style || !Array.isArray(style.layers)) return false;
    return style.layers.some((layer) => layer.id === layerId);
  } catch {
    return false;
  }
}

function safeSetCursor(map, cursor = "") {
  if (!map) return;

  try {
    const canvas = map.getCanvas?.();
    if (canvas) {
      canvas.style.cursor = cursor;
    }
  } catch {}
}

function safeRemovePopup(popup) {
  try {
    popup?.remove?.();
  } catch {}
}

function ensureOverlaySourcesAndLayers(map) {
  if (!map) return;

  if (!map.getSource(TRACK_SOURCE_ID)) {
    map.addSource(TRACK_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });
  }

  if (!map.getLayer(TRACK_LAYER_ID)) {
    map.addLayer({
      id: TRACK_LAYER_ID,
      type: "line",
      source: TRACK_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": "#2563eb",
        "line-width": 4,
        "line-opacity": 0.95,
      },
    });
  }

  if (!map.getSource(TRACK_POINTS_SOURCE_ID)) {
    map.addSource(TRACK_POINTS_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });
  }

  if (!map.getLayer(TRACK_POINTS_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: TRACK_POINTS_CIRCLE_LAYER_ID,
      type: "circle",
      source: TRACK_POINTS_SOURCE_ID,
      layout: {
        visibility: "none",
      },
      paint: {
        "circle-radius": 7,
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
        "circle-color": [
          "match",
          ["get", "role"],
          "start",
          "#16a34a",
          "end",
          "#dc2626",
          "#2563eb",
        ],
      },
    });
  }

  if (!map.getLayer(TRACK_POINTS_LABEL_LAYER_ID)) {
    map.addLayer({
      id: TRACK_POINTS_LABEL_LAYER_ID,
      type: "symbol",
      source: TRACK_POINTS_SOURCE_ID,
      layout: {
        visibility: "none",
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-offset": [0, 1.35],
        "text-anchor": "top",
      },
      paint: {
        "text-color": "#0f172a",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 1.5,
      },
    });
  }

  if (!map.getSource(HEAT_SOURCE_ID)) {
    map.addSource(HEAT_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });
  }

  if (!map.getLayer(HEAT_FILL_LAYER_ID)) {
    map.addLayer({
      id: HEAT_FILL_LAYER_ID,
      type: "fill",
      source: HEAT_SOURCE_ID,
      layout: {
        visibility: "none",
      },
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "normalized"], 0],
          0,
          "#2563eb",
          0.5,
          "#34d399",
          1,
          "#ef4444",
        ],
        "fill-opacity": 0.55,
      },
    });
  }

  if (!map.getLayer(HEAT_LINE_LAYER_ID)) {
    map.addLayer({
      id: HEAT_LINE_LAYER_ID,
      type: "line",
      source: HEAT_SOURCE_ID,
      layout: {
        visibility: "none",
      },
      paint: {
        "line-color": "rgba(255,255,255,0.35)",
        "line-width": 1,
      },
    });
  }
}

function updateOverlayLayers(
  map,
  {
    showTrack,
    showHeatmap,
    trackGeoJson,
    trackEndpointsGeoJson,
    heatCellsGeoJson,
  },
) {
  if (!map) return;

  const emptyCollection = {
    type: "FeatureCollection",
    features: [],
  };

  const trackSource = map.getSource(TRACK_SOURCE_ID);
  if (trackSource) {
    trackSource.setData(showTrack ? trackGeoJson : emptyCollection);
  }

  const trackPointsSource = map.getSource(TRACK_POINTS_SOURCE_ID);
  if (trackPointsSource) {
    trackPointsSource.setData(
      showTrack ? trackEndpointsGeoJson : emptyCollection,
    );
  }

  const heatSource = map.getSource(HEAT_SOURCE_ID);
  if (heatSource) {
    heatSource.setData(showHeatmap ? heatCellsGeoJson : emptyCollection);
  }

  if (map.getLayer(TRACK_LAYER_ID)) {
    map.setLayoutProperty(
      TRACK_LAYER_ID,
      "visibility",
      showTrack ? "visible" : "none",
    );
  }

  if (map.getLayer(TRACK_POINTS_CIRCLE_LAYER_ID)) {
    map.setLayoutProperty(
      TRACK_POINTS_CIRCLE_LAYER_ID,
      "visibility",
      showTrack ? "visible" : "none",
    );
  }

  if (map.getLayer(TRACK_POINTS_LABEL_LAYER_ID)) {
    map.setLayoutProperty(
      TRACK_POINTS_LABEL_LAYER_ID,
      "visibility",
      showTrack ? "visible" : "none",
    );
  }

  if (map.getLayer(HEAT_FILL_LAYER_ID)) {
    map.setLayoutProperty(
      HEAT_FILL_LAYER_ID,
      "visibility",
      showHeatmap ? "visible" : "none",
    );
  }

  if (map.getLayer(HEAT_LINE_LAYER_ID)) {
    map.setLayoutProperty(
      HEAT_LINE_LAYER_ID,
      "visibility",
      showHeatmap ? "visible" : "none",
    );
  }
}

function buildLocationMarkerElement({
  missionsCount = 0,
  selected = false,
  active = false,
}) {
  const root = document.createElement("button");
  root.type = "button";
  root.style.background = "transparent";
  root.style.border = "none";
  root.style.padding = "0";
  root.style.cursor = "pointer";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.alignItems = "center";
  root.style.gap = "6px";

  const badge = document.createElement("div");
  badge.textContent = String(missionsCount);
  badge.style.minWidth = "28px";
  badge.style.height = "28px";
  badge.style.padding = "0 10px";
  badge.style.borderRadius = "999px";
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.justifyContent = "center";
  badge.style.fontSize = "12px";
  badge.style.fontWeight = "700";
  badge.style.background = selected ? "#2563eb" : "rgba(255,255,255,0.96)";
  badge.style.color = selected ? "#ffffff" : "#111827";
  badge.style.border = active
    ? "1px solid rgba(37,99,235,0.35)"
    : "1px solid rgba(148,163,184,0.3)";
  badge.style.boxShadow = "0 10px 24px rgba(15,23,42,0.12)";

  const dot = document.createElement("div");
  dot.style.width = selected ? "12px" : "10px";
  dot.style.height = selected ? "12px" : "10px";
  dot.style.borderRadius = "999px";
  dot.style.background = selected ? "#2563eb" : active ? "#2563eb" : "#111827";
  dot.style.border = "2px solid white";
  dot.style.boxShadow = "0 8px 20px rgba(15,23,42,0.2)";

  root.appendChild(badge);
  root.appendChild(dot);

  return root;
}

function getPopoverPosition(map, pin) {
  if (!map || !pin) return null;

  try {
    const projected = map.project([pin.lon, pin.lat]);
    const container = map.getContainer();

    const width = container?.clientWidth || 0;
    const height = container?.clientHeight || 0;

    const popoverWidth = 300;
    const popoverHeight = 250;

    const preferredLeft = projected.x + 18;
    const preferredTop = projected.y - 24;

    const left = clamp(
      preferredLeft,
      12,
      Math.max(12, width - popoverWidth - 12),
    );
    const top = clamp(
      preferredTop,
      12,
      Math.max(12, height - popoverHeight - 12),
    );

    return { left, top };
  } catch {
    return null;
  }
}

export default function HeatMapMapView({
  activeDevice = null,
  selectedDeviceId = "none",
  profileLabel = "Drone",
  selectedMission = null,
  locationPins = [],
  selectedLocationKey = null,
  onSelectLocationPin = () => {},
  onSelectMission = () => {},
  onCloseLocationPopover = () => {},
  showTrack = false,
  showHeatmap = false,
  heatmapMetric = "temp_c",
  layerLoading = false,
  layerErrorText = "",
  trackGeoJson = { type: "FeatureCollection", features: [] },
  trackEndpointsGeoJson = { type: "FeatureCollection", features: [] },
  heatGrid = null,
  heatCellsGeoJson = { type: "FeatureCollection", features: [] },
  trackBounds = [],
  heatBounds = null,
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const markersRef = useRef([]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [popoverPosition, setPopoverPosition] = useState(null);

  const hasActiveDevice = Boolean(activeDevice && selectedDeviceId !== "none");
  const deviceName = useMemo(
    () => getDisplayName(activeDevice),
    [activeDevice],
  );

  const selectedLocationPin = useMemo(() => {
    return (
      locationPins.find((item) => item.key === selectedLocationKey) || null
    );
  }, [locationPins, selectedLocationKey]);

  const legendMode = useMemo(() => {
    if (showTrack && showHeatmap) return "mixed";
    if (showHeatmap) return "heatmap";
    if (showTrack) return "track";
    return "none";
  }, [showTrack, showHeatmap]);

  useEffect(() => {
    if (!mapNodeRef.current || !MAPTILER_KEY) return;

    const map = new maplibregl.Map({
      container: mapNodeRef.current,
      style: STYLE_3D_URL,
      center: INITIAL_CAMERA.center,
      zoom: INITIAL_CAMERA.zoom,
      pitch: INITIAL_CAMERA.pitch,
      bearing: INITIAL_CAMERA.bearing,
      antialias: true,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.on("style.load", () => {
      try {
        if (typeof map.setProjection === "function") {
          map.setProjection({ type: "globe" });
        }
      } catch {}

      try {
        if (!map.getSource("terrain-rgb")) {
          map.addSource("terrain-rgb", {
            type: "raster-dem",
            url: TERRAIN_URL,
            tileSize: 256,
          });
        }

        if (typeof map.setTerrain === "function") {
          map.setTerrain({
            source: "terrain-rgb",
            exaggeration: 1.15,
          });
        }
      } catch {}

      try {
        if (typeof map.setFog === "function") {
          map.setFog({
            color: "rgb(255, 255, 255)",
            "high-color": "rgb(12, 18, 34)",
            "horizon-blend": 0.14,
            "space-color": "rgb(5, 10, 24)",
            "star-intensity": 0.18,
          });
        }
      } catch {}

      ensureOverlaySourcesAndLayers(map);
      updateOverlayLayers(map, {
        showTrack,
        showHeatmap,
        trackGeoJson,
        trackEndpointsGeoJson,
        heatCellsGeoJson,
      });
    });

    mapRef.current = map;
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: "heatmap-hover-popup",
    });

    return () => {
      markersRef.current.forEach((item) => item.remove());
      markersRef.current = [];

      safeRemovePopup(popupRef.current);
      popupRef.current = null;

      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const stopRotation = () => setAutoRotate(false);

    map.on("dragstart", stopRotation);
    map.on("zoomstart", stopRotation);
    map.on("rotatestart", stopRotation);
    map.on("pitchstart", stopRotation);

    return () => {
      map.off("dragstart", stopRotation);
      map.off("zoomstart", stopRotation);
      map.off("rotatestart", stopRotation);
      map.off("pitchstart", stopRotation);
    };
  }, []);

  useEffect(() => {
    if (!autoRotate) return;
    if (!mapRef.current) return;

    let frameId = 0;
    let cancelled = false;

    const spin = () => {
      if (cancelled || !mapRef.current) return;

      try {
        const currentBearing = mapRef.current.getBearing();
        mapRef.current.rotateTo(currentBearing + 0.03, { duration: 0 });
      } catch {}

      frameId = window.requestAnimationFrame(spin);
    };

    frameId = window.requestAnimationFrame(spin);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [autoRotate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      ensureOverlaySourcesAndLayers(map);
      updateOverlayLayers(map, {
        showTrack,
        showHeatmap,
        trackGeoJson,
        trackEndpointsGeoJson,
        heatCellsGeoJson,
      });
    };

    if (map.isStyleLoaded?.()) {
      apply();
    } else {
      try {
        map.once("styledata", apply);
      } catch {}
    }
  }, [
    showTrack,
    showHeatmap,
    trackGeoJson,
    trackEndpointsGeoJson,
    heatCellsGeoJson,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const popup = popupRef.current;

    if (!map || !popup) return;

    if (!showHeatmap) {
      safeSetCursor(map, "");
      safeRemovePopup(popup);
      return;
    }

    let detached = false;

    const handleMove = (e) => {
      if (detached) return;

      const feature = e.features?.[0];
      if (!feature) return;

      const value = feature.properties?.value;
      const samples = feature.properties?.samples;

      safeSetCursor(map, "crosshair");

      try {
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `
            <div style="min-width:140px">
              <div style="font-size:12px;font-weight:700;margin-bottom:4px;">Heatmap cell</div>
              <div style="font-size:12px;opacity:.8;">Metric: ${heatmapMetric}</div>
              <div style="font-size:12px;opacity:.8;">Value: ${formatHeatValue(value)}</div>
              <div style="font-size:12px;opacity:.8;">Samples: ${samples ?? 0}</div>
            </div>
          `,
          )
          .addTo(map);
      } catch {}
    };

    const handleLeave = () => {
      if (detached) return;
      safeSetCursor(map, "");
      safeRemovePopup(popup);
    };

    const bind = () => {
      if (!hasLayerSafe(map, HEAT_FILL_LAYER_ID)) return;

      try {
        map.on("mousemove", HEAT_FILL_LAYER_ID, handleMove);
        map.on("mouseleave", HEAT_FILL_LAYER_ID, handleLeave);
      } catch {}
    };

    if (map.isStyleLoaded?.()) {
      bind();
    } else {
      try {
        map.once("styledata", bind);
      } catch {}
    }

    return () => {
      detached = true;

      try {
        if (hasLayerSafe(map, HEAT_FILL_LAYER_ID)) {
          map.off("mousemove", HEAT_FILL_LAYER_ID, handleMove);
          map.off("mouseleave", HEAT_FILL_LAYER_ID, handleLeave);
        }
      } catch {}

      safeSetCursor(map, "");
      safeRemovePopup(popup);
    };
  }, [showHeatmap, heatmapMetric]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((item) => item.remove());
    markersRef.current = [];

    for (const pin of locationPins) {
      if (pin.lat == null || pin.lon == null) continue;

      const el = buildLocationMarkerElement({
        missionsCount: pin.missionsCount,
        selected: pin.key === selectedLocationKey,
        active: Boolean(pin.hasActiveDeviceMission),
      });

      el.addEventListener("click", () => {
        onSelectLocationPin(pin.key);
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([pin.lon, pin.lat])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    }
  }, [locationPins, selectedLocationKey, onSelectLocationPin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLocationPin) {
      setPopoverPosition(null);
      return;
    }

    const update = () => {
      setPopoverPosition(getPopoverPosition(map, selectedLocationPin));
    };

    update();

    map.on("move", update);
    map.on("resize", update);

    return () => {
      map.off("move", update);
      map.off("resize", update);
    };
  }, [selectedLocationPin]);

  useEffect(() => {
    if (!mapRef.current || !selectedLocationPin) return;
    if (selectedMission) return;
    if (showTrack || showHeatmap) return;

    fitCoords(mapRef.current, [
      [selectedLocationPin.lon, selectedLocationPin.lat],
    ]);
  }, [selectedLocationPin, selectedMission, showTrack, showHeatmap]);

  useEffect(() => {
    if (!mapRef.current || !selectedMission) return;
    if (showTrack || showHeatmap) return;

    const lat = selectedMission.start?.lat;
    const lon = selectedMission.start?.lon;
    if (lat == null || lon == null) return;

    fitCoords(mapRef.current, [[lon, lat]]);
  }, [selectedMission, showTrack, showHeatmap]);

  useEffect(() => {
    if (!mapRef.current || !showTrack) return;
    if (!trackBounds?.length) return;

    fitCoords(mapRef.current, trackBounds);
  }, [showTrack, trackBounds]);

  useEffect(() => {
    if (!mapRef.current || !showHeatmap) return;
    if (!heatBounds) return;

    fitCoords(mapRef.current, heatBounds);
  }, [showHeatmap, heatBounds]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-base-200">
      {!MAPTILER_KEY ? (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-8">
            <div className="text-lg font-semibold">Map key missing</div>
            <div className="mt-2 text-sm text-base-content/60">
              Add <span className="font-mono">VITE_MAPTILER_KEY</span> in your
              client environment before rendering the HeatMap page.
            </div>
          </div>
        </div>
      ) : (
        <div ref={mapNodeRef} className="h-full w-full" />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center gap-2 rounded-full border border-base-300 bg-base-100/92 px-3 text-sm font-medium shadow-sm backdrop-blur">
            <FiGlobe className="text-primary" />
            Globe view
          </span>

          <span className="inline-flex h-9 items-center gap-2 rounded-full border border-base-300 bg-base-100/92 px-3 text-sm font-medium shadow-sm backdrop-blur">
            <FiLayers className="text-primary" />
            {profileLabel}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            className="btn btn-sm rounded-xl border-base-300 bg-base-100 shadow-sm"
            onClick={() => setAutoRotate((prev) => !prev)}
          >
            {autoRotate ? "Lock rotation" : "Rotate"}
          </button>

          {selectedLocationPin || selectedMission ? (
            <button
              type="button"
              className="btn btn-sm rounded-xl border-base-300 bg-base-100 shadow-sm"
              onClick={() => {
                setAutoRotate(false);

                if (mapRef.current) {
                  mapRef.current.easeTo({
                    pitch: 0,
                    bearing: 0,
                    duration: 900,
                    essential: true,
                  });
                }
              }}
            >
              Top view
            </button>
          ) : null}

          <button
            type="button"
            className="btn btn-sm rounded-xl border-base-300 bg-base-100 shadow-sm"
            onClick={() => {
              setAutoRotate(true);
              onCloseLocationPopover();

              if (mapRef.current) {
                mapRef.current.flyTo({
                  center: INITIAL_CAMERA.center,
                  zoom: INITIAL_CAMERA.zoom,
                  pitch: INITIAL_CAMERA.pitch,
                  bearing: INITIAL_CAMERA.bearing,
                  duration: 1400,
                  essential: true,
                });
              }
            }}
          >
            <FiRotateCcw />
            Reset
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-20 z-20 w-[320px] max-w-[calc(100%-2rem)]">
        <div className="pointer-events-auto">
          <HeatMapLegend
            layerMode={legendMode}
            metric={heatmapMetric}
            heatGrid={heatGrid}
            loading={layerLoading}
            errorText={layerErrorText}
          />
        </div>
      </div>

      {selectedLocationPin && popoverPosition ? (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: `${popoverPosition.left}px`,
            top: `${popoverPosition.top}px`,
          }}
        >
          <div className="pointer-events-auto relative w-[300px] max-w-[calc(100vw-2rem)]">
            <div
              className="absolute -left-2 top-10 h-4 w-4 rotate-45 border-l border-t border-base-300 bg-base-100/96 shadow-sm"
              aria-hidden="true"
            />

            <div className="relative rounded-3xl border border-base-300 bg-base-100/96 shadow-xl backdrop-blur">
              <div className="flex items-start justify-between gap-3 border-b border-base-300 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-base-content">
                    {selectedLocationPin.locationName || "Location missions"}
                  </div>
                  <div className="mt-1 text-xs text-base-content/55">
                    {selectedLocationPin.missionsCount} mission
                    {selectedLocationPin.missionsCount === 1 ? "" : "s"}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={onCloseLocationPopover}
                  aria-label="Close location missions"
                >
                  <FiX />
                </button>
              </div>

              <div className="max-h-[210px] overflow-y-auto p-3 custom-scrollbar">
                <div className="space-y-2">
                  {selectedLocationPin.missions.map((mission) => {
                    const selected =
                      selectedMission?.missionId === mission.missionId;

                    return (
                      <button
                        key={mission.missionId}
                        type="button"
                        onClick={() => onSelectMission(mission)}
                        className={[
                          "w-full rounded-2xl border px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "border-primary/35 bg-primary/5"
                            : "border-base-300 bg-base-100 hover:bg-base-200/60",
                        ].join(" ")}
                      >
                        <div className="truncate text-sm font-semibold text-base-content">
                          {mission.missionName}
                        </div>

                        <div className="mt-1 text-xs text-base-content/55">
                          {mission.deviceName} • {mission.dateLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!selectedLocationPin && !selectedMission ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
          <div className="pointer-events-auto max-w-md rounded-3xl border border-base-300 bg-base-100/92 px-4 py-3 shadow-sm backdrop-blur">
            <div className="text-sm font-semibold text-base-content">
              HeatMap workspace
            </div>
            <div className="mt-1 text-sm text-base-content/60">
              {hasActiveDevice
                ? `Active device: ${deviceName}. Select a location badge to inspect the missions stored at that point.`
                : "Select a device from the topbar and then choose a location on the globe."}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
