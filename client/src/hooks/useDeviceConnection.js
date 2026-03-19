import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

export function useDeviceConnection(selectedDeviceId) {
  const [uiStatus, setUiStatus] = useState("inactive"); // inactive | connected | out_of_range
  const [deviceState, setDeviceState] = useState(null);
  const [missionRunning, setMissionRunning] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!selectedDeviceId || selectedDeviceId === "none") {
      setUiStatus("inactive");
      setDeviceState(null);
      setMissionRunning(false);
      return null;
    }

    try {
      const { data } = await api.get("/device/status");
      setDeviceState(data);

      const runningNow =
        Boolean(data?.running) ||
        ["ARMING", "RUNNING"].includes(String(data?.state || "").toUpperCase());

      setMissionRunning(runningNow);
      setUiStatus("connected");

      return data;
    } catch {
      setDeviceState((prev) => prev);
      setMissionRunning((prev) => prev);
      setUiStatus((prevRunning) => (missionRunning ? "out_of_range" : "inactive"));
      return null;
    }
  }, [selectedDeviceId, missionRunning]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!selectedDeviceId || selectedDeviceId === "none") return;

    const interval = window.setInterval(() => {
      refreshStatus();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [selectedDeviceId, refreshStatus]);

  return {
    uiStatus,
    deviceState,
    missionRunning,
    refreshStatus,
  };
}
