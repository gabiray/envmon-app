import React, { useMemo } from "react";
import {
  FiActivity,
  FiClock,
  FiRadio,
  FiServer,
  FiSlash,
  FiWifi,
  FiAlertTriangle,
  FiMapPin,
} from "react-icons/fi";
import { FaCarSide } from "react-icons/fa";
import carBanner from "../../assets/moving-black-car-road.jpg";

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
      hint: "Ready for road missions",
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
      hint: "Vehicle connection lost",
      Icon: FiAlertTriangle,
      statusClass: "status status-warning",
      badge:
        "badge badge-outline border-warning/30 text-warning bg-base-100/10 backdrop-blur-sm",
      pulsing: false,
    };
  }

  return {
    label: "Inactive",
    hint: "Select a vehicle to begin monitoring",
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
      {pulsing ? (
        <div className={`${statusClass} animate-ping`} aria-hidden="true" />
      ) : null}
      <div className={statusClass} aria-hidden="true" />
    </div>
  );
}

export default function DeviceCarHeroBanner({
  status = "inactive",
  device = null,
}) {
  const safeDevice = device ?? {
    nickname: null,
    hostname: null,
    uuid: null,
    ip: null,
    lastSeenText: null,
  };

  const meta = useMemo(() => getStatusMeta(status), [status]);
  const StatusIcon = meta.Icon;

  const nickname = showNone(safeDevice.nickname);
  const hostname = showNone(safeDevice.hostname);
  const ip = showNone(safeDevice.ip);
  const lastSeenText = showNone(safeDevice.lastSeenText);
  const uuid = showNone(safeDevice.uuid);

  return (
    <section className="relative overflow-hidden rounded-box border border-base-300 bg-neutral text-neutral-content">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: `url(${carBanner})`,
          backgroundPosition: "center center",
        }}
        aria-hidden="true"
      />

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,12,18,0.97) 0%, rgba(10,12,18,0.90) 40%, rgba(10,12,18,0.52) 72%, rgba(10,12,18,0.18) 100%)",
        }}
      />

      {/* Accent glow */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(900px 380px at 20% 45%, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.00) 62%)",
          mixBlendMode: "screen",
          opacity: 0.9,
        }}
      />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          {/* LEFT */}
          <div className="min-w-0 max-w-3xl">
            <div className="flex items-center gap-2 text-xs sm:text-sm opacity-80">
              <span>Active device</span>
            </div>

            <div className="mt-1 truncate text-2xl font-semibold leading-tight sm:text-3xl">
              {nickname}
            </div>

            <div className="mt-1 text-sm text-neutral-content/75">
              Route-based environmental monitoring and live vehicle telemetry
            </div>

            <div className="mt-4 grid gap-2 text-sm opacity-90">
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

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-neutral-content/90 backdrop-blur-sm">
                <FiMapPin className="text-info" />
                Road profile
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-neutral-content/90 backdrop-blur-sm">
                <FiActivity className="text-primary" />
                Live route monitoring
              </span>
            </div>

            <div className="mt-4 text-xs opacity-80">
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

            <div className="max-w-[190px] text-right text-xs opacity-70">
              {meta.hint}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
