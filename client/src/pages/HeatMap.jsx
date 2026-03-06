import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiMap, FiThermometer, FiGrid, FiList, FiChevronDown } from "react-icons/fi";

import PageCard from "../components/PageCard";
import HeatMapMap from "../components/heatmap/HeatMapMap";
import { fetchDbMissions, fetchHeatGrid, fetchMissionTrack } from "../services/heatmapApi";
import { fetchStartPoints } from "../services/envmon";

function roundKey(lat, lon, decimals = 4) {
  return `${lat.toFixed(decimals)},${lon.toFixed(decimals)}`;
}

function distApproxMeters(aLat, aLon, bLat, bLon) {
  // Simple equirectangular approximation (good for nearby points)
  const R = 6371000;
  const x = ((bLon - aLon) * Math.PI) / 180 * Math.cos(((aLat + bLat) * Math.PI) / 360);
  const y = ((bLat - aLat) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * R;
}

function metricLabel(metric) {
  if (metric === "temp_c") return "Temperature (°C)";
  if (metric === "hum_pct") return "Humidity (%)";
  if (metric === "press_hpa") return "Pressure (hPa)";
  if (metric === "gas_ohms") return "Gas (ohms)";
  return metric;
}

export default function HeatMap() {
  const { selectedDeviceId } = useOutletContext();

  const [missions, setMissions] = useState([]);
  const [startPoints, setStartPoints] = useState([]);

  const [selectedPinKey, setSelectedPinKey] = useState(null);
  const [selectedMissionId, setSelectedMissionId] = useState(null);

  const [metric, setMetric] = useState("temp_c");
  const [cellM, setCellM] = useState(20);

  const [track, setTrack] = useState([]);
  const [heat, setHeat] = useState(null);

  // Load missions + start points for selected device
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!selectedDeviceId || selectedDeviceId === "none") {
        setMissions([]);
        setStartPoints([]);
        setSelectedPinKey(null);
        setSelectedMissionId(null);
        setTrack([]);
        setHeat(null);
        return;
      }

      const [list, sp] = await Promise.all([
        fetchDbMissions(selectedDeviceId),
        fetchStartPoints(selectedDeviceId),
      ]);

      if (cancelled) return;

      setMissions(list);
      setStartPoints(sp);

      const withStart = list.filter((m) => m.start?.lat != null && m.start?.lon != null);
      if (withStart.length > 0) {
        const first = withStart[0];
        setSelectedPinKey(roundKey(first.start.lat, first.start.lon, 4));
      } else {
        setSelectedPinKey(null);
      }

      setSelectedMissionId(null);
      setTrack([]);
      setHeat(null);
    }

    load().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [selectedDeviceId]);

  // Build pins grouped by mission start
  const pins = useMemo(() => {
    const map = new Map();
    for (const m of missions) {
      const lat = m.start?.lat;
      const lon = m.start?.lon;
      if (lat == null || lon == null) continue;

      const key = roundKey(lat, lon, 4);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          lat,
          lon,
          count: 1,
          missions: [m],
        });
      } else {
        existing.count += 1;
        existing.missions.push(m);
      }
    }

    // Attach a friendly name based on nearest StartPoint (if any)
    const named = Array.from(map.values()).map((p) => {
      let best = null;
      let bestD = Infinity;

      for (const sp of startPoints) {
        const d = distApproxMeters(p.lat, p.lon, sp.latlng.lat, sp.latlng.lng);
        if (d < bestD) {
          bestD = d;
          best = sp;
        }
      }

      // If nearest start point is within 80m, use its name
      const name = best && bestD <= 80 ? best.name : null;

      return {
        ...p,
        name: name || "Unnamed location",
        nearest_m: Number.isFinite(bestD) ? Math.round(bestD) : null,
      };
    });

    return named.sort((a, b) => b.count - a.count);
  }, [missions, startPoints]);

  const missionsForPin = useMemo(() => {
    if (!selectedPinKey) return [];
    const pin = pins.find((p) => p.key === selectedPinKey);
    return pin ? pin.missions : [];
  }, [pins, selectedPinKey]);

  const selectedMission = useMemo(() => {
    return missions.find((m) => m.mission_id === selectedMissionId) || null;
  }, [missions, selectedMissionId]);

  const selectedPin = useMemo(() => {
    return pins.find((p) => p.key === selectedPinKey) || null;
  }, [pins, selectedPinKey]);

  // Load track + heat grid when mission/metric/cell changes
  useEffect(() => {
    let cancelled = false;

    async function loadMissionLayers() {
      if (!selectedMissionId) {
        setTrack([]);
        setHeat(null);
        return;
      }

      const [t, h] = await Promise.all([
        fetchMissionTrack(selectedMissionId),
        fetchHeatGrid({ mission_id: selectedMissionId, metric, cell_m: cellM }),
      ]);

      if (cancelled) return;

      setTrack(t.map((p) => ({ lat: p.lat, lon: p.lon })));
      setHeat(h);
    }

    loadMissionLayers().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [selectedMissionId, metric, cellM]);

  // Custom dropdowns (no native checkmarks)
  const metricOptions = [
    { id: "temp_c", label: "Temperature (°C)" },
    { id: "hum_pct", label: "Humidity (%)" },
    { id: "press_hpa", label: "Pressure (hPa)" },
    { id: "gas_ohms", label: "Gas (ohms)" },
  ];

  const cellOptions = [10, 20, 50, 100, 200];

  const right = (
    <div className="flex items-center gap-2">
      {/* Metric dropdown */}
      <div className="dropdown dropdown-end">
        <button
          type="button"
          tabIndex={0}
          className="btn btn-sm btn-outline rounded-xl"
          disabled={!selectedMissionId}
          title={!selectedMissionId ? "Select a mission first" : "Choose metric"}
        >
          <FiThermometer />
          <span className="hidden sm:inline">{metricLabel(metric)}</span>
          <FiChevronDown className="opacity-70" />
        </button>

        <ul
          tabIndex={0}
          className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-56 border border-base-200"
        >
          {metricOptions.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={o.id === metric ? "active" : ""}
                onClick={() => setMetric(o.id)}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Cell size dropdown */}
      <div className="dropdown dropdown-end">
        <button
          type="button"
          tabIndex={0}
          className="btn btn-sm btn-outline rounded-xl"
          disabled={!selectedMissionId}
          title={!selectedMissionId ? "Select a mission first" : "Choose grid resolution"}
        >
          <FiGrid />
          <span className="hidden sm:inline">{cellM} m</span>
          <FiChevronDown className="opacity-70" />
        </button>

        <ul
          tabIndex={0}
          className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-40 border border-base-200"
        >
          {cellOptions.map((m) => (
            <li key={m}>
              <button
                type="button"
                className={m === cellM ? "active" : ""}
                onClick={() => setCellM(m)}
              >
                {m} m
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <PageCard title="HeatMap" right={right}>
      {!selectedDeviceId || selectedDeviceId === "none" ? (
        <div className="alert alert-info">
          <FiMap />
          <span>Select a device in the topbar, then open HeatMap.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* LEFT: pins + missions */}
          <div className="xl:col-span-1 space-y-4">
            <div className="rounded-box border border-base-300 bg-base-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold inline-flex items-center gap-2">
                  <FiMap /> Start locations
                </div>
                <span className="badge badge-outline">{pins.length}</span>
              </div>

              {pins.length === 0 ? (
                <div className="text-sm opacity-60 mt-2">
                  No missions with start location for this device.
                </div>
              ) : (
                <ul className="menu menu-sm mt-2 rounded-box bg-base-100 border border-base-300 max-h-56 overflow-y-auto">
                  {pins.map((p) => (
                    <li key={p.key}>
                      <button
                        type="button"
                        className={p.key === selectedPinKey ? "active" : ""}
                        onClick={() => {
                          setSelectedPinKey(p.key);
                          setSelectedMissionId(null);
                          setTrack([]);
                          setHeat(null);
                        }}
                      >
                        <span className="font-semibold truncate">{p.name}</span>
                        <span className="badge badge-outline">{p.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {selectedPin && (
                <div className="mt-2 text-xs opacity-70">
                  <span className="font-medium">{selectedPin.name}</span>
                  {selectedPin.nearest_m != null && (
                    <>
                      <span className="opacity-40"> • </span>
                      <span>nearest saved point: {selectedPin.nearest_m} m</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-box border border-base-300 bg-base-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold inline-flex items-center gap-2">
                  <FiList /> Missions at selected location
                </div>
                <span className="badge badge-outline">{missionsForPin.length}</span>
              </div>

              {missionsForPin.length === 0 ? (
                <div className="text-sm opacity-60 mt-2">
                  Select a location pin.
                </div>
              ) : (
                <ul className="menu menu-sm mt-2 rounded-box bg-base-100 border border-base-300 max-h-72 overflow-y-auto">
                  {missionsForPin.map((m) => (
                    <li key={m.mission_id}>
                      <button
                        type="button"
                        className={m.mission_id === selectedMissionId ? "active" : ""}
                        onClick={() => setSelectedMissionId(m.mission_id)}
                      >
                        <span className="font-mono text-xs break-all">
                          {m.mission_id}
                        </span>
                        <span className={`badge badge-xs ${m.has_gps ? "badge-outline" : "badge-warning"}`}>
                          {m.has_gps ? "gps" : "no gps"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {selectedMission && (
                <div className="mt-3 text-xs opacity-70">
                  Status: <span className="font-medium">{selectedMission.status}</span>
                  <span className="opacity-40"> • </span>
                  Stop: <span className="font-medium">{selectedMission.stop_reason || "None"}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: map */}
          <div className="xl:col-span-2">
            <div className="rounded-box border border-base-300 overflow-hidden h-155 bg-base-200">
              <HeatMapMap
                pins={pins}
                selectedPinKey={selectedPinKey}
                onSelectPin={(k) => {
                  setSelectedPinKey(k);
                  setSelectedMissionId(null);
                  setTrack([]);
                  setHeat(null);
                }}
                selectedMission={selectedMission}
                track={track}
                heat={heat}
                // show a small legend overlay
                legend={{
                  metricLabel: metricLabel(metric),
                  min: heat?.value_min ?? null,
                  max: heat?.value_max ?? null,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </PageCard>
  );
}
