import React, { useEffect, useMemo, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { renderToStaticMarkup } from "react-dom/server";
import { FiCrosshair, FiLayers, FiMapPin, FiRotateCcw } from "react-icons/fi";
import { TbDrone } from "react-icons/tb";
import { MdDirectionsBike } from "react-icons/md";
import { FaCarSide } from "react-icons/fa";

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
const START_POINTS_SOURCE_ID = "mc-start-points-source";
const START_POINTS_LAYER_ID = "mc-start-points-layer";

function makeMissionKey(item) {
  return `${item.device_uuid}:${item.mission_id}`;
}

function toNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value);
}

function samePoint(a, b) {
  if (!a || !b) return false;

  return (
    Math.abs(a.lat - b.lat) < 0.0000001 &&
    Math.abs(a.lon - b.lon) < 0.0000001 &&
    Math.abs((a.alt_m ?? 0) - (b.alt_m ?? 0)) < 0.01
  );
}

function getLivePoint(item) {
  const live = item?.live || {};
  const lat = toNumber(live.lat);
  const lon = toNumber(live.lon);
  const alt_m = toNumber(live.alt_m);
  const ts_epoch = toNumber(live.ts_epoch);

  if (lat == null || lon == null) return null;

  return { lat, lon, alt_m, ts_epoch };
}

function getGpsFallbackPoint(item) {
  const fix = item?.gps?.last_good_fix || {};
  const lat = toNumber(fix.lat);
  const lon = toNumber(fix.lon);
  const alt_m = toNumber(fix.alt_m);
  const ts_epoch = toNumber(fix.ts_epoch);

  if (lat == null || lon == null) return null;

  return { lat, lon, alt_m, ts_epoch };
}

function getTrailPoints(missionKey, trailsByMissionKey) {
  return Array.isArray(trailsByMissionKey?.[missionKey])
    ? trailsByMissionKey[missionKey].filter(
        (point) => point?.lat != null && point?.lon != null,
      )
    : [];
}

function fitCoords(map, coords) {
  if (!map || !coords.length) return;

  if (coords.length === 1) {
    map.flyTo({
      center: coords[0],
      zoom: 15.5,
      pitch: 0,
      bearing: 0,
      speed: 0.9,
      curve: 1.15,
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

function getProfilePalette(profileType = "drone", selected = false) {
  const type = String(profileType || "")
    .trim()
    .toLowerCase();

  if (type === "bicycle") {
    return selected
      ? { primary: "#059669", shadow: "rgba(5,150,105,0.35)" }
      : { primary: "#10b981", shadow: "rgba(16,185,129,0.28)" };
  }

  if (type === "car") {
    return selected
      ? { primary: "#d97706", shadow: "rgba(217,119,6,0.35)" }
      : { primary: "#f59e0b", shadow: "rgba(245,158,11,0.28)" };
  }

  if (type === "static") {
    return selected
      ? { primary: "#475569", shadow: "rgba(71,85,105,0.35)" }
      : { primary: "#64748b", shadow: "rgba(100,116,139,0.28)" };
  }

  return selected
    ? { primary: "#2563eb", shadow: "rgba(37,99,235,0.35)" }
    : { primary: "#38bdf8", shadow: "rgba(56,189,248,0.28)" };
}

function getProfileIconMarkup(profileType = "drone") {
  const type = String(profileType || "")
    .trim()
    .toLowerCase();
  const iconProps = { size: "100%" };

  if (type === "bicycle") {
    return renderToStaticMarkup(<MdDirectionsBike {...iconProps} />);
  }

  if (type === "car") {
    return renderToStaticMarkup(<FaCarSide {...iconProps} />);
  }

  if (type === "static") {
    return renderToStaticMarkup(<FiMapPin {...iconProps} />);
  }

  return renderToStaticMarkup(<TbDrone {...iconProps} />);
}

function createMissionMarkerElement({
  selected = false,
  profileType = "drone",
  title = "",
}) {
  const { primary, shadow } = getProfilePalette(profileType, selected);

  const root = document.createElement("button");
  root.type = "button";
  root.title = title;
  root.style.background = "transparent";
  root.style.border = "none";
  root.style.padding = "0";
  root.style.cursor = "pointer";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.alignItems = "center";
  root.style.justifyContent = "flex-start";
  root.style.width = selected ? "46px" : "40px";
  root.style.height = selected ? "54px" : "48px";

  const head = document.createElement("div");
  head.style.width = selected ? "34px" : "30px";
  head.style.height = selected ? "34px" : "30px";
  head.style.borderRadius = "999px";
  head.style.display = "flex";
  head.style.alignItems = "center";
  head.style.justifyContent = "center";
  head.style.background = primary;
  head.style.border = selected ? "3px solid #ffffff" : "2px solid #ffffff";
  head.style.color = "#ffffff";
  head.style.boxShadow = `0 10px 22px ${shadow}`;
  head.style.zIndex = "2";

  const icon = document.createElement("div");
  icon.style.width = selected ? "18px" : "16px";
  icon.style.height = selected ? "18px" : "16px";
  icon.style.display = "flex";
  icon.style.alignItems = "center";
  icon.style.justifyContent = "center";
  icon.innerHTML = getProfileIconMarkup(profileType);

  const svg = icon.querySelector("svg");
  if (svg) {
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
  }

  head.appendChild(icon);

  const tail = document.createElement("div");
  tail.style.width = selected ? "14px" : "12px";
  tail.style.height = selected ? "14px" : "12px";
  tail.style.marginTop = "-6px";
  tail.style.transform = "rotate(45deg)";
  tail.style.background = primary;
  tail.style.borderRight = selected ? "3px solid #ffffff" : "2px solid #ffffff";
  tail.style.borderBottom = selected
    ? "3px solid #ffffff"
    : "2px solid #ffffff";
  tail.style.boxShadow = `0 10px 18px ${shadow}`;

  root.appendChild(head);
  root.appendChild(tail);

  return root;
}

function emptyFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

function buildTrailCollection(
  items,
  trailsByMissionKey,
  selectedMissionKey,
  pointCacheRef,
) {
  const features = [];

  items.forEach((item) => {
    const missionKey = makeMissionKey(item);
    const trail = getTrailPoints(missionKey, trailsByMissionKey);
    const cachedPoint = pointCacheRef.current[missionKey] || null;

    let points = trail;
    if (cachedPoint) {
      const last = trail[trail.length - 1];
      if (!last || !samePoint(last, cachedPoint)) {
        points = [...trail, cachedPoint];
      }
    }

    if (points.length < 2 || missionKey === selectedMissionKey) return;

    features.push({
      type: "Feature",
      properties: { missionKey },
      geometry: {
        type: "LineString",
        coordinates: points.map((point) => [
          Number(point.lon),
          Number(point.lat),
        ]),
      },
    });
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

function buildSelectedTrailCollection(
  selectedItem,
  trailsByMissionKey,
  pointCacheRef,
) {
  if (!selectedItem) return emptyFeatureCollection();

  const missionKey = makeMissionKey(selectedItem);
  const trail = getTrailPoints(missionKey, trailsByMissionKey);
  const cachedPoint = pointCacheRef.current[missionKey] || null;

  let points = trail;
  if (cachedPoint) {
    const last = trail[trail.length - 1];
    if (!last || !samePoint(last, cachedPoint)) {
      points = [...trail, cachedPoint];
    }
  }

  if (points.length < 2) return emptyFeatureCollection();

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { missionKey },
        geometry: {
          type: "LineString",
          coordinates: points.map((point) => [
            Number(point.lon),
            Number(point.lat),
          ]),
        },
      },
    ],
  };
}

function buildStartPointCollection(
  items,
  trailsByMissionKey,
  selectedMissionKey = null,
) {
  const features = [];

  items.forEach((item) => {
    const missionKey = makeMissionKey(item);
    const trail = getTrailPoints(missionKey, trailsByMissionKey);
    const firstPoint = trail[0];

    if (!firstPoint) return;

    features.push({
      type: "Feature",
      properties: {
        missionKey,
        selected: missionKey === selectedMissionKey ? 1 : 0,
      },
      geometry: {
        type: "Point",
        coordinates: [Number(firstPoint.lon), Number(firstPoint.lat)],
      },
    });
  });

  return {
    type: "FeatureCollection",
    features,
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

  if (!map.getSource(START_POINTS_SOURCE_ID)) {
    map.addSource(START_POINTS_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection(),
    });
  }

  if (!map.getLayer(START_POINTS_LAYER_ID)) {
    map.addLayer({
      id: START_POINTS_LAYER_ID,
      type: "circle",
      source: START_POINTS_SOURCE_ID,
      paint: {
        "circle-radius": ["case", ["==", ["get", "selected"], 1], 6, 4],
        "circle-color": [
          "case",
          ["==", ["get", "selected"], 1],
          "#16a34a",
          "#22c55e",
        ],
        "circle-opacity": 0.92,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
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
  onSetFollowSelected = () => {},
  onSetShowAll = () => {},
  onReset = () => {},
  onSelectMissionKey = () => {},
  telemetryOverlay = null,
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const markerElementsRef = useRef(new Map());
  const lastViewRef = useRef(null);
  const lastFollowPointRef = useRef(null);
  const prevSelectedMissionKeyRef = useRef(selectedMissionKey);
  const prevFollowSelectedRef = useRef(followSelected);
  const prevShowAllRef = useRef(showAll);
  const pointCacheRef = useRef({});

  const visibleItems = useMemo(() => {
    if (showAll) return items;
    return selectedItem ? [selectedItem] : [];
  }, [items, selectedItem, showAll]);

  useEffect(() => {
    const nextCache = { ...pointCacheRef.current };

    items.forEach((item) => {
      const missionKey = makeMissionKey(item);
      const livePoint = getLivePoint(item);
      const gpsPoint = getGpsFallbackPoint(item);
      const trail = getTrailPoints(missionKey, trailsByMissionKey);
      const trailLast = trail[trail.length - 1] || null;
      const prev = nextCache[missionKey] || null;

      if (livePoint) {
        nextCache[missionKey] = livePoint;
        return;
      }

      if (gpsPoint) {
        nextCache[missionKey] =
          prev && prev.ts_epoch > (gpsPoint.ts_epoch ?? 0) ? prev : gpsPoint;
        return;
      }

      if (!prev && trailLast) {
        nextCache[missionKey] = trailLast;
      }
    });

    pointCacheRef.current = nextCache;
  }, [items, trailsByMissionKey]);

  function getStableCurrentPoint(item) {
    if (!item) return null;

    const missionKey = makeMissionKey(item);
    const livePoint = getLivePoint(item);
    if (livePoint) return livePoint;

    const cachedPoint = pointCacheRef.current[missionKey] || null;
    if (cachedPoint) return cachedPoint;

    const gpsPoint = getGpsFallbackPoint(item);
    if (gpsPoint) return gpsPoint;

    const trail = getTrailPoints(missionKey, trailsByMissionKey);
    return trail[trail.length - 1] || null;
  }

  function removeMarker(missionKey) {
    const marker = markersRef.current.get(missionKey);
    if (marker) {
      try {
        marker.remove();
      } catch {}
      markersRef.current.delete(missionKey);
    }

    markerElementsRef.current.delete(missionKey);
  }

  function clearAllMarkers() {
    Array.from(markersRef.current.keys()).forEach((missionKey) => {
      removeMarker(missionKey);
    });
  }

  function handleResetView() {
    const map = mapRef.current;
    if (!map) return;

    const coords = visibleItems
      .map((item) => getStableCurrentPoint(item))
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

    clearAllMarkers();

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

      clearAllMarkers();
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
        buildTrailCollection(
          visibleItems,
          trailsByMissionKey,
          selectedMissionKey,
          pointCacheRef,
        ),
      );
    }

    const selectedSource = map.getSource(SELECTED_TRAIL_SOURCE_ID);
    if (selectedSource) {
      selectedSource.setData(
        buildSelectedTrailCollection(
          selectedItem,
          trailsByMissionKey,
          pointCacheRef,
        ),
      );
    }

    const startSource = map.getSource(START_POINTS_SOURCE_ID);
    if (startSource) {
      startSource.setData(
        buildStartPointCollection(
          visibleItems,
          trailsByMissionKey,
          selectedMissionKey,
        ),
      );
    }
  }, [visibleItems, selectedItem, trailsByMissionKey, selectedMissionKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const visibleKeys = new Set(
      visibleItems.map((item) => makeMissionKey(item)),
    );

    Array.from(markersRef.current.keys()).forEach((missionKey) => {
      if (!visibleKeys.has(missionKey)) {
        removeMarker(missionKey);
      }
    });

    visibleItems.forEach((item) => {
      const missionKey = makeMissionKey(item);
      const point = getStableCurrentPoint(item);
      if (!point) return;

      const selected = missionKey === selectedMissionKey;
      const title = item.mission_name || item.mission_id || missionKey;

      const existingMarker = markersRef.current.get(missionKey);
      const existingElement = markerElementsRef.current.get(missionKey);

      if (!existingMarker || !existingElement) {
        const element = createMissionMarkerElement({
          selected,
          profileType: item.profile_type,
          title,
        });

        element.addEventListener("click", () => {
          onSelectMissionKey(missionKey);
        });

        const marker = new maptilersdk.Marker({
          element,
          anchor: "bottom",
        })
          .setLngLat([point.lon, point.lat])
          .addTo(map);

        markersRef.current.set(missionKey, marker);
        markerElementsRef.current.set(missionKey, {
          element,
          selected,
          profileType: item.profile_type,
          title,
        });
        return;
      }

      existingMarker.setLngLat([point.lon, point.lat]);

      const mustRebuild =
        existingElement.selected !== selected ||
        existingElement.profileType !== item.profile_type ||
        existingElement.title !== title;

      if (mustRebuild) {
        removeMarker(missionKey);

        const element = createMissionMarkerElement({
          selected,
          profileType: item.profile_type,
          title,
        });

        element.addEventListener("click", () => {
          onSelectMissionKey(missionKey);
        });

        const marker = new maptilersdk.Marker({
          element,
          anchor: "bottom",
        })
          .setLngLat([point.lon, point.lat])
          .addTo(map);

        markersRef.current.set(missionKey, marker);
        markerElementsRef.current.set(missionKey, {
          element,
          selected,
          profileType: item.profile_type,
          title,
        });
      }
    });
  }, [
    visibleItems,
    selectedMissionKey,
    trailsByMissionKey,
    onSelectMissionKey,
  ]);

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

    const selectedPoint = getStableCurrentPoint(selectedItem);
    const coords = visibleItems
      .map((item) => getStableCurrentPoint(item))
      .filter(Boolean)
      .map((point) => [point.lon, point.lat]);

    const selectedChanged =
      prevSelectedMissionKeyRef.current !== selectedMissionKey;
    const followActivated = followSelected && !prevFollowSelectedRef.current;
    const showAllActivated = showAll && !prevShowAllRef.current;

    if (followSelected && selectedPoint) {
      const shouldFollow =
        selectedChanged ||
        followActivated ||
        !samePoint(lastFollowPointRef.current, selectedPoint);

      if (shouldFollow) {
        map.flyTo({
          center: [selectedPoint.lon, selectedPoint.lat],
          zoom: Math.max(map.getZoom(), 15.5),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          speed: 0.85,
          curve: 1.1,
          essential: true,
        });

        lastFollowPointRef.current = selectedPoint;
      }
    } else {
      lastFollowPointRef.current = null;

      if (showAllActivated && coords.length) {
        fitCoords(map, coords);
      }
    }

    prevSelectedMissionKeyRef.current = selectedMissionKey;
    prevFollowSelectedRef.current = followSelected;
    prevShowAllRef.current = showAll;
  }, [
    visibleItems,
    selectedItem,
    selectedMissionKey,
    followSelected,
    showAll,
    trailsByMissionKey,
  ]);

  const focusEnabled = Boolean(selectedMissionKey);
  const focusActive = focusEnabled && followSelected;

  useEffect(() => {
    if (!selectedMissionKey && followSelected) {
      onSetFollowSelected(false);
    }
  }, [selectedMissionKey, followSelected, onSetFollowSelected]);

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
              !focusEnabled
                ? "btn-disabled border-base-300 bg-base-200 text-base-content/40 shadow-none"
                : focusActive
                  ? "btn-primary border-none text-white"
                  : "border-base-300 bg-base-100/95 backdrop-blur"
            }`}
            onClick={() => {
              const next = !followSelected;
              onSetFollowSelected(next);
              if (next) {
                onSetShowAll(false);
              }
            }}
            disabled={!focusEnabled}
          >
            <FiCrosshair />
            Focus selected
          </button>

          <button
            type="button"
            className={`btn btn-sm rounded-xl shadow-sm ${
              showAll
                ? "btn-primary border-none text-white"
                : "border-base-300 bg-base-100/95 backdrop-blur"
            }`}
            onClick={() => {
              const next = !showAll;
              onSetShowAll(next);
              if (next) {
                onSetFollowSelected(false);
              }
            }}
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
