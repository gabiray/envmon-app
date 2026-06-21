import React, { useMemo } from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiCamera,
  FiClock,
  FiMap,
  FiNavigation,
  FiRadio,
  FiServer,
  FiSlash,
  FiWifi,
} from "react-icons/fi";
import { MdDirectionsBike } from "react-icons/md";

import bicycleBanner from "../../assets/smiling-young-man-riding-bicycle-mountain-road.jpg";

function showNone(value) {
  if (value === null || value === undefined) return "None";

  const text = String(value).trim();

  if (
    !text ||
    text === "-" ||
    text === "—" ||
    text.toLowerCase() === "null" ||
    text.toLowerCase() === "undefined"
  ) {
    return "None";
  }

  return text;
}

function getStatusMeta(status) {
  if (status === "connected") {
    return {
      label: "Connected",
      hint: "Ready for bicycle missions",
      Icon: FiRadio,
      statusClass: "status status-success",
      badge:
        "badge badge-outline border-success/30 text-success bg-success/10 backdrop-blur-sm",
      pulsing: true,
    };
  }

  if (status === "out_of_range") {
    return {
      label: "Out of range",
      hint: "Connection lost",
      Icon: FiAlertTriangle,
      statusClass: "status status-warning",
      badge:
        "badge badge-outline border-warning/30 text-warning bg-warning/10 backdrop-blur-sm",
      pulsing: false,
    };
  }

  return {
    label: "Inactive",
    hint: "Select or connect a device",
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

function FeatureBadge({ icon: Icon, label }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 text-xs font-medium text-white/90 backdrop-blur-sm">
      <Icon className="text-sm text-white/80" />
      {label}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-white/78">
      <Icon className="shrink-0 text-white/55" />
      <span className="shrink-0 text-white/55">{label}:</span>
      <span
        className={[
          "min-w-0 truncate font-semibold text-white/90",
          mono ? "font-mono text-xs" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

export default function BicycleHeroBanner({
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
    <section className="relative overflow-hidden rounded-box border border-base-300 bg-neutral text-neutral-content shadow-sm">
      <div
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: `url(${bicycleBanner})`,
          backgroundPosition: "center 45%",
        }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, rgba(15,20,32,0.96) 0%, rgba(15,20,32,0.91) 38%, rgba(15,20,32,0.58) 70%, rgba(15,20,32,0.18) 100%)",
        }}
      />

      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(900px 360px at 18% 45%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.00) 64%)",
          mixBlendMode: "overlay",
          opacity: 0.6,
        }}
      />

      <div className="relative p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">

            <div className="text-xs sm:text-sm opacity-75">Bicycle profile</div>

            <h1 className="mt-1 truncate text-2xl font-semibold leading-tight text-white sm:text-3xl">
              {nickname}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Route-based environmental monitoring for bicycle missions,
              focused on GPS tracking and low-speed telemetry collection.
            </p>

            <div className="mt-4 grid gap-1.5">
              <InfoRow icon={FiServer} label="Host" value={hostname} />
              <InfoRow icon={FiWifi} label="IP" value={ip} />
              <InfoRow icon={FiClock} label="Last seen" value={lastSeenText} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <FeatureBadge icon={FiNavigation} label="GPS route" />
              <FeatureBadge icon={FiActivity} label="Telemetry" />
              <FeatureBadge icon={FiMap} label="2D route view" />
              <FeatureBadge icon={FiCamera} label="Camera optional" />
            </div>

            <div className="mt-4 text-xs text-white/70">
              UUID: <span className="break-all font-mono">{uuid}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
            <span className={`${meta.badge} h-7 rounded-full px-2.5`}>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
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

            <div className="text-xs font-medium text-white/65">
              {meta.hint}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
