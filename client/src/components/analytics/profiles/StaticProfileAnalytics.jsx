import React, { useMemo } from "react";
import { FiWind, FiLayers } from "react-icons/fi";
import { buildStaticProfileData } from "../../../utils/analyticsProfile";

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <Icon className="text-base" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-semibold text-base-content">{title}</div>
            <div className="mt-1 text-sm leading-6 text-base-content/60">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-base-content">{value}</div>
    </div>
  );
}

export default function StaticProfileAnalytics({
  missions = [],
  telemetryMap = {},
  sameProfile = false,
  sameLocation = false,
  profileType = "",
  rangePreset = "full",
  gpsFilter = "all",
  formatNumber,
}) {
  const profileData = useMemo(() => {
    return buildStaticProfileData({
      missions,
      telemetryMap,
      sameProfile,
      sameLocation,
      profileType,
      rangePreset,
      gpsFilter,
    });
  }, [missions, telemetryMap, sameProfile, sameLocation, profileType, rangePreset, gpsFilter]);

  if (!profileData) return null;

  return (
    <SectionCard
      title="Static analysis"
      description="Stability-focused interpretation for stationary monitoring missions."
      icon={profileData.mode === "single" ? FiWind : FiLayers}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {profileData.perMission.map((item) => {
          const stability = item.stability || {};
          return (
            <div
              key={item.mission.mission_id}
              className="rounded-2xl border border-base-300 bg-base-100 px-4 py-4"
            >
              <div className="mb-3 text-sm font-semibold text-base-content">
                {item.mission.mission_name || item.mission.mission_id}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <StatCard
                  label="Variation"
                  value={formatNumber(stability.variationPct, 1, " %")}
                />
                <StatCard
                  label="Consistency"
                  value={formatNumber(stability.consistencyScore, 0, " /100")}
                />
                <StatCard
                  label="Drift"
                  value={stability.driftLabel || "—"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
