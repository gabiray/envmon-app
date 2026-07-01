import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import {
  FiGlobe,
  FiLayers,
  FiMap,
  FiRotateCcw,
  FiX,
  FiPause,
  FiPlay,
  FiThermometer,
  FiDroplet,
  FiClock,
  FiMapPin,
  FiActivity,
} from "react-icons/fi";

import api from "../../services/api";
import HeatMapLegend from "./HeatMapLegend";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

if (MAPTILER_KEY) {
  maptilersdk.config.apiKey = MAPTILER_KEY;
}

const CUSTOM_GLOBE_MAP_ID = "019d0124-8989-7808-b02b-a8df305b92f3";
const GLOBE_STYLE_URL = `https://api.maptiler.com/maps/${CUSTOM_GLOBE_MAP_ID}/style.json?key=${MAPTILER_KEY}`;
const TOPO_STYLE_URL = `https://api.maptiler.com/maps/topo-v4/style.json?key=${MAPTILER_KEY}`;
const TERRAIN_URL = `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`;

const CAMERA_PRESETS = {
  globe3d: {
    center: [18, 42],
    zoom: 1.55,
    pitch: 68,
    bearing: -25,
  },
  globe2d: {
    center: [18, 42],
    zoom: 1.55,
    pitch: 0,
    bearing: 0,
  },
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

const TRACK_SOURCE_ID = "heatmap-track-source";
const TRACK_LAYER_ID = "heatmap-track-layer";
const TRACK_POINTS_SOURCE_ID = "heatmap-track-points-source";
const TRACK_POINTS_CIRCLE_LAYER_ID = "heatmap-track-points-circle-layer";
const TRACK_POINTS_LABEL_LAYER_ID = "heatmap-track-points-label-layer";

const HEAT_SOURCE_ID = "heatmap-cells-source";
const HEAT_FILL_LAYER_ID = "heatmap-cells-fill-layer";
const HEAT_LINE_LAYER_ID = "heatmap-cells-line-layer";

const IMAGE_POINTS_SOURCE_ID = "heatmap-image-points-source";
const IMAGE_POINTS_LAYER_ID = "heatmap-image-points-layer";

function formatDateTime(tsEpoch) {
  if (!tsEpoch) return "—";

  return new Date(Number(tsEpoch) * 1000).toLocaleString("ro-RO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatNumber(value, decimals = 2, suffix = "") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function CaptureAnalysisModal({ capture, onClose }) {
  if (!capture) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-base-300 px-6 py-5">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Capture analysis
            </div>

            <h2 className="mt-1 truncate text-xl font-bold text-base-content">
              {capture.filename}
            </h2>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/60">
              <span>{formatDateTime(capture.tsEpoch)}</span>
              <span>•</span>
              <span>{formatNumber(capture.altM, 1, " m")}</span>
              {capture.telemetryDtS != null ? (
                <>
                  <span>•</span>
                  <span>
                    telemetry match: ±
                    {formatNumber(capture.telemetryDtS, 2, " s")}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            aria-label="Close capture analysis"
          >
            <FiX />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
          <div className="flex min-h-[360px] items-center justify-center bg-black p-4">
            <img
              src={capture.imageUrl}
              alt={capture.filename}
              className="max-h-[72vh] w-auto max-w-full rounded-2xl object-contain"
            />
          </div>

          <div className="space-y-4 border-t border-base-300 p-5 lg:border-l lg:border-t-0">
            <div>
              <div className="text-sm font-bold text-base-content">
                Associated environmental data
              </div>
              <div className="mt-1 text-sm text-base-content/60">
                Values are taken from the closest telemetry sample to the image
                timestamp.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <CaptureMetricCard
                icon={FiThermometer}
                label="Temperature"
                value={formatNumber(capture.tempC, 2, " °C")}
              />
              <CaptureMetricCard
                icon={FiDroplet}
                label="Humidity"
                value={formatNumber(capture.humPct, 2, " %")}
              />
              <CaptureMetricCard
                icon={FiActivity}
                label="Pressure"
                value={formatNumber(capture.pressHpa, 2, " hPa")}
              />
              <CaptureMetricCard
                icon={FiActivity}
                label="Gas"
                value={formatNumber(capture.gasOhms, 0, " Ω")}
              />
            </div>

            <details className="collapse collapse-arrow rounded-2xl border border-base-300 bg-base-200/40">
              <summary className="collapse-title text-sm font-semibold">
                Extended capture data
              </summary>

              <div className="collapse-content">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-base-content/55">Image time</span>
                    <span className="text-right font-medium">
                      {formatDateTime(capture.tsEpoch)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-base-content/55">Telemetry time</span>
                    <span className="text-right font-medium">
                      {formatDateTime(capture.telemetryTsEpoch)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-base-content/55">Coordinates</span>
                    <span className="text-right font-medium">
                      {formatNumber(capture.lat, 6)},{" "}
                      {formatNumber(capture.lon, 6)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-base-content/55">Altitude</span>
                    <span className="text-right font-medium">
                      {formatNumber(capture.altM, 1, " m")}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-base-content/55">Satellites</span>
                    <span className="text-right font-medium">
                      {formatNumber(capture.satellites, 0)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-base-content/55">HDOP</span>
                    <span className="text-right font-medium">
                      {formatNumber(capture.hdop, 2)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-base-content/55">Fix quality</span>
                    <span className="text-right font-medium">
                      {formatNumber(capture.fixQuality, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </details>

            <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-base-content/70">
              This view links the visual capture with the environmental
              telemetry recorded during the same mission, which is useful for
              later analysis and report interpretation.
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CaptureMetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-200/45 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-base-content/45">
        {Icon ? <Icon className="text-primary" /> : null}
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-base-content">{value}</div>
    </div>
  );
}

function buildCaptureImageUrl(missionId, imageId) {
  if (!missionId || imageId == null) return null;

  const baseUrl =
    typeof api?.defaults?.baseURL === "string" && api.defaults.baseURL.trim()
      ? api.defaults.baseURL.replace(/\/$/, "")
      : `${window.location.origin}/api`;

  return `${baseUrl}/db/missions/${missionId}/images/${imageId}/file`;
}

function buildCapturePayloadFromFeature(feature, missionId) {
  if (!feature || !missionId) return null;

  const props = feature.properties || {};
  const coordinates = feature.geometry?.coordinates || [];

  const imageId = props.id;
  const imageUrl = buildCaptureImageUrl(missionId, imageId);

  if (!imageUrl) return null;

  return {
    imageId,
    imageUrl,
    filename: props.filename || "image.jpg",

    tsEpoch: props.ts_epoch ?? null,
    lat: props.lat ?? coordinates[1] ?? null,
    lon: props.lon ?? coordinates[0] ?? null,
    altM: props.alt_m ?? null,

    telemetryTsEpoch: props.telemetry_ts_epoch ?? null,
    telemetryDtS: props.telemetry_dt_s ?? null,
    tempC: props.temp_c ?? null,
    humPct: props.hum_pct ?? null,
    pressHpa: props.press_hpa ?? null,
    gasOhms: props.gas_ohms ?? null,
    fixQuality: props.fix_quality ?? null,
    satellites: props.satellites ?? null,
    hdop: props.hdop ?? null,
  };
}

function buildCapturePreviewPopup({
  capture,
  onOpen,
  onMouseEnter,
  onMouseLeave,
}) {
  const wrapper = document.createElement("div");
  wrapper.style.minWidth = "220px";
  wrapper.style.maxWidth = "240px";
  wrapper.style.cursor = "pointer";
  wrapper.style.fontFamily = "Inter, system-ui, sans-serif";

  wrapper.addEventListener("mouseenter", onMouseEnter);
  wrapper.addEventListener("mouseleave", onMouseLeave);

  wrapper.onclick = (event) => {
    event.stopPropagation();
    onOpen();
  };

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "8px";
  header.style.marginBottom = "8px";

  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.alignItems = "center";
  titleRow.style.gap = "4px";
  titleRow.style.fontSize = "13px";
  titleRow.style.fontWeight = "700";
  titleRow.innerHTML = `<span>Capture point</span>`;

  header.appendChild(titleRow);
  wrapper.appendChild(header);

  const imageWrap = document.createElement("div");
  imageWrap.style.position = "relative";
  imageWrap.style.width = "100%";
  imageWrap.style.height = "110px";
  imageWrap.style.marginBottom = "8px";
  imageWrap.style.borderRadius = "10px";
  imageWrap.style.overflow = "hidden";
  imageWrap.style.border = "1px solid rgba(148,163,184,0.25)";
  imageWrap.style.background = "#020617";

  const img = document.createElement("img");
  img.src = capture.imageUrl;
  img.alt = capture.filename || "image.jpg";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.loading = "lazy";

  img.onerror = () => {
    imageWrap.style.display = "none";
  };

  imageWrap.appendChild(img);
  wrapper.appendChild(imageWrap);

  const fileRow = document.createElement("div");
  fileRow.style.fontSize = "12px";
  fileRow.style.opacity = ".88";
  fileRow.style.marginBottom = "3px";
  fileRow.style.lineHeight = "1.25";
  fileRow.innerHTML = `<strong>File:</strong> ${capture.filename || "image.jpg"}`;

  const timeRow = document.createElement("div");
  timeRow.style.fontSize = "12px";
  timeRow.style.opacity = ".88";
  timeRow.style.marginBottom = "3px";
  timeRow.style.lineHeight = "1.25";
  timeRow.innerHTML = `<strong>Captured:</strong> ${formatDateTime(capture.tsEpoch)}`;

  const altRow = document.createElement("div");
  altRow.style.fontSize = "12px";
  altRow.style.opacity = ".88";
  altRow.style.marginBottom = "7px";
  altRow.style.lineHeight = "1.25";
  altRow.innerHTML = `<strong>Altitude:</strong> ${formatNumber(
    capture.altM,
    1,
    " m",
  )}`;

  const hintRow = document.createElement("div");
  hintRow.style.fontSize = "11px";
  hintRow.style.fontWeight = "700";
  hintRow.style.color = "#2563eb";
  hintRow.textContent = "Click to open analysis";

  wrapper.appendChild(fileRow);
  wrapper.appendChild(timeRow);
  wrapper.appendChild(altRow);
  wrapper.appendChild(hintRow);

  return wrapper;
}

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

function getViewKey(viewMode, globePerspective, mapPerspective) {
  if (viewMode === "globe") {
    return globePerspective === "2d" ? "globe2d" : "globe3d";
  }
  return mapPerspective === "3d" ? "map3d" : "map2d";
}

function getCameraPreset(viewMode, globePerspective, mapPerspective) {
  return CAMERA_PRESETS[getViewKey(viewMode, globePerspective, mapPerspective)];
}

function getFocusCamera(viewMode, globePerspective, mapPerspective) {
  if (viewMode === "globe") {
    if (globePerspective === "2d") {
      return {
        pitch: 0,
        bearing: 0,
        singleZoom: 15.1,
        padding: 90,
      };
    }

    return {
      pitch: 58,
      bearing: -18,
      singleZoom: 15.2,
      padding: 90,
    };
  }

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

function fitCoords(map, coords, viewMode, globePerspective, mapPerspective) {
  if (!map || !Array.isArray(coords) || coords.length === 0) return;

  const focus = getFocusCamera(viewMode, globePerspective, mapPerspective);

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

function focusLocationPin(
  map,
  pin,
  viewMode,
  globePerspective,
  mapPerspective,
) {
  if (!map || !pin?.lat || !pin?.lon) return;

  const center = [Number(pin.lon), Number(pin.lat)];

  let camera = {
    center,
    zoom: 13.2,
    pitch: 0,
    bearing: 0,
    speed: 0.85,
    curve: 1.1,
    essential: true,
  };

  if (viewMode === "globe") {
    camera = {
      ...camera,
      zoom: globePerspective === "3d" ? 12.6 : 13.1,
      pitch: globePerspective === "3d" ? 28 : 0,
      bearing: 0,
    };
  } else if (mapPerspective === "3d") {
    camera = {
      ...camera,
      zoom: 13.4,
      pitch: 45,
      bearing: 0,
    };
  }

  map.flyTo(camera);
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

function ensureTerrainSource(map) {
  if (!map.getSource("terrain-rgb")) {
    map.addSource("terrain-rgb", {
      type: "raster-dem",
      url: TERRAIN_URL,
      tileSize: 256,
    });
  }
}

function applyBaseScene(map, viewMode, globePerspective, mapPerspective) {
  if (!map) return;

  const isGlobe = viewMode === "globe";

  try {
    if (isGlobe && typeof map.enableGlobeProjection === "function") {
      map.enableGlobeProjection();
    } else if (!isGlobe && typeof map.enableMercatorProjection === "function") {
      map.enableMercatorProjection();
    } else if (typeof map.setProjection === "function") {
      map.setProjection({ type: isGlobe ? "globe" : "mercator" });
    }
  } catch {}

  if (isGlobe) {
    try {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
    } catch {}

    if (globePerspective === "3d") {
      try {
        ensureTerrainSource(map);
        if (typeof map.setTerrain === "function") {
          map.setTerrain({
            source: "terrain-rgb",
            exaggeration: 1.08,
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

    return;
  }

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

  if (!map.getSource(IMAGE_POINTS_SOURCE_ID)) {
    map.addSource(IMAGE_POINTS_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });
  }

  if (!map.getLayer(IMAGE_POINTS_LAYER_ID)) {
    map.addLayer({
      id: IMAGE_POINTS_LAYER_ID,
      type: "circle",
      source: IMAGE_POINTS_SOURCE_ID,
      layout: {
        visibility: "none",
      },
      paint: {
        "circle-radius": 5.5,
        "circle-color": "#ec4899",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.95,
      },
    });
  }
}

function updateOverlayLayers(
  map,
  {
    showTrack,
    showHeatmap,
    showCaptures,
    trackGeoJson,
    trackEndpointsGeoJson,
    heatCellsGeoJson,
    imagePointsGeoJson,
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

  const imageSource = map.getSource(IMAGE_POINTS_SOURCE_ID);
  if (imageSource) {
    imageSource.setData(showCaptures ? imagePointsGeoJson : emptyCollection);
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

  if (map.getLayer(IMAGE_POINTS_LAYER_ID)) {
    map.setLayoutProperty(
      IMAGE_POINTS_LAYER_ID,
      "visibility",
      showCaptures ? "visible" : "none",
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

function ModeButton({ active = false, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      className={[
        "btn btn-sm rounded-xl shadow-sm",
        active
          ? "btn-primary border-none text-white"
          : "border-base-300 bg-base-100/92 backdrop-blur",
      ].join(" ")}
      onClick={onClick}
    >
      <Icon />
      {label}
    </button>
  );
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
  showCaptures = false,
  heatmapMetric = "temp_c",
  layerLoading = false,
  layerErrorText = "",
  trackGeoJson = { type: "FeatureCollection", features: [] },
  trackEndpointsGeoJson = { type: "FeatureCollection", features: [] },
  heatGrid = null,
  imagePoints = [],
  heatCellsGeoJson = { type: "FeatureCollection", features: [] },
  imagePointsGeoJson = { type: "FeatureCollection", features: [] },
  trackBounds = [],
  heatBounds = null,
  captureBounds = [],
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const heatPopupRef = useRef(null);
  const capturePopupRef = useRef(null);
  const capturePopupPinnedRef = useRef(false);
  const markersRef = useRef([]);
  const lastAutoFitKeyRef = useRef(null);

  const initialLocal2DFallbackDoneRef = useRef(false);
  const pendingLocal2DFallbackKeyRef = useRef(null);
  const userViewModeTouchedRef = useRef(false);

  const [viewMode, setViewMode] = useState("globe");
  const [globePerspective, setGlobePerspective] = useState("3d");
  const [mapPerspective, setMapPerspective] = useState("3d");
  const [autoRotate, setAutoRotate] = useState(true);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const [mapVersion, setMapVersion] = useState(0);
  const [capturePreview, setCapturePreview] = useState(null);

  const [legendCollapsed, setLegendCollapsed] = useState(true);

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

  const localFocusSelectionKey = useMemo(() => {
    const missionId = selectedMission?.missionId || null;

    if (missionId) {
      return `mission:${missionId}`;
    }

    if (selectedLocationPin?.key) {
      return `location:${selectedLocationPin.key}`;
    }

    return null;
  }, [selectedMission?.missionId, selectedLocationPin?.key]);

  const legendMode = useMemo(() => {
    if (showTrack && showHeatmap) return "mixed";
    if (showHeatmap) return "heatmap";
    if (showTrack) return "track";
    return "none";
  }, [showTrack, showHeatmap]);

  useEffect(() => {
    if (viewMode === "map") {
      setAutoRotate(false);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "globe" && globePerspective === "2d") {
      setAutoRotate(false);
    }
  }, [viewMode, globePerspective]);

  useEffect(() => {
    if (!mapNodeRef.current || !MAPTILER_KEY) return;

    markersRef.current.forEach((item) => item.remove());
    markersRef.current = [];
    safeRemovePopup(heatPopupRef.current);
    safeRemovePopup(capturePopupRef.current);
    heatPopupRef.current = null;
    capturePopupRef.current = null;
    capturePopupPinnedRef.current = false;

    const camera = getCameraPreset(viewMode, globePerspective, mapPerspective);
    const isGlobe = viewMode === "globe";
    const style = isGlobe ? GLOBE_STYLE_URL : TOPO_STYLE_URL;

    const map = new maptilersdk.Map({
      container: mapNodeRef.current,
      style,
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      antialias: true,
      attributionControl: true,
      navigationControl: false,
      geolocateControl: false,
      projection: isGlobe ? "globe" : "mercator",
      space: isGlobe ? true : undefined,
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
      applyBaseScene(map, viewMode, globePerspective, mapPerspective);
      ensureOverlaySourcesAndLayers(map);
      updateOverlayLayers(map, {
        showTrack,
        showHeatmap,
        showCaptures,
        trackGeoJson,
        trackEndpointsGeoJson,
        heatCellsGeoJson,
        imagePointsGeoJson,
      });

      try {
        map.triggerRepaint?.();
      } catch {}

      setMapVersion((prev) => prev + 1);
    });

    mapRef.current = map;
    heatPopupRef.current = new maptilersdk.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: "heatmap-hover-popup",
    });

    capturePopupRef.current = new maptilersdk.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: "heatmap-hover-popup",
    });

    return () => {
      markersRef.current.forEach((item) => item.remove());
      markersRef.current = [];
      safeRemovePopup(heatPopupRef.current);
      safeRemovePopup(capturePopupRef.current);
      heatPopupRef.current = null;
      capturePopupRef.current = null;
      capturePopupPinnedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [viewMode, globePerspective, mapPerspective]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || viewMode !== "globe") return;

    const stopRotation = () => setAutoRotate(false);

    map.on("dragstart", stopRotation);
    map.on("zoomstart", stopRotation);
    map.on("pitchstart", stopRotation);
    map.on("mousedown", stopRotation);
    map.on("touchstart", stopRotation);
    map.on("wheel", stopRotation);

    return () => {
      map.off("dragstart", stopRotation);
      map.off("zoomstart", stopRotation);
      map.off("pitchstart", stopRotation);
      map.off("mousedown", stopRotation);
      map.off("touchstart", stopRotation);
      map.off("wheel", stopRotation);
    };
  }, [mapVersion, viewMode]);

  useEffect(() => {
    if (
      viewMode !== "globe" ||
      globePerspective !== "3d" ||
      !autoRotate ||
      !mapRef.current
    ) {
      return;
    }

    let frameId = 0;
    let cancelled = false;
    let lastTs = null;
    const speedDegPerSecond = 0.6;

    const spin = (ts) => {
      if (cancelled || !mapRef.current) return;

      if (lastTs == null) {
        lastTs = ts;
      }

      const deltaS = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      try {
        const currentBearing = mapRef.current.getBearing();
        mapRef.current.rotateTo(currentBearing + speedDegPerSecond * deltaS, {
          duration: 0,
        });
      } catch {}

      frameId = window.requestAnimationFrame(spin);
    };

    frameId = window.requestAnimationFrame(spin);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [autoRotate, viewMode, globePerspective, mapVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;
    let frameId = 0;
    const timers = [];

    const overlayState = {
      showTrack,
      showHeatmap,
      showCaptures,
      trackGeoJson,
      trackEndpointsGeoJson,
      heatCellsGeoJson,
      imagePointsGeoJson,
    };

    const apply = () => {
      if (cancelled) return;
      if (mapRef.current !== map) return;

      try {
        map.resize?.();
      } catch {}

      if (!map.isStyleLoaded?.()) {
        return;
      }

      try {
        ensureOverlaySourcesAndLayers(map);
        updateOverlayLayers(map, overlayState);
        map.triggerRepaint?.();
      } catch (error) {
        console.warn("[HeatMap] Failed to refresh overlay layers", error);
      }
    };

    const scheduleApply = () => {
      if (cancelled) return;
      if (mapRef.current !== map) return;

      frameId = window.requestAnimationFrame(() => {
        apply();

        timers.push(window.setTimeout(apply, 80));
        timers.push(window.setTimeout(apply, 250));
      });
    };

    scheduleApply();

    try {
      map.once("load", scheduleApply);
      map.once("style.load", scheduleApply);
      map.once("idle", scheduleApply);
    } catch {}

    return () => {
      cancelled = true;

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      timers.forEach((timerId) => window.clearTimeout(timerId));

      try {
        map.off("load", scheduleApply);
        map.off("style.load", scheduleApply);
        map.off("idle", scheduleApply);
      } catch {}
    };
  }, [
    mapVersion,
    selectedMission?.missionId,
    showTrack,
    showHeatmap,
    showCaptures,
    trackGeoJson,
    trackEndpointsGeoJson,
    heatCellsGeoJson,
    imagePointsGeoJson,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const popup = heatPopupRef.current;

    if (!map || !popup) return;

    if (!showHeatmap) {
      safeSetCursor(map, "");
      safeRemovePopup(popup);
      return;
    }

    let detached = false;

    const handleMove = (e) => {
      if (detached) return;
      if (capturePopupPinnedRef.current) return;

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
      if (capturePopupPinnedRef.current) return;

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
  }, [mapVersion, showHeatmap, heatmapMetric]);

  useEffect(() => {
    const map = mapRef.current;
    const popup = capturePopupRef.current;
    const heatPopup = heatPopupRef.current;

    if (!map || !popup) return;

    if (!showCaptures) {
      capturePopupPinnedRef.current = false;
      safeSetCursor(map, "");
      safeRemovePopup(popup);
      setCapturePreview(null);
      return;
    }

    let detached = false;
    let closeTimerId = null;

    const clearCloseTimer = () => {
      if (closeTimerId) {
        window.clearTimeout(closeTimerId);
        closeTimerId = null;
      }
    };

    const closeCapturePopup = () => {
      clearCloseTimer();
      capturePopupPinnedRef.current = false;
      safeRemovePopup(popup);
    };

    const scheduleCloseCapturePopup = () => {
      clearCloseTimer();

      closeTimerId = window.setTimeout(() => {
        if (detached) return;
        closeCapturePopup();
        safeSetCursor(map, "");
      }, 180);
    };

    const openCaptureModal = (capture) => {
      if (!capture) return;

      closeCapturePopup();
      safeRemovePopup(heatPopup);
      setCapturePreview(capture);
    };

    const showCapturePreview = (feature, lngLat) => {
      const capture = buildCapturePayloadFromFeature(
        feature,
        selectedMission?.missionId,
      );

      if (!capture) return;

      clearCloseTimer();
      capturePopupPinnedRef.current = true;
      safeRemovePopup(heatPopup);

      try {
        popup
          .setLngLat(lngLat)
          .setDOMContent(
            buildCapturePreviewPopup({
              capture,
              onOpen: () => openCaptureModal(capture),
              onMouseEnter: clearCloseTimer,
              onMouseLeave: scheduleCloseCapturePopup,
            }),
          )
          .addTo(map);
      } catch {}
    };

    const handleEnter = (e) => {
      if (detached) return;

      safeSetCursor(map, "pointer");

      const feature = e.features?.[0];
      if (!feature) return;

      showCapturePreview(feature, e.lngLat);
    };

    const handleMove = (e) => {
      if (detached) return;

      const feature = e.features?.[0];
      if (!feature) return;

      showCapturePreview(feature, e.lngLat);
    };

    const handleLeave = () => {
      if (detached) return;
      scheduleCloseCapturePopup();
    };

    const handleLayerClick = (e) => {
      if (detached) return;

      const feature = e.features?.[0];
      if (!feature) return;

      const capture = buildCapturePayloadFromFeature(
        feature,
        selectedMission?.missionId,
      );

      openCaptureModal(capture);
    };

    const handleMapClick = (e) => {
      if (detached) return;
      if (!hasLayerSafe(map, IMAGE_POINTS_LAYER_ID)) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [IMAGE_POINTS_LAYER_ID],
      });

      if (Array.isArray(features) && features.length > 0) {
        return;
      }

      closeCapturePopup();
      safeSetCursor(map, "");
    };

    const bind = () => {
      if (!hasLayerSafe(map, IMAGE_POINTS_LAYER_ID)) return;

      try {
        map.on("mouseenter", IMAGE_POINTS_LAYER_ID, handleEnter);
        map.on("mousemove", IMAGE_POINTS_LAYER_ID, handleMove);
        map.on("mouseleave", IMAGE_POINTS_LAYER_ID, handleLeave);
        map.on("click", IMAGE_POINTS_LAYER_ID, handleLayerClick);
        map.on("click", handleMapClick);
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
      clearCloseTimer();

      try {
        if (hasLayerSafe(map, IMAGE_POINTS_LAYER_ID)) {
          map.off("mouseenter", IMAGE_POINTS_LAYER_ID, handleEnter);
          map.off("mousemove", IMAGE_POINTS_LAYER_ID, handleMove);
          map.off("mouseleave", IMAGE_POINTS_LAYER_ID, handleLeave);
          map.off("click", IMAGE_POINTS_LAYER_ID, handleLayerClick);
        }

        map.off("click", handleMapClick);
      } catch {}

      safeSetCursor(map, "");
      safeRemovePopup(popup);
      capturePopupPinnedRef.current = false;
    };
  }, [mapVersion, showCaptures, selectedMission?.missionId]);

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

      const marker = new maptilersdk.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([pin.lon, pin.lat])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    }
  }, [
    mapVersion,
    locationPins,
    selectedLocationKey,
    onSelectLocationPin,
    viewMode,
    globePerspective,
    mapPerspective,
  ]);

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
  }, [
    mapVersion,
    selectedLocationPin,
    viewMode,
    globePerspective,
    mapPerspective,
  ]);

  useEffect(() => {
    if (!localFocusSelectionKey) {
      pendingLocal2DFallbackKeyRef.current = null;
      return;
    }

    if (userViewModeTouchedRef.current) {
      return;
    }

    if (initialLocal2DFallbackDoneRef.current) {
      return;
    }

    initialLocal2DFallbackDoneRef.current = true;
    pendingLocal2DFallbackKeyRef.current = localFocusSelectionKey;

    setAutoRotate(false);
    setViewMode("map");
    setMapPerspective("2d");

    lastAutoFitKeyRef.current = null;
  }, [localFocusSelectionKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (
      localFocusSelectionKey &&
      pendingLocal2DFallbackKeyRef.current === localFocusSelectionKey &&
      (viewMode !== "map" || mapPerspective !== "2d")
    ) {
      return;
    }

    if (
      localFocusSelectionKey &&
      pendingLocal2DFallbackKeyRef.current === localFocusSelectionKey &&
      viewMode === "map" &&
      mapPerspective === "2d"
    ) {
      pendingLocal2DFallbackKeyRef.current = null;
    }

    const viewKey = getViewKey(viewMode, globePerspective, mapPerspective);

    if (selectedLocationPin && !selectedMission) {
      const fitKey = [
        "location",
        selectedLocationPin.key,
        viewKey,
        mapVersion,
      ].join(":");

      if (lastAutoFitKeyRef.current === fitKey) return;

      lastAutoFitKeyRef.current = fitKey;

      focusLocationPin(
        map,
        selectedLocationPin,
        viewMode,
        globePerspective,
        mapPerspective,
      );

      return;
    }

    const missionId = selectedMission?.missionId || null;
    if (!missionId) return;

    const hasVisibleLayer = showTrack || showHeatmap || showCaptures;

    const hasTrackBounds =
      showTrack && Array.isArray(trackBounds) && trackBounds.length > 0;

    const hasHeatBounds =
      showHeatmap && Array.isArray(heatBounds) && heatBounds.length > 0;

    const hasCaptureBounds =
      showCaptures && Array.isArray(captureBounds) && captureBounds.length > 0;

    if (
      hasVisibleLayer &&
      layerLoading &&
      !hasTrackBounds &&
      !hasHeatBounds &&
      !hasCaptureBounds
    ) {
      return;
    }

    let coords = [];
    let sourceKey = "start";

    if (hasTrackBounds) {
      coords = trackBounds;
      sourceKey = `track:${trackBounds.length}`;
    } else if (hasHeatBounds) {
      coords = heatBounds;
      sourceKey = `heat:${JSON.stringify(heatBounds)}`;
    } else if (hasCaptureBounds) {
      coords = captureBounds;
      sourceKey = `captures:${captureBounds.length}`;
    } else {
      const lat = selectedMission.start?.lat;
      const lon = selectedMission.start?.lon;

      if (lat != null && lon != null) {
        coords = [[Number(lon), Number(lat)]];
        sourceKey = `start:${Number(lon)}:${Number(lat)}`;
      }
    }

    if (!coords.length) return;

    const fitKey = [
      "mission",
      missionId,
      viewKey,
      mapVersion,
      showTrack ? "track-on" : "track-off",
      showHeatmap ? "heat-on" : "heat-off",
      showCaptures ? "captures-on" : "captures-off",
      sourceKey,
    ].join(":");

    if (lastAutoFitKeyRef.current === fitKey) return;

    lastAutoFitKeyRef.current = fitKey;

    focusLocationPin(
      map,
      {
        lat: Number(coords[0][1]),
        lon: Number(coords[0][0]),
      },
      viewMode,
      globePerspective,
      mapPerspective,
    );

    fitCoords(map, coords, viewMode, globePerspective, mapPerspective);
  }, [
    mapVersion,
    localFocusSelectionKey,
    selectedLocationPin,
    selectedMission,
    selectedMission?.missionId,
    selectedMission?.start?.lat,
    selectedMission?.start?.lon,
    layerLoading,
    showTrack,
    showHeatmap,
    showCaptures,
    trackBounds,
    heatBounds,
    captureBounds,
    viewMode,
    globePerspective,
    mapPerspective,
  ]);

  function markManualViewChange() {
    userViewModeTouchedRef.current = true;
    initialLocal2DFallbackDoneRef.current = true;
    pendingLocal2DFallbackKeyRef.current = null;
    lastAutoFitKeyRef.current = null;
  }

  function handleReset() {
    const camera = getCameraPreset(viewMode, globePerspective, mapPerspective);

    onCloseLocationPopover();
    setCapturePreview(null);
    capturePopupPinnedRef.current = false;
    safeRemovePopup(capturePopupRef.current);
    safeRemovePopup(heatPopupRef.current);

    if (viewMode === "globe" && globePerspective === "3d") {
      setAutoRotate(true);
    } else {
      setAutoRotate(false);
    }

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
        duration: 1400,
        essential: true,
      });
    }
  }

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
          <ModeButton
            active={viewMode === "globe"}
            icon={viewMode === "globe" ? FiGlobe : FiMap}
            label={viewMode === "globe" ? "Globe view" : "Map view"}
            onClick={() => {
              markManualViewChange();

              if (viewMode === "globe") {
                setViewMode("map");
                setAutoRotate(false);
              } else {
                setViewMode("globe");

                if (globePerspective === "3d") {
                  setAutoRotate(true);
                }
              }
            }}
          />

          {viewMode === "globe" ? (
            <ModeButton
              active={globePerspective === "3d"}
              icon={FiLayers}
              label={globePerspective === "3d" ? "Globe 3D" : "Globe 2D"}
              onClick={() => {
                markManualViewChange();

                setGlobePerspective((prev) => (prev === "3d" ? "2d" : "3d"));
              }}
            />
          ) : (
            <ModeButton
              active={mapPerspective === "3d"}
              icon={FiLayers}
              label={mapPerspective === "3d" ? "Map 3D" : "Map 2D"}
              onClick={() => {
                markManualViewChange();

                setMapPerspective((prev) => (prev === "3d" ? "2d" : "3d"));
              }}
            />
          )}

          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-base-300 bg-base-100/92 px-3 text-sm font-medium shadow-sm backdrop-blur">
            <FiLayers className="text-primary" />
            {profileLabel}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {viewMode === "globe" ? (
            <button
              type="button"
              className={[
                "btn btn-sm btn-square rounded-xl shadow-sm",
                autoRotate
                  ? "btn-primary border-none text-white"
                  : "border-base-300 bg-base-100",
              ].join(" ")}
              onClick={() => setAutoRotate((prev) => !prev)}
              disabled={globePerspective === "2d"}
              title={
                globePerspective === "2d"
                  ? "Rotation is disabled in Globe 2D mode."
                  : autoRotate
                    ? "Stop rotation"
                    : "Start rotation"
              }
            >
              {autoRotate ? <FiPause /> : <FiPlay />}
            </button>
          ) : null}

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

      <div
        className={[
          "pointer-events-none absolute right-4 top-20 z-20 max-w-[calc(100%-2rem)] transition-all duration-200",
          legendCollapsed ? "w-auto" : "w-[320px]",
        ].join(" ")}
      >
        <div className="pointer-events-auto">
          <HeatMapLegend
            layerMode={legendMode}
            metric={heatmapMetric}
            heatGrid={heatGrid}
            imagePoints={imagePoints}
            loading={layerLoading}
            errorText={layerErrorText}
            showCaptures={showCaptures}
            collapsed={legendCollapsed}
            onToggleCollapsed={() => setLegendCollapsed((prev) => !prev)}
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

      <CaptureAnalysisModal
        capture={capturePreview}
        onClose={() => setCapturePreview(null)}
      />

      {!selectedLocationPin && !selectedMission ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
          <div className="pointer-events-auto max-w-md glass rounded-3xl border border-white/15 px-4 py-3 shadow-sm">
            <div className="text-sm font-semibold text-base-content">
              HeatMap workspace
            </div>
            <div className="mt-1 text-sm text-base-content/70">
              {hasActiveDevice
                ? `Active device: ${deviceName}. Select a location badge to inspect the missions stored at that point.`
                : `No active device. You can still browse saved missions by profile and select a location on the ${
                    viewMode === "globe" ? "globe" : "map"
                  }.`}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
