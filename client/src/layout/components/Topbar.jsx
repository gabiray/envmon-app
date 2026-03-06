import React, { useMemo } from "react";
import { FiMenu, FiRefreshCw, FiChevronDown, FiCpu } from "react-icons/fi";

export default function Topbar({
  pageTitle,
  devices = [],
  selectedDeviceId = "",
  onDeviceChange = () => {},
  onScan = () => {},
  isScanning = false,
}) {
  const hasDevices = devices.length > 0;

  const selected = useMemo(() => {
    if (!hasDevices) return null;
    return devices.find((d) => d.id === selectedDeviceId) || devices[0];
  }, [devices, hasDevices, selectedDeviceId]);

  const selectedLabel = selected?.label || "No devices";

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

            {/* Custom dropdown to avoid native <select> checkmark */}
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
                  <span className="truncate">{selectedLabel}</span>
                </span>
                <FiChevronDown className="opacity-70 shrink-0" />
              </button>

              <ul
                tabIndex={0}
                className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-56 border border-base-200"
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
                        className={d.id === selected?.id ? "active" : ""}
                        onClick={() => onDeviceChange(d.id)}
                      >
                        <FiCpu className="opacity-70" />
                        <span className="truncate">{d.label}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <button
              className="btn btn-sm btn-primary rounded-xl"
              onClick={onScan}
              disabled={isScanning}
              aria-label="Scan for devices"
              title="Scan for devices"
            >
              <FiRefreshCw className={isScanning ? "animate-spin" : ""} />
              <span className="hidden sm:inline">
                {isScanning ? "Scanning" : "Scan"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
