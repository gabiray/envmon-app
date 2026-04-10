import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useMissionControlLive } from "../hooks/useMissionControlLive";
import MissionControlMissionList from "../components/mission-control/MissionControlMissionList";
import MissionControlMap2D from "../components/mission-control/MissionControlMap2D";
import MissionControlTelemetryDock from "../components/mission-control/MissionControlTelemetryDock";

const TRAIL_STORAGE_KEY = "envmon:mission-control:trails:v2";
const MAX_POINTS_PER_MISSION = 1200;

function makeMissionKey(item) {
  return `${item.device_uuid}:${item.mission_id}`;
}

function toNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value);
}

function getLivePoint(item) {
  const live = item?.live || {};
  const fix = item?.gps?.last_good_fix || {};

  const lat = toNumber(live.lat ?? fix.lat);
  const lon = toNumber(live.lon ?? fix.lon);
  const alt_m = toNumber(live.alt_m ?? fix.alt_m);
  const ts_epoch = toNumber(live.ts_epoch ?? fix.ts_epoch);

  if (lat == null || lon == null) return null;

  return { lat, lon, alt_m, ts_epoch };
}

function samePoint(a, b) {
  if (!a || !b) return false;
  return (
    Math.abs(a.lat - b.lat) < 0.0000001 &&
    Math.abs(a.lon - b.lon) < 0.0000001 &&
    Math.abs((a.alt_m ?? 0) - (b.alt_m ?? 0)) < 0.01
  );
}

function loadStoredTrails() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(TRAIL_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const next = {};

    Object.entries(parsed).forEach(([missionKey, trail]) => {
      if (!Array.isArray(trail)) return;

      const cleaned = trail
        .map((point) => ({
          lat: toNumber(point?.lat),
          lon: toNumber(point?.lon),
          alt_m: toNumber(point?.alt_m),
          ts_epoch: toNumber(point?.ts_epoch),
        }))
        .filter((point) => point.lat != null && point.lon != null)
        .slice(-MAX_POINTS_PER_MISSION);

      if (cleaned.length) {
        next[missionKey] = cleaned;
      }
    });

    return next;
  } catch {
    return {};
  }
}

export default function MissionControl() {
  const { items, loading, error } = useMissionControlLive();
  const [searchParams] = useSearchParams();

  const initialMissionId = searchParams.get("mission_id");
  const initialDeviceUuid = searchParams.get("device_uuid");

  const [selectedMissionKey, setSelectedMissionKey] = useState(null);
  const [followSelected, setFollowSelected] = useState(true);
  const [showAll, setShowAll] = useState(true);
  const [resetNonce, setResetNonce] = useState(0);

  const initialSelectionResolvedRef = useRef(false);
  const [trailByMissionKey, setTrailByMissionKey] = useState(() =>
    loadStoredTrails(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        TRAIL_STORAGE_KEY,
        JSON.stringify(trailByMissionKey),
      );
    } catch {}
  }, [trailByMissionKey]);

  useEffect(() => {
    if (!items.length) {
      setSelectedMissionKey(null);
      return;
    }

    if (!initialSelectionResolvedRef.current) {
      const preferred = items.find(
        (item) =>
          item.mission_id === initialMissionId &&
          item.device_uuid === initialDeviceUuid,
      );

      setSelectedMissionKey(
        preferred ? makeMissionKey(preferred) : makeMissionKey(items[0]),
      );
      initialSelectionResolvedRef.current = true;
      return;
    }

    if (
      selectedMissionKey &&
      !items.some((item) => makeMissionKey(item) === selectedMissionKey)
    ) {
      setSelectedMissionKey(makeMissionKey(items[0]));
    }
  }, [items, initialMissionId, initialDeviceUuid, selectedMissionKey]);

  useEffect(() => {
    setTrailByMissionKey((prev) => {
      let changed = false;
      const next = { ...prev };

      items.forEach((item) => {
        const missionKey = makeMissionKey(item);
        const point = getLivePoint(item);

        if (!point) return;

        const existing = Array.isArray(next[missionKey])
          ? [...next[missionKey]]
          : [];
        const last = existing[existing.length - 1];

        if (!last) {
          existing.push(point);
          next[missionKey] = existing;
          changed = true;
          return;
        }

        const incomingTs = point.ts_epoch ?? null;
        const lastTs = last.ts_epoch ?? null;

        if (incomingTs != null && lastTs != null && incomingTs < lastTs) {
          return;
        }

        if (samePoint(last, point)) {
          if (incomingTs != null && lastTs != null && incomingTs !== lastTs) {
            existing[existing.length - 1] = {
              ...last,
              ts_epoch: incomingTs,
            };
            next[missionKey] = existing;
            changed = true;
          }
          return;
        }

        existing.push(point);

        if (existing.length > MAX_POINTS_PER_MISSION) {
          existing.splice(0, existing.length - MAX_POINTS_PER_MISSION);
        }

        next[missionKey] = existing;
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [items]);

  const selectedItem = useMemo(
    () =>
      items.find((item) => makeMissionKey(item) === selectedMissionKey) || null,
    [items, selectedMissionKey],
  );

  function handleSelectMission(missionKey) {
    setSelectedMissionKey(missionKey);
    setFollowSelected(true);
    setShowAll(false);
  }

  function handleReset() {
    setSelectedMissionKey(null);
    setFollowSelected(false);
    setShowAll(true);
    setResetNonce((prev) => prev + 1);
  }

  return (
    <section className="flex h-full min-h-0 overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="grid h-full min-h-0 flex-1 grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="h-full min-h-0 overflow-hidden border-b border-base-300 xl:border-b-0 xl:border-r">
          <MissionControlMissionList
            items={items}
            loading={loading}
            error={error}
            selectedMissionKey={selectedMissionKey}
            onSelectMissionKey={handleSelectMission}
          />
        </aside>

        <div className="h-full min-h-0 overflow-hidden">
          <MissionControlMap2D
            items={items}
            selectedMissionKey={selectedMissionKey}
            selectedItem={selectedItem}
            followSelected={followSelected}
            showAll={showAll}
            trailsByMissionKey={trailByMissionKey}
            resetNonce={resetNonce}
            onSetFollowSelected={setFollowSelected}
            onSetShowAll={setShowAll}
            onReset={handleReset}
            onSelectMissionKey={handleSelectMission}
            telemetryOverlay={
              <MissionControlTelemetryDock selectedItem={selectedItem} />
            }
          />
        </div>
      </div>
    </section>
  );
}
