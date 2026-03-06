import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Polyline,
  Rectangle,
  Popup,
} from "react-leaflet";
import { fixLeafletIcons } from "../../lib/leafletIcons";

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function valueToColor(v, vmin, vmax) {
  if (v == null || vmin == null || vmax == null) return "transparent";
  const t = vmax === vmin ? 0.5 : clamp01((v - vmin) / (vmax - vmin));
  // Blue (cool) -> Red (hot)
  const hue = 240 - 240 * t;
  return `hsl(${hue}, 90%, 50%)`;
}

export default function HeatMapMap({
  pins = [], // [{ key, lat, lon, count }]
  selectedPinKey = null,
  onSelectPin = () => {},
  selectedMission = null, // mission object
  track = [], // [{lat, lon}]
  heat = null, // { cells, value_min, value_max }
  legend = null,
}) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const center = useMemo(() => {
    const pin = pins.find((p) => p.key === selectedPinKey) || pins[0];
    if (pin) return { lat: pin.lat, lng: pin.lon };
    return { lat: 47.651, lng: 26.255 };
  }, [pins, selectedPinKey]);

  const polyline = useMemo(() => {
    return (track || []).map((p) => [p.lat, p.lon]);
  }, [track]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Pins */}
      {pins.map((p) => (
        <Marker
          key={p.key}
          position={{ lat: p.lat, lng: p.lon }}
          eventHandlers={{ click: () => onSelectPin(p.key) }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">Start location</div>
              <div className="font-mono text-xs">
                {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
              </div>
              <div className="text-xs opacity-70">Missions: {p.count}</div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Track: if GPS points exist */}
      {polyline.length >= 2 && (
        <Polyline
          positions={polyline}
          pathOptions={{ weight: 3, opacity: 0.9 }}
        />
      )}

      {/* Heat grid: rectangles */}
      {heat?.cells?.map((c, idx) => {
        const color = valueToColor(c.value, heat.value_min, heat.value_max);
        return (
          <Rectangle
            key={idx}
            bounds={[
              [c.min_lat, c.min_lon],
              [c.max_lat, c.max_lon],
            ]}
            pathOptions={{
              weight: 0,
              fillOpacity: 0.35,
              fillColor: color,
              color: color,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Cell</div>
                <div className="text-xs">
                  Value:{" "}
                  <span className="font-mono">{c.value?.toFixed?.(2)}</span>
                </div>
                <div className="text-xs opacity-70">Samples: {c.samples}</div>
              </div>
            </Popup>
          </Rectangle>
        );
      })}

      {/* If mission has no GPS, you still see start pin (already rendered) */}
      {/* selectedMission can be used for future overlays */}
      {selectedMission ? null : null}

      {/* Legend overlay */}
      {legend && legend.min != null && legend.max != null && (
        <div className="absolute right-3 bottom-3 z-500">
          <div className="rounded-box border border-base-300 bg-base-100/90 backdrop-blur px-3 py-2 shadow-sm w-56">
            <div className="text-xs font-semibold">{legend.metricLabel}</div>

            <div
              className="mt-2 h-3 rounded"
              style={{
                background:
                  "linear-gradient(90deg, hsl(240, 90%, 50%) 0%, hsl(0, 90%, 50%) 100%)",
              }}
              aria-hidden="true"
            />

            <div className="mt-1 flex justify-between text-[11px] opacity-75 font-mono">
              <span>{Number(legend.min).toFixed(2)}</span>
              <span>{Number(legend.max).toFixed(2)}</span>
            </div>

            <div className="mt-1 text-[11px] opacity-60">
              Cell: {heat?.cell_m ?? "—"} m • Samples:{" "}
              {Array.isArray(heat?.cells)
                ? heat.cells.reduce((s, c) => s + (c.samples || 0), 0)
                : 0}
            </div>
          </div>
        </div>
      )}
    </MapContainer>
  );
}
