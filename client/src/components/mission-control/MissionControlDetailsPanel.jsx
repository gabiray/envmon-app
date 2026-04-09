import React from "react";

function formatValue(value, decimals = 2, suffix = "") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function formatTime(tsEpoch) {
  if (!tsEpoch) return "—";

  try {
    return new Date(Number(tsEpoch) * 1000).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function MissionControlDetailsPanel({ selectedItem = null }) {
  const live = selectedItem?.live || {};
  const gps = selectedItem?.gps || {};
  const fix = gps?.last_good_fix || {};

  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-base-300 bg-base-100 shadow-xl">
      <div className="border-b border-base-300 px-4 py-4">
        <h2 className="text-base font-semibold text-base-content">Mission Details</h2>
        <p className="mt-1 text-sm text-base-content/60">
          Live telemetry for the selected mission.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!selectedItem ? (
          <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-sm text-base-content/70">
            Select a mission to inspect live details.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="text-lg font-semibold text-base-content">
                {selectedItem.mission_name || selectedItem.mission_id}
              </div>
              <div className="mt-1 text-sm text-base-content/60">
                {selectedItem.nickname || selectedItem.hostname || selectedItem.device_uuid}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge badge-outline">
                  {selectedItem.profile_label || selectedItem.profile_type || "Unknown"}
                </span>
                <span className="badge badge-outline">
                  {selectedItem.state || "Unknown"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Temp" value={formatValue(live.temp_c, 1, " °C")} />
              <MetricCard label="Hum" value={formatValue(live.hum_pct, 1, " %")} />
              <MetricCard label="Pressure" value={formatValue(live.press_hpa, 1, " hPa")} />
              <MetricCard label="Gas" value={formatValue(live.gas_ohms, 0, " Ω")} />
              <MetricCard label="Satellites" value={formatValue(live.satellites, 0)} />
              <MetricCard label="HDOP" value={formatValue(live.hdop, 2)} />
              <MetricCard label="Altitude" value={formatValue(live.alt_m, 1, " m")} />
              <MetricCard label="Updated" value={formatTime(live.ts_epoch)} />
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <h3 className="text-sm font-semibold text-base-content">Coordinates</h3>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Latitude" value={formatValue(live.lat ?? fix.lat, 6)} />
                <Row label="Longitude" value={formatValue(live.lon ?? fix.lon, 6)} />
                <Row label="Fix quality" value={formatValue(live.fix_quality ?? gps.fix_quality, 0)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
      <div className="text-[11px] uppercase tracking-wide text-base-content/45">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-base-content">{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-base-content/60">{label}</span>
      <span className="font-medium text-base-content">{value}</span>
    </div>
  );
}
