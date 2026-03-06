import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { listDevices, scanDevices, selectDevice } from "../services/devicesApi";

const ROUTE_META = [
  { path: "/dashboard", title: "Dashboard" },
  { path: "/heatmap", title: "HeatMap" },
  { path: "/missions", title: "Missions" },
  { path: "/analytics", title: "Analytics" },
];

export default function AppShell() {
  const location = useLocation();
  const pageTitle = useMemo(() => {
    const found = ROUTE_META.find((r) => location.pathname.startsWith(r.path));
    return found?.title || "EnvMon";
  }, [location.pathname]);

  const [devicesRaw, setDevicesRaw] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("none");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const data = await listDevices();
    setDevicesRaw(data.devices ?? []);
  }

  useEffect(() => {
    // Keep backend in sync: default "No Device"
    (async () => {
      try {
        await selectDevice("none");
        await refresh();
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || "Init failed");
      }
    })();
  }, []);

  const devices = useMemo(() => {
    // "No Device" entry always first
    const base = [{ id: "none", label: "No Device" }];

    const mapped = (devicesRaw || []).map((d) => ({
      id: d.device_uuid,
      label: d.nickname || d.hostname || d.info?.hostname || "Device",
    }));

    return [...base, ...mapped];
  }, [devicesRaw]);

  const activeDevice = useMemo(() => {
    if (!selectedDeviceId || selectedDeviceId === "none") return null;
    return devicesRaw.find((d) => d.device_uuid === selectedDeviceId) || null;
  }, [devicesRaw, selectedDeviceId]);

  async function handleDeviceChange(id) {
    setSelectedDeviceId(id);
    setError("");
    try {
      await selectDevice(id); // id can be "none"
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Select failed");
    }
  }

  async function handleScan() {
    setIsScanning(true);
    setError("");
    try {
      const cidr = import.meta.env.VITE_SCAN_CIDR; // optional
      const res = await scanDevices(cidr);
      setDevicesRaw(res.devices ?? []);
      // Keep selection as "none" until user explicitly chooses
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Scan failed");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <div className="drawer lg:drawer-open">
        <input id="envmon-drawer" type="checkbox" className="drawer-toggle" />

        <div className="drawer-content flex flex-col min-h-screen">
          <Topbar
            pageTitle={pageTitle}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onDeviceChange={handleDeviceChange}
            onScan={handleScan}
            isScanning={isScanning}
          />

          {error && (
            <div className="alert alert-warning rounded-none">
              <span>{error}</span>
            </div>
          )}

          <main className="px-4 py-6">
            <Outlet context={{ selectedDeviceId, activeDevice }} />
          </main>
        </div>

        <div className="drawer-side">
          <label htmlFor="envmon-drawer" className="drawer-overlay" />
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
