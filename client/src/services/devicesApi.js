import api from "./api";

export async function listDevices() {
  const { data } = await api.get("/devices");
  return data; // store (devices + active_device_uuid)
}

export async function scanDevices(cidr) {
  const { data } = await api.post("/devices/scan", cidr ? { cidr } : {});
  return data; // { found_count, devices, cidr_used, active_device_uuid }
}

export async function selectDevice(device_uuid) {
  const { data } = await api.post("/devices/select", { device_uuid });
  return data;
}
