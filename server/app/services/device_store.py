import json
import time
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
STORE_FILE = DATA_DIR / "devices.json"


def _default_store():
    return {
        "active_base_url": None,
        "devices": [],  # list of {id, name, base_url, last_seen_epoch}
        "updated_epoch": int(time.time()),
    }


def load_store() -> dict:
    try:
        if not STORE_FILE.exists():
            return _default_store()
        return json.loads(STORE_FILE.read_text(encoding="utf-8"))
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
    by_url = {d["base_url"]: d for d in store.get("devices", [])}

    for d in found:
        by_url[d["base_url"]] = d

    store["devices"] = sorted(by_url.values(), key=lambda x: x.get("last_seen_epoch", 0), reverse=True)
    save_store(store)
    return store


def set_active(base_url: str | None) -> dict:
    store = load_store()
    store["active_base_url"] = base_url
    save_store(store)
    return store


def add_manual(name: str, base_url: str) -> dict:
    store = load_store()
    devices = store.get("devices", [])

    device = {
        "id": base_url.replace("http://", "").replace("https://", ""),
        "name": name or f"EnvMon @ {base_url}",
        "base_url": base_url.rstrip("/"),
        "last_seen_epoch": int(time.time()),
    }

    devices = [d for d in devices if d.get("base_url") != device["base_url"]]
    devices.insert(0, device)

    store["devices"] = devices
    save_store(store)
    return store
