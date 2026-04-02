import React from "react";
import { FiDatabase, FiWifi, FiWifiOff } from "react-icons/fi";

export default function MissionsTabs({
  activeTab = "db",
  onChange = () => {},
  deviceDisabled = false,
  deviceConnected = false,
  deviceLabel = "Device",
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-base-200 p-1 w-fit border border-base-300">
      <button
        type="button"
        onClick={() => onChange("db")}
        className={[
          "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
          activeTab === "db"
            ? "bg-base-100 shadow-sm text-base-content"
            : "text-base-content/55 hover:text-base-content",
        ].join(" ")}
      >
        <FiDatabase className="text-[13px]" />
        Database
      </button>

      <button
        type="button"
        onClick={() => !deviceDisabled && onChange("device")}
        disabled={deviceDisabled}
        className={[
          "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
          activeTab === "device"
            ? "bg-base-100 shadow-sm text-base-content"
            : "text-base-content/55 hover:text-base-content",
          deviceDisabled ? "opacity-40 cursor-not-allowed" : "",
        ].join(" ")}
      >
        {!deviceDisabled && (
          deviceConnected
            ? <FiWifi className="text-[13px] text-success" />
            : <FiWifiOff className="text-[13px] text-base-content/40" />
        )}
        {deviceLabel}
      </button>
    </div>
  );
}
