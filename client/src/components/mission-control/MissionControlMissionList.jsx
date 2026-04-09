import React from "react";
import { FiRadio, FiCpu, FiNavigation } from "react-icons/fi";

function makeMissionKey(item) {
  return `${item.device_uuid}:${item.mission_id}`;
}

function profileBadgeClass(profileType) {
  switch (profileType) {
    case "drone":
      return "badge-info";
    case "car":
      return "badge-warning";
    case "bicycle":
      return "badge-success";
    case "static":
      return "badge-neutral";
    default:
      return "badge-ghost";
  }
}

export default function MissionControlMissionList({
  items = [],
  loading = false,
  error = "",
  selectedMissionKey = null,
  onSelectMissionKey = () => {},
}) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-base-300 bg-base-100 shadow-xl">
      <div className="border-b border-base-300 px-4 py-4">
        <h2 className="text-base font-semibold text-base-content">Active Missions</h2>
        <p className="mt-1 text-sm text-base-content/60">
          Select one mission to focus on live.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-sm text-base-content/70">
            Loading live missions...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
            {error}
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-sm text-base-content/70">
            No active missions detected right now.
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const missionKey = makeMissionKey(item);
            const isSelected = missionKey === selectedMissionKey;

            return (
              <button
                key={missionKey}
                type="button"
                onClick={() => onSelectMissionKey(missionKey)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? "border-primary bg-primary/8 shadow-md"
                    : "border-base-300 bg-base-100 hover:bg-base-200/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FiCpu className="text-base-content/70" />
                      <span className="font-semibold text-base-content">
                        {item.nickname || item.hostname || item.device_uuid}
                      </span>
                    </div>

                    <div className="mt-1 text-sm text-base-content/60">
                      {item.mission_name || item.mission_id}
                    </div>
                  </div>

                  <span className={`badge ${profileBadgeClass(item.profile_type)}`}>
                    {item.profile_label || item.profile_type || "Unknown"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="badge badge-outline">{item.state || "Unknown"}</span>
                  <span className="badge badge-outline gap-1">
                    <FiRadio />
                    Live
                  </span>
                  {item.live?.alt_m != null ? (
                    <span className="badge badge-outline gap-1">
                      <FiNavigation />
                      {Number(item.live.alt_m).toFixed(1)} m
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
