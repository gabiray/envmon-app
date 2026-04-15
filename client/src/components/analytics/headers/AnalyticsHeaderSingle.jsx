import React from "react";
import {
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiHash,
  FiMapPin,
  FiNavigation,
  FiImage,
} from "react-icons/fi";

function getSafeEpoch(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) {
      return num;
    }
  }
  return null;
}

function formatEpochLocal(epoch) {
  const value = Number(epoch);
  if (!Number.isFinite(value) || value <= 0) return "—";

  try {
    return new Date(value * 1000).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function MetaCard({ label, value, icon: Icon = null, mono = false }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {Icon ? <Icon className="text-[13px]" /> : null}
        {label}
      </div>
      <div
        className={`mt-1.5 text-sm font-semibold text-base-content ${
          mono ? "font-mono break-all" : ""
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function StatusChip({ children }) {
  return (
    <span className="inline-flex h-8 items-center rounded-full border border-base-300 bg-base-200 px-3 text-xs font-medium text-base-content/80">
      {children}
    </span>
  );
}

export default function AnalyticsHeaderSingle({
  mission = null,
  profileMeta = null,
  expanded = false,
  onToggleExpanded = () => {},
  overview = null,
}) {
  if (!mission) return null;

  const startedEpoch = getSafeEpoch(
    mission?.started_at_epoch,
    mission?.meta?.started_at_epoch,
    mission?.raw?.started_at_epoch,
    mission?.raw?.meta?.started_at_epoch,
  );

  const endedEpoch = getSafeEpoch(
    mission?.ended_at_epoch,
    mission?.meta?.ended_at_epoch,
    mission?.raw?.ended_at_epoch,
    mission?.raw?.meta?.ended_at_epoch,
  );

  const startedText = formatEpochLocal(startedEpoch);
  const endedText = formatEpochLocal(endedEpoch);

  const ProfileIcon = profileMeta?.Icon;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 text-xs font-medium text-primary">
                {ProfileIcon ? <ProfileIcon className="text-sm" /> : null}
                {profileMeta?.label ||
                  mission.profile_label ||
                  mission.profile_type ||
                  "Mission"}
              </span>

              <StatusChip>
                {overview?.statusText || "Unknown status"}
              </StatusChip>
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-base-content sm:text-3xl">
              {mission.mission_name || mission.mission_id || "Untitled mission"}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-base-content/60">
              Mission overview and context before detailed trend and
              profile-specific analysis.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip>
                {overview?.gpsText || "GPS status unknown"}
              </StatusChip>

              <StatusChip>
                {overview?.hasImages
                  ? "Captured images available"
                  : "No captured images"}
              </StatusChip>

              {overview?.locationSourceText ? (
                <StatusChip>{overview.locationSourceText}</StatusChip>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost border border-base-300 bg-base-200 hover:bg-base-300"
              onClick={onToggleExpanded}
              aria-label="Toggle mission summary"
            >
              <FiChevronDown
                className={`transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetaCard label="Started" value={startedText} icon={FiCalendar} />
          <MetaCard
            label="Duration"
            value={overview?.durationText}
            icon={FiClock}
          />
          <MetaCard
            label="Location"
            value={overview?.locationText}
            icon={FiMapPin}
          />
          <MetaCard label="GPS" value={overview?.gpsText} icon={FiNavigation} />
        </div>

        {expanded ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetaCard label="Ended" value={endedText} icon={FiCalendar} />
            <MetaCard
              label="Images"
              value={overview?.hasImages ? "Available" : "Not available"}
              icon={FiImage}
            />
            <MetaCard
              label="Location source"
              value={overview?.locationSourceText}
              icon={FiMapPin}
            />
            <MetaCard
              label="Mission ID"
              value={mission.mission_id}
              icon={FiHash}
              mono
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
