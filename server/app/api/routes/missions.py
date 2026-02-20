from flask import Blueprint, jsonify, request, Response
import requests

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
    """
    Streams the ZIP from device to browser via app server (no CORS headache).
    """
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
