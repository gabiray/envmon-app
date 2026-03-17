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
            <div className="text-base font-semibold leading-tight">{pageTitle}</div>
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
                </span>
                <FiChevronDown className="opacity-70 shrink-0" />
              </button>

              <ul
                tabIndex={0}
                className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-64 border border-base-200"
              >
                {!hasDevices ? (
                  <li>
                    <span className="opacity-70">No devices</span>
                  </li>
                ) : (
                  devices.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        className={d.id === selectedDevice?.id ? "active" : ""}
                        onClick={() => onDeviceChange(d.id)}
                      >
                        <FiCpu className="opacity-70 shrink-0" />
                        <div className="min-w-0 text-left">
                          <div className="truncate">{d.label}</div>
                          {d.subtitle ? (
                            <div className="text-[11px] opacity-60 truncate">
                              {d.subtitle}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))
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
                          className={p.type === selectedProfileType ? "active" : ""}
                          onClick={() => onProfileChange(p.type)}
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
