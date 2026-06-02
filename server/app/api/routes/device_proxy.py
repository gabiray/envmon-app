from flask import Blueprint, jsonify, Response, stream_with_context
import requests

from app.services.device_client import get, DeviceClient, DeviceNotSelected
from app.services.device_store import load_store, touch_device_seen

device_bp = Blueprint("device", __name__)


@device_bp.get("/device/health")
def device_health():
    try:
        r = get("/health", timeout=12)
        if 200 <= r.status_code < 300:
            active_uuid = load_store().get("active_device_uuid")
            if active_uuid:
                touch_device_seen(active_uuid)
        return jsonify(r.json()), r.status_code
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502


@device_bp.get("/device/status")
def device_status():
    try:
        r = get("/status", timeout=4)
        if 200 <= r.status_code < 300:
            active_uuid = load_store().get("active_device_uuid")
            if active_uuid:
                touch_device_seen(active_uuid)
        return jsonify(r.json()), r.status_code
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502


@device_bp.get("/device/stream")
def device_stream():
    try:
        dc = DeviceClient()

        upstream = requests.get(
            dc.base_url + "/stream",
            stream=True,
            timeout=(5, 3600),
            headers={"Accept": "text/event-stream"},
        )

        if upstream.status_code != 200:
            try:
                return jsonify(upstream.json()), upstream.status_code
            except Exception:
                return (
                    jsonify({"ok": False, "error": "Failed to open device stream"}),
                    upstream.status_code,
                )

        @stream_with_context
        def generate():
            try:
                for chunk in upstream.iter_content(
                    chunk_size=1024,
                    decode_unicode=True,
                ):
                    if chunk:
                        yield chunk
            finally:
                upstream.close()

        headers = {
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }

        return Response(
            generate(),
            mimetype="text/event-stream",
            headers=headers,
        )

    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Device unreachable: {e}"}), 502
    
