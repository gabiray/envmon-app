import api from "./api";

function toUiStartPoint(item) {
  return {
    id: item.id,
    name: item.name,
    latlng: { lat: item.lat, lng: item.lon },
    alt_m: item.alt_m ?? null,
    source: item.source ?? "manual",
    tags: Array.isArray(item.tags) ? item.tags : [],
    createdAtEpoch: item.created_at_epoch ?? null,
    updatedAtEpoch: item.updated_at_epoch ?? null,
    distance_m: item.distance_m ?? null,
  };
}

export async function fetchStartPoints(device_uuid) {
  const { data } = await api.get("/start-points", {
    params: device_uuid ? { device_uuid } : undefined,
  });

  return (data.items ?? []).map(toUiStartPoint);
}

export async function searchStartPoints({ device_uuid, q, limit = 20 }) {
  const { data } = await api.get("/start-points/search", {
    params: {
      ...(device_uuid ? { device_uuid } : {}),
      q,
      limit,
    },
  });

  return (data.items ?? []).map(toUiStartPoint);
}

export async function matchStartPointByCoords({
  device_uuid,
  lat,
  lon,
  radius_m = 20,
}) {
  const { data } = await api.post("/start-points/match", {
    device_uuid,
    lat,
    lon,
    radius_m,
  });

  return {
    ok: Boolean(data?.ok),
    matched: Boolean(data?.matched),
    distance_m: data?.distance_m ?? null,
    item: data?.item ? toUiStartPoint(data.item) : null,
  };
}

export async function createStartPoint({
  device_uuid,
  name,
  latlng,
  alt_m = null,
  source = "manual",
  tags = [],
}) {
  const { data } = await api.post("/start-points", {
    device_uuid,
    name,
    lat: latlng.lat,
    lon: latlng.lng,
    alt_m,
    source,
    tags,
  });

  return toUiStartPoint(data.item);
}

export async function deleteStartPoint({ device_uuid, id }) {
  const { data } = await api.delete(`/start-points/${id}`, {
    params: device_uuid ? { device_uuid } : undefined,
  });

  return data;
}
