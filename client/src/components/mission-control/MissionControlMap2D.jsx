import React, { useEffect, useMemo, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { FiRotateCcw } from "react-icons/fi";

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

function getItemCoords(item) {
  const live = item?.live || {};
  const gps = item?.gps?.last_good_fix || {};

  const lat = live.lat ?? gps.lat ?? null;
  const lon = live.lon ?? gps.lon ?? null;
  const alt_m = live.alt_m ?? gps.alt_m ?? null;

  if (lat == null || lon == null) return null;

  return {
    lat: Number(lat),
    lon: Number(lon),
    alt_m: alt_m != null ? Number(alt_m) : null,
  };
}

function fitCoords(map, coords) {
  if (!map || !Array.isArray(coords) || coords.length === 0) return;

  if (coords.length === 1) {
    map.flyTo({
      center: coords[0],
      zoom: 15.4,
      pitch: 0,
      bearing: 0,
      speed: 0.9,
      curve: 1.2,
      essential: true,
    });
    return;
  }

  const bounds = new maptilersdk.LngLatBounds(coords[0], coords[0]);
  coords.forEach((item) => bounds.extend(item));

  map.fitBounds(bounds, {
    padding: 84,
    duration: 1100,
    essential: true,
    pitch: 0,
    bearing: 0,
    maxZoom: 16.2,
  });
}

function createMissionMarkerElement(isSelected = false) {
  const el = document.createElement("button");
  el.type = "button";
  el.style.width = isSelected ? "20px" : "16px";
  el.style.height = isSelected ? "20px" : "16px";
  el.style.borderRadius = "999px";
  el.style.border = "3px solid white";
  el.style.background = isSelected ? "#2563eb" : "#06b6d4";
  el.style.boxShadow = "0 8px 20px rgba(0,0,0,0.22)";
  el.style.cursor = "pointer";
  return el;
}

export default function MissionControlMap2D({
  items = [],
  selectedItem = null,
  followSelected = true,
  showAll = true,
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

    map.addControl(
      new maptilersdk.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      "bottom-right",
    );

    map.on("style.load", () => {
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

      map.easeTo({
        center: initialCenter,
        zoom: initialZoom,
        pitch: 0,
        bearing: 0,
        duration: 700,
        essential: true,
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
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearMarkers();

    visibleItems.forEach((item) => {
      const coords = getItemCoords(item);
      if (!coords) return;

      const isSelected =
        selectedItem &&
        item.device_uuid === selectedItem.device_uuid &&
        item.mission_id === selectedItem.mission_id;

      const el = createMissionMarkerElement(Boolean(isSelected));

      const popup = new maptilersdk.Popup({
        offset: 16,
        closeButton: false,
      }).setHTML(`
        <div style="min-width:180px">
          <div style="font-weight:700; margin-bottom:4px;">
            ${item.nickname || item.hostname || item.device_uuid}
          </div>
          <div style="font-size:12px; opacity:.75;">
            ${item.mission_name || item.mission_id}
          </div>
          <div style="margin-top:8px; font-size:12px; opacity:.8;">
            Lat: ${coords.lat.toFixed(6)}<br/>
            Lon: ${coords.lon.toFixed(6)}<br/>
            Alt: ${coords.alt_m != null ? `${coords.alt_m.toFixed(1)} m` : "—"}
          </div>
        </div>
      `);

      const marker = new maptilersdk.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([coords.lon, coords.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [visibleItems, selectedItem]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedItem && followSelected) {
      const coords = getItemCoords(selectedItem);
      if (coords) {
        fitCoords(map, [[coords.lon, coords.lat]]);
        return;
      }
    }

    const coords = visibleItems
      .map((item) => {
        const point = getItemCoords(item);
        if (!point) return null;
        return [point.lon, point.lat];
      })
      .filter(Boolean);

    if (coords.length > 0) {
      fitCoords(map, coords);
    }
  }, [visibleItems, selectedItem, followSelected]);

  function handleReset() {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: DEFAULT_CAMERA.center,
      zoom: DEFAULT_CAMERA.zoom,
      pitch: DEFAULT_CAMERA.pitch,
      bearing: DEFAULT_CAMERA.bearing,
      duration: 1200,
      essential: true,
    });
  }

  return (
    <div className="relative h-[540px] w-full overflow-hidden bg-base-200 rounded-3xl border border-base-300 shadow-xl">
      {!MAPTILER_KEY ? (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-8">
            <div className="text-lg font-semibold">Map key missing</div>
            <div className="mt-2 text-sm text-base-content/60">
              Add <span className="font-mono">VITE_MAPTILER_KEY</span> in your
              client environment before rendering Mission Control.
            </div>
          </div>
        </div>
      ) : (
        <div ref={mapNodeRef} className="h-full w-full" />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-end gap-3 p-4">
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
    </div>
  );
}
