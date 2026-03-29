from flask import Blueprint, jsonify, request
from app.services.sync_service import SyncService
from app.services.device_client import DeviceNotSelected

sync_bp = Blueprint("sync", __name__)


@sync_bp.post("/sync/active/import-new")
def sync_active_import_new():
    try:
        svc = SyncService()
        result = svc.sync_all_new()
        return jsonify(result)
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Sync failed: {e}"}), 500


@sync_bp.post("/sync/active/import-selected")
def sync_active_import_selected():
    try:
        payload = request.get_json(silent=True) or {}
        mission_ids = payload.get("mission_ids") or []

        if not isinstance(mission_ids, list) or not mission_ids:
            return jsonify({"ok": False, "error": "mission_ids must be a non-empty list"}), 400

        svc = SyncService()
        result = svc.sync_selected(mission_ids)
        return jsonify(result)
    except DeviceNotSelected as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Sync failed: {e}"}), 500
    