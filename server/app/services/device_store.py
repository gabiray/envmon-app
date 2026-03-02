import json
import time
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
STORE_FILE = DATA_DIR / "devices.json"


def _default_store():
    return {
        "active_device_uuid": None,
        "devices": [],  # list of {device_uuid, name, base_url, last_seen_epoch, health?}
        "updated_epoch": int(time.time()),
    }


def load_store() -> dict:
    try:
        if not STORE_FILE.exists():
            return _default_store()
        s = json.loads(STORE_FILE.read_text(encoding="utf-8"))

        # Optional: auto-migrate older format (active_base_url/devices with base_url keys)
        if "active_device_uuid" not in s:
            s["active_device_uuid"] = None
        if "devices" not in s or not isinstance(s["devices"], list):
            s["devices"] = []
        return s
    except Exception:
        return _default_store()


def save_store(store: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    store["updated_epoch"] = int(time.time())
    tmp = STORE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(store, indent=2), encoding="utf-8")
    tmp.replace(STORE_FILE)


def upsert_devices(found: list[dict]) -> dict:
    store = load_store()
    by_uuid = {d.get("device_uuid"): d for d in store.get("devices", []) if d.get("device_uuid")}

    for d in found:
        du = d.get("device_uuid")
        if not du:
            continue
        by_uuid[du] = {
            "device_uuid": du,
            "name": d.get("name") or by_uuid.get(du, {}).get("name") or du[:8],
            "base_url": str(d.get("base_url") or "").rstrip("/"),
            "last_seen_epoch": int(time.time()),
            "info": d.get("info"),
        }

    store["devices"] = sorted(by_uuid.values(), key=lambda x: x.get("last_seen_epoch", 0), reverse=True)
    save_store(store)
    return store


def set_active(device_uuid: str | None) -> dict:
    store = load_store()
    store["active_device_uuid"] = device_uuid
    save_store(store)
    return store


def get_base_url_for(device_uuid: str) -> str | None:
    store = load_store()
    for d in store.get("devices", []):
        if d.get("device_uuid") == device_uuid:
            return d.get("base_url")
    return None
