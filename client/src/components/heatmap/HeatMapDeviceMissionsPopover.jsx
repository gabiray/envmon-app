import React from "react";
import { FiClock, FiMapPin, FiX } from "react-icons/fi";

function getStatusBadge(status) {
  const key = String(status || "").toLowerCase();

  if (key === "completed" || key === "done") {
    return "badge badge-outline border-success/30 bg-success/10 text-success";
  }

  if (key === "aborted" || key === "error" || key === "failed") {
    return "badge badge-outline border-error/30 bg-error/10 text-error";
  }

  if (key === "running") {
    return "badge badge-outline border-info/30 bg-info/10 text-info";
  }

  return "badge badge-outline border-base-300 bg-base-200 text-base-content/70";
}

export default function HeatMapDeviceMissionsPopover({
  pin = null,
  selectedMissionId = null,
  onSelectMission = () => {},
  onClose = () => {},
}) {
  if (!pin) return null;

  return (
    <div className="w-[380px] max-w-[calc(100vw-2rem)] rounded-3xl border border-base-300 bg-base-100/95 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-3 border-b border-base-300 px-4 py-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-base-content">
            {pin.deviceName}
          </div>
          <div className="mt-1 text-xs text-base-content/55">
            {pin.missionsCount} mission{pin.missionsCount === 1 ? "" : "s"} on
            this profile
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm btn-circle"
          onClick={onClose}
          aria-label="Close missions popover"
        >
          <FiX />
        </button>
      </div>

      <div className="max-h-[340px] overflow-y-auto p-3 custom-scrollbar">
        <div className="space-y-2">
          {pin.missions.map((mission) => {
            const selected = mission.missionId === selectedMissionId;

            return (
              <button
                key={mission.missionId}
                type="button"
                onClick={() => onSelectMission(mission)}
                className={[
                  "w-full rounded-2xl border px-3 py-3 text-left transition-colors",
                  selected
                    ? "border-primary/35 bg-primary/5"
                    : "border-base-300 bg-base-100 hover:bg-base-200/50",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-base-content">
                      {mission.missionName}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-base-content/55">
                      <FiClock className="text-base-content/40" />
                      <span className="truncate">{mission.dateLabel}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-base-content/55">
                      <FiMapPin className="text-base-content/40" />
                      <span className="truncate">{mission.locationLabel}</span>
                    </div>
                  </div>

                  <span className={getStatusBadge(mission.status)}>
                    {mission.status || "Unknown"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
