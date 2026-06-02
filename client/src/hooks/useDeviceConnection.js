import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

export function useDeviceConnection(selectedDeviceId, options = {}) {
  const { onConnected = null } = options;

  const [uiStatus, setUiStatus] = useState("inactive"); // inactive | connected | out_of_range | stale
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

      if (data?.connection_state === "uuid_mismatch") {
        setUiStatus("stale");
        return data;
      }

      const runningNow =
        Boolean(data?.running) ||
        ["ARMING", "RUNNING"].includes(String(data?.state || "").toUpperCase());

      setMissionRunning(runningNow);
      setUiStatus("connected");
      onConnected?.(selectedDeviceId);

      return data;
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      if (status === 409 || data?.connection_state === "uuid_mismatch") {
        setDeviceState(data || null);
        setMissionRunning(false);
        setUiStatus("stale");
        return data || null;
      }

      setDeviceState((prev) => prev);
      setMissionRunning((prev) => prev);
      setUiStatus(missionRunning ? "out_of_range" : "inactive");
      return null;
    }
  }, [selectedDeviceId, missionRunning, onConnected]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refreshStatus();
    }, 0);

    return () => window.clearTimeout(timeout);
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
