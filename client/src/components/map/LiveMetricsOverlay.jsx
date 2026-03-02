import React from "react";

function Item({ label, value, unit }) {
  return (
    <div className="flex flex-col px-4 py-2">
      <div className="text-[11px] opacity-60">{label}</div>
      <div className="text-sm font-semibold leading-tight">
        {value} {unit}
      </div>
    </div>
  );
}

function StartItem({ selectedStartName }) {
  return (
    <div className="flex flex-col px-4 py-2 min-w-42.5">
      <div className="text-[11px] opacity-60">Start</div>
      <div className="text-sm font-semibold leading-tight truncate">
        {selectedStartName ? selectedStartName : "No start selected"}
      </div>
    </div>
  );
}

export default function LiveMetricsOverlay({
  metrics = {
    temperature: { value: 25.2, unit: "°C" },
    humidity: { value: 49.7, unit: "%" },
    pressure: { value: 979.6, unit: "hPa" },
    gas: { value: 24.3, unit: "kΩ" },
  },
  selectedStartName = null,
}) {
  return (
    <div className="pointer-events-none absolute top-4 left-0 right-0 z-500 flex justify-center px-3">
      <div className="pointer-events-auto max-w-full">
        <div className="bg-base-100/50 backdrop-blur border border-base-300 shadow-sm rounded-2xl overflow-hidden">
          {/* dacă e îngust ecranul, permite scroll pe orizontală */}
          <div className="flex items-stretch overflow-x-auto">
            <Item label="Temp" {...metrics.temperature} />
            <div className="w-px bg-base-300" />
            <Item label="Humidity" {...metrics.humidity} />
            <div className="w-px bg-base-300" />
            <Item label="Pressure" {...metrics.pressure} />
            <div className="w-px bg-base-300" />
            <Item label="Gas" {...metrics.gas} />
            <div className="w-px bg-base-300" />

            <StartItem selectedStartName={selectedStartName} />
          </div>
        </div>
      </div>
    </div>
  );
}
