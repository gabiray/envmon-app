import { useEffect, useMemo, useState } from "react";
import { fetchDbMissions } from "../services/heatmapApi";

function getDeviceUuid(device) {
  return (
    device?.uuid ||
    device?.device_uuid ||
    device?.id ||
    device?.info?.uuid ||
    null
  );
}

function getDeviceDisplayName(device) {
  if (!device) return "Unknown device";
  return (
    device.nickname ||
    device.hostname ||
    device.info?.hostname ||
    device.info?.name ||
    "Device"
  );
}

function formatEpoch(epoch) {
  if (!epoch) return "Unknown date";

  try {
    return new Date(epoch * 1000).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown date";
  }
}

function formatCoords(lat, lon) {
  if (lat == null || lon == null) return "No coordinates";
  return `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function buildDeviceNameMap(devicesRaw = []) {
  const map = new Map();

  for (const device of devicesRaw) {
    const uuid = getDeviceUuid(device);
    if (!uuid) continue;
    map.set(uuid, getDeviceDisplayName(device));
  }

  return map;
}

function getLocationKey(lat, lon) {
  return `${Number(lat).toFixed(5)}|${Number(lon).toFixed(5)}`;
}

function toUiMission(item, deviceNameMap) {
  const lat = item?.start?.lat ?? null;
  const lon = item?.start?.lon ?? null;
  const deviceUuid = item?.device_uuid || "";
  const deviceName = deviceNameMap.get(deviceUuid) || "Unknown device";
  const dateLabel = formatEpoch(item?.started_at_epoch || item?.created_at_epoch);

  return {
    missionId: item?.mission_id || "",
    missionName: item?.mission_name || item?.mission_id || "Unnamed mission",
    deviceUuid,
    deviceName,
    profileType: item?.profile_type || "unknown",
    profileLabel: item?.profile_label || "",
    startedAtEpoch: item?.started_at_epoch ?? null,
    endedAtEpoch: item?.ended_at_epoch ?? null,
    importedAtEpoch: item?.imported_at_epoch ?? null,
    status: item?.status || "unknown",
    stopReason: item?.stop_reason || "",
    locationMode: item?.location_mode || "unknown",
    hasGps: Boolean(item?.has_gps),
    hasImages: Boolean(item?.has_images),
    start: {
      lat,
      lon,
      alt_m: item?.start?.alt ?? item?.start?.alt_m ?? null,
    },
    locationKey:
      lat != null && lon != null ? getLocationKey(lat, lon) : null,
    dateLabel,
    locationLabel: formatCoords(lat, lon),
    searchBlob: [
      item?.mission_name || "",
      item?.mission_id || "",
      deviceName,
      item?.status || "",
      item?.location_mode || "",
      dateLabel,
      formatCoords(lat, lon),
    ]
      .join(" ")
      .toLowerCase(),
    raw: item,
  };
}

export default function useHeatMapData({
  selectedDeviceId = "none",
  profileType = "drone",
  searchValue = "",
  devicesRaw = [],
}) {
  const [missionsRaw, setMissionsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorText("");

      try {
        const data = await fetchDbMissions();
        if (cancelled) return;
        setMissionsRaw(Array.isArray(data) ? data : []);
      } catch (error) {
        if (cancelled) return;
        setMissionsRaw([]);
        setErrorText(
          error?.response?.data?.error ||
            error?.message ||
            "Failed to load database missions."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const deviceNameMap = useMemo(
    () => buildDeviceNameMap(devicesRaw),
    [devicesRaw]
  );

  const allMissions = useMemo(() => {
    return (missionsRaw || []).map((item) => toUiMission(item, deviceNameMap));
  }, [missionsRaw, deviceNameMap]);

  const profileMissions = useMemo(() => {
    return allMissions.filter((item) => item.profileType === profileType);
  }, [allMissions, profileType]);

  const normalizedSearch = useMemo(
    () => normalizeSearch(searchValue),
    [searchValue]
  );

  const activeDeviceMissions = useMemo(() => {
    const base = profileMissions.filter(
      (item) => item.deviceUuid === selectedDeviceId
    );

    const filtered = !normalizedSearch
      ? base
      : base.filter((item) => item.searchBlob.includes(normalizedSearch));

    return filtered.sort((a, b) => (b.startedAtEpoch || 0) - (a.startedAtEpoch || 0));
  }, [profileMissions, selectedDeviceId, normalizedSearch]);

  const missionMap = useMemo(() => {
    const map = new Map();
    for (const mission of profileMissions) {
      map.set(mission.missionId, mission);
    }
    return map;
  }, [profileMissions]);

  const locationPins = useMemo(() => {
    const grouped = new Map();

    for (const mission of profileMissions) {
      const lat = mission.start?.lat;
      const lon = mission.start?.lon;
      const key = mission.locationKey;

      if (lat == null || lon == null || !key) continue;

      const prev = grouped.get(key);

      if (!prev) {
        grouped.set(key, {
          key,
          lat,
          lon,
          missionsCount: 1,
          lastMissionEpoch: mission.startedAtEpoch || 0,
          missions: [mission],
          hasActiveDeviceMission: mission.deviceUuid === selectedDeviceId,
        });
        continue;
      }

      prev.missionsCount += 1;
      prev.missions.push(mission);
      prev.hasActiveDeviceMission =
        prev.hasActiveDeviceMission || mission.deviceUuid === selectedDeviceId;

      const missionEpoch = mission.startedAtEpoch || 0;
      if (missionEpoch >= (prev.lastMissionEpoch || 0)) {
        prev.lastMissionEpoch = missionEpoch;
      }
    }

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        missions: item.missions.sort(
          (a, b) => (b.startedAtEpoch || 0) - (a.startedAtEpoch || 0)
        ),
      }))
      .sort((a, b) => {
        if (a.hasActiveDeviceMission && !b.hasActiveDeviceMission) return -1;
        if (!a.hasActiveDeviceMission && b.hasActiveDeviceMission) return 1;
        return (b.lastMissionEpoch || 0) - (a.lastMissionEpoch || 0);
      });
  }, [profileMissions, selectedDeviceId]);

  return {
    loading,
    errorText,
    allMissions,
    profileMissions,
    activeDeviceMissions,
    missionMap,
    locationPins,
  };
}
