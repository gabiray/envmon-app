import json
import time
import uuid
import os
from pathlib import Path
from threading import Lock

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
STORE_FILE = DATA_DIR / "devices.json"

_STORE_LOCK = Lock()


def _default_store():
    return {
        "active_device_uuid": None,
        "devices": [],
        "updated_epoch": int(time.time()),
    }


def load_store() -> dict:
    try:
        if not STORE_FILE.exists():
            return _default_store()

        s = json.loads(STORE_FILE.read_text(encoding="utf-8"))

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

    payload = json.dumps(store, indent=2, ensure_ascii=False)

    with _STORE_LOCK:
        # unique temp file avoids collisions between near-simultaneous writes
        tmp = STORE_FILE.with_name(f"{STORE_FILE.stem}.{uuid.uuid4().hex}.tmp")
        tmp.write_text(payload, encoding="utf-8")

        last_err = None
        for _ in range(8):
            try:
                os.replace(tmp, STORE_FILE)
                return
            except PermissionError as e:
                last_err = e
                time.sleep(0.05)

        try:
            tmp.unlink(missing_ok=True)
        except Exception:
            pass

        if last_err:
            raise last_err


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

    store["devices"] = sorted(
        by_uuid.values(),
        key=lambda x: x.get("last_seen_epoch", 0),
        reverse=True,
    )
    save_store(store)
    return store


def set_active(device_uuid: str | None) -> dict:
    store = load_store()

    if store.get("active_device_uuid") == device_uuid:
        return store

    store["active_device_uuid"] = device_uuid
    save_store(store)
    return store


def get_base_url_for(device_uuid: str) -> str | None:
    store = load_store()
    for d in store.get("devices", []):
        if d.get("device_uuid") == device_uuid:
            return d.get("base_url")
    return None
