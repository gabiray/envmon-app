import React, { useMemo } from "react";
import {
  FiServer,
  FiWifi,
  FiClock,
  FiHash,
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
      badge: "badge badge-outline border-success/40 text-success bg-success/5",
      pulsing: true,
    };
  }

  if (status === "out_of_range") {
    return {
      label: "Out of range",
      hint: "Connection lost",
      tone: "warning",
      Icon: FiAlertTriangle,
      badge: "badge badge-outline border-warning/40 text-warning bg-warning/5",
      pulsing: false,
    };
  }

  return {
    label: "Inactive",
    hint: "Select a device to enable missions",
    tone: "neutral",
    Icon: FiSlash,
    badge:
      "badge badge-outline border-neutral-content/20 text-neutral-content/80",
    pulsing: false,
  };
}

function StatusDot({ tone = "neutral", pulsing = false }) {
  const color =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : "bg-neutral-content/60";

  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {pulsing && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-60 animate-ping`}
          aria-hidden="true"
        />
      )}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`}
        aria-hidden="true"
      />
    </span>
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
          <div className="min-w-0 max-w-195">
            <div className="text-xs sm:text-sm opacity-75">Active device</div>

            <div className="mt-1 text-2xl sm:text-3xl font-semibold leading-tight truncate">
              {nickname}
            </div>

            <div className="mt-3 grid gap-1.5 text-sm opacity-85">
              <div className="flex items-center gap-2">
                <FiServer className="opacity-80" />
                <span className="opacity-70">Host:</span>
                <span className="font-medium truncate">{hostname}</span>
              </div>

              <div className="flex items-center gap-2">
                <FiWifi className="opacity-80" />
                <span className="opacity-70">IP:</span>
                <span className="font-medium truncate">{ip}</span>
              </div>

              <div className="flex items-center gap-2">
                <FiClock className="opacity-80" />
                <span className="opacity-70">Last seen:</span>
                <span className="font-medium truncate">{lastSeenText}</span>
              </div>
            </div>

            <div className="mt-4 text-xs opacity-85">
              UUID: <span className="font-mono break-all">{uuid}</span>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={meta.badge}>
              <StatusDot tone={meta.tone} pulsing={meta.pulsing} />
              <span className="ml-2 inline-flex items-center gap-2">
                <StatusIcon />
                {meta.label}
              </span>
            </span>

            <div className="text-xs opacity-70 text-right">{meta.hint}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
