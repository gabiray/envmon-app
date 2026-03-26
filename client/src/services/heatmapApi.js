import api from "./api";

export async function fetchDbMissions(device_uuid) {
  const { data } = await api.get("/db/missions", {
    params: device_uuid ? { device_uuid } : undefined,
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchMissionTrack(mission_id) {
  const { data } = await api.get(`/db/missions/${mission_id}/track`);
  return Array.isArray(data) ? data : [];
}

export async function fetchMissionStats(mission_id) {
  const { data } = await api.get(`/db/missions/${mission_id}/stats`);
  return data || null;
}

export async function fetchHeatGrid({ mission_id, metric = "temp_c", cell_m = 15 }) {
  const { data } = await api.get("/db/heatmap", {
    params: { mission_id, metric, cell_m },
  });
  return data;
}
