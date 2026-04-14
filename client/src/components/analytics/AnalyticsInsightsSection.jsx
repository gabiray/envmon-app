import React, { useMemo } from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiCompass,
  FiMapPin,
  FiNavigation,
  FiTrendingUp,
  FiWind,
} from "react-icons/fi";

function formatSafe(formatNumber, value, decimals = 2, suffix = "") {
  if (typeof formatNumber === "function") {
    return formatNumber(value, decimals, suffix);
  }

  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(decimals)}${suffix}`;
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
        <div className="mt-1 text-xs leading-5 text-base-content/60">{hint}</div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-base-300 bg-base-100 px-4 py-3">
      <div className="text-sm text-base-content/60">{label}</div>
      <div className="text-sm font-medium text-base-content text-right">
        {value}
      </div>
    </div>
  );
}

function buildStatusTone(direction) {
  if (direction === "up") return "warning";
  if (direction === "down") return "info";
  return "success";
}

export default function AnalyticsInsightsSection({
  activeMission = null,
  metric = "temp_c",
  metricMeta = null,
  stats = null,
  trendSummary = null,
  gpsQuality = null,
  airAnomalies = null,
  baselineComparison = null,
  movementStats = null,
  locationLabel = "Unknown location",
  formatNumber,
}) {
  const profileType = String(activeMission?.profile_type || "")
    .trim()
    .toLowerCase();

  const metricStats = useMemo(() => {
    if (!stats || !metric) return null;
    return stats?.[metric] || null;
  }, [stats, metric]);

  const anomaliesCount = Array.isArray(airAnomalies?.intervals)
    ? airAnomalies.intervals.length
    : 0;

  const baselineDelta = baselineComparison?.deltaFromBaseline ?? null;
  const baselineLabel = baselineComparison?.label || "No baseline context";

  const totalDistanceKm =
    Number.isFinite(movementStats?.totalDistanceM)
      ? movementStats.totalDistanceM / 1000
      : null;

  const avgMovingSpeedKmh =
    Number.isFinite(movementStats?.avgMovingSpeedMps)
      ? movementStats.avgMovingSpeedMps * 3.6
      : null;

  if (!activeMission) {
    return null;
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="General insights"
        description="High-level interpretation of the selected mission and the current metric context."
        icon={FiActivity}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Trend direction"
            value={trendSummary?.directionLabel || "—"}
            hint="General behavior of the selected metric"
            tone={buildStatusTone(trendSummary?.direction)}
          />

          <StatCard
            label="Metric average"
            value={formatSafe(
              formatNumber,
              metricStats?.avg,
              2,
              metricMeta?.unit ? ` ${metricMeta.unit}` : "",
            )}
            hint={metricMeta?.label || "Selected metric"}
          />

          <StatCard
            label="GPS quality"
            value={gpsQuality?.label || "Unknown"}
            hint="Estimated from available GPS diagnostics"
            tone={
              gpsQuality?.quality === "good"
                ? "success"
                : gpsQuality?.quality === "fair"
                  ? "info"
                  : gpsQuality?.quality === "poor"
                    ? "warning"
                    : "default"
            }
          />

          <StatCard
            label="Air anomalies"
            value={String(anomaliesCount)}
            hint="Detected intervals with unusual gas behavior"
            tone={anomaliesCount > 0 ? "warning" : "success"}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Mission context"
        description="Contextual metadata useful before deeper profile-specific interpretation."
        icon={FiMapPin}
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <InfoRow
            label="Mission"
            value={activeMission?.mission_name || activeMission?.mission_id || "—"}
          />
          <InfoRow
            label="Profile"
            value={activeMission?.profile_label || activeMission?.profile_type || "—"}
          />
          <InfoRow
            label="Status"
            value={activeMission?.status || "—"}
          />
          <InfoRow
            label="Location"
            value={locationLabel || "Unknown location"}
          />
          <InfoRow
            label="GPS availability"
            value={activeMission?.has_gps ? "Available" : "Unavailable"}
          />
          <InfoRow
            label="Metric focus"
            value={metricMeta?.label || metric}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Metric interpretation"
        description="Summary of the selected metric based on mission statistics and trend evolution."
        icon={FiTrendingUp}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Minimum"
            value={formatSafe(
              formatNumber,
              metricStats?.min,
              2,
              metricMeta?.unit ? ` ${metricMeta.unit}` : "",
            )}
          />
          <StatCard
            label="Maximum"
            value={formatSafe(
              formatNumber,
              metricStats?.max,
              2,
              metricMeta?.unit ? ` ${metricMeta.unit}` : "",
            )}
          />
          <StatCard
            label="Average"
            value={formatSafe(
              formatNumber,
              metricStats?.avg,
              2,
              metricMeta?.unit ? ` ${metricMeta.unit}` : "",
            )}
          />
          <StatCard
            label="Delta"
            value={trendSummary?.deltaLabel || "—"}
            hint="Difference between the beginning and the end of the selected range"
            tone={buildStatusTone(trendSummary?.direction)}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Baseline and anomaly context"
        description="Useful for identifying unusual environmental behavior in the selected range."
        icon={FiWind}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Baseline delta"
            value={formatSafe(formatNumber, baselineDelta, 2)}
            hint={baselineLabel}
            tone={
              Number.isFinite(Number(baselineDelta)) && Math.abs(Number(baselineDelta)) > 0
                ? "info"
                : "default"
            }
          />
          <StatCard
            label="Anomaly intervals"
            value={String(anomaliesCount)}
            hint="Continuous intervals considered unusual"
            tone={anomaliesCount > 0 ? "warning" : "success"}
          />
          <StatCard
            label="Interpretation"
            value={
              anomaliesCount > 0
                ? "Potential outliers detected"
                : "No strong anomaly pattern"
            }
            hint="Quick overview of anomaly behavior"
            tone={anomaliesCount > 0 ? "warning" : "success"}
          />
        </div>
      </SectionCard>

      {(profileType === "car" || profileType === "bicycle") && movementStats ? (
        <SectionCard
          title="Mobility snapshot"
          description="General movement context for route-based monitoring missions."
          icon={FiNavigation}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total distance"
              value={formatSafe(formatNumber, totalDistanceKm, 2, " km")}
            />
            <StatCard
              label="Avg moving speed"
              value={formatSafe(formatNumber, avgMovingSpeedKmh, 1, " km/h")}
            />
            <StatCard
              label="Stationary ratio"
              value={formatSafe(
                formatNumber,
                movementStats?.stationaryPct,
                0,
                " %",
              )}
              tone={
                Number(movementStats?.stationaryPct) > 35
                  ? "warning"
                  : Number(movementStats?.stationaryPct) > 15
                    ? "info"
                    : "success"
              }
            />
            <StatCard
              label="Stationary duration"
              value={formatSafe(
                formatNumber,
                movementStats?.stationaryDurationS,
                0,
                " s",
              )}
            />
          </div>
        </SectionCard>
      ) : null}

      {profileType === "drone" ? (
        <SectionCard
          title="Drone mission note"
          description="Altitude and flight-path interpretation are available in the profile-specific section below."
          icon={FiCompass}
        >
          <div className="rounded-2xl border border-base-300 bg-base-200/35 px-4 py-4 text-sm leading-6 text-base-content/70">
            For drone missions, the most relevant specialized insights come from
            altitude variation and aerial coverage context. These are shown in the
            dedicated drone analysis section.
          </div>
        </SectionCard>
      ) : null}

      {profileType === "static" ? (
        <SectionCard
          title="Static mission note"
          description="Stability-focused interpretation is available in the profile-specific section below."
          icon={FiCompass}
        >
          <div className="rounded-2xl border border-base-300 bg-base-200/35 px-4 py-4 text-sm leading-6 text-base-content/70">
            For static monitoring, the most important aspect is the stability of
            the selected metric over time and the absence of large drifts.
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
