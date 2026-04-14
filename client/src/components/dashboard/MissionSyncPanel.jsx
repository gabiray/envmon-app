import React, { useMemo, useState } from "react";
import {
  FiCheckSquare,
  FiDatabase,
  FiDownload,
  FiFolderPlus,
  FiRefreshCw,
  FiSearch,
  FiSquare,
  FiChevronDown,
} from "react-icons/fi";

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

function MissionCheckbox({ checked }) {
  return checked ? (
    <FiCheckSquare className="text-primary text-base shrink-0" />
  ) : (
    <FiSquare className="text-base-content/40 text-base shrink-0" />
  );
}

function MissionRow({ mission, checked, onToggle }) {
  const imported = Boolean(mission.imported);

  const displayName =
    mission.mission_name && mission.mission_name.trim() !== ""
      ? mission.mission_name
      : mission.mission_id || "Unknown Mission";

  return (
    <button
      type="button"
      onClick={() => onToggle(mission.mission_id)}
      className={`group flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors duration-200
        ${
          checked
            ? "border-primary/50 bg-primary/5"
            : "border-base-300 bg-base-100 hover:bg-base-200/80"
        }`}
    >
      <div className="pt-0.5">
        <MissionCheckbox checked={checked} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`truncate text-sm font-semibold ${
                checked ? "text-primary" : "text-base-content"
              }`}
            >
              {displayName}
            </div>
            <div className="mt-1 truncate font-mono text-[11px] text-base-content/50">
              ID: {mission.mission_id}
            </div>
          </div>

          <div className="shrink-0">
            {imported ? (
              <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success-content/80">
                Imported
              </span>
            ) : (
              <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning-content/80">
                New
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-base-content/60">
          <span className="rounded-full border border-base-300 bg-base-200/80 px-2 py-1">
            {mission.profile_label || mission.profile_type || "Mission"}
          </span>

          <span className="rounded-full border border-base-300 bg-base-200/80 px-2 py-1">
            {formatEpoch(mission.started_at_epoch)}
          </span>

          {mission.has_gps && (
            <span className="rounded-full border border-info/30 bg-info/10 px-2 py-1 text-info-content/80 font-medium">
              GPS
            </span>
          )}

          {mission.has_images && (
            <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2 py-1 text-info-content/80 font-medium">
              Images
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function MissionSyncPanel({
  missions = [],
  selectedMissionIds = [],
  search = "",
  onSearchChange = () => {},
  onToggleMission = () => {},
  onRefresh = () => {},
  onImportSelected = () => {},
  onImportNew = () => {},
  loading = false,
  importing = null, // null | "new" | "selected" | "reimport"
  canImport = true,
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const selectedSet = useMemo(
    () => new Set(selectedMissionIds),
    [selectedMissionIds],
  );

  const filteredMissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return missions;

    return missions.filter((m) => {
      const name = String(m.mission_name || "").toLowerCase();
      const id = String(m.mission_id || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [missions, search]);

  const DISPLAY_LIMIT = 100;
  const displayedMissions = filteredMissions.slice(0, DISPLAY_LIMIT);
  const hasMoreMissions = filteredMissions.length > DISPLAY_LIMIT;

  const selectedCount = selectedMissionIds.length;
  const newCount = missions.filter((m) => !m.imported).length;

  const isImportingAny = Boolean(importing);
  const isImportingNew = importing === "new";
  const isImportingSelected = importing === "selected";

  return (
    <section className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 text-base-content shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FiDatabase className="text-primary" />
              <h2 className="text-base font-semibold">Mission sync</h2>
            </div>

            <p className="mt-1 text-sm text-base-content/60">
              Manage and import missions from the active device
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 items-center rounded-full border border-base-300 bg-base-200 px-3 text-xs font-medium text-base-content/80">
                Total {missions.length}
              </span>
              <span className="inline-flex h-8 items-center rounded-full border border-warning/30 bg-warning/10 px-3 text-xs font-medium text-warning-content/90">
                New {newCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              className="btn btn-sm btn-primary rounded-xl text-white border-none"
              onClick={onRefresh}
              disabled={loading || isImportingAny}
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <FiRefreshCw />
              )}
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              className="btn btn-sm btn-circle btn-ghost border border-base-300 bg-base-200 hover:bg-base-300"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label="Toggle sync panel"
            >
              <FiChevronDown
                className={`transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between rounded-2xl border border-base-300 bg-base-200/50 p-3">
              <div className="flex-1 w-full lg:max-w-md">
                <label className="flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3 py-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                  <FiSearch className="text-base-content/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search mission name or ID..."
                    className="w-full bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/40"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                <button
                  type="button"
                  className="btn btn-sm bg-base-100 border border-base-300 hover:bg-base-200 text-base-content rounded-xl font-medium"
                  onClick={onImportNew}
                  disabled={!canImport || isImportingAny || newCount === 0}
                >
                  {isImportingNew ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <FiDownload
                      className={
                        newCount > 0 ? "text-primary" : "text-base-content/40"
                      }
                    />
                  )}
                  {isImportingNew
                    ? "Importing new..."
                    : `Import new (${newCount})`}
                </button>

                <button
                  type="button"
                  className="btn btn-sm bg-primary hover:bg-primary/90 text-white border-none rounded-xl"
                  onClick={onImportSelected}
                  disabled={!canImport || isImportingAny || selectedCount === 0}
                >
                  {isImportingSelected ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <FiFolderPlus />
                  )}
                  {isImportingSelected
                    ? "Importing selected..."
                    : `Import selected (${selectedCount})`}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/30 p-2">
              {filteredMissions.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-base-300 bg-base-100 p-6 text-center text-sm text-base-content/50">
                  <FiDatabase className="text-3xl text-base-content/20 mb-2" />
                  <p>No missions found.</p>
                  {search && (
                    <p className="text-xs">Try adjusting your search query.</p>
                  )}
                </div>
              ) : (
                <div className="max-h-104 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                  {displayedMissions.map((mission) => (
                    <MissionRow
                      key={mission.mission_id}
                      mission={mission}
                      checked={selectedSet.has(mission.mission_id)}
                      onToggle={onToggleMission}
                    />
                  ))}

                  {hasMoreMissions && (
                    <div className="py-4 text-center text-xs text-base-content/50 font-medium">
                      Showing {DISPLAY_LIMIT} of {filteredMissions.length} missions.
                      <br className="sm:hidden" />
                      Use the search bar to find specific older missions.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
