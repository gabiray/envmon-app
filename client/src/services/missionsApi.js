import api from "./api";

function buildParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function toMissionListItem(item) {
  if (!item) return null;

  return {
    mission_id: item.mission_id,
    mission_name: item.mission_name || item.mission_id || "Unknown mission",
    device_uuid: item.device_uuid ?? null,
    profile_type: item.profile_type ?? null,
    profile_label: item.profile_label ?? null,
    created_at_epoch: item.created_at_epoch ?? null,
    started_at_epoch: item.started_at_epoch ?? null,
    ended_at_epoch: item.ended_at_epoch ?? null,
    status: item.status ?? null,
    stop_reason: item.stop_reason ?? null,
    location_mode: item.location_mode ?? null,
    start: item.start
      ? {
          lat: item.start.lat ?? null,
          lon: item.start.lon ?? null,
          alt_m: item.start.alt_m ?? null,
        }
      : null,
    has_gps: Boolean(item.has_gps),
    has_images: Boolean(item.has_images),
    imported_at_epoch: item.imported_at_epoch ?? null,
    imported: item.imported ?? null,
    incomplete: Boolean(item.incomplete),
    raw: item,
  };
}

function toDbMissionDetails(item) {
  if (!item) return null;

  return {
    mission_id: item.mission_id,
    mission_name: item.mission_name || item.mission_id || "Unknown mission",
    device_uuid: item.device_uuid ?? null,
    profile_type: item.profile_type ?? null,
    profile_label: item.profile_label ?? null,
    created_at_epoch: item.created_at_epoch ?? null,
    started_at_epoch: item.started_at_epoch ?? null,
    ended_at_epoch: item.ended_at_epoch ?? null,
    status: item.status ?? null,
    stop_reason: item.stop_reason ?? null,
    location_mode: item.location_mode ?? null,
    start: item.start
      ? {
          lat: item.start.lat ?? null,
          lon: item.start.lon ?? null,
          alt_m: item.start.alt_m ?? null,
        }
      : null,
    has_gps: Boolean(item.has_gps),
    has_images: Boolean(item.has_images),
    imported_at_epoch: item.imported_at_epoch ?? null,
    telemetry_count: item.telemetry_count ?? 0,
    image_count: item.image_count ?? 0,
    profile: item.profile ?? {},
    meta: item.meta ?? {},
    raw_zip_path: item.raw_zip_path ?? null,
    unpacked_path: item.unpacked_path ?? null,
    raw: item,
  };
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/* Active device mission runtime APIs */
export async function startMission(payload) {
  const { data } = await api.post("/missions/start", payload);
  return data;
}

export async function stopMission() {
  const { data } = await api.post("/missions/stop", {});
  return data;
}

export async function abortMission() {
  const { data } = await api.post("/missions/abort", {});
  return data;
}

/* Device-side mission handling */
export async function fetchDeviceMissions() {
  const { data } = await api.get("/missions");

  return {
    ok: Boolean(data?.ok),
    missions: ensureArray(data?.missions),
    incomplete_missions: ensureArray(data?.incomplete_missions),
    missions_meta: data?.missions_meta ?? {},
    raw: data,
  };
}

export async function renameDeviceMission(mission_id, mission_name) {
  const { data } = await api.patch(`/device/missions/${mission_id}`, {
    mission_name,
  });
  return data;
}

export async function deleteDeviceMission(mission_id) {
  const { data } = await api.delete(`/device/missions/${mission_id}`);
  return data;
}

export async function downloadDeviceMissionZip(mission_id) {
  const response = await api.get(`/missions/${mission_id}/export`, {
    responseType: "blob",
  });

  triggerBlobDownload(response.data, `${mission_id}.zip`);
  return { ok: true };
}

/* DB mission list + detail */
export async function fetchDbSummary(device_uuid) {
  const { data } = await api.get("/db/summary", {
    params: buildParams({ device_uuid }),
  });

  return {
    ok: Boolean(data?.ok),
    mission_count: Number(data?.mission_count ?? 0),
    device_count: Number(data?.device_count ?? 0),
    raw: data,
  };
}

export async function fetchDbMissions(device_uuid) {
  const { data } = await api.get("/db/missions", {
    params: buildParams({ device_uuid }),
  });

  return ensureArray(data).map(toMissionListItem).filter(Boolean);
}

export async function fetchDbMissionDetails(mission_id) {
  const { data } = await api.get(`/db/missions/${mission_id}`);
  return toDbMissionDetails(data?.item);
}

export async function renameDbMission(mission_id, mission_name) {
  const { data } = await api.patch(`/db/missions/${mission_id}`, {
    mission_name,
  });
  return data;
}

export async function deleteDbMission(mission_id) {
  const { data } = await api.delete(`/db/missions/${mission_id}`);
  return data;
}

export async function downloadDbMissionZip(mission_id) {
  const response = await api.get(`/db/missions/${mission_id}/export`, {
    responseType: "blob",
  });

  triggerBlobDownload(response.data, `${mission_id}.zip`);
  return { ok: true };
}

/* Sync / import DB */
export async function importNewMissions() {
  const { data } = await api.post("/sync/active/import-new", {});
  return data;
}

export async function importSelectedMissions(mission_ids) {
  const { data } = await api.post("/sync/active/import-selected", {
    mission_ids: ensureArray(mission_ids),
  });
  return data;
}
