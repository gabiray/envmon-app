import React from "react";
import {
  FiActivity,
  FiArrowLeft,
  FiCamera,
  FiChevronDown,
  FiClock,
  FiCpu,
  FiImage,
  FiMapPin,
  FiNavigation,
  FiSearch,
  FiTarget,
} from "react-icons/fi";
import { TbDrone } from "react-icons/tb";
import { MdDirectionsBike } from "react-icons/md";
import { FaCarSide } from "react-icons/fa";

import HeatMapMissionList from "./HeatMapMissionList";

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

function formatEpoch(epoch) {
  if (!epoch) return "—";

  try {
    return new Date(epoch * 1000).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getStatusBadgeClass(status) {
  const key = String(status || "").trim().toLowerCase();

  if (key === "completed" || key === "done") {
    return "badge badge-outline border-success/30 bg-success/10 text-success";
  }

  if (key === "running") {
    return "badge badge-outline border-info/30 bg-info/10 text-info";
  }

  if (key === "arming") {
    return "badge badge-outline border-warning/30 bg-warning/10 text-warning";
  }

  if (key === "aborted" || key === "error" || key === "failed") {
    return "badge badge-outline border-error/30 bg-error/10 text-error";
  }

  return "badge badge-outline border-base-300 bg-base-200 text-base-content/70";
}

function DetailTile({
  label,
  value,
  icon: Icon = null,
  mono = false,
  valueClassName = "",
}) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-200/40 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {Icon ? <Icon className="text-[13px]" /> : null}
        {label}
      </div>

      <div
        className={[
          "mt-1.5 text-sm font-semibold text-base-content",
          mono ? "font-mono break-all" : "",
          valueClassName,
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
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

  const isDetailsMode = Boolean(selectedMission);

  return (
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

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailTile
                label="Status"
                icon={FiActivity}
                value={
                  <span className={getStatusBadgeClass(selectedMission.status)}>
                    {selectedMission.status || "Unknown"}
                  </span>
                }
              />

              <DetailTile
                label="Location mode"
                icon={FiMapPin}
                value={selectedMission.locationMode || "Unknown"}
              />

              <DetailTile
                label="Started"
                icon={FiClock}
                value={formatEpoch(selectedMission.startedAtEpoch)}
              />

              <DetailTile
                label="Coordinates"
                icon={FiMapPin}
                value={selectedMission.locationLabel || "—"}
                mono
              />

              <DetailTile
                label="GPS data"
                icon={FiNavigation}
                value={selectedMission.hasGps ? "Available" : "Missing"}
              />

              <DetailTile
                label="Images"
                icon={FiImage}
                value={selectedMission.hasImages ? "Available" : "Missing"}
              />
            </div>

            <div className="mt-5 border-t border-base-300 pt-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
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

                <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-200 px-2.5 py-1 text-xs text-base-content/65">
                  <FiCamera className="text-[12px]" />
                  {selectedMission.hasImages ? "Camera used" : "No images"}
                </span>
              </div>
            </div>

            {showHeatmap ? (
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-base-300 pt-4 md:grid-cols-[minmax(0,1fr)_130px]">
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
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-primary">
                    <ProfileIcon className="text-lg" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <select
                      className="select select-sm select-ghost w-full px-0 text-sm font-semibold"
                      value={profileType}
                      onChange={(e) => onProfileChange(e.target.value)}
                      disabled={!hasActiveDevice}
                    >
                      {profiles.map((profile) => (
                        <option key={profile.type} value={profile.type}>
                          {profile.label || getProfileMeta(profile.type).label}
                        </option>
                      ))}
                    </select>

                    <div className="mt-0.5 truncate text-xs text-base-content/55">
                      {profileMeta.description}
                    </div>
                  </div>

                  <FiChevronDown className="shrink-0 text-base-content/35" />
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

            <div className="mt-4 min-h-0 flex-1">
              <HeatMapMissionList
                loading={loading}
                errorText={errorText}
                missions={missions}
                selectedMissionId={selectedMissionId}
                onSelectMission={onSelectMission}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
