import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import NewDeviceModal from "./components/NewDeviceModal";
import {
  listDevices,
  scanDevices,
  selectDevice,
  listDeviceProfiles,
  setDeviceProfile,
  configureDevice,
} from "../services/devicesApi";

const ROUTE_META = [
  { path: "/dashboard", title: "Dashboard" },
  { path: "/heatmap", title: "HeatMap" },
  { path: "/missions", title: "Missions" },
  { path: "/analytics", title: "Analytics" },
];

const FALLBACK_PROFILES = [
  { type: "drone", label: "Drone" },
  { type: "bicycle", label: "Bicycle" },
  { type: "car", label: "Car" },
  { type: "static", label: "Static Station" },
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
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [error, setError] = useState("");

  const [profiles, setProfiles] = useState(FALLBACK_PROFILES);

  const [setupQueue, setSetupQueue] = useState([]);
  const [currentSetupDevice, setCurrentSetupDevice] = useState(null);

  async function refresh() {
    const data = await listDevices();
    setDevicesRaw(data.devices ?? []);
  }

  async function loadProfiles() {
    try {
      const data = await listDeviceProfiles();
      setProfiles(data.items?.length ? data.items : FALLBACK_PROFILES);
    } catch {
      setProfiles(FALLBACK_PROFILES);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await loadProfiles();
        await selectDevice("none");
        await refresh();
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || "Init failed");
      }
    })();
  }, []);

  useEffect(() => {
    if (!currentSetupDevice && setupQueue.length > 0) {
      setCurrentSetupDevice(setupQueue[0]);
    }
  }, [setupQueue, currentSetupDevice]);

  const devices = useMemo(() => {
    const base = [
      { id: "none", label: "No Device", subtitle: "No active node selected" },
    ];

    const mapped = (devicesRaw || []).map((d) => ({
      id: d.device_uuid,
      label: d.nickname || d.hostname || d.info?.hostname || "Device",
      subtitle: d.active_profile_label || "Drone",
    }));

    return [...base, ...mapped];
  }, [devicesRaw]);

  const activeDevice = useMemo(() => {
    if (!selectedDeviceId || selectedDeviceId === "none") return null;
    return devicesRaw.find((d) => d.device_uuid === selectedDeviceId) || null;
  }, [devicesRaw, selectedDeviceId]);

  const selectedProfileType = activeDevice?.active_profile_type || "drone";

  async function handleDeviceChange(id) {
    setSelectedDeviceId(id);
    setError("");

    try {
      await selectDevice(id);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Select failed");
    }
  }

  async function handleProfileChange(profileType) {
    if (!selectedDeviceId || selectedDeviceId === "none") return;

    const profile = profiles.find((p) => p.type === profileType);
    if (!profile) return;

    setError("");

    try {
      await setDeviceProfile(selectedDeviceId, profile.type, profile.label);
      await refresh();
    } catch (e) {
      setError(
        e?.response?.data?.error || e?.message || "Profile update failed",
      );
    }
  }

  async function handleScan() {
    setIsScanning(true);
    setError("");

    try {
      const cidr = import.meta.env.VITE_SCAN_CIDR;
      const res = await scanDevices(cidr);

      const scannedDevices = res.devices ?? [];
      setDevicesRaw(scannedDevices);

      const setupCandidates = (res.new_devices ?? []).filter(
        (d) => d.needs_setup || !(d.nickname || "").trim(),
      );

      if (setupCandidates.length > 0) {
        setSetupQueue(setupCandidates);
        setCurrentSetupDevice(setupCandidates[0]);
      }

      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Scan failed");
    } finally {
      setIsScanning(false);
    }
  }

  function handleCloseSetupModal() {
    setCurrentSetupDevice(null);
    setSetupQueue((prev) => prev.slice(1));
  }

  async function handleSaveSetupDevice(payload) {
    setIsSavingDevice(true);
    setError("");

    try {
      await configureDevice(payload.device_uuid, {
        nickname: payload.nickname,
        profile_type: payload.profile_type,
        profile_label: payload.profile_label,
      });

      if (payload.selectAfterSave !== false) {
        await selectDevice(payload.device_uuid);
        setSelectedDeviceId(payload.device_uuid);
      }

      await refresh();

      setCurrentSetupDevice(null);
      setSetupQueue((prev) => prev.slice(1));
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Device setup failed");
    } finally {
      setIsSavingDevice(false);
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
            profiles={profiles}
            selectedProfileType={selectedProfileType}
            onProfileChange={handleProfileChange}
            profileDisabled={!activeDevice}
            newDevicesCount={setupQueue.length}
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

      <NewDeviceModal
        open={Boolean(currentSetupDevice)}
        device={currentSetupDevice}
        profiles={profiles}
        busy={isSavingDevice}
        queueIndex={currentSetupDevice ? 0 : null}
        queueTotal={setupQueue.length}
        onClose={handleCloseSetupModal}
        onSave={handleSaveSetupDevice}
      />
    </div>
  );
}
