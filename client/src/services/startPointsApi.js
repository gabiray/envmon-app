import api from "./api";

function toUiStartPoint(item) {
  return {
    id: item.id,
    name: item.name,
    latlng: { lat: item.lat, lng: item.lon },
    alt_m: item.alt_m ?? null,
    createdAtEpoch: item.created_at_epoch ?? null,
  };
}

export async function fetchStartPoints(device_uuid) {
  const { data } = await api.get("/start-points", {
    params: device_uuid ? { device_uuid } : undefined,
  });

  return (data.items ?? []).map(toUiStartPoint);
}

export async function createStartPoint({ device_uuid, name, latlng, alt_m = null }) {
  const { data } = await api.post("/start-points", {
    device_uuid,
    name,
    lat: latlng.lat,
    lon: latlng.lng,
    alt_m,
  });

  return toUiStartPoint(data.item);
}

export async function deleteStartPoint({ device_uuid, id }) {
  const { data } = await api.delete(`/start-points/${id}`, {
    params: device_uuid ? { device_uuid } : undefined,
  });

  return data;
}
