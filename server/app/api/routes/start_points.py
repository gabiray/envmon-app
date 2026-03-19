from flask import Blueprint, jsonify, request

from app.repositories.start_points_repo import StartPointsRepo
from app.services.device_store import load_store

start_points_bp = Blueprint("start_points", __name__)


def _get_device_uuid_from_request() -> str | None:
    du = (request.args.get("device_uuid") or "").strip()
    if du:
        return du

    body = request.get_json(silent=True) or {}
    du = (body.get("device_uuid") or "").strip()
    if du:
        return du

    store = load_store()
    return store.get("active_device_uuid")


@start_points_bp.get("/start-points")
def list_start_points():
    device_uuid = _get_device_uuid_from_request()
    if not device_uuid:
        return jsonify({"ok": False, "error": "device_uuid missing (and no active device selected)"}), 400

    repo = StartPointsRepo()
    return jsonify({
        "ok": True,
        "device_uuid": device_uuid,
        "items": repo.list(device_uuid),
    })


@start_points_bp.get("/start-points/search")
def search_start_points():
    device_uuid = _get_device_uuid_from_request()
    if not device_uuid:
        return jsonify({"ok": False, "error": "device_uuid missing (and no active device selected)"}), 400

    q = (request.args.get("q") or "").strip()
    try:
        limit = int(request.args.get("limit") or 20)
    except Exception:
        limit = 20

    repo = StartPointsRepo()
    return jsonify({
        "ok": True,
        "device_uuid": device_uuid,
        "query": q,
        "items": repo.search(device_uuid, q, limit=max(1, min(limit, 100))),
    })


@start_points_bp.post("/start-points/match")
def match_start_point():
    payload = request.get_json(silent=True) or {}
    device_uuid = _get_device_uuid_from_request()
    if not device_uuid:
        return jsonify({"ok": False, "error": "device_uuid missing (and no active device selected)"}), 400

    lat = payload.get("lat")
    lon = payload.get("lon")
    radius_m = payload.get("radius_m", 20)

    if lat is None or lon is None:
        return jsonify({"ok": False, "error": "lat and lon are required"}), 400

    try:
        lat = float(lat)
        lon = float(lon)
        radius_m = float(radius_m)
    except Exception:
        return jsonify({"ok": False, "error": "lat, lon and radius_m must be numeric"}), 400

    repo = StartPointsRepo()
    item = repo.match_near(device_uuid, lat, lon, radius_m)

    if item:
        return jsonify({
            "ok": True,
            "matched": True,
            "distance_m": item.get("distance_m"),
            "item": item,
        })

    return jsonify({
        "ok": True,
        "matched": False,
        "item": None,
    })


@start_points_bp.post("/start-points")
def create_start_point():
    payload = request.get_json(silent=True) or {}
    device_uuid = _get_device_uuid_from_request()
    if not device_uuid:
        return jsonify({"ok": False, "error": "device_uuid missing (and no active device selected)"}), 400

    name = (payload.get("name") or "").strip()
    lat = payload.get("lat")
    lon = payload.get("lon")
    alt_m = payload.get("alt_m")
    source = (payload.get("source") or "manual").strip()
    tags = payload.get("tags")

    if not name:
        return jsonify({"ok": False, "error": "name is required"}), 400
    if lat is None or lon is None:
        return jsonify({"ok": False, "error": "lat and lon are required"}), 400

    repo = StartPointsRepo()
    item = repo.create(
        device_uuid=device_uuid,
        name=name,
        lat=float(lat),
        lon=float(lon),
        alt_m=float(alt_m) if alt_m is not None else None,
        source=source,
        tags=tags if isinstance(tags, list) else None,
    )
    return jsonify({"ok": True, "item": item}), 201


@start_points_bp.patch("/start-points/<start_point_id>")
def rename_start_point(start_point_id: str):
    payload = request.get_json(silent=True) or {}
    device_uuid = _get_device_uuid_from_request()
    if not device_uuid:
        return jsonify({"ok": False, "error": "device_uuid missing (and no active device selected)"}), 400

    name = (payload.get("name") or "").strip()
    if not name:
        return jsonify({"ok": False, "error": "name is required"}), 400

    repo = StartPointsRepo()
    try:
        item = repo.rename(start_point_id, device_uuid, name)
        return jsonify({"ok": True, "item": item})
    except KeyError:
        return jsonify({"ok": False, "error": "start_point not found"}), 404


@start_points_bp.delete("/start-points/<start_point_id>")
def delete_start_point(start_point_id: str):
    device_uuid = _get_device_uuid_from_request()
    if not device_uuid:
        return jsonify({"ok": False, "error": "device_uuid missing (and no active device selected)"}), 400

    repo = StartPointsRepo()
    deleted = repo.delete(start_point_id, device_uuid)
    if not deleted:
        return jsonify({"ok": False, "error": "start_point not found"}), 404
    return jsonify({"ok": True})
