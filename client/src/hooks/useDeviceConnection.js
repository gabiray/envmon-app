import { useEffect, useRef, useState } from "react";
import api from "../services/api";

export function useDeviceConnection(selectedDeviceId) {
  const [uiStatus, setUiStatus] = useState("inactive"); // inactive | connected | out_of_range
  const [deviceState, setDeviceState] = useState(null); // response from /device/status
  const lastRunningRef = useRef(false);

  useEffect(() => {
    let t = null;
    let cancelled = false;

    async function tick() {
      // No device selected -> always inactive
      if (!selectedDeviceId || selectedDeviceId === "none") {
        lastRunningRef.current = false;
        setUiStatus("inactive");
        setDeviceState(null);
        return;
      }

      try {
        const { data } = await api.get("/device/status");
        if (cancelled) return;

        setDeviceState(data);

        const runningNow =
          Boolean(data?.running) || ["ARMING", "RUNNING"].includes(String(data?.state || ""));
        lastRunningRef.current = runningNow;

        setUiStatus("connected");
      } catch (e) {
        if (cancelled) return;

        // If a mission was running and we lost connection -> out_of_range
        setDeviceState(null);
        setUiStatus(lastRunningRef.current ? "out_of_range" : "inactive");
      }
    }

    tick();
    t = setInterval(tick, 2000);

    return () => {
      cancelled = true;
      if (t) clearInterval(t);
    };
  }, [selectedDeviceId]);

  return { uiStatus, deviceState, missionRunning: lastRunningRef.current };
}
