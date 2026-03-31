import React from "react";

export default function MissionsTabs({
  activeTab = "db",
  onChange = () => {},
  deviceDisabled = false,
  className = "",
}) {
  return (
    <div className={className}>
      <div className="tabs-box inline-flex rounded-xl border border-base-300 bg-base-100 p-1 shadow-sm">
        <input
          type="radio"
          name="missions_tabs"
          className="tab h-9 min-w-28 rounded-lg px-4 text-sm font-medium"
          aria-label="Database"
          checked={activeTab === "db"}
          onChange={() => onChange("db")}
        />

        <input
          type="radio"
          name="missions_tabs"
          className="tab h-9 min-w-24 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
          aria-label="Device"
          checked={activeTab === "device"}
          onChange={() => {
            if (!deviceDisabled) onChange("device");
          }}
          disabled={deviceDisabled}
        />
      </div>
    </div>
  );
}
