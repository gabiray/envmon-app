import React, { useMemo } from "react";
import {
  FiBarChart2,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiEye,
  FiMap,
  FiMoreVertical,
  FiTrash2,
} from "react-icons/fi";

function formatDate(epoch) {
  if (!epoch) return "--.--.--";
  try {
    return new Date(epoch * 1000).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return "--.--.--";
  }
}

function formatTime(epoch) {
  if (!epoch) return "--:--";
  try {
    return new Date(epoch * 1000).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--";
  }
}

function StatusText({ status }) {
  const key = String(status || "").toUpperCase();

  const map = {
    COMPLETED: "text-success",
    ABORTED: "text-error",
    ERROR: "text-error",
    RUNNING: "text-info",
  };

  const label =
    key === "COMPLETED"
      ? "Completed"
      : key === "ABORTED"
        ? "Aborted"
        : key === "ERROR"
          ? "Error"
          : key === "RUNNING"
            ? "Running"
            : status || "Unknown";

  return (
    <span className={`text-sm font-medium ${map[key] || "text-base-content/65"}`}>
      {label}
    </span>
  );
}

function SourceText({ source }) {
  const map = {
    synced: { label: "Synced", cls: "text-success" },
    device: { label: "Device", cls: "text-warning" },
    db: { label: "Database", cls: "text-base-content/70" },
  };

  const meta = map[source] || map.db;

  return <span className={`text-sm font-medium ${meta.cls}`}>{meta.label}</span>;
}

function getLocationDisplay(mission) {
  const explicitLabel =
    typeof mission.location_label === "string" ? mission.location_label.trim() : "";

  const lat = mission?.raw?.start?.lat ?? null;
  const lon = mission?.raw?.start?.lon ?? null;

  const hasCoords = lat != null && lon != null;

  const coordsLabel = hasCoords
    ? `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`
    : "Coordinates unavailable";

  if (
    explicitLabel &&
    explicitLabel !== "Unknown" &&
    explicitLabel !== coordsLabel
  ) {
    return {
      locationLabel: explicitLabel,
      coordsLabel,
    };
  }

  const locationMode =
    mission.location_mode === "fixed"
      ? "Fixed point"
      : mission.location_mode === "gps"
        ? "GPS location"
        : "Unknown location";

  return { locationLabel: locationMode, coordsLabel };
}

function SortHeader({ label, field, sortBy, onSort }) {
  const active = sortBy === `${field}_asc` || sortBy === `${field}_desc`;
  const isAsc = sortBy === `${field}_asc`;

  function toggle() {
    if (!active || isAsc) {
      onSort(`${field}_desc`);
    } else {
      onSort(`${field}_asc`);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1 text-left text-[13px] font-semibold uppercase tracking-[0.12em] text-base-content/70 transition-colors hover:text-base-content"
    >
      {label}
      {active ? (
        isAsc ? (
          <FiChevronUp className="text-primary" />
        ) : (
          <FiChevronDown className="text-primary" />
        )
      ) : (
        <FiChevronDown className="text-base-content/25" />
      )}
    </button>
  );
}

export default function MissionsTable({
  loading = false,
  rows = [],
  selectedIds = [],
  selectedMissionId = null,
  sortBy = "date_desc",
  onSortChange = () => {},
  deviceConnected = false,
  onToggleSelect = () => {},
  onToggleSelectAll = () => {},
  onClearSelection = () => {},
  onOpenAnalyticsForSelected = () => {},
  onOpenDetails = () => {},
  onOpenHeatmap = () => {},
  onOpenAnalytics = () => {},
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
    <div
      className={`relative rounded-[18px] border border-base-300 bg-base-100 shadow-sm ${className}`}
    >
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-base-300 bg-primary/5 px-5 py-3">
          <span className="text-sm font-medium text-primary">
            {selectedIds.length} mission{selectedIds.length > 1 ? "s" : ""} selected
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm rounded-xl px-4"
              onClick={onOpenAnalyticsForSelected}
            >
              Open Analytics
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm rounded-xl text-base-content/60"
              onClick={onClearSelection}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-visible min-h-fit custom-scrollbar">
        <table className="w-full min-w-[980px] table-fixed">
          <thead>
            <tr className="border-b border-base-300 bg-base-300/45">
              <th className="w-12 px-4 py-4">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm rounded"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  onChange={() => onToggleSelectAll(rows)}
                />
              </th>

              <th className="w-[260px] px-4 py-4 text-left">
                <SortHeader
                  label="Mission"
                  field="name"
                  sortBy={sortBy}
                  onSort={onSortChange}
                />
              </th>

              <th className="w-[130px] px-4 py-4 text-left">
                <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-base-content/70">
                  Profile
                </span>
              </th>

              <th className="w-[250px] px-4 py-4 text-left">
                <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-base-content/70">
                  Location
                </span>
              </th>

              <th className="w-[120px] px-4 py-4 text-left">
                <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-base-content/70">
                  Status
                </span>
              </th>

              <th className="w-[120px] px-4 py-4 text-left">
                <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-base-content/70">
                  Source
                </span>
              </th>

              <th className="w-[120px] px-4 py-4 text-left">
                <SortHeader
                  label="Date"
                  field="date"
                  sortBy={sortBy}
                  onSort={onSortChange}
                />
              </th>

              <th className="w-[72px] px-4 py-4 text-center">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-base-200/80">
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <div className="flex items-center justify-center gap-3 py-16 text-sm text-base-content/45">
                    <span className="loading loading-spinner loading-sm" />
                    Loading missions...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                    <div className="text-sm font-medium text-base-content/70">
                      No missions found
                    </div>
                    <div className="text-xs text-base-content/40">
                      Try adjusting your search or filters
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((mission) => {
                const isChecked = selectedSet.has(mission.mission_id);
                const isSelected = mission.mission_id === selectedMissionId;
                const { locationLabel, coordsLabel } = getLocationDisplay(mission);

                return (
                  <tr
                    key={mission.mission_id}
                    onClick={() => onOpenDetails(mission)}
                    className={[
                      "group cursor-pointer align-top transition-colors duration-150",
                      isSelected
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-base-200/35",
                    ].join(" ")}
                  >
                    <td
                      className="px-4 py-4 align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm rounded"
                        checked={isChecked}
                        onChange={() => onToggleSelect(mission.mission_id)}
                      />
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="min-w-0">
                        <div
                          className={[
                            "truncate text-sm font-semibold",
                            isSelected ? "text-primary" : "text-base-content",
                          ].join(" ")}
                        >
                          {mission.mission_name}
                        </div>

                        <div className="mt-1 truncate font-mono text-[11px] text-base-content/38">
                          {mission.mission_id}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="text-sm text-base-content/80">
                        {mission.profile_label || mission.profile_type || "--"}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-base-content/85">
                          {locationLabel}
                        </div>
                        <div className="mt-1 truncate text-[12px] text-base-content/42">
                          {coordsLabel}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <StatusText status={mission.status} />
                    </td>

                    <td className="px-4 py-4 align-top">
                      <SourceText source={mission.source} />
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div>
                        <div className="text-sm font-medium text-base-content/85">
                          {formatDate(mission.date_epoch)}
                        </div>
                        <div className="mt-1 text-[12px] text-base-content/42">
                          {formatTime(mission.date_epoch)}
                        </div>
                      </div>
                    </td>

                    <td
                      className="px-2 py-3 align-middle text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="dropdown dropdown-end">
                        <button
                          type="button"
                          tabIndex={0}
                          className="btn btn-ghost btn-md btn-square mx-auto flex h-10 w-10 min-h-10 items-center justify-center rounded-xl text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content"
                        >
                          <FiMoreVertical className="text-[20px]" />
                        </button>

                        <ul
                          tabIndex={0}
                          className="dropdown-content menu z-[90] mt-2 w-44 rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-2xl"
                        >
                          <li>
                            <button
                              className="rounded-xl py-2 text-sm"
                              onClick={() => onOpenDetails(mission)}
                            >
                              <FiEye className="text-base-content/60" />
                              Details
                            </button>
                          </li>

                          <li>
                            <button
                              className="rounded-xl py-2 text-sm"
                              onClick={() => onOpenHeatmap(mission)}
                            >
                              <FiMap className="text-base-content/60" />
                              Open HeatMap
                            </button>
                          </li>

                          <li>
                            <button
                              className="rounded-xl py-2 text-sm"
                              onClick={() => onOpenAnalytics(mission)}
                            >
                              <FiBarChart2 className="text-base-content/60" />
                              Analytics
                            </button>
                          </li>

                          <li>
                            <button
                              className="rounded-xl py-2 text-sm"
                              onClick={() => onRename(mission)}
                            >
                              <FiEdit2 className="text-base-content/60" />
                              Rename
                            </button>
                          </li>

                          <li className="mt-1 border-t border-base-200 pt-1">
                            <button
                              className="rounded-xl py-2 text-sm text-error hover:bg-error/8"
                              onClick={() => onDelete(mission)}
                            >
                              <FiTrash2 />
                              Delete
                            </button>
                          </li>

                          {mission.on_device && deviceConnected && (
                            <li>
                              <button
                                className="rounded-xl py-2 text-sm text-error/80 hover:bg-error/8"
                                onClick={() => onDelete(mission)}
                              >
                                <FiTrash2 />
                                Delete from device
                              </button>
                            </li>
                          )}
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

      {!loading && rows.length > 0 && (
        <div className="border-t border-base-200 px-5 py-3 text-xs font-medium text-base-content/40">
          {rows.length} mission{rows.length !== 1 ? "s" : ""}
          {selectedIds.length > 0 && (
            <span className="ml-2 text-primary">| {selectedIds.length} selected</span>
          )}
        </div>
      )}
    </div>
  );
}
