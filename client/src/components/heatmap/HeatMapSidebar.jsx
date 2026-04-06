import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiActivity,
  FiArrowLeft,
  FiChevronDown,
  FiCpu,
  FiNavigation,
  FiSearch,
  FiTarget,
  FiMapPin,
} from "react-icons/fi";
import { TbDrone } from "react-icons/tb";
import { MdDirectionsBike } from "react-icons/md";
import { FaCarSide } from "react-icons/fa";

import HeatMapMissionList from "./HeatMapMissionList";
import MissionDetailsModal from "./MissionDetailsModal";

const METRIC_OPTIONS = [
  { value: "temp_c", label: "Temperature (°C)" },
  { value: "hum_pct", label: "Humidity (%)" },
  { value: "press_hpa", label: "Pressure (hPa)" },
  { value: "gas_ohms", label: "Gas resistance (Ω)" },
];

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

function LayerToggleButton({ active = false, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "btn btn-sm rounded-xl",
        active
          ? "btn-primary text-white border-none"
          : "btn-outline border-base-300 bg-base-100 hover:bg-base-200",
      ].join(" ")}
    >
      <Icon />
      {label}
    </button>
  );
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
  const SelectedIcon = selectedMeta.Icon;

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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={[
          "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left shadow-sm transition",
          "border-base-300 bg-base-100 hover:border-primary/25 hover:bg-base-200/40",
          "disabled:cursor-not-allowed disabled:opacity-60",
        ].join(" ")}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
          <SelectedIcon className="text-lg" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-base-content">
            {selectedMeta.label}
          </span>
          <span className="mt-0.5 block truncate text-xs text-base-content/55">
            {selectedMeta.description}
          </span>
        </span>

        <FiChevronDown
          className={`shrink-0 text-base-content/45 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-[40] overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl">
          <div className="space-y-1">
            {profiles.map((profile) => {
              const meta = getProfileMeta(profile.type);
              const Icon = meta.Icon;
              const active = profile.type === value;

              return (
                <button
                  key={profile.type}
                  type="button"
                  onClick={() => {
                    onChange(profile.type);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-base-content hover:bg-base-200/70",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      active
                        ? "bg-primary text-primary-content"
                        : "bg-base-200 text-base-content/70",
                    ].join(" ")}
                  >
                    <Icon className="text-sm" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {profile.label || meta.label}
                    </span>
                    <span className="block truncate text-xs opacity-65">
                      {meta.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
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
  onOpenAnalytics = () => {},
}) {
  const hasActiveDevice = Boolean(activeDevice && selectedDeviceId !== "none");
  const profileMeta = getProfileMeta(profileType);
  const isDetailsMode = Boolean(selectedMission);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  useEffect(() => {
    setDetailsModalOpen(false);
  }, [selectedMissionId]);

  const selectedMissionSummary = useMemo(() => {
    if (!selectedMission) return null;

    return {
      missionId: selectedMission.missionId,
      missionName: selectedMission.missionName,
      deviceUuid: selectedMission.deviceUuid,
      profileType: selectedMission.profileType,
      profileLabel: selectedMission.profileLabel,
      startedAtEpoch: selectedMission.startedAtEpoch,
      endedAtEpoch: selectedMission.endedAtEpoch,
      status: selectedMission.status,
      stopReason: selectedMission.stopReason,
      locationMode: selectedMission.locationMode,
      locationName: selectedMission.locationName,
      start: selectedMission.start,
      hasGps: selectedMission.hasGps,
      hasImages: selectedMission.hasImages,
    };
  }, [selectedMission]);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-base-100">
        <div className="border-b border-base-300 px-5 py-5">
          <div className="flex items-center gap-2">
            {isDetailsMode ? (
              <FiNavigation className="text-primary" />
            ) : (
              <FiTarget className="text-primary" />
            )}

            <h2 className="text-lg font-semibold">
              {isDetailsMode ? "Mission details" : "HeatMap explorer"}
            </h2>
          </div>

          <p className="mt-1 text-sm text-base-content/60">
            {isDetailsMode
              ? "Inspect the selected mission and control the visible layers."
              : "Filter missions by profile and explore mission locations on the map."}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
          {isDetailsMode ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xl font-semibold text-base-content">
                    {selectedMission.missionName}
                  </div>

                  <div className="mt-1 text-sm text-base-content/60">
                    {selectedMission.deviceName} •{" "}
                    {selectedMission.profileLabel || selectedMission.profileType}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                  onClick={onBackToExplorer}
                >
                  <FiArrowLeft />
                  Back
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-base-300 bg-base-200/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  <FiActivity />
                  Mission layers
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <LayerToggleButton
                    active={showTrack}
                    icon={FiNavigation}
                    label="View track"
                    onClick={onToggleTrack}
                  />

                  <LayerToggleButton
                    active={showHeatmap}
                    icon={FiActivity}
                    label="View heatmap"
                    onClick={onToggleHeatmap}
                  />
                </div>

                {showHeatmap ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_130px]">
                    <label className="form-control">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                        Heatmap metric
                      </div>

                      <select
                        className="select select-bordered w-full rounded-2xl"
                        value={heatmapMetric}
                        onChange={(e) => onHeatmapMetricChange(e.target.value)}
                      >
                        {METRIC_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="form-control">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                        Cell size (m)
                      </div>

                      <input
                        className="input input-bordered w-full rounded-2xl"
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

              <div className="mt-4 rounded-3xl border border-base-300 bg-base-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-base-content">
                      Mission details
                    </div>
                    <div className="mt-1 text-xs text-base-content/55">
                      Open the selected mission information in a modal window.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-primary rounded-xl"
                    onClick={() => setDetailsModalOpen(true)}
                    disabled={!selectedMission}
                  >
                    View details
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Profile filter
                  </div>

                  <ProfileDropdown
                    profiles={profiles}
                    value={profileType}
                    disabled={!hasActiveDevice}
                    onChange={onProfileChange}
                  />

                  <div className="mt-2 text-xs text-base-content/60">
                    {profileMeta.description}
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

              <div className="mt-5 flex items-center justify-between">
                <div className="text-sm font-semibold">Device missions</div>
                <span className="badge badge-outline">{missionCount}</span>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-3xl border border-base-300 bg-base-200/30 p-2">
                <HeatMapMissionList
                  loading={loading}
                  errorText={errorText}
                  missions={missions}
                  selectedMissionId={selectedMissionId}
                  expandedMissionIds={expandedMissionIds}
                  onToggleMissionExpand={onToggleMissionExpand}
                  onSelectMission={onSelectMission}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <MissionDetailsModal
        open={detailsModalOpen}
        mission={selectedMissionSummary}
        heatmapDisabled={true}
        analyticsDisabled={!selectedMissionSummary}
        onClose={() => setDetailsModalOpen(false)}
        onOpenHeatmap={() => {
          setDetailsModalOpen(false);
        }}
        onOpenAnalytics={() => {
          if (!selectedMission) return;
          setDetailsModalOpen(false);
          onOpenAnalytics(selectedMission);
        }}
      />
    </>
  );
}
