import React from "react";
import {
  FiActivity,
  FiBarChart2,
  FiMapPin,
  FiNavigation,
  FiTrendingUp,
  FiWind,
} from "react-icons/fi";

function StatCard({ label, value, hint = "", tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning/10"
      : tone === "success"
        ? "border-success/30 bg-success/10"
        : tone === "info"
          ? "border-info/30 bg-info/10"
          : "border-base-300 bg-base-100";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-base-content">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs leading-5 text-base-content/60">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <Icon className="text-base" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-semibold text-base-content">
              {title}
            </div>
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

function MiniInfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-base-300 bg-base-100 px-4 py-3">
      <div className="text-sm text-base-content/60">{label}</div>
      <div className="text-sm font-medium text-base-content text-right">
        {value}
      </div>
    </div>
  );
}

function DenseZonesList({ densityMapPoints = [], formatNumber }) {
  if (!densityMapPoints.length) {
    return (
      <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/35 px-4 py-8 text-center text-sm text-base-content/55">
        No dense movement areas were identified for the current selection.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {densityMapPoints.slice(0, 5).map((item, index) => (
        <div
          key={`${item.key || "dense"}-${index}`}
          className="rounded-2xl border border-base-300 bg-base-100 px-4 py-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-base-content">
                Zone {index + 1}
              </div>
              <div className="mt-1 text-xs text-base-content/55">
                {formatNumber(item.lat, 5)}, {formatNumber(item.lon, 5)}
              </div>
            </div>

            <span className="badge badge-outline">
              {item.samples ?? item.count ?? 0} pts
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MiniInfoRow
              label="Density score"
              value={formatNumber(item.densityScore ?? item.score, 0)}
            />
            <MiniInfoRow
              label="Gas avg"
              value={formatNumber(item.gasAvg, 0, " Ω")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DroneSection({
  mission,
  telemetry = [],
  altitudeSeries = [],
  trendSummary = null,
  formatNumber,
  AnalyticsSimpleLineChart,
}) {
  const altitudeValues = telemetry
    .map((point) => Number(point?.alt_m))
    .filter((value) => Number.isFinite(value));

  const maxAltitude =
    altitudeValues.length > 0 ? Math.max(...altitudeValues) : null;
  const minAltitude =
    altitudeValues.length > 0 ? Math.min(...altitudeValues) : null;
  const avgAltitude =
    altitudeValues.length > 0
      ? altitudeValues.reduce((sum, value) => sum + value, 0) /
        altitudeValues.length
      : null;

  const altitudeSpread =
    Number.isFinite(maxAltitude) && Number.isFinite(minAltitude)
      ? maxAltitude - minAltitude
      : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Max altitude"
          value={formatNumber(maxAltitude, 1, " m")}
          hint="Highest recorded altitude in the selected range"
        />
        <StatCard
          label="Avg altitude"
          value={formatNumber(avgAltitude, 1, " m")}
          hint="Average altitude during the mission"
        />
        <StatCard
          label="Altitude spread"
          value={formatNumber(altitudeSpread, 1, " m")}
          hint="Difference between min and max altitude"
        />
        <StatCard
          label="Metric trend"
          value={trendSummary?.directionLabel || "—"}
          hint="General direction of the selected metric"
          tone={
            trendSummary?.direction === "up"
              ? "warning"
              : trendSummary?.direction === "down"
                ? "info"
                : "success"
          }
        />
      </div>

      {AnalyticsSimpleLineChart && altitudeSeries?.length ? (
        <SectionCard
          title="Altitude profile"
          description="Vertical evolution of the flight path across the selected mission range."
          icon={FiTrendingUp}
        >
          <AnalyticsSimpleLineChart
            title="Altitude profile"
            xLabel="Time"
            yLabel="Altitude"
            unit="m"
            series={altitudeSeries}
            height={280}
          />
        </SectionCard>
      ) : null}

      <SectionCard
        title="Flight interpretation"
        description="Profile-specific context for aerial monitoring."
        icon={FiNavigation}
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <MiniInfoRow
            label="Mission type"
            value={mission?.profile_label || "Drone"}
          />
          <MiniInfoRow label="Altitude relevance" value="High" />
          <MiniInfoRow
            label="Recommended focus"
            value="Altitude changes and route coverage"
          />
        </div>
      </SectionCard>
    </div>
  );
}

function VehicleSection({
  mission,
  movementStats,
  densityMapPoints = [],
  distanceSeries = [],
  formatNumber,
  AnalyticsSimpleLineChart,
}) {
  const stationaryPct = movementStats?.stationaryPct;
  const totalDistanceM = movementStats?.totalDistanceM;
  const avgMovingSpeedMps = movementStats?.avgMovingSpeedMps;
  const stationaryDurationS = movementStats?.stationaryDurationS;

  const interpretation =
    stationaryPct > 35
      ? "Likely congestion"
      : stationaryPct > 15
        ? "Moderate delays"
        : "Mostly fluid movement";

  const tone =
    stationaryPct > 35 ? "warning" : stationaryPct > 15 ? "info" : "success";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Stationary ratio"
          value={formatNumber(stationaryPct, 0, "%")}
          hint="Useful for identifying crowded or slow zones"
          tone={tone}
        />
        <StatCard
          label="Total distance"
          value={formatNumber(
            Number.isFinite(totalDistanceM) ? totalDistanceM / 1000 : null,
            2,
            " km",
          )}
          hint="Estimated covered route distance"
        />
        <StatCard
          label="Avg moving speed"
          value={formatNumber(
            Number.isFinite(avgMovingSpeedMps) ? avgMovingSpeedMps * 3.6 : null,
            1,
            " km/h",
          )}
          hint="Average speed while moving"
        />
        <StatCard
          label="Traffic interpretation"
          value={interpretation}
          hint="Overall movement behavior"
          tone={tone}
        />
      </div>

      {AnalyticsSimpleLineChart && distanceSeries?.length ? (
        <SectionCard
          title="Distance progression"
          description="Metric evolution aligned to route progression."
          icon={FiBarChart2}
        >
          <AnalyticsSimpleLineChart
            title="Distance progression"
            xLabel="Cumulative distance"
            yLabel="Metric value"
            unit=""
            series={distanceSeries}
            height={280}
          />
        </SectionCard>
      ) : null}

      <SectionCard
        title="Dense movement zones"
        description="Areas with repeated samples or prolonged presence, useful for traffic or dwell interpretation."
        icon={FiMapPin}
      >
        <DenseZonesList
          densityMapPoints={densityMapPoints}
          formatNumber={formatNumber}
        />
      </SectionCard>

      <SectionCard
        title="Mobility context"
        description="Profile-specific interpretation for route-based ground monitoring."
        icon={FiActivity}
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <MiniInfoRow
            label="Profile"
            value={mission?.profile_label || mission?.profile_type || "Vehicle"}
          />
          <MiniInfoRow
            label="Stationary duration"
            value={formatNumber(stationaryDurationS, 0, " s")}
          />
          <MiniInfoRow
            label="Recommended focus"
            value="Congestion, dwell zones and exposure along route"
          />
        </div>
      </SectionCard>
    </div>
  );
}

function StaticSection({
  mission,
  staticStability = null,
  trendSummary = null,
  formatNumber,
}) {
  const variationPct = staticStability?.variationPct ?? null;
  const consistencyScore = staticStability?.consistencyScore ?? null;
  const driftLabel =
    staticStability?.driftLabel ||
    trendSummary?.directionLabel ||
    "No strong drift";

  const tone =
    variationPct > 20 ? "warning" : variationPct > 8 ? "info" : "success";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Variation"
          value={formatNumber(variationPct, 1, "%")}
          hint="Relative variation of the selected metric"
          tone={tone}
        />
        <StatCard
          label="Consistency"
          value={formatNumber(consistencyScore, 0, "/100")}
          hint="Higher is better for stationary monitoring"
          tone={variationPct > 8 ? "info" : "success"}
        />
        <StatCard
          label="Drift"
          value={driftLabel}
          hint="Observed tendency across the selected range"
        />
        <StatCard
          label="Recommended focus"
          value="Stability"
          hint="Useful for baseline and fixed-point interpretation"
        />
      </div>

      <SectionCard
        title="Static monitoring context"
        description="Interpretation dedicated to stationary environmental monitoring."
        icon={FiWind}
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <MiniInfoRow
            label="Profile"
            value={mission?.profile_label || "Static"}
          />
          <MiniInfoRow label="Main use" value="Baseline consistency" />
          <MiniInfoRow
            label="Interpretation focus"
            value="Low drift and stable measurements"
          />
        </div>
      </SectionCard>
    </div>
  );
}

export default function AnalyticsProfileSection({
  profileType = null,
  profileMeta = null,
  mission = null,
  telemetry = [],
  trendSummary = null,
  movementStats = null,
  densityMapPoints = [],
  distanceSeries = [],
  altitudeSeries = [],
  staticStability = null,
  formatNumber,
  AnalyticsSimpleLineChart,
}) {
  if (!mission || !profileType || !profileMeta?.Icon) {
    return null;
  }

  const description =
    profileType === "drone"
      ? "Profile-specific interpretation for aerial missions."
      : profileType === "car" || profileType === "bicycle"
        ? "Profile-specific interpretation for route-based ground missions."
        : profileType === "static"
          ? "Profile-specific interpretation for stationary monitoring."
          : "Profile-specific interpretation.";

  return (
    <SectionCard
      title={`${profileMeta.label} analysis`}
      description={description}
      icon={profileMeta.Icon}
    >
      {profileType === "drone" ? (
        <DroneSection
          mission={mission}
          telemetry={telemetry}
          altitudeSeries={altitudeSeries}
          trendSummary={trendSummary}
          formatNumber={formatNumber}
          AnalyticsSimpleLineChart={AnalyticsSimpleLineChart}
        />
      ) : null}

      {profileType === "car" || profileType === "bicycle" ? (
        <VehicleSection
          mission={mission}
          movementStats={movementStats}
          densityMapPoints={densityMapPoints}
          distanceSeries={distanceSeries}
          formatNumber={formatNumber}
          AnalyticsSimpleLineChart={AnalyticsSimpleLineChart}
        />
      ) : null}

      {profileType === "static" ? (
        <StaticSection
          mission={mission}
          staticStability={staticStability}
          trendSummary={trendSummary}
          formatNumber={formatNumber}
        />
      ) : null}
    </SectionCard>
  );
}
