import React, { useMemo } from "react";
import {
  FiServer,
  FiWifi,
  FiClock,
  FiRadio,
  FiAlertTriangle,
  FiSlash,
} from "react-icons/fi";
import droneLogo from "../../assets/drone-flying-mountain-landscape.jpg";

function showNone(value) {
  if (value === null || value === undefined) return "None";
  const s = String(value).trim();
  if (!s || s === "-" || s === "—" || s.toLowerCase() === "null") return "None";
  return s;
}

function getStatusMeta(status) {
  if (status === "connected") {
    return {
      label: "Connected",
      hint: "Ready for missions",
      tone: "success",
      Icon: FiRadio,
      statusClass: "status status-success",
      badge:
        "badge badge-outline border-success/30 text-success bg-base-100/10 backdrop-blur-sm",
      pulsing: true,
    };
  }

  if (status === "out_of_range") {
    return {
      label: "Out of range",
      hint: "Connection lost",
      tone: "warning",
      Icon: FiAlertTriangle,
      statusClass: "status status-warning",
      badge:
        "badge badge-outline border-warning/30 text-warning bg-base-100/10 backdrop-blur-sm",
      pulsing: false,
    };
  }

  return {
    label: "Inactive",
    hint: "Select a device to enable missions",
    tone: "neutral",
    Icon: FiSlash,
    statusClass: "status status-neutral",
    badge:
      "badge badge-outline border-base-content/20 text-base-content/80 bg-base-100/10 backdrop-blur-sm",
    pulsing: false,
  };
}

function StatusIndicator({ statusClass, pulsing = false }) {
  return (
    <div className="inline-grid shrink-0 *:[grid-area:1/1]">
      {pulsing && (
        <div className={`${statusClass} animate-ping`} aria-hidden="true" />
      )}
      <div className={statusClass} aria-hidden="true" />
    </div>
  );
}

export default function DeviceHeroBanner({
  status = "inactive",
  device = {
    nickname: null,
    hostname: null,
    uuid: null,
    ip: null,
    lastSeenText: null,
  },
}) {
  const meta = useMemo(() => getStatusMeta(status), [status]);

  const nickname = showNone(device.nickname);
  const hostname = showNone(device.hostname);
  const ip = showNone(device.ip);
  const lastSeenText = showNone(device.lastSeenText);
  const uuid = showNone(device.uuid);

  const StatusIcon = meta.Icon;

  return (
    <section className="relative overflow-hidden rounded-box border border-base-300 bg-neutral text-neutral-content">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: `url(${droneLogo})`,
          backgroundPosition: "center 30%",
        }}
        aria-hidden="true"
      />

      {/* Dark overlay + left-to-right gradient */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, rgba(15,20,32,0.96) 0%, rgba(15,20,32,0.88) 42%, rgba(15,20,32,0.45) 70%, rgba(15,20,32,0.12) 100%)",
        }}
      />

      {/* Soft vignette */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(1000px 420px at 18% 50%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.00) 60%)",
          mixBlendMode: "overlay",
          opacity: 0.55,
        }}
      />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          {/* LEFT */}
          <div className="min-w-0 max-w-3xl">
            <div className="text-xs sm:text-sm opacity-75">Active device</div>

            <div className="mt-1 truncate text-2xl font-semibold leading-tight sm:text-3xl">
              {nickname}
            </div>

            <div className="mt-3 grid gap-1.5 text-sm opacity-85">
              <div className="flex items-center gap-2">
                <FiServer className="opacity-80" />
                <span className="opacity-70">Host:</span>
                <span className="truncate font-medium">{hostname}</span>
              </div>

              <div className="flex items-center gap-2">
                <FiWifi className="opacity-80" />
                <span className="opacity-70">IP:</span>
                <span className="truncate font-medium">{ip}</span>
              </div>

              <div className="flex items-center gap-2">
                <FiClock className="opacity-80" />
                <span className="opacity-70">Last seen:</span>
                <span className="truncate font-medium">{lastSeenText}</span>
              </div>
            </div>

            <div className="mt-4 text-xs opacity-85">
              UUID: <span className="break-all font-mono">{uuid}</span>
            </div>
          </div>

          {/* RIGHT */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            <span className={`${meta.badge} h-7 px-2.5 rounded-full`}>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                <StatusIndicator
                  statusClass={meta.statusClass}
                  pulsing={meta.pulsing}
                />
                <span className="inline-flex items-center gap-1.5">
                  <StatusIcon className="size-3.5" />
                  {meta.label}
                </span>
              </span>
            </span>

            <div className="text-right text-xs opacity-70">{meta.hint}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
