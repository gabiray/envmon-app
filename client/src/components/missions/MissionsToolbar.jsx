import React from "react";
import { FiFilter, FiSearch, FiSliders } from "react-icons/fi";

export default function MissionsToolbar({
  devicesRaw = [],
  profiles = [],
  searchValue = "",
  onSearchChange = () => {},
  selectedDeviceFilter = "all",
  onDeviceFilterChange = () => {},
  selectedProfileFilter = "all",
  onProfileFilterChange = () => {},
  selectedLocationFilter = "all",
  onLocationFilterChange = () => {},
  startDate = "",
  onStartDateChange = () => {},
  endDate = "",
  onEndDateChange = () => {},
  locationOptions = [],
  sortBy = "date_desc",
  onSortChange = () => {},
  className = "",
}) {
  return (
    <section className={`flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between ${className}`}>
      
      {/* Partea stângă - Filtre rapide */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
        <label className="form-control w-full md:w-56">
          <div className="label py-1"><span className="label-text text-xs text-base-content/60 font-medium">Device</span></div>
          <select
            className="select select-bordered h-10 min-h-10 rounded-xl text-sm"
            value={selectedDeviceFilter}
            onChange={(e) => onDeviceFilterChange(e.target.value)}
          >
            <option value="all">All devices</option>
            {(devicesRaw || []).map((device) => (
              <option key={device.device_uuid} value={device.device_uuid}>
                {device.nickname || device.hostname || device.device_uuid}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control w-full md:w-48">
          <div className="label py-1"><span className="label-text text-xs text-base-content/60 font-medium">Profile</span></div>
          <select
            className="select select-bordered h-10 min-h-10 rounded-xl text-sm"
            value={selectedProfileFilter}
            onChange={(e) => onProfileFilterChange(e.target.value)}
          >
            <option value="all">All profiles</option>
            {(profiles || []).map((profile) => (
              <option key={profile.type} value={profile.type}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Partea dreaptă - Căutare, Filtre avansate și Sortare */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-end">
        
        {/* Search */}
        <label className="input input-bordered h-10 min-h-10 rounded-xl flex items-center gap-2 w-full md:w-72 text-sm">
          <FiSearch className="opacity-55" />
          <input
            type="text"
            className="grow"
            placeholder="Search missions..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>

        {/* Buton Filtrare Dropdown Corectat */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-outline border-base-300 h-10 min-h-10 rounded-xl px-4 text-sm font-medium">
            <FiFilter className="text-base" />
            Filters
          </div>

          <div tabIndex={0} className="dropdown-content z-[20] mt-2 w-[22rem] rounded-[24px] border border-base-300 bg-base-100 p-5 shadow-xl">
            <div className="space-y-4 text-left">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-base-content/75">Location</label>
                <select
                  className="select select-bordered select-sm h-9 rounded-lg w-full"
                  value={selectedLocationFilter}
                  onChange={(e) => onLocationFilterChange(e.target.value)}
                >
                  <option value="all">All locations</option>
                  {(locationOptions || []).map((location) => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-base-content/75">Start date</label>
                  <input
                    type="date"
                    className="input input-bordered input-sm h-9 rounded-lg w-full text-xs"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-base-content/75">End date</label>
                  <input
                    type="date"
                    className="input input-bordered input-sm h-9 rounded-lg w-full text-xs"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-200 mt-4">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm rounded-lg text-error hover:bg-error/10"
                  onClick={() => {
                    onLocationFilterChange("all");
                    onStartDateChange("");
                    onEndDateChange("");
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sortare */}
        <label className="form-control w-full md:w-44">
          <div className="label py-1 hidden md:block"><span className="label-text text-xs text-transparent select-none">Sort</span></div>
          <select 
            className="select select-bordered h-10 min-h-10 rounded-xl text-sm" 
            value={sortBy} 
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </select>
        </label>
      </div>
    </section>
  );
}
