import api from "./api";

// Device runtime / health
export async function getDeviceStatus() {
  const { data } = await api.get("/device/status");
  return data;
}

export async function getDeviceHealth() {
  const { data } = await api.get("/device/health");
  return data;
}

// Missions
export async function getDeviceMissions() {
  // Proxies device /missions response
  const { data } = await api.get("/missions");
  return data;
}

export async function getDbMissions(device_uuid) {
  const { data } = await api.get("/db/missions", {
    params: device_uuid ? { device_uuid } : undefined,
  });
  // Backend returns an array
  return Array.isArray(data) ? data : [];
}

export async function importNewMissions() {
  const { data } = await api.post("/sync/active/import-new", {});
  return data;
}
