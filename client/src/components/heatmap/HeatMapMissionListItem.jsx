import React, { useEffect, useRef } from "react";
import {
  FiCamera,
  FiChevronDown,
  FiClock,
  FiMapPin,
  FiNavigation,
} from "react-icons/fi";

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

export default function HeatMapMissionListItem({
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
    onToggleExpand(mission.missionId);
  }

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
        onClick={() => onSelect(mission)}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-base-content">
              {mission.missionName}
            </div>
            <div className="mt-1 text-xs text-base-content/55">
              {mission.dateLabel}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className={getStatusBadge(mission.status)}>
              {mission.status || "Unknown"}
            </span>

            <button
              type="button"
              className="btn btn-ghost btn-xs rounded-lg"
              onClick={handleToggleExpand}
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
          <span className="truncate">{mission.locationLabel}</span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-base-300 px-4 py-3">
          <div className="grid grid-cols-1 gap-2 text-xs text-base-content/70">
            <div className="flex items-center gap-2">
              <FiClock className="text-base-content/45" />
              <span>Location mode: {mission.locationMode || "Unknown"}</span>
            </div>

            <div className="flex items-center gap-2">
              <FiNavigation className="text-base-content/45" />
              <span>GPS: {mission.hasGps ? "Available" : "Missing"}</span>
            </div>

            <div className="flex items-center gap-2">
              <FiCamera className="text-base-content/45" />
              <span>Images: {mission.hasImages ? "Available" : "Missing"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
