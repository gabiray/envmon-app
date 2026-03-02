from flask import Blueprint, jsonify, request
import time
import requests

from app.services.discovery import scan_network, default_cidr
from app.services.device_store import load_store, upsert_devices, set_active
from app.repositories.devices_repo import DevicesRepo

devices_bp = Blueprint("devices", __name__)


def _enrich_devices(store_devices: list[dict], db_map: dict[str, dict]) -> list[dict]:
    enriched = []
    for d in store_devices or []:
        rec = db_map.get(d.get("device_uuid"))
        enriched.append({
            **d,
            "known": bool(rec and rec.get("nickname")),
            "nickname": rec.get("nickname") if rec else None,
        })
    return enriched


@devices_bp.get("/devices")
def list_devices():
    """
    Returns cached scan store, enriched with DB fields (nickname/known).
    """
    store = load_store()
    repo = DevicesRepo()
    db_map = repo.get_map()

    store["devices"] = _enrich_devices(store.get("devices", []), db_map)
    return jsonify(store)


@devices_bp.post("/devices/scan")
def scan_devices():
    """
    Scans LAN for EnvMon devices (identified only by GET /info).
    Updates:
      - local store (devices.json) with last_base_url
      - DB devices table (seen + hostname + last_base_url)
    Returns enriched device list including nickname/known.
    """
    payload = request.get_json(silent=True) or {}
    cidr = payload.get("cidr") or None

    found = scan_network(cidr=cidr)

    # 1) Update local store cache
    store = upsert_devices(found)

    # 2) Upsert found devices into DB
    repo = DevicesRepo()
    for d in found:
        info = d.get("info") or {}
        repo.upsert_seen(
            device_uuid=d.get("device_uuid"),
            hostname=info.get("hostname"),
            base_url=d.get("base_url"),
        )

    # 3) Enrich response with nickname/known from DB
    db_map = repo.get_map()
    enriched = _enrich_devices(store.get("devices", []), db_map)

    return jsonify({
        "ok": True,
        "cidr_used": cidr or default_cidr(),
        "found_count": len(found),
        "devices": enriched,
        "active_device_uuid": store.get("active_device_uuid"),
    })


@devices_bp.post("/devices/select")
def select_device():
    """
    Sets the active device by UUID (used for live control/proxy routes).
    """
    payload = request.get_json(silent=True) or {}
    device_uuid = (payload.get("device_uuid") or "").strip()
    if not device_uuid:
        return jsonify({"ok": False, "error": "device_uuid is required"}), 400

    store = load_store()
    exists = any(d.get("device_uuid") == device_uuid for d in store.get("devices", []))
    if not exists:
        return jsonify({"ok": False, "error": "device_uuid not found. Run scan again."}), 404

    store = set_active(device_uuid)
    return jsonify({"ok": True, "active_device_uuid": store.get("active_device_uuid")})


@devices_bp.post("/devices/add")
def add_device_manual():
    """
    Manual add by base_url (optional).
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

        # update store + DB
        store = upsert_devices(found)
        DevicesRepo().upsert_seen(device_uuid=device_uuid, hostname=info.get("hostname"), base_url=base_url)

        # enrich response
        db_map = DevicesRepo().get_map()
        enriched = _enrich_devices(store.get("devices", []), db_map)

        return jsonify({"ok": True, "devices": enriched})

    except Exception as e:
        return jsonify({"ok": False, "error": f"Manual add failed: {e}"}), 502


@devices_bp.post("/devices/<device_uuid>/nickname")
def set_device_nickname(device_uuid: str):
    """
    Sets a user-friendly nickname for a device (stored in DB).
    """
    payload = request.get_json(silent=True) or {}
    nickname = (payload.get("nickname") or "").strip()
    if not nickname:
        return jsonify({"ok": False, "error": "nickname is required"}), 400

    repo = DevicesRepo()
    try:
        repo.set_nickname(device_uuid, nickname)
        return jsonify({"ok": True, "device_uuid": device_uuid, "nickname": nickname})
    except KeyError:
        return jsonify({"ok": False, "error": "device not found (scan first)"}), 404