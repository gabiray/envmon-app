import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiBarChart2,
  FiClock,
  FiImage,
  FiLayers,
  FiMapPin,
  FiNavigation,
} from "react-icons/fi";
import { TbDrone } from "react-icons/tb";
import { MdDirectionsBike } from "react-icons/md";
import { FaCarSide } from "react-icons/fa";

import AnalyticsRechartsBarChart from "./charts/AnalyticsRechartsBarChart";
import { fetchDbSummary, fetchDbMissions } from "../../services/analyticsApi";

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;

  const mins = seconds / 60;
  if (mins < 60) return `${mins.toFixed(1)} min`;

  const hours = mins / 60;
  return `${hours.toFixed(1)} h`;
}

function getProfileMeta(type) {
  if (type === "drone") return { label: "Drone", Icon: TbDrone };
  if (type === "bicycle") return { label: "Bicycle", Icon: MdDirectionsBike };
  if (type === "car") return { label: "Car", Icon: FaCarSide };
  if (type === "static") return { label: "Static", Icon: FiMapPin };
  return { label: "Unknown", Icon: FiLayers };
}

function startOfDay(dateLike) {
  const date = new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(dateLike) {
  const date = startOfDay(dateLike);
  date.setDate(1);
  return date;
}

function sameDate(a, b) {
  return a.getTime() === b.getTime();
}

function formatDayShort(dateLike) {
  try {
    return new Date(dateLike).toLocaleDateString("ro-RO", {
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDayLong(dateLike) {
  try {
    return new Date(dateLike).toLocaleDateString("ro-RO", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatMonthShort(dateLike) {
  try {
    return new Date(dateLike).toLocaleDateString("ro-RO", {
      month: "short",
    });
  } catch {
    return "—";
  }
}

function formatMonthLong(dateLike) {
  try {
    return new Date(dateLike).toLocaleDateString("ro-RO", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getAvailableMissionYears(missions = []) {
  return Array.from(
    new Set(
      missions
        .map((mission) => {
          const epoch = Number(mission?.started_at_epoch);
          if (!Number.isFinite(epoch)) return null;
          return new Date(epoch * 1000).getFullYear();
        })
        .filter((year) => Number.isFinite(year)),
    ),
  ).sort((a, b) => b - a);
}

function buildBuckets(missions = [], range = "month", selectedYear = null) {
  const now = new Date();
  const missionMap = new Map();

  let start = null;
  let end = null;
  let shortFormatter = formatDayShort;
  let longFormatter = formatDayLong;
  let incrementFn = (date) => date.setDate(date.getDate() + 1);
  let bucketKeyFn = (date) => startOfDay(date).getTime();

  if (range === "week") {
    start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    end = startOfDay(now);

    shortFormatter = formatDayShort;
    longFormatter = formatDayLong;
    incrementFn = (date) => date.setDate(date.getDate() + 1);
    bucketKeyFn = (date) => startOfDay(date).getTime();
  } else if (range === "month") {
    start = startOfMonth(now);
    end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end = startOfDay(end);

    shortFormatter = formatDayShort;
    longFormatter = formatDayLong;
    incrementFn = (date) => date.setDate(date.getDate() + 1);
    bucketKeyFn = (date) => startOfDay(date).getTime();
  } else {
    const targetYear = Number.isFinite(Number(selectedYear))
      ? Number(selectedYear)
      : now.getFullYear();

    start = new Date(targetYear, 0, 1);
    end = new Date(targetYear, 11, 1);

    shortFormatter = formatMonthShort;
    longFormatter = formatMonthLong;
    incrementFn = (date) => date.setMonth(date.getMonth() + 1);
    bucketKeyFn = (date) =>
      new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  }

  missions.forEach((mission) => {
    const epoch = Number(mission?.started_at_epoch);
    if (!Number.isFinite(epoch)) return;

    const missionDate = new Date(epoch * 1000);

    if (range === "all") {
      if (missionDate.getFullYear() !== Number(selectedYear)) return;
    } else {
      if (missionDate < start || missionDate > end) return;
    }

    const key = bucketKeyFn(missionDate);
    missionMap.set(key, (missionMap.get(key) || 0) + 1);
  });

  const rows = [];
  const cursor = new Date(start);

  while (cursor <= end || sameDate(cursor, end)) {
    const bucketDate = new Date(cursor);
    const key = bucketKeyFn(bucketDate);

    rows.push({
      key,
      label: shortFormatter(bucketDate),
      fullLabel: longFormatter(bucketDate),
      value: missionMap.get(key) || 0,
    });

    incrementFn(cursor);

    if (rows.length > 366) break;
  }

  return rows;
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-3xl border border-base-300 bg-base-100 px-5 py-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="text-lg" />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-base-content/45">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-base-content">
            {value}
          </div>
        </div>
      </div>

      {hint ? (
        <div className="mt-3 text-sm text-base-content/60">{hint}</div>
      ) : null}
    </div>
  );
}

function MiniBarRow({ label, value, total, icon: Icon }) {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-base-content">
          <Icon className="text-primary" />
          <span>{label}</span>
        </div>
        <span className="text-sm text-base-content/60">{value}</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-base-200">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RangeChip({ active = false, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "btn btn-sm rounded-xl",
        active
          ? "btn-primary text-white border-none"
          : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function AnalyticsEmptyState() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [activityRange, setActivityRange] = useState("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorText("");

      try {
        const [summaryRes, missionsRes] = await Promise.all([
          fetchDbSummary(),
          fetchDbMissions(),
        ]);

        if (cancelled) return;

        setSummary(summaryRes || null);
        setMissions(Array.isArray(missionsRes) ? missionsRes : []);
      } catch (error) {
        if (cancelled) return;

        setErrorText(
          error?.response?.data?.error ||
            error?.message ||
            "Failed to load analytics overview.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const availableYears = useMemo(() => {
    return getAvailableMissionYears(missions);
  }, [missions]);

  useEffect(() => {
    if (!availableYears.length) {
      setSelectedYear(new Date().getFullYear());
      return;
    }

    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const overview = useMemo(() => {
    const totalMissions = missions.length;

    const durations = missions
      .map((mission) => {
        const start = Number(mission?.started_at_epoch);
        const end = Number(mission?.ended_at_epoch);

        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
          return null;
        }

        return end - start;
      })
      .filter((value) => Number.isFinite(value));

    const avgDuration =
      durations.length > 0
        ? durations.reduce((acc, value) => acc + value, 0) / durations.length
        : null;

    const withGps = missions.filter((mission) => mission?.has_gps).length;
    const withImages = missions.filter((mission) => mission?.has_images).length;

    const byProfileMap = new Map();
    missions.forEach((mission) => {
      const key = mission?.profile_type || "unknown";
      byProfileMap.set(key, (byProfileMap.get(key) || 0) + 1);
    });

    const byProfile = Array.from(byProfileMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        ...getProfileMeta(type),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalMissions,
      avgDuration,
      withGps,
      withImages,
      byProfile,
    };
  }, [missions]);

  const activityData = useMemo(() => {
    return buildBuckets(missions, activityRange, selectedYear);
  }, [missions, activityRange, selectedYear]);

  const activityMeta = useMemo(() => {
    if (activityRange === "week") {
      return {
        subtitle: "Daily mission count for the last 7 days",
      };
    }

    if (activityRange === "month") {
      return {
        subtitle: "Daily mission count for the current month",
      };
    }

    return {
      subtitle: `Monthly mission count for ${selectedYear}`,
    };
  }, [activityRange, selectedYear]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-base-300 bg-base-100 px-6 py-10 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-base-content/60">
            <span className="loading loading-spinner loading-sm" />
            Loading analytics overview...
          </div>
        </div>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="rounded-[2rem] border border-error/30 bg-error/10 px-6 py-6 text-sm text-error shadow-sm">
        {errorText}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-secondary/8" />

        <div className="relative px-6 py-7 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                <FiActivity />
                Analytics Overview
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                No mission selected
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/65 sm:text-base">
                Select one or more missions to unlock detailed trends, air
                quality insights, density analysis and profile-specific
                interpretation. Until then, this page shows a general overview
                of the recorded data.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary rounded-xl"
                onClick={() => navigate("/missions")}
              >
                Browse missions
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FiLayers}
          label="Total missions"
          value={summary?.mission_count ?? overview.totalMissions}
          hint="Stored in the analytics database"
        />
        <StatCard
          icon={FiNavigation}
          label="Devices used"
          value={summary?.device_count ?? "—"}
          hint="Distinct devices with recorded missions"
        />
        <StatCard
          icon={FiClock}
          label="Average duration"
          value={formatDuration(overview.avgDuration)}
          hint="Estimated from mission start and end time"
        />
        <StatCard
          icon={FiImage}
          label="Media coverage"
          value={`${overview.withGps}/${overview.withImages}`}
          hint="Missions with GPS / missions with images"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <FiBarChart2 className="text-primary" />
                Mission activity
              </div>
              <div className="mt-1 text-sm text-base-content/60">
                {activityMeta.subtitle}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RangeChip
                label="This week"
                active={activityRange === "week"}
                onClick={() => setActivityRange("week")}
              />

              <RangeChip
                label="This month"
                active={activityRange === "month"}
                onClick={() => setActivityRange("month")}
              />

              <div className="flex items-center gap-2">
                <RangeChip
                  label="All time"
                  active={activityRange === "all"}
                  onClick={() => setActivityRange("all")}
                />

                {activityRange === "all" ? (
                  <select
                    className="select select-sm h-9 min-h-9 w-[84px] rounded-xl border-base-300 bg-base-100 px-2 text-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {availableYears.length > 0 ? (
                      availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))
                    ) : (
                      <option value={selectedYear}>{selectedYear}</option>
                    )}
                  </select>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <AnalyticsRechartsBarChart
              data={activityData}
              xKey="label"
              yKey="value"
              xLabel={
                activityRange === "week"
                  ? "Day"
                  : activityRange === "month"
                    ? "Day"
                    : "Month"
              }
              yLabel="Missions"
              height={300}
              showLegend={true}
              legendLabel="Recorded missions"
              valueDecimals={0}
              yMinOverride={0}
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold">
              <FiLayers className="text-primary" />
              Profile distribution
            </div>
            <div className="mt-1 text-sm text-base-content/60">
              Mission distribution across supported profiles
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {overview.byProfile.length > 0 ? (
              overview.byProfile.map((item) => (
                <MiniBarRow
                  key={item.type}
                  label={item.label}
                  value={item.count}
                  total={overview.totalMissions}
                  icon={item.Icon}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/40 px-4 py-10 text-center text-sm text-base-content/55">
                No profile data available yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-base font-semibold">
          <FiActivity className="text-primary" />
          Try analytics
        </div>
        <div className="mt-1 text-sm text-base-content/60">
          Suggested next steps after selecting one or more missions
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-base-300 bg-base-200/35 px-4 py-4">
            <div className="font-medium">Compare missions</div>
            <div className="mt-1 text-sm text-base-content/60">
              Overlay multiple missions and compare trends.
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-200/35 px-4 py-4">
            <div className="font-medium">Inspect trends</div>
            <div className="mt-1 text-sm text-base-content/60">
              Analyze temperature, humidity, pressure and gas evolution.
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-200/35 px-4 py-4">
            <div className="font-medium">Check anomalies</div>
            <div className="mt-1 text-sm text-base-content/60">
              Highlight air-quality spikes and baseline deviations.
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-200/35 px-4 py-4">
            <div className="font-medium">Study movement</div>
            <div className="mt-1 text-sm text-base-content/60">
              Review density zones, dwell areas and movement behavior.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
