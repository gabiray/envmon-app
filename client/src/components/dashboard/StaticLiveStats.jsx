import React from "react";
import {
  FiActivity,
  FiClock,
  FiDroplet,
  FiMapPin,
  FiRadio,
  FiThermometer,
  FiWifiOff,
  FiWind,
} from "react-icons/fi";

function formatNumber(value, decimals = 1, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function formatGas(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const n = Number(value);

  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)} kΩ`;
  }

  return `${n.toFixed(0)} Ω`;
}

function formatTime(value) {
  if (!value) return "—";

  const date =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function MetricTile({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
  mono = false,
}) {
  const toneClasses =
    tone === "success"
      ? "border-success/25 bg-success/8"
      : tone === "warning"
        ? "border-warning/25 bg-warning/8"
        : tone === "info"
          ? "border-info/25 bg-info/8"
          : "border-base-300 bg-base-100";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {Icon ? <Icon className="text-[13px]" /> : null}
        {label}
      </div>

      <div
        className={[
          "mt-2 text-lg font-bold text-base-content",
          mono ? "font-mono text-base" : "",
        ].join(" ")}
      >
        {value}
      </div>

      {helper ? (
        <div className="mt-1 text-xs text-base-content/50">{helper}</div>
      ) : null}
    </div>
  );
}

export default function StaticLiveStats({
  telemetry = null,
  status = null,
  location = null,
  missionRunning = false,
  streamState = "idle",
}) {
  const hasLiveTelemetry =
    telemetry &&
    telemetry.temp_c !== null &&
    telemetry.temp_c !== undefined &&
    telemetry.hum_pct !== null &&
    telemetry.hum_pct !== undefined;

  const lastUpdate =
    telemetry?.ts_epoch || status?.since_epoch || status?.ts_epoch || null;

  const lat = location?.lat ?? telemetry?.lat;
  const lon = location?.lon ?? telemetry?.lon;

  const locationText =
    lat !== null &&
    lat !== undefined &&
    lon !== null &&
    lon !== undefined
      ? `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`
      : "Not set";

  const streamConnected = streamState === "connected";

  return (
    <section className="rounded-box border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FiActivity className="text-lg text-primary" />

              <div>
                <h2 className="text-lg font-semibold">
                  Environmental telemetry
                </h2>
                <p className="text-sm text-base-content/60">
                  Latest sensor values recorded by the static monitoring
                  station.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "badge badge-outline gap-2 rounded-full",
                missionRunning
                  ? "border-success/30 text-success"
                  : "border-base-content/20 text-base-content/60",
              ].join(" ")}
            >
              <span
                className={[
                  "status",
                  missionRunning ? "status-success" : "status-neutral",
                ].join(" ")}
              />
              {missionRunning ? "Recording" : "Idle"}
            </span>

            <span
              className={[
                "badge badge-outline gap-2 rounded-full",
                streamConnected
                  ? "border-info/30 text-info"
                  : "border-base-content/20 text-base-content/60",
              ].join(" ")}
            >
              {streamConnected ? <FiRadio /> : <FiWifiOff />}
              {streamConnected ? "Live stream" : "No stream"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5">
        {!hasLiveTelemetry ? (
          <div className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-base-100 text-base-content/60">
                <FiWifiOff />
              </div>

              <div>
                <div className="text-sm font-semibold">
                  No live environmental sample yet
                </div>

                <div className="mt-1 text-sm leading-6 text-base-content/60">
                  Live temperature, humidity, pressure and gas values appear
                  while a static monitoring session is running. Use Check status
                  for a hardware check, then start a static session.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={FiThermometer}
            label="Temperature"
            value={formatNumber(telemetry?.temp_c, 1, " °C")}
            helper="Ambient air"
            tone={hasLiveTelemetry ? "warning" : "default"}
          />

          <MetricTile
            icon={FiDroplet}
            label="Humidity"
            value={formatNumber(telemetry?.hum_pct, 1, " %")}
            helper="Relative humidity"
            tone={hasLiveTelemetry ? "info" : "default"}
          />

          <MetricTile
            icon={FiActivity}
            label="Pressure"
            value={formatNumber(telemetry?.press_hpa, 1, " hPa")}
            helper="Atmospheric pressure"
          />

          <MetricTile
            icon={FiWind}
            label="Gas"
            value={formatGas(telemetry?.gas_ohms)}
            helper="BME680 resistance"
            tone={hasLiveTelemetry ? "success" : "default"}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <MetricTile
            icon={FiMapPin}
            label="Station position"
            value={locationText}
            helper="Fixed monitoring location"
            mono
          />

          <MetricTile
            icon={FiClock}
            label="Last sample"
            value={formatTime(lastUpdate)}
            helper="Telemetry timestamp"
          />

          <MetricTile
            icon={FiRadio}
            label="Mission"
            value={status?.mission_name || status?.mission_id || "—"}
            helper={missionRunning ? "Active session" : "No active session"}
          />
        </div>
      </div>
    </section>
  );
}
