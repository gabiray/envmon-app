import { useEffect, useState } from "react";
import { DevicesAPI } from "../services/devices";
import { MissionsAPI } from "../services/missions";
import styles from "../styles/Dashboard.module.css";

function useInterval(cb, delay) {
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(cb, delay);
    return () => clearInterval(id);
  }, [cb, delay]);
}

export default function Dashboard() {
  const [deviceUrl, setDeviceUrl] = useState("");
  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [missions, setMissions] = useState([]);

  useInterval(async () => {
    try {
      const st = await DevicesAPI.status();
      setStatus(st);
    } catch (err) {
      console.error("Failed to fetch device status:", err);
    }
  }, 2000);

  useEffect(() => {
    (async () => {
      const d = await DevicesAPI.getDevice();
      setDeviceUrl(d.device_url);

      const st = await DevicesAPI.status().catch(() => null);
      setStatus(st);

      const ms = await MissionsAPI.list().catch(() => ({ missions: [] }));
      setMissions(ms.missions || []);
    })();
  }, []);

  const doHealth = async () => {
    const h = await DevicesAPI.health();
    setHealth(h);
  };

  const doRefreshMissions = async () => {
    const ms = await MissionsAPI.list();
    setMissions(ms.missions || []);
  };

  const doStartTest = async () => {
    await MissionsAPI.start({
      duration: 20,
      sample_hz: 2,
      photo_every: 0,
      gps_mode: "off",
      camera_mode: "off",
      location_mode: "fixed",
      fixed_location: { lat: 47.63, lon: 26.2, alt_m: 420.0 },
    });
    await doRefreshMissions();
  };

  const doStop = async () => {
    await MissionsAPI.stop().catch(() => {});
  };

  const isRunning = status?.state === "RUNNING" || status?.state === "ARMING";

  return (
    <div className={styles.page}>
      <h2>EnvMon Dashboard</h2>

      <div className={styles.card}>
        <div><b>Device:</b> {deviceUrl || "-"}</div>

        <div>
          <b>Status:</b>{" "}
          {isRunning ? (
            <span className={`${styles.badge} ${styles.badgeRunning}`}>RUNNING</span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeIdle}`}>IDLE</span>
          )}
        </div>

        <div><b>Mission:</b> {status?.mission_id || "-"}</div>
        <div><b>Warnings:</b> {(status?.warnings || []).join(", ") || "-"}</div>

        <div className={styles.row}>
          <button onClick={doHealth}>Health</button>
          <button onClick={doRefreshMissions}>Refresh missions</button>
          <button onClick={doStartTest} disabled={isRunning}>Start test</button>
          <button onClick={doStop} disabled={!isRunning}>Stop</button>
        </div>
      </div>

      {health && (
        <pre className={`${styles.card} ${styles.pre}`}>
          {JSON.stringify(health, null, 2)}
        </pre>
      )}

      <div className={styles.card}>
        <h3>Missions</h3>
        <ul>
          {missions.map((m) => (
            <li key={m}>
              <b>{m}</b>{" "}
              <a href={MissionsAPI.exportZipUrl(m)}>export zip</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
