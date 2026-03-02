import React, { useState } from "react";
import DeviceHeroBanner from "../components/dashboard/DeviceHeroBanner";
import MissionMapPanel from "../components/dashboard/MissionMapPanel";

export default function Dashboard() {
  const [startPoints, setStartPoints] = useState([]);
  const [selectedStartPointId, setSelectedStartPointId] = useState(null);

  const deviceStatus = "connected";

  // placeholder live metrics (mai târziu vin din API)
  const metrics = {
    temperature: { value: 25.2, unit: "°C", hint: "stable" },
    humidity: { value: 49.7, unit: "%", hint: "normal" },
    pressure: { value: 979.6, unit: "hPa", hint: "ok" },
    gas: { value: 24.3, unit: "kΩ", hint: "baseline" },
  };

  return (
    <div className="flex flex-col gap-4">
      <DeviceHeroBanner
        status={deviceStatus}
        device={{
          nickname: "Drona 1",
          hostname: "raspberrypi",
          uuid: "2e004ee8-…-56adf",
          ip: "192.168.137.92",
          lastSeenText: "a few seconds ago",
        }}
      />

      <MissionMapPanel
        deviceStatus={deviceStatus}
        startPoints={startPoints}
        selectedStartPointId={selectedStartPointId}
        onAddStartPoint={(p) => setStartPoints((prev) => [p, ...prev])}
        onSelectStartPoint={setSelectedStartPointId}
        metrics={metrics}
      />
    </div>
  );
}
