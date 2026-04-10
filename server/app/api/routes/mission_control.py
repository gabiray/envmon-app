from flask import Blueprint, jsonify
import requests

from app.services.device_store import load_store
from app.repositories.devices_repo import DevicesRepo

mission_control_bp = Blueprint("mission_control", __name__)


def _safe_json_get(url: str, timeout=(1.0, 2.0)):
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.json() or {}


@mission_control_bp.get("/mission-control/active")
def mission_control_active():
    store = load_store()
    repo = DevicesRepo()
    db_map = repo.get_map()

    items = []

    for device in store.get("devices", []):
        device_uuid = device.get("device_uuid")
        base_url = str(device.get("base_url") or "").rstrip("/")

        if not device_uuid or not base_url:
            continue

        db_rec = db_map.get(device_uuid) or {}

        nickname = db_rec.get("nickname")
        profile_type = db_rec.get("active_profile_type")
        profile_label = db_rec.get("active_profile_label")

        try:
            info = _safe_json_get(base_url + "/info", timeout=(1.0, 2.0))
            status = _safe_json_get(base_url + "/status", timeout=(1.0, 2.0))
        except Exception:
            continue

        state = status.get("state")
        mission_id = status.get("mission_id")

        if state not in ("ARMING", "RUNNING") or not mission_id:
            continue

        live = None
        try:
            live_resp = _safe_json_get(base_url + "/live/telemetry", timeout=(1.0, 2.0))
            live = live_resp.get("item")
        except Exception:
            live = None

        profile = status.get("profile") or {}
        effective_profile_type = profile_type or profile.get("profile_type")
        effective_profile_label = profile_label or profile.get("profile_label")

        items.append(
            {
                "device_uuid": device_uuid,
                "nickname": nickname,
                "hostname": info.get("hostname"),
                "base_url": base_url,
                "connected": True,
                "mission_id": mission_id,
                "mission_name": status.get("mission_name") or mission_id,
                "profile_type": effective_profile_type,
                "profile_label": effective_profile_label,
                "state": state,
                "gps": status.get("gps"),
                "live": live,
            }
        )

    return jsonify({
        "ok": True,
        "items": items,
    })
    