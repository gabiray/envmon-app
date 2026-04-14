import React from "react";
import { FiActivity, FiLayers, FiMapPin } from "react-icons/fi";

function StatusChip({ children, tone = "default" }) {
  const cls =
    tone === "primary"
      ? "border-primary/20 bg-primary/10 text-primary"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning"
        : tone === "info"
          ? "border-info/30 bg-info/10 text-info"
          : "border-base-300 bg-base-200 text-base-content/80";

  return (
    <span className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-medium border ${cls}`}>
      {children}
    </span>
  );
}

function MissionTab({ mission, active = false, onClick = () => {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[220px] rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-primary/40 bg-primary/6"
          : "border-base-300 bg-base-100 hover:bg-base-200"
      }`}
    >
      <div className="truncate text-sm font-semibold text-base-content">
        {mission?.mission_name || mission?.mission_id || "Untitled mission"}
      </div>

      <div className="mt-1 truncate text-[11px] font-mono text-base-content/50">
        {mission?.mission_id || "—"}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {mission?.location_name ? (
          <span className="badge badge-outline badge-sm">{mission.location_name}</span>
        ) : null}

        {mission?.status ? (
          <span className="badge badge-outline badge-sm">{mission.status}</span>
        ) : null}
      </div>
    </button>
  );
}

export default function AnalyticsHeaderMulti({
  missions = [],
  activeMissionId = null,
  onChangeActiveMissionId = () => {},
  sameProfile = true,
  sameLocation = true,
  profileMeta = null,
}) {
  if (!missions.length) return null;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone="primary">
                <FiActivity className="mr-2" />
                {missions.length} missions selected
              </StatusChip>

              <StatusChip tone={sameProfile ? "default" : "warning"}>
                <FiLayers className="mr-2" />
                {sameProfile
                  ? profileMeta?.label || missions[0]?.profile_label || missions[0]?.profile_type || "Same profile"
                  : "Mixed profiles"}
              </StatusChip>

              <StatusChip tone={sameLocation ? "default" : "info"}>
                <FiMapPin className="mr-2" />
                {sameLocation ? "Same location context" : "Different locations"}
              </StatusChip>
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-base-content sm:text-3xl">
              Mission comparison
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-base-content/60">
              Compare trends across multiple missions and switch focus between the selected datasets.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto pb-1 custom-scrollbar">
          <div className="flex gap-3">
            {missions.map((mission) => (
              <MissionTab
                key={mission.mission_id}
                mission={mission}
                active={mission.mission_id === activeMissionId}
                onClick={() => onChangeActiveMissionId(mission.mission_id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
