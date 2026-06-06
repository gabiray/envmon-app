import React, { useMemo } from "react";
import {
  FiMenu,
  FiRefreshCw,
  FiChevronDown,
  FiCpu,
  FiMapPin,
} from "react-icons/fi";
import { FaCarSide } from "react-icons/fa";
import { MdDirectionsBike } from "react-icons/md";
import { TbDrone } from "react-icons/tb";
import { useNavigate } from "react-router-dom";

function getProfileMeta(type) {
  if (type === "drone") {
    return {
      label: "Drone",
      Icon: TbDrone,
    };
  }

  if (type === "bicycle") {
    return {
      label: "Bicycle",
      Icon: MdDirectionsBike,
    };
  }

  if (type === "car") {
    return {
      label: "Car",
      Icon: FaCarSide,
    };
  }

  if (type === "static") {
    return {
      label: "Static Station",
      Icon: FiMapPin,
    };
  }

  return {
    label: "Drone",
    Icon: TbDrone,
  };
}

function getDashboardRoute(profileType) {
  switch (profileType) {
    case "car":
      return "/dashboard-car";
    case "static":
      return "/dashboard-static";
    default:
      return "/dashboard";
  }
}

function isPlaceholderDevice(device) {
  return (
    !device ||
    device.id === "none" ||
    device.id === "" ||
    device.isPlaceholder === true
  );
}

function isDeviceOnline(device) {
  if (isPlaceholderDevice(device)) return false;

  return (
    device.connectionState === "online" ||
    device.connection_state === "online"
  );
}

function DeviceStatusDot({ device, showLabel = false }) {
  if (isPlaceholderDevice(device)) return null;

  const online = isDeviceOnline(device);
  const label = online ? "Online" : "Offline";

  return (
    <span
      className="tooltip tooltip-left shrink-0"
      data-tip={label}
      aria-label={label}
      title={label}
    >
      <span className="relative flex h-3 w-3 items-center justify-center">
        {online ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />
        ) : null}

        <span
          className={[
            "relative inline-flex h-2.5 w-2.5 rounded-full border border-base-100",
            online ? "bg-success" : "bg-base-300",
          ].join(" ")}
        />
      </span>

      {showLabel ? (
        <span className="ml-2 text-xs text-base-content/60">{label}</span>
      ) : null}
    </span>
  );
}

export default function Topbar({
  pageTitle,
  devices = [],
  selectedDeviceId = "",
  onDeviceChange = () => {},
  onScan = () => {},
  isScanning = false,

  profiles = [],
  selectedProfileType = "",
  onProfileChange = () => {},
  profileDisabled = false,

  newDevicesCount = 0,
}) {
  const hasDevices = devices.length > 0;
  const navigate = useNavigate();

  const selectedDevice = useMemo(() => {
    if (!hasDevices) return null;
    return devices.find((d) => d.id === selectedDeviceId) || devices[0];
  }, [devices, hasDevices, selectedDeviceId]);

  const selectedDeviceLabel = selectedDevice?.label || "No Device";

  const selectedProfile = useMemo(() => {
    if (!profiles.length) return getProfileMeta(selectedProfileType);

    const found = profiles.find((p) => p.type === selectedProfileType);
    return getProfileMeta(found?.type || selectedProfileType);
  }, [profiles, selectedProfileType]);

  const SelectedProfileIcon = selectedProfile.Icon;

  async function handleProfileSelect(profileType) {
    try {
      const ok = await onProfileChange(profileType);
      if (ok === false) return;

      navigate(getDashboardRoute(profileType));
    } catch (error) {
      console.error("Failed to change profile", error);
    }
  }

  async function handleDeviceSelect(deviceId) {
    try {
      const result = await onDeviceChange(deviceId);
      if (!result || result.ok === false) return;

      navigate(getDashboardRoute(result.profileType));
    } catch (error) {
      console.error("Failed to change device", error);
    }
  }

  return (
    <header className="sticky top-0 z-30">
      <div className="navbar bg-base-100/80 backdrop-blur border-b border-base-300 px-4">
        <div className="navbar-start gap-3">
          <label
            htmlFor="envmon-drawer"
            className="btn btn-ghost btn-sm lg:hidden"
            aria-label="Open menu"
          >
            <FiMenu className="text-lg" />
          </label>

          <div>
            <div className="text-base font-semibold leading-tight">
              {pageTitle}
            </div>
            <div className="text-xs opacity-60">EnvMon / {pageTitle}</div>
          </div>
        </div>

        <div className="navbar-end">
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70 hidden sm:inline">Device</span>

            <div className="dropdown dropdown-end">
              <button
                type="button"
                tabIndex={0}
                className="btn btn-sm btn-outline rounded-xl w-44 sm:w-56 justify-between"
                disabled={!hasDevices || isScanning}
                aria-label="Select device"
                title="Select device"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <FiCpu className="opacity-70 shrink-0" />

                  <span className="truncate">{selectedDeviceLabel}</span>

                  <DeviceStatusDot device={selectedDevice} />
                </span>

                <FiChevronDown className="opacity-70 shrink-0" />
              </button>

              <ul
                tabIndex={0}
                className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-72 border border-base-200"
              >
                {!hasDevices ? (
                  <li>
                    <span className="opacity-70">No devices</span>
                  </li>
                ) : (
                  devices.map((d) => {
                    const selected = d.id === selectedDevice?.id;
                    const placeholder = isPlaceholderDevice(d);
                    const online = isDeviceOnline(d);

                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          className={[
                            "flex w-full items-center justify-between gap-3 rounded-xl",
                            selected ? "active" : "",
                          ].join(" ")}
                          onClick={() => handleDeviceSelect(d.id)}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <FiCpu className="opacity-70 shrink-0" />

                            <span className="min-w-0 text-left">
                              <span className="block truncate">{d.label}</span>

                              {d.subtitle ? (
                                <span className="block text-[11px] opacity-60 truncate">
                                  {d.subtitle}
                                </span>
                              ) : null}
                            </span>
                          </span>

                          {!placeholder ? (
                            <span className="flex shrink-0 items-center gap-2">
                              <span
                                className={[
                                  "hidden text-[11px] sm:inline",
                                  online
                                    ? "text-success"
                                    : "text-base-content/35",
                                ].join(" ")}
                              >
                                {online ? "Online" : "Offline"}
                              </span>

                              <DeviceStatusDot device={d} />
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            <div className="dropdown dropdown-end">
              <button
                type="button"
                tabIndex={0}
                className="btn btn-sm btn-outline rounded-xl w-12 min-w-12 px-0"
                disabled={profileDisabled}
                aria-label="Select profile"
                title={selectedProfile.label}
              >
                <SelectedProfileIcon className="text-base opacity-85" />
              </button>

              <ul
                tabIndex={0}
                className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-56 border border-base-200"
              >
                {profiles.length === 0 ? (
                  <li>
                    <span className="opacity-70">No profiles</span>
                  </li>
                ) : (
                  profiles.map((p) => {
                    const meta = getProfileMeta(p.type);
                    const Icon = meta.Icon;

                    return (
                      <li key={p.type}>
                        <button
                          type="button"
                          className={
                            p.type === selectedProfileType ? "active" : ""
                          }
                          onClick={() => handleProfileSelect(p.type)}
                        >
                          <Icon className="opacity-80 shrink-0" />
                          <span>{p.label || meta.label}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-primary rounded-xl relative"
              onClick={onScan}
              disabled={isScanning}
              aria-label="Scan for devices"
              title="Scan for devices"
            >
              <FiRefreshCw className={isScanning ? "animate-spin" : ""} />

              <span className="hidden sm:inline">
                {isScanning ? "Scanning" : "Scan"}
              </span>

              {newDevicesCount > 0 && !isScanning ? (
                <span className="badge badge-xs badge-secondary absolute -top-2 -right-2">
                  {newDevicesCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
