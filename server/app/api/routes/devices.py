from flask import Blueprint, jsonify, request

from app.services.discovery import scan_network, default_cidr
from app.services.device_store import load_store, upsert_devices, set_active, add_manual

devices_bp = Blueprint("devices", __name__)


@devices_bp.get("/devices")
def list_devices():
    return jsonify(load_store())


@devices_bp.post("/devices/scan")
def scan_devices():
    payload = request.get_json(silent=True) or {}
    cidr = payload.get("cidr") or None

    found = scan_network(cidr=cidr)
    store = upsert_devices(found)

    return jsonify({
        "ok": True,
        "cidr_used": cidr or default_cidr(),
        "found_count": len(found),
        "devices": store.get("devices", []),
        "active_base_url": store.get("active_base_url"),
    })


@devices_bp.post("/devices/select")
def select_device():
    payload = request.get_json(silent=True) or {}
    base_url = (payload.get("base_url") or "").strip().rstrip("/")
    if not base_url:
        return jsonify({"ok": False, "error": "base_url is required"}), 400

    store = set_active(base_url)
    return jsonify({"ok": True, "active_base_url": store.get("active_base_url")})


@devices_bp.post("/devices/add")
def add_device():
    payload = request.get_json(silent=True) or {}
    base_url = (payload.get("base_url") or "").strip().rstrip("/")
    name = (payload.get("name") or "").strip()

    if not base_url.startswith("http://") and not base_url.startswith("https://"):
        return jsonify({"ok": False, "error": "base_url must start with http:// or https://"}), 400

    store = add_manual(name=name, base_url=base_url)
    return jsonify({"ok": True, "devices": store.get("devices", [])})
