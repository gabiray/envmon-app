import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCamera,
  FiChevronDown,
  FiChevronLeft,
  FiClock,
  FiCpu,
  FiMapPin,
  FiNavigation,
  FiSearch,
  FiTarget,
} from "react-icons/fi";
import { TbDrone } from "react-icons/tb";
import { MdDirectionsBike } from "react-icons/md";
import { FaCarSide } from "react-icons/fa";

function getProfileMeta(type) {
  if (type === "drone") {
    return {
      label: "Drone",
      Icon: TbDrone,
      description: "Aerial missions and geospatial scans",
    };
  }

  if (type === "bicycle") {
    return {
      label: "Bicycle",
      Icon: MdDirectionsBike,
      description: "Light mobile environmental routes",
    };
  }

  if (type === "car") {
    return {
      label: "Car",
      Icon: FaCarSide,
      description: "Road-based monitoring and transport routes",
    };
  }

  if (type === "static") {
    return {
      label: "Static Station",
      Icon: FiMapPin,
      description: "Fixed monitoring node with repeated acquisitions",
    };
  }

  return {
    label: "Unknown profile",
    Icon: FiCpu,
    description: "No profile metadata available",
  };
}

function formatEpoch(epoch) {
  if (!epoch) return "—";

  try {
    return new Date(epoch * 1000).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getStatusBadge(status) {
  const key = String(status || "").toLowerCase();

  if (key === "completed" || key === "done") {
    return "badge badge-outline border-success/30 bg-success/10 text-success";
  }

  if (key === "aborted" || key === "error" || key === "failed") {
    return "badge badge-outline border-error/30 bg-error/10 text-error";
  }

  if (key === "running") {
    return "badge badge-outline border-info/30 bg-info/10 text-info";
  }

  return "badge badge-outline border-base-300 bg-base-200 text-base-content/70";
}

function ProfileDropdown({
  profiles = [],
  value,
  disabled = false,
  onChange = () => {},
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selectedProfile = useMemo(() => {
    return profiles.find((item) => item.type === value) || { type: value };
  }, [profiles, value]);

  const selectedMeta = getProfileMeta(selectedProfile.type);
  const SelectedProfileIcon = selectedMeta.Icon;

  useEffect(() => {
    function handleClickOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={rootRef} className={`dropdown ${open ? "dropdown-open" : ""}`}>
      <button
        type="button"
        tabIndex={0}
        className="btn btn-sm btn-outline rounded-xl w-12 min-w-12 px-0"
        disabled={disabled}
        aria-label="Select profile"
        title={selectedMeta.label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <SelectedProfileIcon className="text-base opacity-85" />
      </button>

      <ul className="menu dropdown-content z-[30] mt-2 w-72 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl">
        {profiles.map((profile) => {
          const meta = getProfileMeta(profile.type);
          const Icon = meta.Icon;
          const active = profile.type === value;

          return (
            <li key={profile.type}>
              <button
                type="button"
                className={[
                  "flex items-center gap-3 rounded-xl",
                  active ? "bg-primary/10 text-primary" : "",
                ].join(" ")}
                onClick={() => {
                  onChange(profile.type);
                  setOpen(false);
                }}
              >
                <span
                  className={[
                    "inline-flex h-8 w-8 items-center justify-center rounded-full",
                    active
                      ? "bg-primary text-primary-content"
                      : "bg-base-200 text-base-content/70",
                  ].join(" ")}
                >
                  <Icon className="text-sm" />
                </span>

                <span className="font-medium">
                  {profile.label || meta.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MissionListItem({
  mission,
  selected = false,
  expanded = false,
  onSelect = () => {},
  onToggleExpand = () => {},
}) {
  const rootRef = useRef(null);

  function handleToggleExpand(e) {
    e.stopPropagation();
    onToggleExpand(mission.missionId);

    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }

  return (
    <div
      ref={rootRef}
      className={[
        "rounded-2xl border transition-all",
        selected
          ? "border-primary/35 bg-primary/5 shadow-sm"
          : "border-base-300 bg-base-100 hover:border-primary/20 hover:bg-base-200/40",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onSelect(mission)}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-base-content">
              {mission.missionName}
            </div>
            <div className="mt-1 text-xs text-base-content/55">
              {mission.dateLabel}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={getStatusBadge(mission.status)}>
              {mission.status || "Unknown"}
            </span>

            <button
              type="button"
              className="btn btn-ghost btn-xs rounded-lg"
              onClick={handleToggleExpand}
            >
              <FiChevronDown
                className={`transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-base-content/55">
          <FiMapPin className="text-primary" />
          <span className="truncate">{mission.locationLabel}</span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-base-300 px-4 py-3">
          <div className="grid grid-cols-1 gap-2 text-xs text-base-content/70">
            <div className="flex items-center gap-2">
              <FiNavigation className="text-base-content/45" />
              <span>GPS: {mission.hasGps ? "Available" : "Missing"}</span>
            </div>

            <div className="flex items-center gap-2">
              <FiCamera className="text-base-content/45" />
              <span>Images: {mission.hasImages ? "Available" : "Missing"}</span>
            </div>

            <div className="rounded-xl bg-base-200/70 px-3 py-2 font-mono text-[11px] text-base-content/65">
              {mission.missionId}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MissionDetailsInline({
  mission,
  showTrack = false,
  showHeatmap = false,
  heatmapMetric = "temp_c",
  heatmapCellM = 15,
  onToggleTrack = () => {},
  onToggleHeatmap = () => {},
  onHeatmapMetricChange = () => {},
  onHeatmapCellMChange = () => {},
  onBack = () => {},
}) {
  if (!mission) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
        <div className="min-w-0">
          <div className="text-base font-semibold text-base-content">
            Mission details
          </div>
          <div className="mt-1 truncate text-sm text-base-content/60">
            {mission.missionName}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-sm rounded-xl border-base-300 bg-base-100"
          onClick={onBack}
        >
          <FiChevronLeft />
          Back
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 custom-scrollbar">
        <div className="rounded-3xl border border-base-300 bg-base-100 shadow-sm">
          <div className="border-b border-base-300 px-4 py-4">
            <div className="text-lg font-semibold">{mission.missionName}</div>
            <div className="mt-1 text-sm text-base-content/60">
              {mission.deviceName} • {mission.profileLabel || mission.profileType}
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Status
                </div>
                <div className="mt-1.5 text-sm font-semibold">
                  {mission.status || "Unknown"}
                </div>
              </div>

              <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Location mode
                </div>
                <div className="mt-1.5 text-sm font-semibold">
                  {mission.locationMode || "Unknown"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Started
                </div>
                <div className="mt-1.5 text-sm font-semibold">
                  {formatEpoch(mission.startedAtEpoch)}
                </div>
              </div>

              <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Coordinates
                </div>
                <div className="mt-1.5 break-all font-mono text-sm font-semibold">
                  {mission.locationLabel}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={
                  showTrack
                    ? "btn btn-sm btn-primary rounded-xl"
                    : "btn btn-sm btn-outline rounded-xl"
                }
                onClick={onToggleTrack}
              >
                <FiNavigation />
                View track
              </button>

              <button
                type="button"
                className={
                  showHeatmap
                    ? "btn btn-sm btn-primary rounded-xl"
                    : "btn btn-sm btn-outline rounded-xl"
                }
                onClick={onToggleHeatmap}
              >
                <FiMapPin />
                View heatmap
              </button>
            </div>

            {showHeatmap ? (
              <div className="grid grid-cols-1 gap-3">
                <label className="form-control">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Heatmap metric
                  </div>
                  <select
                    className="select select-bordered rounded-xl"
                    value={heatmapMetric}
                    onChange={(e) => onHeatmapMetricChange(e.target.value)}
                  >
                    <option value="temp_c">Temperature (°C)</option>
                    <option value="hum_pct">Humidity (%)</option>
                    <option value="press_hpa">Pressure (hPa)</option>
                    <option value="gas_ohms">Gas resistance (Ω)</option>
                  </select>
                </label>

                <label className="form-control">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Cell size (m)
                  </div>
                  <input
                    className="input input-bordered rounded-xl"
                    type="number"
                    min="2"
                    step="1"
                    value={heatmapCellM}
                    onChange={(e) =>
                      onHeatmapCellMChange(Number(e.target.value) || 15)
                    }
                  />
                </label>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeatMapSidebar({
  activeDevice = null,
  selectedDeviceId = "none",
  profileType = "drone",
  profiles = [],
  searchValue = "",
  onProfileChange = () => {},
  onSearchChange = () => {},
  missionCount = 0,
  missions = [],
  loading = false,
  errorText = "",
  selectedMission = null,
  selectedMissionId = null,
  expandedMissionIds = [],
  onToggleMissionExpand = () => {},
  onSelectMission = () => {},
  onBackToExplorer = () => {},
  showTrack = false,
  showHeatmap = false,
  heatmapMetric = "temp_c",
  heatmapCellM = 15,
  onToggleTrack = () => {},
  onToggleHeatmap = () => {},
  onHeatmapMetricChange = () => {},
  onHeatmapCellMChange = () => {},
}) {
  const hasActiveDevice = Boolean(activeDevice && selectedDeviceId !== "none");
  const profileMeta = getProfileMeta(profileType);
  const ProfileIcon = profileMeta.Icon;

  const detailsOpen = Boolean(selectedMissionId);

  return (
    <div className="h-full overflow-hidden bg-base-100">
      <div
        className={`flex h-full w-[200%] transition-transform duration-300 ease-out ${
          detailsOpen ? "-translate-x-1/2" : "translate-x-0"
        }`}
      >
        {/* Explorer */}
        <div className="flex h-full w-1/2 min-h-0 flex-col">
          <div className="border-b border-base-300 px-5 py-5">
            <div className="flex items-center gap-2">
              <FiTarget className="text-primary" />
              <h2 className="text-lg font-semibold">HeatMap explorer</h2>
            </div>

            <p className="mt-1 text-sm text-base-content/60">
              Filter missions by profile and explore mission locations on the map.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Profile filter
                </div>

                <div className="flex items-center gap-3">
                  <ProfileDropdown
                    profiles={profiles}
                    value={profileType}
                    disabled={!hasActiveDevice}
                    onChange={onProfileChange}
                  />

                  <div className="min-w-0 rounded-2xl border border-base-300 bg-base-200/50 px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
                      <ProfileIcon className="text-primary" />
                      {profileMeta.label}
                    </div>
                    <div className="mt-0.5 text-xs text-base-content/60">
                      {profileMeta.description}
                    </div>
                  </div>
                </div>
              </div>

              <label className="form-control">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  Search missions
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-base-300 bg-base-100 px-3 py-2.5">
                  <FiSearch className="shrink-0 text-base-content/40" />
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    disabled={!hasActiveDevice}
                    placeholder="Search by mission, date or location..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-base-content/35"
                  />
                </div>
              </label>
            </div>

            <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-base-content">
                  Device missions
                </div>

                <span className="badge badge-outline">{missionCount}</span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {!hasActiveDevice ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-200/40 px-6 text-center text-sm text-base-content/55">
                    Select a device from the topbar.
                  </div>
                ) : loading ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-200/40 px-6 text-center">
                    <div>
                      <div className="loading loading-spinner loading-md text-primary" />
                      <div className="mt-3 text-sm text-base-content/60">
                        Loading missions...
                      </div>
                    </div>
                  </div>
                ) : errorText ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center rounded-3xl border border-error/30 bg-error/10 px-6 text-center text-sm text-error">
                    {errorText}
                  </div>
                ) : missions.length === 0 ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-200/40 px-6 text-center text-sm text-base-content/55">
                    No missions found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {missions.map((mission) => (
                      <MissionListItem
                        key={mission.missionId}
                        mission={mission}
                        selected={mission.missionId === selectedMissionId}
                        expanded={expandedMissionIds.includes(mission.missionId)}
                        onSelect={onSelectMission}
                        onToggleExpand={onToggleMissionExpand}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="flex h-full w-1/2 min-h-0 flex-col border-l border-base-300 bg-base-100">
          {selectedMission ? (
            <MissionDetailsInline
              mission={selectedMission}
              showTrack={showTrack}
              showHeatmap={showHeatmap}
              heatmapMetric={heatmapMetric}
              heatmapCellM={heatmapCellM}
              onToggleTrack={onToggleTrack}
              onToggleHeatmap={onToggleHeatmap}
              onHeatmapMetricChange={onHeatmapMetricChange}
              onHeatmapCellMChange={onHeatmapCellMChange}
              onBack={onBackToExplorer}
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-base-content">
                    Mission details
                  </div>
                  <div className="mt-1 text-sm text-base-content/60">
                    Loading mission...
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                  onClick={onBackToExplorer}
                >
                  <FiChevronLeft />
                  Back
                </button>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center p-5 text-sm text-base-content/55">
                Preparing mission details...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
