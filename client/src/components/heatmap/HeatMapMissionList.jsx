import React from "react";
import HeatMapMissionListItem from "./HeatMapMissionListItem";

export default function HeatMapMissionList({
  loading = false,
  errorText = "",
  missions = [],
  selectedMissionId = null,
  expandedMissionIds = [],
  onToggleMissionExpand = () => {},
  onSelectMission = () => {},
}) {
  if (loading) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-100 px-6 text-center">
        <div>
          <div className="loading loading-spinner loading-md text-primary" />
          <div className="mt-3 text-sm text-base-content/60">
            Loading missions...
          </div>
        </div>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-3xl border border-error/30 bg-error/10 px-6 text-center">
        <div>
          <div className="text-base font-semibold text-error">
            Failed to load missions
          </div>
          <div className="mt-2 text-sm text-error/80">{errorText}</div>
        </div>
      </div>
    );
  }

  if (!missions.length) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-100 px-6 text-center text-sm text-base-content/55">
        No missions found.
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-1 custom-scrollbar">
      <div className="space-y-3">
        {missions.map((mission) => (
          <HeatMapMissionListItem
            key={mission.missionId}
            mission={mission}
            selected={mission.missionId === selectedMissionId}
            expanded={expandedMissionIds.includes(mission.missionId)}
            onToggleExpand={() => onToggleMissionExpand(mission.missionId)}
            onSelect={onSelectMission}
          />
        ))}
      </div>
    </div>
  );
}
