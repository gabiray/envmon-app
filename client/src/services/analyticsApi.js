import api from "./api";

export async function fetchAnalyticsMission(missionId) {
  const { data } = await api.get(`/db/missions/${missionId}`);
  return data?.item || null;
}

export async function fetchAnalyticsMissionStats(missionId) {
  const { data } = await api.get(`/db/missions/${missionId}/stats`);
  return data || null;
}

export async function fetchAnalyticsMissionTelemetry(missionId) {
  const { data } = await api.get(`/db/missions/${missionId}/telemetry`);
  return Array.isArray(data) ? data : [];
}

export async function fetchAnalyticsMissionImages(missionId) {
  const { data } = await api.get(`/db/missions/${missionId}/images`);
  return Array.isArray(data) ? data : [];
}

export function buildMissionImageUrl(missionId, imageId) {
  return `${api.defaults.baseURL}/db/missions/${missionId}/images/${imageId}/file`;
}
