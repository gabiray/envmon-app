import React, { useEffect, useMemo, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import {
  FiCrosshair,
  FiLayers,
  FiRotateCcw,
} from "react-icons/fi";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

if (MAPTILER_KEY) {
  maptilersdk.config.apiKey = MAPTILER_KEY;
}

const TOPO_STYLE_URL = `https://api.maptiler.com/maps/topo-v4/style.json?key=${MAPTILER_KEY}`;

const DEFAULT_CAMERA = {
  center: [26.255, 47.651],
  zoom: 12.4,
  pitch: 0,
  bearing: 0,
};

const ALL_TRAILS_SOURCE_ID = "mc-all-trails-source";
const ALL_TRAILS_LAYER_ID = "mc-all-trails-layer";
const SELECTED_TRAIL_SOURCE_ID = "mc-selected-trail-source";
const SELECTED_TRAIL_LAYER_ID = "mc-selected-trail-layer";

function makeMissionKey(item) {
  return `${item.device_uuid}:${item.mission_id}`;
}

function toNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value);
}

function getLivePoint(item) {
  const live = item?.live || {};
  const fix = item?.gps?.last_good_fix || {};

  const lat = toNumber(live.lat ?? fix.lat);
  const lon = toNumber(live.lon ?? fix.lon);
  const alt_m = toNumber(live.alt_m ?? fix.alt_m);

  if (lat == null || lon == null) return null;

  return { lat, lon, alt_m };
}

function fitCoords(map, coords) {
  if (!map || !Array.isArray(coords) || coords.length === 0) return;

  if (coords.length === 1) {
    map.flyTo({
      center: coords[0],
      zoom: 15.5,
      pitch: 0,
      bearing: 0,
      speed: 0.9,
      curve: 1.2,
      essential: true,
    });
    return;
  }

  const bounds = new maptilersdk.LngLatBounds(coords[0], coords[0]);
  coords.forEach((coord) => bounds.extend(coord));

  map.fitBounds(bounds, {
    padding: 90,
    duration: 1000,
    essential: true,
    pitch: 0,
    bearing: 0,
    maxZoom: 16.2,
  });
}

function createMissionMarkerElement({ selected = false }) {
  const el = document.createElement("button");
  el.type = "button";
  el.style.width = selected ? "20px" : "15px";
  el.style.height = selected ? "20px" : "15px";
  el.style.borderRadius = "999px";
  el.style.border = selected ? "4px solid #ffffff" : "3px solid #ffffff";
  el.style.background = selected ? "#2563eb" : "#06b6d4";
  el.style.boxShadow = selected
    ? "0 10px 25px rgba(37,99,235,0.35)"
    : "0 8px 18px rgba(0,0,0,0.22)";
  el.style.cursor = "pointer";
  return el;
}

function emptyFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

function buildTrailCollection(items, trailsByMissionKey, selectedMissionKey = null) {
  const features = [];

  items.forEach((item) => {
    const missionKey = makeMissionKey(item);
    const trail = Array.isArray(trailsByMissionKey?.[missionKey])
      ? trailsByMissionKey[missionKey]
      : [];

    if (trail.length < 2 || missionKey === selectedMissionKey) return;

    const coords = trail
      .filter((point) => point?.lon != null && point?.lat != null)
      .map((point) => [Number(point.lon), Number(point.lat)]);

    if (coords.length < 2) return;

    features.push({
      type: "Feature",
      properties: { missionKey },
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
    });
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

function buildSelectedTrailCollection(selectedMissionKey, trailsByMissionKey) {
  if (!selectedMissionKey) return emptyFeatureCollection();

  const trail = Array.isArray(trailsByMissionKey?.[selectedMissionKey])
    ? trailsByMissionKey[selectedMissionKey]
    : [];

  if (trail.length < 2) return emptyFeatureCollection();

  const coords = trail
    .filter((point) => point?.lon != null && point?.lat != null)
    .map((point) => [Number(point.lon), Number(point.lat)]);

  if (coords.length < 2) return emptyFeatureCollection();

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { missionKey: selectedMissionKey },
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      },
    ],
  };
}

function ensureTrailSourcesAndLayers(map) {
  if (!map.getSource(ALL_TRAILS_SOURCE_ID)) {
    map.addSource(ALL_TRAILS_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection(),
    });
  }

  if (!map.getLayer(ALL_TRAILS_LAYER_ID)) {
    map.addLayer({
      id: ALL_TRAILS_LAYER_ID,
      type: "line",
      source: ALL_TRAILS_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#7dd3fc",
        "line-opacity": 0.38,
        "line-width": 3,
      },
    });
  }

  if (!map.getSource(SELECTED_TRAIL_SOURCE_ID)) {
    map.addSource(SELECTED_TRAIL_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection(),
    });
  }

  if (!map.getLayer(SELECTED_TRAIL_LAYER_ID)) {
    map.addLayer({
      id: SELECTED_TRAIL_LAYER_ID,
      type: "line",
      source: SELECTED_TRAIL_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#2563eb",
        "line-opacity": 0.95,
        "line-width": 4,
      },
    });
  }
}

export default function MissionControlMap2D({
  items = [],
  selectedMissionKey = null,
  selectedItem = null,
  followSelected = true,
  showAll = true,
  trailsByMissionKey = {},
  resetNonce = 0,
  onToggleFollowSelected = () => {},
  onToggleShowAll = () => {},
  onReset = () => {},
  onSelectMissionKey = () => {},
  telemetryOverlay = null,
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const lastViewRef = useRef(null);

  const visibleItems = useMemo(() => {
    if (showAll) return items;
    return selectedItem ? [selectedItem] : [];
  }, [items, selectedItem, showAll]);

  function clearMarkers() {
    markersRef.current.forEach((marker) => {
      try {
        marker.remove();
      } catch {}
    });
    markersRef.current = [];
  }

  function handleResetView() {
    const map = mapRef.current;
    if (!map) return;

    const coords = visibleItems
      .map((item) => getLivePoint(item))
      .filter(Boolean)
      .map((point) => [point.lon, point.lat]);

    if (coords.length) {
      fitCoords(map, coords);
      return;
    }

    map.flyTo({
      center: DEFAULT_CAMERA.center,
      zoom: DEFAULT_CAMERA.zoom,
      pitch: DEFAULT_CAMERA.pitch,
      bearing: DEFAULT_CAMERA.bearing,
      duration: 900,
      essential: true,
    });
  }

  useEffect(() => {
    if (!mapNodeRef.current || !MAPTILER_KEY) return;

    clearMarkers();

    const previousView = lastViewRef.current;
    const initialCenter = previousView?.center || DEFAULT_CAMERA.center;
    const initialZoom = previousView?.zoom ?? DEFAULT_CAMERA.zoom;
    const initialPitch = previousView?.pitch ?? DEFAULT_CAMERA.pitch;
    const initialBearing = previousView?.bearing ?? DEFAULT_CAMERA.bearing;

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

    map.addControl(new maptilersdk.NavigationControl(), "bottom-right");

    map.on("load", () => {
      ensureTrailSourcesAndLayers(map);
    });

    map.on("moveend", () => {
      try {
        const center = map.getCenter();
        lastViewRef.current = {
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        };
      } catch {}
    });

    mapRef.current = map;

    return () => {
      try {
        const center = map.getCenter();
        lastViewRef.current = {
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        };
      } catch {}

      clearMarkers();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const allSource = map.getSource(ALL_TRAILS_SOURCE_ID);
    if (allSource) {
      allSource.setData(
        buildTrailCollection(items, trailsByMissionKey, selectedMissionKey)
      );
    }

    const selectedSource = map.getSource(SELECTED_TRAIL_SOURCE_ID);
    if (selectedSource) {
      selectedSource.setData(
        buildSelectedTrailCollection(selectedMissionKey, trailsByMissionKey)
      );
    }
  }, [items, trailsByMissionKey, selectedMissionKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    clearMarkers();

    visibleItems.forEach((item) => {
      const point = getLivePoint(item);
      if (!point) return;

      const missionKey = makeMissionKey(item);
      const selected = missionKey === selectedMissionKey;

      const element = createMissionMarkerElement({ selected });
      const marker = new maptilersdk.Marker({
        element,
        anchor: "center",
      })
        .setLngLat([point.lon, point.lat])
        .addTo(map);

      element.addEventListener("click", () => {
        onSelectMissionKey(missionKey);
      });

      markersRef.current.push(marker);
    });
  }, [visibleItems, selectedMissionKey, onSelectMissionKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (resetNonce <= 0) return;

    window.requestAnimationFrame(() => {
      handleResetView();
    });
  }, [resetNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const selectedPoint = getLivePoint(selectedItem);
    const coords = visibleItems
      .map((item) => getLivePoint(item))
      .filter(Boolean)
      .map((point) => [point.lon, point.lat]);

    if (followSelected && selectedPoint) {
      map.flyTo({
        center: [selectedPoint.lon, selectedPoint.lat],
        zoom: 15.5,
        pitch: 0,
        bearing: 0,
        speed: 0.8,
        curve: 1.15,
        essential: true,
      });
      return;
    }

    if (showAll && coords.length) {
      fitCoords(map, coords);
    }
  }, [visibleItems, selectedItem, followSelected, showAll]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-base-200">
      {!MAPTILER_KEY ? (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-8">
            <div className="text-lg font-semibold">Map key missing</div>
            <div className="mt-2 text-sm text-base-content/60">
              Add <span className="font-mono">VITE_MAPTILER_KEY</span> first.
            </div>
          </div>
        </div>
      ) : (
        <div ref={mapNodeRef} className="h-full w-full" />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`btn btn-sm rounded-xl shadow-sm ${
              followSelected
                ? "btn-primary border-none text-white"
                : "border-base-300 bg-base-100/95 backdrop-blur"
            }`}
            onClick={onToggleFollowSelected}
          >
            <FiCrosshair />
            Follow selected
          </button>

          <button
            type="button"
            className={`btn btn-sm rounded-xl shadow-sm ${
              showAll
                ? "btn-primary border-none text-white"
                : "border-base-300 bg-base-100/95 backdrop-blur"
            }`}
            onClick={onToggleShowAll}
          >
            <FiLayers />
            Show all
          </button>
        </div>

        <div className="pointer-events-auto">
          <button
            type="button"
            className="btn btn-sm rounded-xl border-base-300 bg-base-100/95 shadow-sm backdrop-blur"
            onClick={onReset}
          >
            <FiRotateCcw />
            Reset
          </button>
        </div>
      </div>

      {telemetryOverlay ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4">
          {telemetryOverlay}
        </div>
      ) : null}
    </div>
  );
}
