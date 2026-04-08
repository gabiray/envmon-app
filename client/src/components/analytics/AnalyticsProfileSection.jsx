import React from "react";

function formatNumber(value, decimals = 2, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-3xl border border-base-300 bg-base-100 shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <Icon className="text-base" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-semibold text-base-content">
              {title}
            </div>
            <div className="mt-1 text-sm text-base-content/60">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

function StatCard({ label, value, hint = "", tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning/10"
      : tone === "success"
        ? "border-success/30 bg-success/10"
        : "border-base-300 bg-base-100";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-base-content">{value}</div>
      {hint ? <div className="mt-1 text-xs text-base-content/60">{hint}</div> : null}
    </div>
  );
}

export default function AnalyticsProfileSection({
  sameProfile,
  activeMission,
  profileMeta,
  activeTelemetrySliced = [],
  activeTelemetryRaw = [],
  activeImages = [],
  activeGpsQuality = { goodPct: null },
  movementStats = {
    stationaryPct: null,
    totalDistanceM: null,
    avgMovingSpeedMps: null,
  },
  denseTop = [],
  carDenseGasComparison = null,
  staticStability = [],
  metric,
  getMetricMeta,
  droneAltitudeSeries = [],
  bicycleDistanceSeries = [],
  SimpleLineChart,
  DroneImagesPanel,
}) {
  if (!sameProfile || !activeMission || !profileMeta?.Icon) {
    return null;
  }

  const metricMeta = getMetricMeta(metric);

  return (
    <SectionCard
      title="Profile module"
      description="Interpretation adapted to the selected operating profile."
      icon={profileMeta.Icon}
    >
      {activeMission.profile_type === "drone" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Max altitude"
              value={formatNumber(
                Math.max(
                  ...activeTelemetrySliced
                    .map((point) => Number(point?.alt_m))
                    .filter((value) => Number.isFinite(value)),
                  0
                ),
                1,
                " m"
              )}
            />
            <StatCard
              label="Image frames"
              value={String(activeImages.length)}
              hint="Surveillance imagery available"
            />
            <StatCard
              label="GPS good points"
              value={formatNumber(activeGpsQuality.goodPct, 0, "%")}
            />
          </div>

          {SimpleLineChart ? (
            <SimpleLineChart
              title="Altitude profile"
              xLabel="Elapsed time (min)"
              yLabel="Altitude"
              unit="m"
              series={droneAltitudeSeries}
            />
          ) : null}

          {DroneImagesPanel ? (
            <DroneImagesPanel
              missionId={activeMission.mission_id}
              images={activeImages}
              telemetry={activeTelemetryRaw}
            />
          ) : null}
        </div>
      ) : null}

      {activeMission.profile_type === "car" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Stationary ratio"
              value={formatNumber(movementStats.stationaryPct, 0, "%")}
              hint="Useful for congestion interpretation"
            />
            <StatCard label="Top dense zones" value={String(denseTop.length)} />
            <StatCard
              label="Traffic interpretation"
              value={
                movementStats.stationaryPct > 35
                  ? "Likely congestion"
                  : movementStats.stationaryPct > 15
                    ? "Moderate delays"
                    : "Mostly fluid route"
              }
              tone={movementStats.stationaryPct > 35 ? "warning" : "success"}
            />
          </div>

          {carDenseGasComparison ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard
                label="Gas in dense zones"
                value={formatNumber(carDenseGasComparison.denseAvg, 0, " Ω")}
                hint="Average where dwell concentration is highest"
              />
              <StatCard
                label="Gas while moving"
                value={formatNumber(carDenseGasComparison.movingAvg, 0, " Ω")}
                hint="Average outside dense clusters"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {activeMission.profile_type === "static" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {staticStability.map((item) => {
              const meta = getMetricMeta(item.metric);

              return (
                <StatCard
                  key={item.metric}
                  label={`${meta.label} stability`}
                  value={
                    item.cvPct == null
                      ? "—"
                      : item.cvPct < 2
                        ? "Very stable"
                        : item.cvPct < 5
                          ? "Stable"
                          : "Variable"
                  }
                  hint={
                    item.cvPct == null
                      ? "No data"
                      : `CV ${formatNumber(item.cvPct, 2, "%")}`
                  }
                  tone={item.cvPct != null && item.cvPct > 5 ? "warning" : "success"}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {activeMission.profile_type === "bicycle" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Route distance"
              value={formatNumber(movementStats.totalDistanceM / 1000, 2, " km")}
            />
            <StatCard
              label="Avg moving speed"
              value={formatNumber(movementStats.avgMovingSpeedMps, 2, " m/s")}
            />
            <StatCard label="Exposure style" value="Along-route analysis" />
          </div>

          {SimpleLineChart ? (
            <SimpleLineChart
              title={`${metricMeta.label} along route`}
              xLabel="Cumulative distance (m)"
              yLabel={metricMeta.label}
              unit={metricMeta.unit}
              series={bicycleDistanceSeries}
            />
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}
