from flask import Blueprint, jsonify, request
import time
import requests

from app.services.discovery import scan_network, default_cidr
from app.services.device_store import load_store, upsert_devices, set_active
from app.repositories.devices_repo import DevicesRepo

devices_bp = Blueprint("devices", __name__)

PROFILE_CATALOG = {
    "drone": "Drone",
    "bicycle": "Bicycle",
    "car": "Car",
    "static": "Static Station",
}


def _normalize_profile(profile_type: str, profile_label: str | None = None) -> tuple[str, str]:
    pt = str(profile_type or "").strip().lower()
    if pt not in PROFILE_CATALOG:
        raise ValueError("invalid profile_type")

    label = str(profile_label or "").strip() or PROFILE_CATALOG[pt]
    return pt, label


def _enrich_devices(store_devices: list[dict], db_map: dict[str, dict]) -> list[dict]:
    enriched = []

    for d in store_devices or []:
        rec = db_map.get(d.get("device_uuid"))

        enriched.append({
            **d,
            "known": bool(rec),
            "nickname": rec.get("nickname") if rec else None,
            "active_profile_type": rec.get("active_profile_type") if rec else None,
            "active_profile_label": rec.get("active_profile_label") if rec else None,
            "is_configured": bool(rec and rec.get("is_configured")),
            "needs_setup": bool(rec and rec.get("needs_setup")),
        })

    return enriched


@devices_bp.get("/device-profiles")
def list_device_profiles():
    return jsonify({
        "items": [
            {"type": k, "label": v}
            for k, v in PROFILE_CATALOG.items()
        ]
    })


@devices_bp.get("/devices")
def list_devices():
    """
    Returns cached scan store, enriched with DB fields:
      - nickname
      - active profile
      - configured/setup state
    """
    store = load_store()
    repo = DevicesRepo()
    db_map = repo.get_map()

    store["devices"] = _enrich_devices(store.get("devices", []), db_map)
    return jsonify(store)


@devices_bp.post("/devices/scan")
def scan_devices():
    """
    Scans LAN for EnvMon devices.
    Updates:
      - local store (devices.json)
      - DB devices table
    Returns:
      - enriched devices
      - newly discovered device UUIDs
      - newly discovered enriched devices
    """
    payload = request.get_json(silent=True) or {}
    cidr = payload.get("cidr") or None

    store_before = load_store()
    known_before = {
        d.get("device_uuid")
        for d in (store_before.get("devices") or [])
        if d.get("device_uuid")
    }

    found = scan_network(cidr=cidr)

    store = upsert_devices(found)

    repo = DevicesRepo()
    for d in found:
        info = d.get("info") or {}
        repo.upsert_seen(
            device_uuid=d.get("device_uuid"),
            hostname=info.get("hostname"),
            base_url=d.get("base_url"),
        )

    db_map = repo.get_map()
    enriched = _enrich_devices(store.get("devices", []), db_map)

    new_device_uuids = [
        d.get("device_uuid")
        for d in found
        if d.get("device_uuid") and d.get("device_uuid") not in known_before
    ]

    new_devices = [
        d for d in enriched
        if d.get("device_uuid") in set(new_device_uuids)
    ]

    return jsonify({
        "ok": True,
        "cidr_used": cidr or default_cidr(),
        "found_count": len(found),
        "devices": enriched,
        "active_device_uuid": store.get("active_device_uuid"),
        "new_device_uuids": new_device_uuids,
        "new_devices": new_devices,
    })


@devices_bp.post("/devices/select")
def select_device():
    payload = request.get_json(silent=True) or {}
    device_uuid = (payload.get("device_uuid") or "").strip()

    if device_uuid.lower() in ("", "none", "null"):
        store = set_active(None)
        return jsonify({"ok": True, "active_device_uuid": store.get("active_device_uuid")})

    store = load_store()
    exists = any(d.get("device_uuid") == device_uuid for d in store.get("devices", []))
    if not exists:
        return jsonify({"ok": False, "error": "device_uuid not found. Run scan again."}), 404

    store = set_active(device_uuid)
    return jsonify({"ok": True, "active_device_uuid": store.get("active_device_uuid")})


@devices_bp.post("/devices/add")
def add_device_manual():
    """
    Manual add by base_url.
    Fetches UUID via /info, then upserts both local store and DB.
    """
    payload = request.get_json(silent=True) or {}
    base_url = (payload.get("base_url") or "").strip().rstrip("/")
    name_override = (payload.get("name") or "").strip()

    if not base_url.startswith("http://") and not base_url.startswith("https://"):
        return jsonify({"ok": False, "error": "base_url must start with http:// or https://"}), 400

    try:
        ri = requests.get(f"{base_url}/info", timeout=(1.0, 3.0))
        if ri.status_code != 200:
            return jsonify({"ok": False, "error": "Device /info not reachable"}), 502

        info = ri.json() or {}
        device_uuid = str(info.get("device_uuid") or "").strip()
        if not device_uuid:
            return jsonify({"ok": False, "error": "Device did not return device_uuid"}), 502

        device_name = name_override or info.get("hostname") or f"EnvMon @ {base_url}"

        found = [{
            "device_uuid": device_uuid,
            "name": device_name,
            "base_url": base_url,
            "last_seen_epoch": int(time.time()),
            "info": info,
        }]

        store = upsert_devices(found)
        DevicesRepo().upsert_seen(
            device_uuid=device_uuid,
            hostname=info.get("hostname"),
            base_url=base_url,
        )

        db_map = DevicesRepo().get_map()
        enriched = _enrich_devices(store.get("devices", []), db_map)

        return jsonify({"ok": True, "devices": enriched})
    except Exception as e:
        return jsonify({"ok": False, "error": f"Manual add failed: {e}"}), 502


@devices_bp.post("/devices/<device_uuid>/nickname")
def set_device_nickname(device_uuid: str):
    payload = request.get_json(silent=True) or {}
    nickname = (payload.get("nickname") or "").strip()

    if not nickname:
        return jsonify({"ok": False, "error": "nickname is required"}), 400

    repo = DevicesRepo()
    try:
        repo.set_nickname(device_uuid, nickname)
        rec = repo.get_one(device_uuid)
        return jsonify({"ok": True, "device": rec})
    except KeyError:
        return jsonify({"ok": False, "error": "device not found (scan first)"}), 404


@devices_bp.post("/devices/<device_uuid>/profile")
def set_device_profile(device_uuid: str):
    payload = request.get_json(silent=True) or {}

    try:
        profile_type, profile_label = _normalize_profile(
            payload.get("profile_type"),
            payload.get("profile_label"),
        )
    except ValueError:
        return jsonify({
            "ok": False,
            "error": "profile_type must be one of: drone, bicycle, car, static",
        }), 400

    repo = DevicesRepo()
    try:
        repo.set_profile(device_uuid, profile_type, profile_label)
        rec = repo.get_one(device_uuid)
        return jsonify({"ok": True, "device": rec})
    except KeyError:
        return jsonify({"ok": False, "error": "device not found (scan first)"}), 404


@devices_bp.post("/devices/<device_uuid>/configure")
def configure_device(device_uuid: str):
    payload = request.get_json(silent=True) or {}

    nickname = str(payload.get("nickname") or "").strip()
    if not nickname:
        return jsonify({"ok": False, "error": "nickname is required"}), 400

    try:
        profile_type, profile_label = _normalize_profile(
            payload.get("profile_type"),
            payload.get("profile_label"),
        )
    except ValueError:
        return jsonify({
            "ok": False,
            "error": "profile_type must be one of: drone, bicycle, car, static",
        }), 400

    repo = DevicesRepo()
    try:
        rec = repo.configure(device_uuid, nickname, profile_type, profile_label)
        return jsonify({"ok": True, "device": rec})
    except KeyError:
        return jsonify({"ok": False, "error": "device not found (scan first)"}), 404
    