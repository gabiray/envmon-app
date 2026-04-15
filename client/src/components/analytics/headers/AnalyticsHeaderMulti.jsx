import React from "react";
import { FiLayers, FiMapPin } from "react-icons/fi";

function StatChip({ children }) {
  return (
    <span className="inline-flex h-8 items-center rounded-full border border-base-300 bg-base-200 px-3 text-xs font-medium text-base-content/80">
      {children}
    </span>
  );
}

function MissionChip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
      {children}
    </span>
  );
}

export default function AnalyticsHeaderMulti({
  missions = [],
  sameProfile = false,
  sameLocation = false,
  profileMeta = null,
}) {
  const missionCount = missions.length;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatChip>
                <FiLayers className="mr-2 text-sm" />
                {missionCount} selected mission{missionCount === 1 ? "" : "s"}
              </StatChip>

              {sameProfile && profileMeta?.label ? (
                <StatChip>{profileMeta.label}</StatChip>
              ) : (
                <StatChip>Mixed profiles</StatChip>
              )}

              {sameLocation ? (
                <StatChip>
                  <FiMapPin className="mr-2 text-sm" />
                  Same location context
                </StatChip>
              ) : (
                <StatChip>Different locations</StatChip>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-base-content sm:text-3xl">
              Multi-mission comparison
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-base-content/60">
              Compare multiple missions using shared metrics, aligned ranges and
              normalization controls.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {missions.map((mission) => (
                <MissionChip key={mission.mission_id}>
                  {mission.mission_name || mission.mission_id}
                </MissionChip>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
