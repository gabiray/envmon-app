import React, { useMemo } from "react";
import {
  FiCheckSquare,
  FiDatabase,
  FiDownload,
  FiFolderPlus,
  FiRefreshCw,
  FiSearch,
  FiSquare,
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
    <FiSquare className="text-neutral-content/45 text-base shrink-0" />
  );
}

function MissionRow({ mission, checked, onToggle }) {
  const imported = Boolean(mission.imported);

  return (
    <button
      type="button"
      onClick={() => onToggle(mission.mission_id)}
      className="group flex w-full items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-left transition hover:bg-white/[0.07]"
    >
      <div className="pt-0.5">
        <MissionCheckbox checked={checked} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-neutral-content">
              {mission.mission_name || mission.mission_id}
            </div>

            <div className="mt-1 truncate font-mono text-[11px] text-neutral-content/45">
              {mission.mission_id}
            </div>
          </div>

          <div className="shrink-0">
            {imported ? (
              <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                Imported
              </span>
            ) : (
              <span className="rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
                New
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-content/50">
          <span className="rounded-full border border-white/8 bg-black/15 px-2 py-1">
            {mission.profile_label || mission.profile_type || "Mission"}
          </span>

          <span className="rounded-full border border-white/8 bg-black/15 px-2 py-1">
            {formatEpoch(mission.started_at_epoch)}
          </span>

          {mission.has_gps ? (
            <span className="rounded-full border border-info/20 bg-info/10 px-2 py-1 text-info">
              GPS
            </span>
          ) : null}

          {mission.has_images ? (
            <span className="rounded-full border border-secondary/20 bg-secondary/10 px-2 py-1 text-secondary">
              Images
            </span>
          ) : null}
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
  onToggleSelectAllVisible = () => {},
  onRefresh = () => {},
  onImportSelected = () => {},
  onImportNew = () => {},
  loading = false,
  importing = false,
  canImport = true,
}) {
  const selectedSet = useMemo(
    () => new Set(selectedMissionIds),
    [selectedMissionIds]
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

  const visibleSelectable = useMemo(
    () => filteredMissions.filter((m) => !m.imported),
    [filteredMissions]
  );

  const allVisibleSelected =
    visibleSelectable.length > 0 &&
    visibleSelectable.every((m) => selectedSet.has(m.mission_id));

  const selectedCount = selectedMissionIds.length;
  const importedCount = missions.filter((m) => m.imported).length;
  const newCount = missions.filter((m) => !m.imported).length;

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral/80 bg-neutral text-neutral-content shadow-xl">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FiDatabase className="text-neutral-content/70" />
              <h2 className="text-base font-semibold tracking-[0.01em]">
                Mission sync
              </h2>
            </div>

            <p className="mt-1 text-sm text-neutral-content/55">
              Select the missions you want to import from the active device
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-content/80">
                Total {missions.length}
              </span>

              <span className="rounded-full border border-warning/20 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
                New {newCount}
              </span>

              <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                Imported {importedCount}
              </span>

              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                Selected {selectedCount}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-sm rounded-xl border-0 bg-white/8 text-neutral-content hover:bg-white/12"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <FiRefreshCw />
              )}
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              className="btn btn-sm rounded-xl border-0 bg-white/8 text-neutral-content hover:bg-white/12"
              onClick={onToggleSelectAllVisible}
              disabled={visibleSelectable.length === 0}
            >
              {allVisibleSelected ? <FiSquare /> : <FiCheckSquare />}
              {allVisibleSelected ? "Clear visible" : "Select visible"}
            </button>

            <button
              type="button"
              className="btn btn-sm rounded-xl border-0 bg-warning text-warning-content hover:bg-warning/90"
              onClick={onImportNew}
              disabled={!canImport || importing || newCount === 0}
            >
              <FiDownload />
              Import new
            </button>

            <button
              type="button"
              className="btn btn-sm rounded-xl border-0 bg-primary text-primary-content hover:bg-primary/90"
              onClick={onImportSelected}
              disabled={!canImport || importing || selectedCount === 0}
            >
              {importing ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <FiFolderPlus />
              )}
              {importing ? "Importing..." : "Import selected"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">
            <FiSearch className="text-neutral-content/45" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by mission name or ID"
              className="w-full bg-transparent text-sm text-neutral-content outline-none placeholder:text-neutral-content/35"
            />
          </label>
        </div>

        <div className="mt-4 rounded-[22px] border border-white/8 bg-black/10 p-2">
          {filteredMissions.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-neutral-content/50">
              No missions found.
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto pr-1">
              <div className="space-y-2">
                {filteredMissions.map((mission) => (
                  <MissionRow
                    key={mission.mission_id}
                    mission={mission}
                    checked={selectedSet.has(mission.mission_id)}
                    onToggle={onToggleMission}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-neutral-content/45">
          The mission list stays scrollable so the dashboard height remains stable.
        </div>
      </div>
    </section>
  );
}
