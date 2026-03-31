import React, { useMemo } from "react";
import { FiCalendar, FiMapPin, FiMoreVertical, FiTrash2, FiEdit2 } from "react-icons/fi";

function formatDate(epoch) {
  if (!epoch) return "—";

  try {
    return new Date(epoch * 1000).toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

function MissionSourceBadge({ source }) {
  if (source === "synced") {
    return (
      <span className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
        Synced
      </span>
    );
  }

  if (source === "device") {
    return (
      <span className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning-content">
        Device
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-info/20 bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
      Database
    </span>
  );
}

export default function MissionsTable({
  loading = false,
  rows = [],
  selectedIds = [],
  onToggleSelect = () => {},
  onToggleSelectAll = () => {},
  onClearSelection = () => {},
  onOpenAnalyticsForSelected = () => {},
  onOpenDetails = () => {},
  onRename = () => {},
  onDelete = () => {},
  className = "",
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const allVisibleSelected =
    rows.length > 0 && rows.every((row) => selectedSet.has(row.mission_id));

  const someVisibleSelected =
    rows.some((row) => selectedSet.has(row.mission_id)) && !allVisibleSelected;

  return (
    <section
      className={`overflow-hidden rounded-[24px] border border-base-200 bg-base-100 shadow-sm ${className}`}
    >
      {selectedIds.length > 0 ? (
        <div className="flex flex-col gap-3 border-b border-base-200 bg-primary/5 px-6 py-3 sm:flex-row sm:items-center sm:justify-between transition-colors">
          <div className="text-sm font-medium text-primary">
            {selectedIds.length} mission{selectedIds.length > 1 ? "s" : ""} selected
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-primary rounded-xl font-medium"
              onClick={onOpenAnalyticsForSelected}
            >
              Open in Analytics
            </button>

            <button
              type="button"
              className="btn btn-sm btn-ghost rounded-xl text-base-content/70 hover:text-base-content"
              onClick={onClearSelection}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className="custom-scrollbar max-h-[36rem] overflow-auto">
        <table className="table w-full">
          <thead className="sticky top-0 z-10 bg-base-200/40 backdrop-blur-md">
            <tr className="border-b border-base-200 text-xs font-semibold uppercase tracking-wider text-base-content/50">
              <th className="w-12 pl-6 pr-4 py-4">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm rounded border-base-content/30"
                  checked={allVisibleSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someVisibleSelected;
                  }}
                  onChange={() => onToggleSelectAll(rows)}
                  aria-label="Select all visible missions"
                />
              </th>
              <th className="px-4 py-4">Mission</th>
              <th className="px-4 py-4">Profile</th>
              <th className="px-4 py-4">Location</th>
              <th className="px-4 py-4">Date</th>
              <th className="px-4 py-4">Source</th>
              <th className="w-20 px-6 py-4 text-right"></th>
            </tr>
          </thead>

          <tbody className="bg-base-100">
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="flex items-center justify-center gap-3 px-2 py-12 text-sm text-base-content/50">
                    <span className="loading loading-spinner loading-sm" />
                    Loading missions...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
                    <div className="text-base font-medium text-base-content">No missions found</div>
                    <div className="max-w-md text-sm text-base-content/50">
                      Try another search or adjust your filters.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((mission) => {
                const isSelected = selectedSet.has(mission.mission_id);

                return (
                  <tr
                    key={mission.mission_id}
                    className={`cursor-pointer border-b border-base-200/60 transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-base-200/30"
                    }`}
                    onClick={() => onOpenDetails(mission)}
                  >
                    <td className="pl-6 pr-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm rounded border-base-content/30"
                        checked={isSelected}
                        onChange={() => onToggleSelect(mission.mission_id)}
                        aria-label={`Select mission ${mission.mission_name}`}
                      />
                    </td>

                    <td className="px-4 py-4">
                      <div className="min-w-[200px]">
                        <div className="font-semibold text-base-content text-sm">
                          {mission.mission_name}
                        </div>
                        <div className="mt-0.5 text-xs font-mono text-base-content/40">
                          {mission.mission_id}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-base-content/80">
                        {mission.profile_label || "—"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-base-content/70">
                        <FiMapPin className="shrink-0 text-base-content/40" />
                        <span className="max-w-[180px] truncate" title={mission.location_label}>
                          {mission.location_label}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-base-content/70">
                        <FiCalendar className="shrink-0 text-base-content/40" />
                        <span>{formatDate(mission.date_epoch)}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <MissionSourceBadge source={mission.source} />
                    </td>

                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {/* Meniu 3 puncte (Dropdown DaisyUI) */}
                      <div className="dropdown dropdown-end">
                        <div 
                          tabIndex={0} 
                          role="button" 
                          className="btn btn-ghost btn-sm btn-square rounded-xl text-base-content/60 hover:text-base-content"
                        >
                          <FiMoreVertical className="text-lg" />
                        </div>
                        <ul 
                          tabIndex={0} 
                          className="dropdown-content z-[50] menu p-2 mt-1 shadow-lg bg-base-100 rounded-xl w-40 border border-base-200"
                        >
                          <li>
                            <button 
                              className="text-sm font-medium" 
                              onClick={() => {
                                onRename(mission);
                                // Inchide dropdown-ul blurand elementul activ (optional)
                                document.activeElement.blur();
                              }}
                            >
                              <FiEdit2 className="text-base-content/60" /> Rename
                            </button>
                          </li>
                          <li>
                            <button 
                              className="text-sm font-medium text-error hover:bg-error/10 hover:text-error" 
                              onClick={() => {
                                onDelete(mission);
                                document.activeElement.blur();
                              }}
                            >
                              <FiTrash2 /> Delete
                            </button>
                          </li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 ? (
        <div className="border-t border-base-200 px-6 py-4 text-xs font-medium text-base-content/50">
          Showing {rows.length} mission{rows.length !== 1 ? "s" : ""}
        </div>
      ) : null}
    </section>
  );
}
