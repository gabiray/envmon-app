import React, { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiChevronDown,
  FiCpu,
  FiMapPin,
  FiRadio,
  FiWifi,
} from "react-icons/fi";
import { TbDrone } from "react-icons/tb";
import { MdDirectionsBike } from "react-icons/md";
import { FaCarSide } from "react-icons/fa";

function getProfileMeta(type) {
  if (type === "drone") return { label: "Drone", Icon: TbDrone };
  if (type === "bicycle") return { label: "Bicycle", Icon: MdDirectionsBike };
  if (type === "car") return { label: "Car", Icon: FaCarSide };
  if (type === "static") return { label: "Static Station", Icon: FiMapPin };
  return { label: "Unknown profile", Icon: FiCpu };
}

function formatEpoch(epoch) {
  if (!epoch) return "—";
  try {
    return new Date(epoch * 1000).toLocaleString("ro-RO", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatNumber(value, decimals = 2, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function toTitleCase(value) {
  if (!value) return "Unknown";
  const s = String(value).trim().toUpperCase();
  const labels = {
    IDLE: "Idle", ARMING: "Arming", RUNNING: "Running",
    COMPLETED: "Completed", ABORTED: "Aborted", ERROR: "Error",
  };
  return labels[s] || s.charAt(0) + s.slice(1).toLowerCase();
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
      <span className="text-xs uppercase tracking-wide text-neutral-content/60">{label}</span>
      <span className={`text-right text-sm font-medium text-neutral-content ${mono ? "font-mono break-all" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default function DeviceStatusPanel({
  activeDevice = null,
  deviceStatus = "inactive",
  deviceState = null,
  onCheckStatus = () => {},
  checking = false,
  defaultExpanded = false,
  expandSignal = 0,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (expandSignal > 0) setExpanded(true);
  }, [expandSignal]);

  const profile = useMemo(() => getProfileMeta(activeDevice?.active_profile_type), [activeDevice?.active_profile_type]);
  const runtimeState = deviceState?.state || "Unknown";
  
  const missionName = deviceState?.mission_name || deviceState?.mission_id || "No active mission";
  const gps = deviceState?.gps || {};
  const fix = gps?.last_good_fix || null;
  const warnings = Array.isArray(deviceState?.warnings) ? deviceState.warnings : [];

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral/80 bg-neutral text-neutral-content shadow-lg">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FiActivity className="text-primary" />
              <h2 className="text-base font-semibold">Device status</h2>
            </div>
            <p className="mt-1 text-sm text-neutral-content/60">Runtime state, connection details and GPS diagnostics</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-neutral-content/90">
                <profile.Icon className="text-sm" />
                {activeDevice?.active_profile_label || profile.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              className="btn btn-sm btn-primary rounded-xl"
              onClick={onCheckStatus}
              disabled={checking}
            >
              {checking ? <span className="loading loading-spinner loading-xs" /> : <FiRadio />}
              {checking ? "Checking..." : "Check status"}
            </button>

            <button
              className="btn btn-sm btn-circle btn-ghost border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label="Toggle panel"
            >
              <FiChevronDown className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Runtime Details */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FiCpu className="text-primary" />
                <h3 className="text-sm font-semibold text-neutral-content">Runtime details</h3>
              </div>
              <div className="space-y-2.5">
                <InfoRow label="Current state" value={toTitleCase(runtimeState)} />
                <InfoRow label="Connection" value={deviceStatus === "connected" ? "Connected" : deviceStatus === "out_of_range" ? "Out of range" : "Inactive"} />
                <InfoRow label="Mission" value={missionName} mono={Boolean(deviceState?.mission_id)} />
                <InfoRow label="Running" value={deviceState?.running ? "Yes" : "No"} />
                <InfoRow label="Last seen" value={formatEpoch(activeDevice?.last_seen_epoch)} />
              </div>
            </div>

            {/* GPS Details */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FiWifi className="text-primary" />
                <h3 className="text-sm font-semibold text-neutral-content">GPS details</h3>
              </div>
              <div className="space-y-2.5">
                <InfoRow label="GPS stream" value={gps.online ? "Online" : gps.online === false ? "Offline" : "Unknown"} />
                <InfoRow label="GPS fix" value={gps.has_fix ? "Fix acquired" : gps.has_fix === false ? "No fix" : "Unknown"} />
                <InfoRow label="Satellites" value={fix?.satellites ?? gps?.satellites ?? "—"} />
                <InfoRow label="HDOP" value={formatNumber(fix?.hdop ?? gps?.hdop)} />
              </div>

              {fix?.lat != null && fix?.lon != null ? (
                <div className="mt-3 rounded-xl border border-info/30 bg-info/10 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-info">
                    <FiMapPin className="text-sm" /> GPS fix coordinates
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <InfoRow label="Lat" value={formatNumber(fix.lat, 6)} mono />
                    <InfoRow label="Lon" value={formatNumber(fix.lon, 6)} mono />
                    <InfoRow label="Alt" value={formatNumber(fix.alt_m, 1, " m")} />
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-4 text-sm text-neutral-content/50 text-center">
                  No valid GPS coordinates available yet.
                </div>
              )}
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="xl:col-span-2 rounded-2xl border border-warning/30 bg-warning/10 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FiAlertTriangle className="text-warning" />
                  <h3 className="text-sm font-semibold text-warning">Warnings</h3>
                </div>
                <div className="space-y-2">
                  {warnings.map((warning, index) => (
                    <div key={index} className="rounded-xl border border-warning/40 bg-warning/20 px-3 py-3 text-sm text-warning-content font-medium">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </section>
  );
}
