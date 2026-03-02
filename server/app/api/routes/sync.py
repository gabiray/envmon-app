from flask import Blueprint, jsonify
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