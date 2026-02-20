import { api } from "./api";

export const MissionsAPI = {
  list: async () => (await api.get("/missions")).data,
  start: async (payload) => (await api.post("/missions/start", payload)).data,
  stop: async () => (await api.post("/missions/stop")).data,
  exportZipUrl: (missionId) => `/api/missions/${missionId}/export`,
};
