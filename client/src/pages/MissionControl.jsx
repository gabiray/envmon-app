import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useMissionControlLive } from "../hooks/useMissionControlLive";
import MissionControlToolbar from "../components/mission-control/MissionControlToolbar";
import MissionControlMissionList from "../components/mission-control/MissionControlMissionList";
import MissionControlMap2D from "../components/mission-control/MissionControlMap2D";
import MissionControlDetailsPanel from "../components/mission-control/MissionControlDetailsPanel";

function makeMissionKey(item) {
  return `${item.device_uuid}:${item.mission_id}`;
}

export default function MissionControl() {
  const { items, loading, error } = useMissionControlLive();
  const [searchParams] = useSearchParams();

  const initialMissionId = searchParams.get("mission_id");
  const initialDeviceUuid = searchParams.get("device_uuid");

  const [selectedMissionKey, setSelectedMissionKey] = useState(null);
  const [followSelected, setFollowSelected] = useState(true);
  const [showAll, setShowAll] = useState(true);

  useEffect(() => {
    if (!items.length) {
      setSelectedMissionKey(null);
      return;
    }

    const preferred = items.find(
      (item) =>
        item.mission_id === initialMissionId &&
        item.device_uuid === initialDeviceUuid
    );

    if (preferred) {
      setSelectedMissionKey(makeMissionKey(preferred));
      return;
    }

    setSelectedMissionKey((prev) => {
      if (prev && items.some((item) => makeMissionKey(item) === prev)) {
        return prev;
      }
      return makeMissionKey(items[0]);
    });
  }, [items, initialMissionId, initialDeviceUuid]);

  const selectedItem = useMemo(
    () =>
      items.find((item) => makeMissionKey(item) === selectedMissionKey) || null,
    [items, selectedMissionKey]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <MissionControlToolbar
        activeCount={items.length}
        connectedCount={items.length}
        followSelected={followSelected}
        showAll={showAll}
        onToggleFollow={() => setFollowSelected((prev) => !prev)}
        onToggleShowAll={() => setShowAll((prev) => !prev)}
      />

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <div className="col-span-12 min-h-0 xl:col-span-3">
          <MissionControlMissionList
            items={items}
            loading={loading}
            error={error}
            selectedMissionKey={selectedMissionKey}
            onSelectMissionKey={setSelectedMissionKey}
          />
        </div>

        <div className="col-span-12 xl:col-span-6">
          <MissionControlMap2D
            items={items}
            selectedItem={selectedItem}
            followSelected={followSelected}
            showAll={showAll}
          />
        </div>

        <div className="col-span-12 min-h-0 xl:col-span-3">
          <MissionControlDetailsPanel selectedItem={selectedItem} />
        </div>
      </div>
    </div>
  );
}
