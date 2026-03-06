import api from "./api";

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
