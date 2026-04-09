import React from "react";
import { FiMap, FiCrosshair, FiLayers } from "react-icons/fi";

export default function MissionControlToolbar({
  activeCount = 0,
  connectedCount = 0,
  followSelected = true,
  showAll = true,
  onToggleFollow = () => {},
  onToggleShowAll = () => {},
}) {
  return (
    <section className="rounded-3xl border border-base-300 bg-base-100 p-4 shadow-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-base-content">Mission Control</h1>
          <p className="mt-1 text-sm text-base-content/65">
            Monitor all active missions and focus on a live device stream.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="badge badge-outline gap-2 px-3 py-3">
            <FiMap />
            {activeCount} active missions
          </div>

          <div className="badge badge-outline gap-2 px-3 py-3">
            <FiLayers />
            {connectedCount} connected devices
          </div>

          <button
            type="button"
            className={`btn btn-sm rounded-xl ${
              followSelected ? "btn-primary" : "btn-ghost border border-base-300"
            }`}
            onClick={onToggleFollow}
          >
            <FiCrosshair />
            {followSelected ? "Following selected" : "Follow selected"}
          </button>

          <button
            type="button"
            className={`btn btn-sm rounded-xl ${
              showAll ? "btn-primary" : "btn-ghost border border-base-300"
            }`}
            onClick={onToggleShowAll}
          >
            <FiLayers />
            {showAll ? "Showing all" : "Focused only"}
          </button>
        </div>
      </div>
    </section>
  );
}
