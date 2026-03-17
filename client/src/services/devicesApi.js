import api from "./api";

export async function listDevices() {
  const { data } = await api.get("/devices");
  return data;
}

export async function scanDevices(cidr) {
  const { data } = await api.post("/devices/scan", cidr ? { cidr } : {});
  return data;
}

export async function selectDevice(device_uuid) {
  const { data } = await api.post("/devices/select", { device_uuid });
  return data;
}

export async function listDeviceProfiles() {
  const { data } = await api.get("/device-profiles");
  return data;
}

export async function setDeviceProfile(device_uuid, profile_type, profile_label = "") {
  const { data } = await api.post(`/devices/${device_uuid}/profile`, {
    profile_type,
    profile_label,
  });
  return data;
}

export async function configureDevice(device_uuid, { nickname, profile_type, profile_label = "" }) {
  const { data } = await api.post(`/devices/${device_uuid}/configure`, {
    nickname,
    profile_type,
    profile_label,
  });
  return data;
}
