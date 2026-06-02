from flask import Blueprint, jsonify
import requests
from collections import Counter

from app.services.device_store import load_store
from app.repositories.devices_repo import DevicesRepo

mission_control_bp = Blueprint("mission_control", __name__)


def _safe_json_get(url: str, timeout=(1.0, 2.0)):
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.json() or {}


def _log_mission_control_event(event: str, details: dict | None = None) -> None:
    payload = {"event": event}
    if details:
        payload.update(details)
    print("[mission_control]", payload)


@mission_control_bp.get("/mission-control/active")
def mission_control_active():
    store = load_store()
    repo = DevicesRepo()
    db_map = repo.get_map()
    base_url_counts = Counter(
        str(d.get("base_url") or "").rstrip("/")
        for d in store.get("devices", [])
        if str(d.get("base_url") or "").rstrip("/")
    )

    items = []

    for device in store.get("devices", []):
        device_uuid = device.get("device_uuid")
        base_url = str(device.get("base_url") or "").rstrip("/")

        if not device_uuid or not base_url:
            continue

        if base_url_counts.get(base_url, 0) > 1:
            _log_mission_control_event(
                "duplicate_base_url",
                {
                    "device_uuid": device_uuid,
                    "base_url": base_url,
                    "duplicate_count": base_url_counts.get(base_url),
                },
            )

        db_rec = db_map.get(device_uuid) or {}

        nickname = db_rec.get("nickname")
        profile_type = db_rec.get("active_profile_type")
        profile_label = db_rec.get("active_profile_label")

        try:
            info = _safe_json_get(base_url + "/info", timeout=(1.0, 2.0))
        except Exception as e:
            _log_mission_control_event(
                "device_unreachable",
                {
                    "device_uuid": device_uuid,
                    "base_url": base_url,
                    "error": str(e),
                },
            )
            continue

        actual_uuid = str(info.get("device_uuid") or "").strip()
        if actual_uuid != str(device_uuid or "").strip():
            _log_mission_control_event(
                "uuid_mismatch",
                {
                    "expected_uuid": device_uuid,
                    "actual_uuid": actual_uuid or None,
                    "base_url": base_url,
                },
            )
            continue

        _log_mission_control_event(
            "online_uuid_match",
            {
                "device_uuid": device_uuid,
                "base_url": base_url,
            },
        )

        try:
            status = _safe_json_get(base_url + "/status", timeout=(1.0, 2.0))
        except Exception as e:
            _log_mission_control_event(
                "device_unreachable",
                {
                    "device_uuid": device_uuid,
                    "base_url": base_url,
                    "endpoint": "/status",
                    "error": str(e),
                },
            )
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
    