import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
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
import api from "../services/api";

const ROUTE_META = [
  { path: "/dashboard-static", title: "Dashboard" },
  { path: "/dashboard-car", title: "Dashboard" },
  { path: "/dashboard", title: "Dashboard" },
  { path: "/dashboard-bicycle", title: "Dashboard" },
  { path: "/mission-control", title: "Mission Control" },
  { path: "/heatmap", title: "HeatMap" },
  { path: "/missions", title: "Missions" },
  { path: "/analytics", title: "Analytics" },
  { path: "/settings", title: "Settings" },
];

const FALLBACK_PROFILES = [
  { type: "drone", label: "Drone" },
  { type: "bicycle", label: "Bicycle" },
  { type: "car", label: "Car" },
  { type: "static", label: "Static Station" },
];

function getDashboardRoute(profileType) {
  switch (profileType) {
    case "car":
      return "/dashboard-car";
    case "bicycle":
      return "/dashboard-bicycle";
    case "static":
      return "/dashboard-static";
    default:
      return "/dashboard";
  }
}

function isRuntimeMissionActive(state) {
  return (
    Boolean(state?.running) ||
    ["ARMING", "RUNNING"].includes(String(state?.state || "").toUpperCase())
  );
}

function getRuntimeProfileType(state) {
  return (
    state?.profile_type ||
    state?.active_profile_type ||
    state?.profile?.profile_type ||
    state?.profile?.type ||
    null
  );
}

function getRuntimeProfileLabel(state, profiles = []) {
  const profileType = getRuntimeProfileType(state);

  return (
    state?.profile_label ||
    state?.active_profile_label ||
    state?.profile?.profile_label ||
    state?.profile?.label ||
    profiles.find((p) => p.type === profileType)?.label ||
    profileType ||
    "Unknown profile"
  );
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

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

  const [runtimeProfileLock, setRuntimeProfileLock] = useState(null);
  const lastRuntimeProfileSyncRef = useRef(null);

  const [setupQueue, setSetupQueue] = useState([]);
  const [currentSetupDevice, setCurrentSetupDevice] = useState(null);

  const refresh = useCallback(async () => {
    const data = await listDevices();
    const nextDevices = data.devices ?? [];

    setDevicesRaw(nextDevices);
    setSelectedDeviceId(data.active_device_uuid || "none");

    return nextDevices;
  }, []);

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
        await refresh();
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || "Init failed");
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (!currentSetupDevice && setupQueue.length > 0) {
      setCurrentSetupDevice(setupQueue[0]);
    }
  }, [setupQueue, currentSetupDevice]);

  const devices = useMemo(() => {
    const base = [
      {
        id: "none",
        label: "No Device",
        subtitle: "No active node selected",
        connected: false,
        isPlaceholder: true,
      },
    ];

    const mapped = (devicesRaw || []).map((d) => ({
      id: d.device_uuid,
      label: d.nickname || d.hostname || d.info?.hostname || "Device",
      subtitle: d.active_profile_label || "Drone",
      connectionState: d.connection_state || "offline",
      lastSeenAgeS: d.last_seen_age_s ?? null,
    }));

    return [...base, ...mapped];
  }, [devicesRaw]);

  const activeDevice = useMemo(() => {
    if (!selectedDeviceId || selectedDeviceId === "none") return null;
    return devicesRaw.find((d) => d.device_uuid === selectedDeviceId) || null;
  }, [devicesRaw, selectedDeviceId]);

  const profileLockedByRunningMission =
    Boolean(runtimeProfileLock) &&
    runtimeProfileLock.deviceId === selectedDeviceId &&
    runtimeProfileLock.running === true;

  const selectedProfileType = profileLockedByRunningMission
    ? runtimeProfileLock.profileType
    : activeDevice?.active_profile_type || "drone";

  useEffect(() => {
    const dashboardRoutes = [
      "/dashboard",
      "/dashboard-car",
      "/dashboard-bicycle",
      "/dashboard-static",
    ];

    if (!dashboardRoutes.includes(location.pathname)) return;

    const targetRoute = getDashboardRoute(selectedProfileType);

    if (location.pathname !== targetRoute) {
      navigate(targetRoute, { replace: true });
    }
  }, [selectedProfileType, location.pathname, navigate]);

  useEffect(() => {
    if (!selectedDeviceId || selectedDeviceId === "none") {
      setRuntimeProfileLock(null);
      lastRuntimeProfileSyncRef.current = null;
      return undefined;
    }

    let cancelled = false;

    async function checkRuntimeProfileLock() {
      try {
        const { data } = await api.get("/device/status");

        if (cancelled) return;

        const runningNow = isRuntimeMissionActive(data);

        if (!runningNow) {
          setRuntimeProfileLock(null);
          lastRuntimeProfileSyncRef.current = null;
          return;
        }

        const runtimeProfileType =
          getRuntimeProfileType(data) ||
          activeDevice?.active_profile_type ||
          "drone";

        const runtimeProfileLabel = getRuntimeProfileLabel(data, profiles);

        setRuntimeProfileLock({
          deviceId: selectedDeviceId,
          running: true,
          profileType: runtimeProfileType,
          profileLabel: runtimeProfileLabel,
        });

        const syncKey = `${selectedDeviceId}:${runtimeProfileType}`;

        if (
          runtimeProfileType &&
          activeDevice?.active_profile_type !== runtimeProfileType &&
          lastRuntimeProfileSyncRef.current !== syncKey
        ) {
          lastRuntimeProfileSyncRef.current = syncKey;

          const profileLabel =
            profiles.find((p) => p.type === runtimeProfileType)?.label ||
            runtimeProfileLabel;

          await setDeviceProfile(
            selectedDeviceId,
            runtimeProfileType,
            profileLabel,
          );
          await refresh();
        }
      } catch {
        if (cancelled) return;

        // Dacă dispozitivul nu mai răspunde, nu blocăm profilul în interfață.
        setRuntimeProfileLock(null);
        lastRuntimeProfileSyncRef.current = null;
      }
    }

    checkRuntimeProfileLock();

    const interval = window.setInterval(checkRuntimeProfileLock, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedDeviceId, activeDevice?.active_profile_type, profiles, refresh]);

  async function handleDeviceChange(id) {
    setSelectedDeviceId(id);
    setError("");

    try {
      await selectDevice(id);

      const nextDevices = await refresh();

      if (!id || id === "none") {
        return { ok: true, profileType: "drone" };
      }

      const selected = nextDevices.find((d) => d.device_uuid === id);

      return {
        ok: true,
        profileType: selected?.active_profile_type || "drone",
      };
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Select failed");
      return { ok: false };
    }
  }

  async function handleProfileChange(profileType) {
    if (!selectedDeviceId || selectedDeviceId === "none") return false;

    if (profileLockedByRunningMission) {
      setError(
        `${runtimeProfileLock.profileLabel} mission is running. Stop or abort the mission before changing the profile.`,
      );
      return false;
    }

    const profile = profiles.find((p) => p.type === profileType);
    if (!profile) return false;

    setError("");

    try {
      await setDeviceProfile(selectedDeviceId, profile.type, profile.label);
      await refresh();
      return true;
    } catch (e) {
      setError(
        e?.response?.data?.error || e?.message || "Profile update failed",
      );
      return false;
    }
  }

  const handleDeviceConnected = useCallback(
    async (deviceId) => {
      if (!deviceId || deviceId === "none") return;

      try {
        await refresh();
      } catch {
        // Runtime polling should not surface duplicate errors beside page-level errors.
      }
    },
    [refresh],
  );

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

        <div className="drawer-content flex min-h-screen flex-col">
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
            profileDisabled={!activeDevice || profileLockedByRunningMission}
            profileLockMessage={
              profileLockedByRunningMission
                ? `${runtimeProfileLock.profileLabel} mission running`
                : ""
            }
            newDevicesCount={setupQueue.length}
          />

          {error && (
            <div className="alert alert-warning rounded-none">
              <span>{error}</span>
            </div>
          )}

          <main className="flex-1 min-h-0 overflow-hidden px-4 py-6">
            <Outlet
              context={{
                selectedDeviceId,
                activeDevice,
                selectedProfileType,
                profiles,
                devicesRaw,
                refreshDevices: refresh,
                onScan: handleScan,
                onDeviceConnected: handleDeviceConnected,
                onDeviceChange: handleDeviceChange,
                onProfileChange: handleProfileChange,
              }}
            />
          </main>
        </div>

        <div className="drawer-side">
          <label htmlFor="envmon-drawer" className="drawer-overlay" />
          <Sidebar selectedProfileType={selectedProfileType} />
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
