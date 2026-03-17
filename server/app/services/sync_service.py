import time
from pathlib import Path
import requests

from app.services.device_client import DeviceClient, DeviceNotSelected
from app.repositories.missions_repo import MissionsRepo
from app.services.mission_importer import MissionImporter

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
TMP_ZIPS = DATA_DIR / "tmp_zips"


class SyncService:
    def __init__(self):
        self.missions_repo = MissionsRepo()
        self.importer = MissionImporter()

    def _download_zip(self, base_url: str, mission_id: str) -> Path:
        TMP_ZIPS.mkdir(parents=True, exist_ok=True)
        out = TMP_ZIPS / f"{mission_id}.zip"
        if out.exists():
            out.unlink()

        url = base_url.rstrip("/") + f"/missions/{mission_id}/export"
        r = requests.get(url, stream=True, timeout=90)
        r.raise_for_status()

        with out.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 64):
                if chunk:
                    f.write(chunk)
        return out

    def sync_one(self, device_uuid: str, hostname: str | None, base_url: str, mission_id: str) -> dict:
        zip_path = self._download_zip(base_url, mission_id)
        res = self.importer.import_zip(device_uuid=device_uuid, hostname=hostname, base_url=base_url, zip_path=zip_path)
        return {
            "mission_id": res.mission_id,
            "mission_name": res.mission_name,
            "telemetry_rows": res.telemetry_rows,
            "image_rows": res.image_rows,
            "has_gps": res.has_gps,
            "has_images": res.has_images,
            "start": {"lat": res.start_lat, "lon": res.start_lon, "alt_m": res.start_alt_m},
        }

    def sync_all_new(self) -> dict:
        """
        Uses ACTIVE device (DeviceClient) to list missions and import those missing in DB.
        """
        dc = DeviceClient()  # requires active_device_uuid
        base_url = dc.base_url

        # Read /info to get UUID/hostname safely
        info = {}
        try:
            ri = requests.get(base_url + "/info", timeout=(1, 3))
            if ri.status_code == 200:
                info = ri.json() or {}
        except Exception:
            info = {}

        device_uuid = str(info.get("device_uuid") or "").strip()
        hostname = info.get("hostname")

        if not device_uuid:
            raise RuntimeError("Active device did not return device_uuid from /info")

        # List missions on device
        missions_resp = dc.get("/missions", timeout=8).json()
        mission_ids = missions_resp.get("missions") or []
        imported = []
        skipped = []
        errors = []

        for mid in mission_ids:
            if self.missions_repo.exists(mid):
                skipped.append(mid)
                continue
            try:
                imported.append(self.sync_one(device_uuid, hostname, base_url, mid))
            except Exception as e:
                errors.append({"mission_id": mid, "error": str(e)})

        return {
            "ok": True,
            "device_uuid": device_uuid,
            "hostname": hostname,
            "base_url": base_url,
            "imported_count": len(imported),
            "skipped_count": len(skipped),
            "errors_count": len(errors),
            "imported": imported,
            "skipped": skipped,
            "errors": errors,
        }
        