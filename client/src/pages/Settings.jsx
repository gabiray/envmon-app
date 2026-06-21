import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOutletContext } from "react-router-dom";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCpu,
  FiDatabase,
  FiEdit3,
  FiHardDrive,
  FiInfo,
  FiRefreshCw,
  FiServer,
  FiSettings,
  FiShield,
  FiTrash2,
  FiWifi,
  FiWifiOff,
  FiX,
} from "react-icons/fi";

import {
  deleteDevice,
  deleteDeviceDbMissions,
  listDevices,
  scanDevices,
  selectDevice,
  setDeviceNickname,
} from "../services/devicesApi";

import {
  deleteAllDeviceMissions,
  fetchDbMissions,
  fetchDeviceMissions,
} from "../services/missionsApi";

import ThemeSettingsPanel from "../components/settings/ThemeSettingsPanel";

function getDeviceName(device) {
  return (
    device?.nickname ||
    device?.hostname ||
    device?.info?.hostname ||
    device?.name ||
    "Unnamed device"
  );
}

function formatAge(seconds) {
  if (seconds === null || seconds === undefined) return "Never";

  const value = Number(seconds);
  if (!Number.isFinite(value)) return "Unknown";

  if (value < 60) return `${Math.max(0, Math.round(value))}s ago`;
  if (value < 3600) return `${Math.round(value / 60)}m ago`;
  if (value < 86400) return `${Math.round(value / 3600)}h ago`;

  return `${Math.round(value / 86400)}d ago`;
}

function getConnectionMeta(state) {
  const normalized = String(state || "offline").toLowerCase();

  if (normalized === "online") {
    return {
      label: "Online",
      dotClass: "status status-success",
      icon: FiWifi,
      textClass: "text-base-content",
      helper: "Device reachable",
    };
  }

  if (normalized === "stale") {
    return {
      label: "Stale",
      dotClass: "status status-warning",
      icon: FiWifiOff,
      textClass: "text-base-content/75",
      helper: "UUID mismatch or old address",
    };
  }

  return {
    label: "Offline",
    dotClass: "status status-neutral",
    icon: FiWifiOff,
    textClass: "text-base-content/60",
    helper: "Device not reachable",
  };
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  action = null,
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-base-300 px-5 py-5 sm:px-6 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <Icon className="shrink-0 text-[20px] text-primary" />
          <h2 className="text-lg font-semibold text-base-content">{title}</h2>
        </div>

        {description ? (
          <p className="mt-0.5 max-w-3xl text-sm leading-7 text-base-content/65">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="w-full xl:w-auto">{action}</div> : null}
    </div>
  );
}

function StatusPill({ state }) {
  const meta = getConnectionMeta(state);
  const Icon = meta.icon;

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-base-300 bg-base-200/40 px-3 py-1.5 text-xs font-medium">
      <span className={meta.dotClass} />
      <Icon className="text-[13px] text-base-content/55" />
      <span className={meta.textClass}>{meta.label}</span>
    </div>
  );
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast toast-bottom toast-center z-[200]">
      {toasts.map((toast) => {
        const isError = toast.type === "error";
        const isWarning = toast.type === "warning";
        const isSuccess = toast.type === "success";

        const Icon = isError
          ? FiAlertTriangle
          : isWarning
            ? FiAlertTriangle
            : isSuccess
              ? FiCheckCircle
              : FiInfo;

        const alertClass = isError
          ? "alert-error"
          : isWarning
            ? "alert-warning"
            : isSuccess
              ? "alert-success"
              : "alert-info";

        return (
          <div
            key={toast.id}
            className={`alert ${alertClass} min-w-[280px] max-w-[420px] rounded-2xl shadow-lg`}
          >
            <Icon className="shrink-0" />
            <span className="text-sm">{toast.message}</span>

            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle ml-auto"
              onClick={() => onDismiss(toast.id)}
              aria-label="Close notification"
            >
              <FiX />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Modal({ title, description, children, footer, onClose }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/35 px-4">
      <div className="w-full max-w-xl rounded-[28px] border border-base-300 bg-base-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-base-300 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-base-content">
              {title}
            </h3>

            {description ? (
              <p className="mt-1 text-sm leading-6 text-base-content/60">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FiX />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        <div className="flex justify-end gap-2 border-t border-base-300 px-6 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, muted = false }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-200/25 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/45">
        <Icon className="text-primary" />
        {label}
      </div>

      <div
        className={[
          "mt-2 min-h-[24px] break-all text-sm font-semibold",
          muted ? "font-mono text-base-content/55" : "text-base-content",
        ].join(" ")}
      >
        {value || "—"}
      </div>
    </div>
  );
}

export default function Settings() {
  const {
    selectedDeviceId = "none",
    devicesRaw = [],
    refreshDevices,
    onScan,
    onDeviceChange,
  } = useOutletContext() || {};

  const [devices, setDevices] = useState(devicesRaw || []);
  const [activeDeviceId, setActiveDeviceId] = useState(
    selectedDeviceId || "none",
  );

  const [dbMissionCounts, setDbMissionCounts] = useState({});
  const [activeDeviceMissionCount, setActiveDeviceMissionCount] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");

  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDbMissions, setDeleteDbMissions] = useState(false);
  const [deleteDeviceMissions, setDeleteDeviceMissions] = useState(false);

  const [deleteActiveMissionsOpen, setDeleteActiveMissionsOpen] =
    useState(false);
  const [deleteActiveDbCopies, setDeleteActiveDbCopies] = useState(false);

  const [toasts, setToasts] = useState([]);
  const timersRef = useRef([]);

  const activeDevice = useMemo(() => {
    if (!activeDeviceId || activeDeviceId === "none") return null;
    return devices.find((device) => device.device_uuid === activeDeviceId) || null;
  }, [devices, activeDeviceId]);

  const activeDeviceConnected = activeDevice?.connection_state === "online";
  const deleteTargetOnline = deleteTarget?.connection_state === "online";

  const totalDbMissions = useMemo(() => {
    return Object.values(dbMissionCounts).reduce((sum, value) => {
      const numeric = Number(value);
      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }, 0);
  }, [dbMissionCounts]);

  const onlineCount = useMemo(() => {
    return devices.filter((device) => device.connection_state === "online")
      .length;
  }, [devices]);

  const showToast = useCallback((message, type = "info") => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    setToasts((current) => [...current, { id, message, type }]);

    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);

    timersRef.current.push(timer);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const [devicesData, dbMissions] = await Promise.all([
        listDevices(),
        fetchDbMissions(),
      ]);

      const nextDevices = devicesData?.devices || [];
      const nextActiveId = devicesData?.active_device_uuid || "none";

      setDevices(nextDevices);
      setActiveDeviceId(nextActiveId);

      const counts = {};

      for (const mission of dbMissions || []) {
        const deviceUuid = mission?.device_uuid;
        if (!deviceUuid) continue;
        counts[deviceUuid] = (counts[deviceUuid] || 0) + 1;
      }

      setDbMissionCounts(counts);

      const nextActiveDevice =
        nextActiveId !== "none"
          ? nextDevices.find((device) => device.device_uuid === nextActiveId)
          : null;

      if (nextActiveDevice?.connection_state === "online") {
        try {
          const deviceMissions = await fetchDeviceMissions();
          setActiveDeviceMissionCount(
            Array.isArray(deviceMissions?.missions)
              ? deviceMissions.missions.length
              : 0,
          );
        } catch {
          setActiveDeviceMissionCount(null);
        }
      } else {
        setActiveDeviceMissionCount(null);
      }
    } catch (error) {
      showToast(
        error?.response?.data?.error ||
          error?.message ||
          "Failed to load device settings.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setDevices(devicesRaw || []);
  }, [devicesRaw]);

  useEffect(() => {
    setActiveDeviceId(selectedDeviceId || "none");
  }, [selectedDeviceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function refreshAll() {
    await reload();
    await refreshDevices?.();
  }

  async function handleScan() {
    setBusyAction("scan");

    try {
      if (onScan) {
        await onScan();
      } else {
        const cidr = import.meta.env.VITE_SCAN_CIDR;
        await scanDevices(cidr);
      }

      await refreshAll();
      showToast("Device scan completed.", "success");
    } catch (error) {
      showToast(
        error?.response?.data?.error || error?.message || "Scan failed.",
        "error",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleSelectDevice(deviceUuid) {
    setBusyAction(`select:${deviceUuid}`);

    try {
      if (onDeviceChange) {
        await onDeviceChange(deviceUuid);
      } else {
        await selectDevice(deviceUuid);
      }

      await refreshAll();
      showToast("Active device changed.", "success");
    } catch (error) {
      showToast(
        error?.response?.data?.error ||
          error?.message ||
          "Failed to select device.",
        "error",
      );
    } finally {
      setBusyAction("");
    }
  }

  function openRenameModal(device) {
    setRenameTarget(device);
    setRenameValue(getDeviceName(device));
  }

  async function handleConfirmRename() {
    const nextName = renameValue.trim();

    if (!renameTarget || !nextName) return;

    setBusyAction("rename");

    try {
      await setDeviceNickname(renameTarget.device_uuid, nextName);

      setRenameTarget(null);
      setRenameValue("");

      await refreshAll();
      showToast("Device renamed.", "success");
    } catch (error) {
      showToast(
        error?.response?.data?.error || error?.message || "Rename failed.",
        "error",
      );
    } finally {
      setBusyAction("");
    }
  }

  function openDeleteModal(device) {
    setDeleteTarget(device);
    setDeleteDbMissions(false);
    setDeleteDeviceMissions(false);
  }

  async function handleConfirmDeleteDevice() {
    if (!deleteTarget) return;

    setBusyAction("delete-device");

    try {
      await deleteDevice(deleteTarget.device_uuid, {
        delete_db_missions: deleteDbMissions,
        delete_device_missions: deleteTargetOnline && deleteDeviceMissions,
      });

      setDeleteTarget(null);
      setDeleteDbMissions(false);
      setDeleteDeviceMissions(false);

      await refreshAll();
      showToast("Device removed.", "success");
    } catch (error) {
      showToast(
        error?.response?.data?.error ||
          error?.response?.data?.device_response?.error ||
          error?.message ||
          "Delete failed.",
        "error",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleDeleteActiveDeviceMissions() {
    if (!activeDevice || !activeDeviceConnected) {
      showToast("The active device must be online.", "warning");
      return;
    }

    setBusyAction("delete-active-missions");

    try {
      await deleteAllDeviceMissions();

      if (deleteActiveDbCopies) {
        await deleteDeviceDbMissions(activeDevice.device_uuid);
      }

      setDeleteActiveMissionsOpen(false);
      setDeleteActiveDbCopies(false);

      await refreshAll();
      showToast("Active device missions deleted.", "success");
    } catch (error) {
      showToast(
        error?.response?.data?.error ||
          error?.message ||
          "Failed to delete active device missions.",
        "error",
      );
    } finally {
      setBusyAction("");
    }
  }

  const activeConnectionMeta = getConnectionMeta(activeDevice?.connection_state);
  const ActiveIcon = activeConnectionMeta.icon;

  return (
    <div className="space-y-6">
      <ThemeSettingsPanel />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <section className="rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
        <SectionHeader
          icon={FiSettings}
          title="Device management"
          description="Manage acquisition devices, local database associations and physical mission storage."
          action={
            <button
              type="button"
              className="btn btn-primary rounded-xl text-white border-none"
              onClick={handleScan}
              disabled={Boolean(busyAction)}
            >
              {busyAction === "scan" ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <FiRefreshCw />
              )}
              Scan devices
            </button>
          }
        />

        <div className="grid grid-cols-1 gap-3 px-5 py-5 sm:px-6 md:grid-cols-3">
          <div className="rounded-2xl border border-base-300 bg-base-200/25 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/45">
              <FiServer className="text-primary" />
              Known devices
            </div>
            <div className="mt-2 text-2xl font-semibold text-base-content">
              {devices.length}
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-200/25 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/45">
              <FiWifi className="text-primary" />
              Reachable now
            </div>
            <div className="mt-2 text-2xl font-semibold text-base-content">
              {onlineCount}
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-200/25 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/45">
              <FiDatabase className="text-primary" />
              Imported missions
            </div>
            <div className="mt-2 text-2xl font-semibold text-base-content">
              {totalDbMissions}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
        <SectionHeader
          icon={FiCpu}
          title="Selected device"
          description="This device is used by Dashboard, Mission Control, Missions and live operations."
        />

        <div className="px-5 py-5 sm:px-6">
          {activeDevice ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-base-300 bg-base-200/20 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <ActiveIcon className="text-xl" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-base-content">
                          {getDeviceName(activeDevice)}
                        </h3>
                        <p className="mt-1 text-sm text-base-content/55">
                          {activeDevice.active_profile_label || "Drone"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <StatusPill state={activeDevice.connection_state} />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoCard
                    icon={FiServer}
                    label="Base URL"
                    value={activeDevice.base_url || activeDevice.last_base_url}
                    muted
                  />

                  <InfoCard
                    icon={FiShield}
                    label="Device UUID"
                    value={activeDevice.device_uuid}
                    muted
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-base-300 bg-base-200/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-base-content/70">
                      <FiDatabase className="text-primary" />
                      DB missions
                    </div>

                    <span className="text-xl font-semibold text-base-content">
                      {dbMissionCounts[activeDevice.device_uuid] || 0}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-base-300 bg-base-200/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-base-content/70">
                      <FiHardDrive className="text-primary" />
                      Device missions
                    </div>

                    <span className="text-xl font-semibold text-base-content">
                      {activeDeviceMissionCount === null
                        ? "—"
                        : activeDeviceMissionCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/20 p-6 text-sm text-base-content/55">
              No active device selected.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
        <SectionHeader
          icon={FiServer}
          title="Registered devices"
          description="Devices discovered or manually added to the ground station."
        />

        <div className="px-5 py-5 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/20 p-8 text-center">
              <FiServer className="mx-auto text-2xl text-primary" />
              <p className="mt-3 text-sm font-medium text-base-content">
                No devices found.
              </p>
              <p className="mt-1 text-sm text-base-content/55">
                Run a scan to discover available EnvMon devices.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const isActive = device.device_uuid === activeDeviceId;
                const status = device.connection_state || "offline";
                const meta = getConnectionMeta(status);
                const Icon = meta.icon;
                const missionCount = dbMissionCounts[device.device_uuid] || 0;

                return (
                  <div
                    key={device.device_uuid}
                    className={[
                      "rounded-2xl border bg-base-100 p-4 transition-all",
                      isActive
                        ? "border-primary/30 shadow-sm"
                        : "border-base-300 hover:border-primary/20",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                            <Icon className="text-xl" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-semibold text-base-content">
                                {getDeviceName(device)}
                              </h3>

                              {isActive ? (
                                <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  Active
                                </span>
                              ) : null}

                              <StatusPill state={status} />
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/50">
                              <span>
                                Profile:{" "}
                                <span className="font-medium text-base-content/70">
                                  {device.active_profile_label || "Drone"}
                                </span>
                              </span>

                              <span>
                                DB missions:{" "}
                                <span className="font-medium text-base-content/70">
                                  {missionCount}
                                </span>
                              </span>

                              <span>
                                Last seen:{" "}
                                <span className="font-medium text-base-content/70">
                                  {formatAge(device.last_seen_age_s)}
                                </span>
                              </span>
                            </div>

                            <div className="mt-2 max-w-full truncate font-mono text-[11px] text-base-content/45">
                              {device.base_url || device.last_base_url || "No base URL"} ·{" "}
                              {device.device_uuid}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        {!isActive ? (
                          <button
                            type="button"
                            className="btn btn-sm rounded-xl"
                            onClick={() => handleSelectDevice(device.device_uuid)}
                            disabled={Boolean(busyAction)}
                          >
                            Select
                          </button>
                        ) : null}

                        <button
                          type="button"
                          className="btn btn-sm btn-ghost rounded-xl"
                          onClick={() => openRenameModal(device)}
                          disabled={Boolean(busyAction)}
                        >
                          <FiEdit3 />
                          Rename
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-error btn-outline rounded-xl"
                          onClick={() => openDeleteModal(device)}
                          disabled={Boolean(busyAction)}
                        >
                          <FiTrash2 />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-error/25 bg-base-100 shadow-sm">
        <SectionHeader
          icon={FiAlertTriangle}
          title="Danger zone"
          description="Destructive actions for the currently selected device."
          action={
            <button
              type="button"
              className="btn btn-error btn-outline rounded-xl"
              disabled={!activeDevice || !activeDeviceConnected || Boolean(busyAction)}
              onClick={() => setDeleteActiveMissionsOpen(true)}
            >
              <FiTrash2 />
              Delete active device missions
            </button>
          }
        />

        <div className="px-5 py-4 sm:px-6">
          <div className="rounded-2xl border border-base-300 bg-base-200/25 px-4 py-3 text-sm text-base-content/60">
            {activeDeviceConnected
              ? "The active device is online. Physical mission deletion is available."
              : "The active device must be online before physical mission storage can be deleted."}
          </div>
        </div>
      </section>

      {renameTarget ? (
        <Modal
          title="Rename device"
          description="Update the display name used by the ground station."
          onClose={() => setRenameTarget(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost rounded-xl"
                onClick={() => setRenameTarget(null)}
                disabled={busyAction === "rename"}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary rounded-xl text-white border-none"
                onClick={handleConfirmRename}
                disabled={busyAction === "rename" || !renameValue.trim()}
              >
                {busyAction === "rename" ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <FiCheckCircle />
                )}
                Save
              </button>
            </>
          }
        >
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium">Device name</span>
            </div>

            <input
              className="input input-bordered w-full rounded-2xl"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              autoFocus
            />
          </label>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal
          title="Delete device"
          description="Remove the device from the ground station. Extra deletion options are optional."
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost rounded-xl"
                onClick={() => setDeleteTarget(null)}
                disabled={busyAction === "delete-device"}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-error rounded-xl"
                onClick={handleConfirmDeleteDevice}
                disabled={busyAction === "delete-device"}
              >
                {busyAction === "delete-device" ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <FiTrash2 />
                )}
                Delete
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-base-300 bg-base-200/30 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <FiCpu />
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-base-content">
                    {getDeviceName(deleteTarget)}
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-base-content/45">
                    {deleteTarget.device_uuid}
                  </div>

                  <div className="mt-3">
                    <StatusPill state={deleteTarget.connection_state} />
                  </div>
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-base-300 p-4">
              <input
                type="checkbox"
                className="checkbox checkbox-error mt-1"
                checked={deleteDbMissions}
                onChange={(event) => setDeleteDbMissions(event.target.checked)}
              />

              <span>
                <span className="block font-medium text-base-content">
                  Delete imported database missions
                </span>

                <span className="mt-1 block text-sm leading-6 text-base-content/55">
                  Removes database missions, telemetry and imported files
                  associated with this device.
                </span>
              </span>
            </label>

            {deleteTargetOnline ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-base-300 p-4">
                <input
                  type="checkbox"
                  className="checkbox checkbox-error mt-1"
                  checked={deleteDeviceMissions}
                  onChange={(event) =>
                    setDeleteDeviceMissions(event.target.checked)
                  }
                />

                <span>
                  <span className="block font-medium text-base-content">
                    Delete missions stored on physical device
                  </span>

                  <span className="mt-1 block text-sm leading-6 text-base-content/55">
                    The Raspberry Pi is online. The backend will verify the UUID
                    before deleting physical mission folders.
                  </span>
                </span>
              </label>
            ) : (
              <div className="rounded-2xl border border-base-300 bg-base-200/30 p-4">
                <div className="flex items-start gap-3">
                  <FiInfo className="mt-0.5 shrink-0 text-primary" />

                  <div>
                    <div className="font-medium text-base-content">
                      Physical mission deletion unavailable
                    </div>

                    <p className="mt-1 text-sm leading-6 text-base-content/55">
                      This device is not currently online, so only local ground
                      station data can be removed.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      ) : null}

      {deleteActiveMissionsOpen ? (
        <Modal
          title="Delete active device missions"
          description="This action deletes all mission folders stored on the selected physical device."
          onClose={() => setDeleteActiveMissionsOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost rounded-xl"
                onClick={() => setDeleteActiveMissionsOpen(false)}
                disabled={busyAction === "delete-active-missions"}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-error rounded-xl"
                onClick={handleDeleteActiveDeviceMissions}
                disabled={busyAction === "delete-active-missions"}
              >
                {busyAction === "delete-active-missions" ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <FiTrash2 />
                )}
                Delete missions
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-error/25 bg-error/5 p-4">
              <div className="flex items-start gap-3">
                <FiAlertTriangle className="mt-0.5 shrink-0 text-error" />

                <div>
                  <div className="font-medium text-base-content">
                    Destructive action
                  </div>

                  <p className="mt-1 text-sm leading-6 text-base-content/60">
                    This removes all mission folders stored locally on the active
                    Raspberry Pi device.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-200/30 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-base-content/45">
                Active device
              </div>

              <div className="mt-2 font-semibold text-base-content">
                {activeDevice ? getDeviceName(activeDevice) : "No active device"}
              </div>

              {activeDevice ? (
                <div className="mt-1 break-all font-mono text-xs text-base-content/45">
                  {activeDevice.device_uuid}
                </div>
              ) : null}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-base-300 p-4">
              <input
                type="checkbox"
                className="checkbox checkbox-error mt-1"
                checked={deleteActiveDbCopies}
                onChange={(event) =>
                  setDeleteActiveDbCopies(event.target.checked)
                }
              />

              <span>
                <span className="block font-medium text-base-content">
                  Also delete imported database copies
                </span>

                <span className="mt-1 block text-sm leading-6 text-base-content/55">
                  Keeps the device registered, but removes imported missions
                  associated with it from the ground station database.
                </span>
              </span>
            </label>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
