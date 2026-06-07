import api from "./api";

export async function fetchAiMissionReport(missionId) {
  if (!missionId) return null;

  const { data } = await api.get(`/ai/reports/${missionId}`);
  return data;
}

export async function analyzeMissionWithAi(missionId, { regenerate = false } = {}) {
  if (!missionId) {
    throw new Error("missionId is required");
  }

  const { data } = await api.post("/ai/analyze-mission", {
    mission_id: missionId,
    regenerate,
  });

  return data;
}
