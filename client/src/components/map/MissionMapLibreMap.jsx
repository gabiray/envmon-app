import React, { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const TOPO_STYLE_URL = `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_KEY}`;
const STYLE_3D_URL = `https://api.maptiler.com/maps/019d0124-8989-7808-b02b-a8df305b92f3/style.json?key=${MAPTILER_KEY}`;
const TERRAIN_URL = `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`;

function createMarkerElement({ selected = false, pending = false }) {
  const el = document.createElement("button");
  el.type = "button";
  el.style.width = pending ? "18px" : "16px";
  el.style.height = pending ? "18px" : "16px";
  el.style.borderRadius = "999px";
  el.style.border = selected
    ? "3px solid white"
    : pending
    ? "2px solid white"
    : "2px solid rgba(255,255,255,0.92)";
  el.style.background = pending
    ? "var(--color-warning)"
    : selected
    ? "var(--color-primary)"
    : "var(--color-secondary)";
  el.style.boxShadow = "0 8px 20px rgba(0,0,0,0.22)";
  el.style.cursor = "pointer";
  return el;
}

export default function MissionMapLibreMap({
  startPoints = [],
  selectedStartPointId = null,
  pendingMapPick = null,
  mapPickEnabled = false,
  onMapPick = () => {},
  onSelectStartPoint = () => {},
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [viewMode, setViewMode] = useState("2d");

  const selectedPoint = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId]
  );

  useEffect(() => {
    if (!mapNodeRef.current) return;
    if (!MAPTILER_KEY) {
      console.error("VITE_MAPTILER_KEY is missing.");
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const map = new maplibregl.Map({
      container: mapNodeRef.current,
      style: viewMode === "2d" ? TOPO_STYLE_URL : STYLE_3D_URL,
      center: [26.255, 47.651],
      zoom: 12.8,
      pitch: viewMode === "3d" ? 68 : 0,
      bearing: viewMode === "3d" ? -24 : 0,
      antialias: true,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("style.load", () => {
      if (viewMode === "3d") {
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
              exaggeration: 1.2,
            });
          }
        } catch {}
      } else {
        try {
          if (typeof map.setProjection === "function") {
            map.setProjection({ type: "mercator" });
          }
        } catch {}
      }
    });

    map.on("click", (event) => {
      if (!mapPickEnabled) return;
      onMapPick({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      });
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [viewMode, mapPickEnabled, onMapPick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = mapPickEnabled ? "crosshair" : "";
  }, [mapPickEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    startPoints.forEach((point) => {
      const el = createMarkerElement({
        selected: point.id === selectedStartPointId,
      });

      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectStartPoint(point.id);
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([point.latlng.lng, point.latlng.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (pendingMapPick) {
      const pendingEl = createMarkerElement({ pending: true });
      const pendingMarker = new maplibregl.Marker({
        element: pendingEl,
        anchor: "center",
      })
        .setLngLat([pendingMapPick.lng, pendingMapPick.lat])
        .addTo(map);

      markersRef.current.push(pendingMarker);
    }
  }, [startPoints, selectedStartPointId, pendingMapPick, onSelectStartPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const target = pendingMapPick || selectedPoint?.latlng || null;
    if (!target) return;

    map.easeTo({
      center: [target.lng, target.lat],
      zoom: Math.max(map.getZoom(), 15),
      duration: 700,
    });
  }, [selectedPoint, pendingMapPick]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapNodeRef} className="h-full w-full" />

      <div className="absolute left-4 top-4 z-10">
        <button
          type="button"
          className="btn btn-sm rounded-xl border-base-300 bg-base-100 shadow-sm"
          onClick={() => setViewMode((prev) => (prev === "2d" ? "3d" : "2d"))}
        >
          {viewMode === "2d" ? "Switch to 3D" : "Switch to 2D"}
        </button>
      </div>
    </div>
  );
}
