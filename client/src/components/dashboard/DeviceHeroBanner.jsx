import React, { useMemo } from "react";
import droneLogo from "../../assets/drone-flying-mountain-landscape.jpg";

function getStatusMeta(status) {
  if (status === "connected") {
    return {
      label: "Connected",
      dot: "status status-success status-sm",
      hint: "Ready for missions",
      badge:
        "badge badge-outline border-neutral-content/30 text-neutral-content",
    };
  }

  if (status === "out_of_range") {
    return {
      label: "Out of range",
      dot: "status status-warning status-sm",
      hint: "Connection lost during mission",
      badge: "badge badge-outline border-warning/40 text-warning",
    };
  }

  return {
    label: "Inactive",
    dot: "status status-neutral status-sm",
    hint: "Select a device to enable missions",
    badge:
      "badge badge-outline border-neutral-content/20 text-neutral-content/80",
  };
}

export default function DeviceHeroBanner({
  status = "connected",
  device = {
    nickname: "Drona 1",
    hostname: "raspberrypi",
    uuid: "2e004ee8-…-56adf",
    ip: "192.168.137.92",
    lastSeenText: "a few seconds ago",
  },
}) {
  const meta = useMemo(() => getStatusMeta(status), [status]);

  return (
    <section className="relative overflow-hidden rounded-box border border-base-300 bg-neutral text-neutral-content">
      {/* Background image (RIGHT) */}
      <div
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: `url(${droneLogo})`,
          backgroundPosition: "center 30%", 
        }}
        aria-hidden="true"
      />

      {/* Dark overlay + left-to-right gradient (MEDIUM) */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, rgba(15,20,32,0.96) 0%, rgba(15,20,32,0.88) 42%, rgba(15,20,32,0.45) 70%, rgba(15,20,32,0.12) 100%)",
        }}
      />

      {/* Optional: soft vignette (subtil) */}
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

      {/* Content */}
      <div className="relative p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          {/* LEFT */}
          <div className="min-w-0 max-w-195">
            <div className="text-xs sm:text-sm opacity-75">Active device</div>

            <div className="mt-1 text-2xl sm:text-3xl font-semibold leading-tight truncate">
              {device.nickname}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm opacity-80">
              <span className="inline-flex items-center gap-2">
                <span className="opacity-70">Host:</span>
                <span className="font-medium">{device.hostname}</span>
              </span>
              <span className="opacity-40">•</span>
              <span className="inline-flex items-center gap-2">
                <span className="opacity-70">IP:</span>
                <span className="font-medium">{device.ip}</span>
              </span>
              <span className="opacity-40">•</span>
              <span className="inline-flex items-center gap-2">
                <span className="opacity-70">Last seen:</span>
                <span className="font-medium">{device.lastSeenText}</span>
              </span>
            </div>

            <div className="mt-3 text-xs opacity-80">
              UUID: <span className="font-mono">{device.uuid}</span>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={meta.badge}>
              <span className={meta.dot} aria-hidden="true" />
              <span className="ml-2">{meta.label}</span>
            </span>
            <div className="text-xs opacity-70 text-right">{meta.hint}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
