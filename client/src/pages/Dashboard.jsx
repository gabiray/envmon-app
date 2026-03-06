import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import DeviceHeroBanner from "../components/dashboard/DeviceHeroBanner";
import MissionMapPanel from "../components/dashboard/MissionMapPanel";
import DeviceOpsPanel from "../components/dashboard/DeviceOpsPanel";

import { createStartPoint, fetchStartPoints } from "../services/envmon";
import { useDeviceConnection } from "../hooks/useDeviceConnection";
import {
  startMission,
  stopMission,
  abortMission,
} from "../services/missionsApi";

function ipFromBaseUrl(baseUrl) {
  try {
    const u = new URL(baseUrl);
    return u.hostname;
  } catch {
    return "None";
  }
}

export default function Dashboard() {
  const { selectedDeviceId, activeDevice } = useOutletContext();

  const {
    uiStatus: deviceStatus,
    deviceState,
    missionRunning,
  } = useDeviceConnection(selectedDeviceId);

  const [startPoints, setStartPoints] = useState([]);
  const [selectedStartPointId, setSelectedStartPointId] = useState(null);
  const [busy, setBusy] = useState(false);

  const metrics = {
    temperature: { value: 25.2, unit: "°C" },
    humidity: { value: 49.7, unit: "%" },
    pressure: { value: 979.6, unit: "hPa" },
    gas: { value: 24.3, unit: "kΩ" },
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!selectedDeviceId || selectedDeviceId === "none") {
        setStartPoints([]);
        setSelectedStartPointId(null);
        return;
      }
      const items = await fetchStartPoints(selectedDeviceId);
      if (cancelled) return;
      setStartPoints(items);
      if (!selectedStartPointId && items.length > 0)
        setSelectedStartPointId(items[0].id);
    }

    load().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [selectedDeviceId]);

  async function handleAddStartPoint({ name, latlng }) {
    if (!selectedDeviceId || selectedDeviceId === "none") return null;
    const created = await createStartPoint({
      device_uuid: selectedDeviceId,
      name,
      latlng,
    });
    setStartPoints((prev) => [created, ...prev]);
    return created;
  }

  async function handleStartMission(profile) {
    if (deviceStatus !== "connected") return;

    const sp = startPoints.find((p) => p.id === selectedStartPointId);
    const fixed_location = sp
      ? { lat: sp.latlng.lat, lon: sp.latlng.lng, alt_m: sp.alt_m ?? null }
      : { lat: null, lon: null, alt_m: null };

    setBusy(true);
    try {
      await startMission({
        duration: profile.duration,
        sample_hz: profile.sample_hz,
        photo_every: profile.photo_every,
        gps_mode: profile.gps_mode,
        camera_mode: "on",
        location_mode: sp ? "fixed" : "gps",
        fixed_location,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleStopMission() {
    setBusy(true);
    try {
      await stopMission();
    } finally {
      setBusy(false);
    }
  }

  async function handleAbortMission() {
    setBusy(true);
    try {
      await abortMission();
    } finally {
      setBusy(false);
    }
  }

  const heroDevice = useMemo(() => {
    const baseUrl = activeDevice?.base_url || "";
    return {
      nickname:
        activeDevice?.nickname ||
        (selectedDeviceId === "none" ? "None" : "No device selected"),
      hostname:
        activeDevice?.hostname || activeDevice?.info?.hostname || "None",
      uuid:
        activeDevice?.device_uuid ||
        (selectedDeviceId === "none" ? "None" : selectedDeviceId),
      ip: ipFromBaseUrl(baseUrl),
      lastSeenText: activeDevice?.last_seen_epoch ? "recent" : "None",
    };
  }, [activeDevice, selectedDeviceId]);

  return (
    <div className="flex flex-col gap-4">
      <DeviceHeroBanner status={deviceStatus} device={heroDevice} />

      <DeviceOpsPanel
        selectedDeviceId={selectedDeviceId}
        deviceStatus={deviceStatus}
      />

      <MissionMapPanel
        deviceStatus={deviceStatus}
        startPoints={startPoints}
        selectedStartPointId={selectedStartPointId}
        onAddStartPoint={handleAddStartPoint}
        onSelectStartPoint={setSelectedStartPointId}
        metrics={metrics}
        missionRunning={Boolean(deviceState?.running) || missionRunning}
        onStartMission={handleStartMission}
        onStopMission={handleStopMission}
        onAbortMission={handleAbortMission}
        busy={busy}
      />
    </div>
  );
}
