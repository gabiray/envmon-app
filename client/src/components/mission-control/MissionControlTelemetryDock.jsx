import React from "react";
import {
  FiActivity,
  FiDroplet,
  FiThermometer,
  FiWind,
} from "react-icons/fi";

function formatValue(value, decimals = 1, suffix = "") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function MetricTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/18 bg-white/10 px-4 py-3 backdrop-blur-md shadow-lg">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/55">
        <Icon className="text-primary" />
        {label}
      </div>
      <div className="mt-1.5 text-base font-semibold text-base-content">
        {value}
      </div>
    </div>
  );
}

export default function MissionControlTelemetryDock({ selectedItem = null }) {
  if (!selectedItem) return null;

  const live = selectedItem?.live || {};

  return (
    <div className="pointer-events-auto flex justify-center">
      <div className="rounded-[1.6rem] border border-white/20 bg-base-100/12 p-3 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricTile
            icon={FiThermometer}
            label="Temperature"
            value={formatValue(live.temp_c, 1, " °C")}
          />

          <MetricTile
            icon={FiDroplet}
            label="Humidity"
            value={formatValue(live.hum_pct, 1, " %")}
          />

          <MetricTile
            icon={FiActivity}
            label="Pressure"
            value={formatValue(live.press_hpa, 1, " hPa")}
          />

          <MetricTile
            icon={FiWind}
            label="Gas"
            value={formatValue(live.gas_ohms, 0, " Ω")}
          />
        </div>
      </div>
    </div>
  );
}
