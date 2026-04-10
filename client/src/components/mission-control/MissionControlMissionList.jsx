import React, { useMemo, useState } from "react";
import { FiRadio, FiSearch } from "react-icons/fi";
import MissionControlMissionListItem from "./MissionControlMissionListItem";

function makeMissionKey(item) {
  return `${item.device_uuid}:${item.mission_id}`;
}

export default function MissionControlMissionList({
  items = [],
  loading = false,
  selectedMissionKey = null,
  onSelectMissionKey = () => {},
}) {
  const [searchValue, setSearchValue] = useState("");
  const [expandedMissionKeys, setExpandedMissionKeys] = useState([]);

  const filteredItems = useMemo(() => {
    const q = String(searchValue || "").trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const haystack = [
        item.mission_name,
        item.mission_id,
        item.nickname,
        item.hostname,
        item.device_uuid,
        item.profile_label,
        item.profile_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [items, searchValue]);

  function handleToggleExpand(missionKey) {
    setExpandedMissionKeys((prev) =>
      prev.includes(missionKey)
        ? prev.filter((key) => key !== missionKey)
        : [...prev, missionKey]
    );
  }

  const showNoActiveMissions = !loading && items.length === 0;
  const showNoSearchResults = !loading && items.length > 0 && filteredItems.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-base-100">
      <div className="border-b border-base-300 px-5 py-5">
        <div className="flex items-center gap-2">
          <FiRadio className="text-primary" />
          <h2 className="text-lg font-semibold text-base-content">
            Active Streams
          </h2>
        </div>

        <p className="mt-1 text-sm text-base-content/60">
          Search a mission, device or profile.
        </p>

        <label className="mt-4 flex items-center gap-2 rounded-2xl border border-base-300 bg-base-100 px-3 py-2.5 shadow-sm">
          <FiSearch className="text-base-content/40" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search active streams..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-base-content/35"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : showNoActiveMissions ? (
          <div className="flex min-h-40 items-center justify-center">
            <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 px-6 py-8 text-center">
              <div className="text-base font-semibold text-base-content">
                No active missions
              </div>
              <div className="mt-2 text-sm text-base-content/60">
                There are currently no active missions to display.
              </div>
            </div>
          </div>
        ) : showNoSearchResults ? (
          <div className="flex min-h-40 items-center justify-center">
            <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 px-6 py-8 text-center">
              <div className="text-base font-semibold text-base-content">
                No matching results
              </div>
              <div className="mt-2 text-sm text-base-content/60">
                Try a different search term.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const missionKey = makeMissionKey(item);

              return (
                <MissionControlMissionListItem
                  key={missionKey}
                  mission={item}
                  missionKey={missionKey}
                  selected={selectedMissionKey === missionKey}
                  expanded={expandedMissionKeys.includes(missionKey)}
                  onToggleExpand={() => handleToggleExpand(missionKey)}
                  onSelect={() => onSelectMissionKey(missionKey)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
