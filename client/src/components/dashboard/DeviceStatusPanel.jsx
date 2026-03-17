import React, { useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiCpu,
  FiMapPin,
  FiPauseCircle,
  FiPlayCircle,
  FiRadio,
  FiSlash,
  FiThermometer,
  FiWifi,
  FiWind,
} from "react-icons/fi";
import { TbDrone } from "react-icons/tb";
import { MdDirectionsBike } from "react-icons/md";
import { FaCarSide } from "react-icons/fa";

function getConnectionMeta(status) {
  if (status === "connected") {
    return {
      label: "Connected",
      tone: "text-success",
      softTone: "border-success/20 bg-success/10 text-success",
      Icon: FiCheckCircle,
    };
  }

  if (status === "out_of_range") {
    return {
      label: "Out of range",
      tone: "text-warning",
      softTone: "border-warning/20 bg-warning/10 text-warning",
      Icon: FiAlertTriangle,
    };
  }

  return {
    label: "Inactive",
    tone: "text-base-content/55",
    softTone: "border-base-content/10 bg-base-content/5 text-base-content/70",
    Icon: FiSlash,
  };
}

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
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatValue(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(digits);
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/8 bg-black/10 px-3 py-2.5">
      <span className="text-xs uppercase tracking-wide text-neutral-content/50">
        {label}
      </span>
      <span
        className={`text-right text-sm font-medium text-neutral-content ${
          mono ? "font-mono break-all" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StreamMetric({ icon: Icon, label, value, unit }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-content/55">
        <Icon className="text-sm" />
        <span>{label}</span>
      </div>

      <div className="mt-2 flex items-end gap-1">
        <span className="text-lg font-semibold leading-none text-neutral-content">
          {value}
        </span>
        <span className="text-xs text-neutral-content/55">{unit}</span>
      </div>
    </div>
  );
}

export default function DeviceStatusPanel({
  activeDevice = null,
  deviceStatus = "inactive",
  deviceState = null,
  liveMetrics = null,
  liveStreamEnabled = false,
  onToggleLiveStream = () => {},
  onCheckStatus = () => {},
  checking = false,
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const connection = useMemo(
    () => getConnectionMeta(deviceStatus),
    [deviceStatus]
  );

  const profile = useMemo(
    () => getProfileMeta(activeDevice?.active_profile_type),
    [activeDevice?.active_profile_type]
  );

  const ConnectionIcon = connection.Icon;
  const ProfileIcon = profile.Icon;

  const runtimeState = deviceState?.state || "Unknown";
  const missionName =
    deviceState?.mission_name || deviceState?.mission_id || "No active mission";

  const gps = deviceState?.gps || {};
  const gpsState =
    gps.online === true
      ? "Online"
      : gps.online === false
      ? "Offline"
      : "Unknown";

  const gpsFix =
    gps.has_fix === true
      ? "Fix acquired"
      : gps.has_fix === false
      ? "No fix"
      : "Unknown";

  const warnings = Array.isArray(deviceState?.warnings)
    ? deviceState.warnings
    : [];

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral/80 bg-neutral text-neutral-content shadow-xl">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FiActivity className="text-neutral-content/70" />
              <h2 className="text-base font-semibold tracking-[0.01em]">
                Device status
              </h2>
            </div>

            <p className="mt-1 text-sm text-neutral-content/55">
              Quick connection overview and live diagnostics
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${connection.softTone}`}
              >
                <ConnectionIcon className={`text-sm ${connection.tone}`} />
                {connection.label}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-content/80">
                <ProfileIcon className="text-sm" />
                {activeDevice?.active_profile_label || profile.label}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`btn btn-sm rounded-xl border-0 ${
                liveStreamEnabled
                  ? "bg-primary text-primary-content hover:bg-primary/90"
                  : "bg-white/8 text-neutral-content hover:bg-white/12"
              }`}
              onClick={onToggleLiveStream}
            >
              {liveStreamEnabled ? <FiPauseCircle /> : <FiPlayCircle />}
              {liveStreamEnabled ? "Stop live" : "Live stream"}
            </button>

            <button
              type="button"
              className="btn btn-sm rounded-xl border-0 bg-white/8 text-neutral-content hover:bg-white/12"
              onClick={onCheckStatus}
              disabled={checking}
            >
              {checking ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <FiRadio />
              )}
              {checking ? "Checking..." : "Check status"}
            </button>

            <button
              type="button"
              className="btn btn-sm rounded-xl border-0 bg-white/8 text-neutral-content hover:bg-white/12"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
            >
              {expanded ? <FiChevronUp /> : <FiChevronDown />}
              {expanded ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>

        {liveStreamEnabled ? (
          <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.06] p-3 shadow-inner backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-neutral-content">
                Live environmental stream
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StreamMetric
                icon={FiThermometer}
                label="Temperature"
                value={formatValue(liveMetrics?.temperature?.value, 1)}
                unit="°C"
              />
              <StreamMetric
                icon={FiActivity}
                label="Humidity"
                value={formatValue(liveMetrics?.humidity?.value, 1)}
                unit="%"
              />
              <StreamMetric
                icon={FiWind}
                label="Pressure"
                value={formatValue(liveMetrics?.pressure?.value, 1)}
                unit="hPa"
              />
              <StreamMetric
                icon={FiActivity}
                label="Gas"
                value={formatValue(liveMetrics?.gas?.value, 1)}
                unit="kΩ"
              />
            </div>
          </div>
        ) : null}

        {expanded ? (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/12 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FiCpu className="text-neutral-content/65" />
                <h3 className="text-sm font-semibold text-neutral-content">
                  Runtime details
                </h3>
              </div>

              <div className="space-y-2.5">
                <InfoRow label="Current state" value={runtimeState} />
                <InfoRow
                  label="Mission"
                  value={missionName}
                  mono={Boolean(deviceState?.mission_id)}
                />
                <InfoRow
                  label="Running"
                  value={deviceState?.running ? "Yes" : "No"}
                />
                <InfoRow
                  label="Last seen"
                  value={formatEpoch(activeDevice?.last_seen_epoch)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/12 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FiWifi className="text-neutral-content/65" />
                <h3 className="text-sm font-semibold text-neutral-content">
                  Device & GPS
                </h3>
              </div>

              <div className="space-y-2.5">
                <InfoRow
                  label="Hostname"
                  value={activeDevice?.hostname || activeDevice?.info?.hostname || "—"}
                />
                <InfoRow
                  label="Device UUID"
                  value={activeDevice?.device_uuid || "—"}
                  mono
                />
                <InfoRow label="GPS stream" value={gpsState} />
                <InfoRow label="GPS fix" value={gpsFix} />
              </div>
            </div>

            <div className="xl:col-span-2 rounded-2xl border border-white/8 bg-black/12 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FiAlertTriangle className="text-neutral-content/65" />
                <h3 className="text-sm font-semibold text-neutral-content">
                  Warnings
                </h3>
              </div>

              {warnings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-4 text-sm text-neutral-content/55">
                  No warnings reported.
                </div>
              ) : (
                <div className="space-y-2">
                  {warnings.map((warning, index) => (
                    <div
                      key={`${warning}-${index}`}
                      className="rounded-xl border border-warning/20 bg-warning/10 px-3 py-3 text-sm text-warning"
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
