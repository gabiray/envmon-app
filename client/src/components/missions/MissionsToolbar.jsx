import React, { useMemo, useState } from "react";
import {
  FiCalendar,
  FiChevronDown,
  FiFilter,
  FiMapPin,
  FiSearch,
  FiSliders,
  FiX,
} from "react-icons/fi";

function countActiveFilters({
  selectedDeviceId,
  selectedProfileFilter,
  startDate,
  endDate,
  selectedLocationIds,
}) {
  let count = 0;

  if (
    selectedDeviceId &&
    selectedDeviceId !== "all" &&
    selectedDeviceId !== "none"
  ) {
    count += 1;
  }

  if (selectedProfileFilter && selectedProfileFilter !== "all") {
    count += 1;
  }

  if (startDate) count += 1;
  if (endDate) count += 1;
  if ((selectedLocationIds || []).length > 0) count += 1;

  return count;
}

function FieldLabel({ children }) {
  return (
    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
      {children}
    </div>
  );
}

export default function MissionsToolbar({
  devicesRaw = [],
  selectedDeviceId = "all",
  onDeviceChange = () => {},

  profiles = [],
  selectedProfileFilter = "all",
  onProfileFilterChange = () => {},

  locationOptions = [],
  selectedLocationIds = [],
  onSelectedLocationIdsChange = () => {},

  searchValue = "",
  onSearchChange = () => {},

  sortBy = "date_desc",
  onSortChange = () => {},

  startDate = "",
  onStartDateChange = () => {},
  endDate = "",
  onEndDateChange = () => {},
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationsOpen, setLocationsOpen] = useState(
    (selectedLocationIds || []).length > 0,
  );

  const deviceOptions = useMemo(() => {
    return [
      { value: "all", label: "All devices" },
      ...(devicesRaw || []).map((device) => ({
        value: device.device_uuid,
        label:
          device.nickname ||
          device.hostname ||
          device.info?.hostname ||
          "Unnamed device",
      })),
    ];
  }, [devicesRaw]);

  const profileOptions = useMemo(() => {
    return [
      { value: "all", label: "All profiles" },
      ...(profiles || []).map((profile) => ({
        value: profile.type,
        label: profile.label || profile.type,
      })),
    ];
  }, [profiles]);

  const filteredLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return locationOptions || [];

    return (locationOptions || []).filter((item) =>
      String(item.name || item.label || "")
        .toLowerCase()
        .includes(q),
    );
  }, [locationOptions, locationSearch]);

  const activeFilterCount = countActiveFilters({
    selectedDeviceId,
    selectedProfileFilter,
    startDate,
    endDate,
    selectedLocationIds,
  });

  const hasActiveFilters = activeFilterCount > 0;

  const sortOptions = [
    { value: "date_desc", label: "Newest first" },
    { value: "date_asc", label: "Oldest first" },
    { value: "name_asc", label: "Name A–Z" },
    { value: "name_desc", label: "Name Z–A" },
  ];

  function handleClearOnlyFilters() {
    onDeviceChange("all");
    onProfileFilterChange("all");
    onStartDateChange("");
    onEndDateChange("");
    onSelectedLocationIdsChange([]);
    setLocationSearch("");
  }

  function toggleLocation(locationId) {
    const current = selectedLocationIds || [];

    if (current.includes(locationId)) {
      onSelectedLocationIdsChange(current.filter((id) => id !== locationId));
      return;
    }

    onSelectedLocationIdsChange([...current, locationId]);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <label className="flex h-11 min-w-[280px] flex-1 items-center gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 shadow-sm transition-colors hover:bg-base-200/60 lg:max-w-[460px]">
            <FiSearch className="shrink-0 text-base-content/40" />
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search missions..."
              className="w-full bg-transparent text-sm font-medium text-base-content outline-none placeholder:text-base-content/40"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="btn btn-ghost btn-xs btn-circle"
                aria-label="Clear search"
              >
                <FiX />
              </button>
            ) : null}
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={[
                "btn h-11 rounded-2xl px-4 shadow-sm border",
                filtersOpen
                  ? "btn-primary border-primary text-primary-content"
                  : hasActiveFilters
                    ? "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                    : "border-base-300 bg-base-100 text-base-content hover:bg-base-200/60",
              ].join(" ")}
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              <FiFilter />
              <span>Filters</span>

              {hasActiveFilters ? (
                <span
                  className={[
                    "ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    filtersOpen
                      ? "bg-white/15 text-primary-content"
                      : "bg-primary/15 text-primary",
                  ].join(" ")}
                >
                  {activeFilterCount}
                </span>
              ) : null}

              <FiChevronDown
                className={`transition-transform duration-200 ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <div className="dropdown dropdown-end">
              <button
                type="button"
                tabIndex={0}
                className="btn btn-square h-11 w-11 rounded-2xl border border-base-300 bg-base-100 shadow-sm hover:bg-base-200/60"
                aria-label="Sort missions"
                title="Sort missions"
              >
                <FiSliders className="text-[16px]" />
              </button>

              <ul
                tabIndex={0}
                className="dropdown-content menu z-[95] mt-2 w-52 rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-2xl"
              >
                {sortOptions.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      className={
                        sortBy === option.value
                          ? "active rounded-xl"
                          : "rounded-xl"
                      }
                      onClick={() => onSortChange(option.value)}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div
        className={[
          "overflow-hidden transition-all duration-300",
          filtersOpen ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <div className="rounded-[24px] border border-base-300 bg-base-200/40 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-base-content">
                Refine mission list
              </div>
              <div className="mt-1 text-xs text-base-content/55">
                Filter by device, profile, date and saved locations.
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
            >
              <FiX />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <label className="form-control">
              <FieldLabel>Device</FieldLabel>
              <select
                className="select select-bordered w-full rounded-2xl bg-base-100"
                value={selectedDeviceId}
                onChange={(e) => onDeviceChange(e.target.value)}
              >
                {deviceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <FieldLabel>Profile</FieldLabel>
              <select
                className="select select-bordered w-full rounded-2xl bg-base-100"
                value={selectedProfileFilter}
                onChange={(e) => onProfileFilterChange(e.target.value)}
              >
                {profileOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <FieldLabel>Start date</FieldLabel>
              <label className="input input-bordered flex h-11 items-center gap-2 rounded-2xl bg-base-100">
                <FiCalendar className="text-base-content/45" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="w-full bg-transparent outline-none"
                />
              </label>
            </label>

            <label className="form-control">
              <FieldLabel>End date</FieldLabel>
              <label className="input input-bordered flex h-11 items-center gap-2 rounded-2xl bg-base-100">
                <FiCalendar className="text-base-content/45" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="w-full bg-transparent outline-none"
                />
              </label>
            </label>
          </div>

          <div className="mt-4 overflow-hidden rounded-[22px] border border-base-300 bg-base-100">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-base-200/60"
              onClick={() => setLocationsOpen((prev) => !prev)}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-base-content">
                  Saved locations
                </div>
                <div className="mt-1 text-xs text-base-content/55">
                  Filter missions by selected saved start points.
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(selectedLocationIds || []).length > 0 ? (
                  <span className="badge badge-primary badge-sm">
                    {(selectedLocationIds || []).length}
                  </span>
                ) : null}

                <FiChevronDown
                  className={`text-base-content/50 transition-transform duration-200 ${
                    locationsOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {locationsOpen ? (
              <div className="border-t border-base-300 px-3 pb-3 pt-3">
                <label className="flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3 py-2 shadow-sm">
                  <FiMapPin className="text-base-content/40" />
                  <input
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Search saved locations..."
                  />
                </label>

                <div className="mt-3 max-h-[160px] overflow-y-auto rounded-2xl border border-base-300 bg-base-100 p-2 custom-scrollbar">
                  {filteredLocations.length === 0 ? (
                    <div className="flex min-h-20 items-center justify-center px-3 text-center text-sm text-base-content/50">
                      No matching locations found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {filteredLocations.map((location) => {
                        const locationId = location.id || location.value;
                        const label =
                          location.name || location.label || "Unnamed location";
                        const checked = (selectedLocationIds || []).includes(
                          locationId,
                        );

                        return (
                          <button
                            key={locationId}
                            type="button"
                            onClick={() => toggleLocation(locationId)}
                            className={[
                              "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition",
                              checked
                                ? "border-primary/35 bg-primary/5"
                                : "border-base-300 bg-base-100 hover:bg-base-200/70",
                            ].join(" ")}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-base-content">
                                {label}
                              </div>

                              {location.latlng?.lat != null &&
                              location.latlng?.lng != null ? (
                                <div className="mt-1 font-mono text-[11px] text-base-content/50">
                                  {Number(location.latlng.lat).toFixed(6)},{" "}
                                  {Number(location.latlng.lng).toFixed(6)}
                                </div>
                              ) : null}
                            </div>

                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm pointer-events-none"
                              checked={checked}
                              readOnly
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm rounded-xl"
              onClick={handleClearOnlyFilters}
            >
              Clear filters
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm rounded-xl"
              onClick={() => setFiltersOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
