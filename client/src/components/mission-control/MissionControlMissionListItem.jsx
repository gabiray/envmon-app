import React, { useEffect, useRef } from "react";
import { FiChevronDown, FiHardDrive, FiMapPin, FiRadio } from "react-icons/fi";

function profileBadgeClass(profileType) {
  switch (profileType) {
    case "drone":
      return "badge badge-outline border-info/30 bg-info/10 text-info";
    case "car":
      return "badge badge-outline border-warning/30 bg-warning/10 text-warning";
    case "bicycle":
      return "badge badge-outline border-success/30 bg-success/10 text-success";
    case "static":
      return "badge badge-outline border-base-300 bg-base-200 text-base-content/70";
    default:
      return "badge badge-outline border-base-300 bg-base-200 text-base-content/70";
  }
}

function statusBadgeClass(state) {
  const value = String(state || "").toUpperCase();

  if (value === "RUNNING") {
    return "badge badge-outline border-success/30 bg-success/10 text-success";
  }

  if (value === "ARMING") {
    return "badge badge-outline border-warning/30 bg-warning/10 text-warning";
  }

  if (value === "COMPLETED") {
    return "badge badge-outline border-info/30 bg-info/10 text-info";
  }

  if (value === "ABORTED" || value === "ERROR") {
    return "badge badge-outline border-error/30 bg-error/10 text-error";
  }

  return "badge badge-outline border-base-300 bg-base-200 text-base-content/70";
}

function formatEpoch(epoch) {
  if (!epoch) return "—";
  try {
    return new Date(Number(epoch) * 1000).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatCoord(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value).toFixed(6);
}

function getDeviceName(mission) {
  return (
    mission?.nickname ||
    mission?.hostname ||
    mission?.device_name ||
    mission?.device_uuid ||
    "Unknown device"
  );
}

function getMissionStartEpoch(mission) {
  return (
    mission?.started_at_epoch ||
    mission?.live?.ts_epoch ||
    mission?.gps?.last_good_fix?.ts_epoch ||
    null
  );
}

function getMissionStartLocation(mission) {
  const live = mission?.live || {};
  const fix = mission?.gps?.last_good_fix || {};

  const lat = live.lat ?? fix.lat ?? null;
  const lon = live.lon ?? fix.lon ?? null;

  if (lat == null || lon == null) return "Unknown location";

  const latText = formatCoord(lat);
  const lonText = formatCoord(lon);

  if (!latText || !lonText) return "Unknown location";
  return `${latText}, ${lonText}`;
}

function InfoRow({
  label,
  value,
  mono = false,
  right = null,
  stacked = false,
}) {
  if (stacked) {
    return (
      <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-3">
        <div className="text-[11px] uppercase tracking-[0.14em] text-base-content/45">
          {label}
        </div>

        <div className="mt-2">
          {right ? (
            right
          ) : (
            <div
              className={`text-sm font-medium text-base-content ${
                mono ? "font-mono break-all" : ""
              }`}
            >
              {value}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-base-300 bg-base-100 px-3 py-2.5">
      <span className="text-[11px] uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </span>

      <div className="min-w-0 text-right">
        {right ? (
          right
        ) : (
          <span
            className={`text-sm font-medium text-base-content ${
              mono ? "font-mono break-all" : ""
            }`}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MissionControlMissionListItem({
  mission,
  selected = false,
  expanded = false,
  onToggleExpand = () => {},
  onSelect = () => {},
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!expanded) return;

    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }, [expanded]);

  function handleToggleExpand(e) {
    e.stopPropagation();
    onToggleExpand();
  }

  const deviceName = getDeviceName(mission);
  const missionStatus = mission?.state || "Unknown";

  return (
    <div
      ref={rootRef}
      className={[
        "rounded-2xl border transition-all",
        selected
          ? "border-primary/35 bg-primary/5 shadow-sm"
          : "border-base-300 bg-base-100 hover:border-primary/20 hover:bg-base-200/40",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-base-content">
              {deviceName}
            </div>

            <div className="mt-1 text-xs text-base-content/55">
              {formatEpoch(getMissionStartEpoch(mission))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className={profileBadgeClass(mission?.profile_type)}>
              {mission?.profile_label || mission?.profile_type || "Unknown"}
            </span>

            <button
              type="button"
              className="btn btn-ghost btn-xs rounded-lg"
              onClick={handleToggleExpand}
              aria-label="Toggle mission details"
            >
              <FiChevronDown
                className={`transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-base-content/55">
          <FiMapPin className="text-primary" />
          <span className="truncate">{getMissionStartLocation(mission)}</span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-base-300 px-4 pb-3 pt-3">
          <div className="space-y-2">
            <InfoRow
              label="Mission ID"
              value={mission?.mission_id || "—"}
              mono
              stacked
            />

            <InfoRow
              label="Status"
              value={missionStatus}
              right={
                <span className={statusBadgeClass(missionStatus)}>
                  <span className="inline-flex items-center gap-1.5">
                    <FiRadio className="text-[11px]" />
                    {missionStatus}
                  </span>
                </span>
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
