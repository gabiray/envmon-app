import { api } from "./api";

// Device related calls (station server -> device)
export const DevicesAPI = {
  getDevice: async () => (await api.get("/device")).data,
  setDevice: async (device_url) => (await api.post("/device", { device_url })).data,
  health: async () => (await api.get("/device/health")).data,
  status: async () => (await api.get("/device/status")).data,
};
