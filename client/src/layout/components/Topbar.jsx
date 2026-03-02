import React from "react";
import { FiMenu, FiRefreshCw } from "react-icons/fi";

export default function Topbar({
  pageTitle,
  devices = [],
  selectedDeviceId = "",
  onDeviceChange = () => {},
  onScan = () => {},
  isScanning = false,
}) {
  const hasDevices = devices.length > 0;
  const value = hasDevices ? selectedDeviceId || devices[0]?.id : "none";

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

            <select
              className="select select-sm select-bordered rounded-xl w-44 sm:w-56"
              value={value}
              disabled={!hasDevices || isScanning}
              onChange={(e) => onDeviceChange(e.target.value)}
            >
              {!hasDevices ? (
                <option value="none">No devices</option>
              ) : (
                devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))
              )}
            </select>

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
