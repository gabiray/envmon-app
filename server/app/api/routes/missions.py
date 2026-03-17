from flask import Blueprint, jsonify, request, Response
import requests

from app.services.device_store import load_store
from app.repositories.devices_repo import DevicesRepo

from ...services.device_client import DeviceClient, DeviceNotSelected

missions_bp = Blueprint("missions", __name__)


@missions_bp.get("/missions")
def list_missions():
    try:
        dc = DeviceClient()
        r = dc.get("/missions", timeout=5)
        return jsonify(r.json()), r.status_code
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502


@missions_bp.post("/missions/start")
def start_mission():
    try:
        payload = request.get_json(silent=True) or {}

        mission_name = str(payload.get("mission_name") or "").strip()
        payload["mission_name"] = mission_name

        store = load_store()
        active_uuid = store.get("active_device_uuid")
        if not active_uuid:
            return jsonify({"ok": False, "error": "No active device selected"}), 400

        repo = DevicesRepo()
        device_rec = repo.get_one(active_uuid)
        if not device_rec:
            return jsonify({"ok": False, "error": "Active device not found in DB"}), 404

        profile_type = str(device_rec.get("active_profile_type") or "").strip()
        profile_label = str(device_rec.get("active_profile_label") or "").strip()

        if not profile_type:
            return jsonify({"ok": False, "error": "Active device has no selected profile"}), 400

        payload["profile_type"] = profile_type
        payload["profile_label"] = profile_label

        dc = DeviceClient()
        r = dc.post("/missions/start", payload, timeout=10)
        return jsonify(r.json()), r.status_code
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502


@missions_bp.post("/missions/stop")
def stop_mission():
    try:
        dc = DeviceClient()
        r = dc.post("/missions/stop", {}, timeout=5)
        return jsonify(r.json()), r.status_code
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502


@missions_bp.post("/missions/abort")
def abort_mission():
    try:
        dc = DeviceClient()
        r = dc.post("/missions/abort", {}, timeout=5)
        return jsonify(r.json()), r.status_code
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502


@missions_bp.get("/missions/<mission_id>/export")
def export_mission(mission_id: str):
    try:
        dc = DeviceClient()
        url = dc.base_url + f"/missions/{mission_id}/export"
        upstream = requests.get(url, stream=True, timeout=60)

        if upstream.status_code != 200:
            try:
                return jsonify(upstream.json()), upstream.status_code
            except Exception:
                return jsonify({"ok": False, "error": "Export failed"}), upstream.status_code

        def gen():
            for chunk in upstream.iter_content(chunk_size=1024 * 64):
                if chunk:
                    yield chunk

        headers = {
            "Content-Disposition": f'attachment; filename="{mission_id}.zip"',
            "Content-Type": "application/zip",
        }
        return Response(gen(), headers=headers, status=200)

    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502
    