from flask import Blueprint, jsonify, request

from app.services.device_client import get, post, DeviceNotSelected

device_bp = Blueprint("device", __name__)


@device_bp.get("/device")
def active_device():
    # just returns store info via /devices
    return jsonify({"ok": True})


@device_bp.get("/device/health")
def device_health():
    try:
        r = get("/health", timeout=4)
        return jsonify(r.json()), r.status_code
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502


@device_bp.get("/device/status")
def device_status():
    try:
        r = get("/status", timeout=4)
        return jsonify(r.json()), r.status_code
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502


@device_bp.post("/device/missions/start")
def mission_start():
    try:
        payload = request.get_json(silent=True) or {}
        r = post("/missions/start", payload, timeout=8)
        return jsonify(r.json()), r.status_code
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502
