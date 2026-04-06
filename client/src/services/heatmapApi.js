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

export async function fetchMissionImages(mission_id) {
  const { data } = await api.get(`/db/missions/${mission_id}/images`);
  return Array.isArray(data) ? data : [];
}

export function buildMissionImageUrl(missionId, imageId) {
  return `${api.defaults.baseURL}/db/missions/${missionId}/images/${imageId}/file`;
}

export async function fetchHeatGrid({
  mission_id,
  metric = "temp_c",
  cell_m = 15,
}) {
  const { data } = await api.get("/db/heatmap", {
    params: {
      mission_id,
      metric,
      cell_m,
    },
  });

  return data || null;
}
