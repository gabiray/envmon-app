import csv
import json
import os
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path

from app.db.models import Mission, TelemetryPoint, MissionImage
from app.repositories.missions_repo import MissionsRepo
from app.repositories.devices_repo import DevicesRepo

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
IMPORT_ROOT = DATA_DIR / "imports"


def _to_float(v):
    if v is None:
        return None
    s = str(v).strip()
    if s == "" or s.lower() == "none":
        return None
    try:
        return float(s)
    except Exception:
        return None


def _to_int(v):
    f = _to_float(v)
    return None if f is None else int(f)


@dataclass
class ImportResult:
    mission_id: str
    telemetry_rows: int
    image_rows: int
    has_gps: bool
    has_images: bool
    start_lat: float | None
    start_lon: float | None
    start_alt_m: float | None
    raw_zip_path: str
    unpacked_path: str


class MissionImporter:
    def __init__(self):
        self.missions_repo = MissionsRepo()
        self.devices_repo = DevicesRepo()

    def import_zip(self, device_uuid: str, hostname: str | None, base_url: str | None, zip_path: Path) -> ImportResult:
        IMPORT_ROOT.mkdir(parents=True, exist_ok=True)

        # Ensure device exists in DB
        self.devices_repo.upsert_seen(device_uuid=device_uuid, hostname=hostname, base_url=base_url)

        # Extract to temp
        tmp_dir = IMPORT_ROOT / "tmp_extract"
        if tmp_dir.exists():
            for root, dirs, files in os.walk(tmp_dir, topdown=False):
                for f in files:
                    Path(root, f).unlink(missing_ok=True)
                for d in dirs:
                    Path(root, d).rmdir()
            tmp_dir.rmdir()
        tmp_dir.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(tmp_dir)

        meta_path = tmp_dir / "meta.json"
        if not meta_path.exists():
            raise RuntimeError("meta.json missing in mission ZIP")

        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        mission_id = meta.get("mission_id")
        if not mission_id:
            raise RuntimeError("meta.json missing mission_id")

        # Final storage
        mission_dir = IMPORT_ROOT / device_uuid / mission_id
        mission_dir.mkdir(parents=True, exist_ok=True)

        raw_zip_final = mission_dir / f"{mission_id}.zip"
        raw_zip_final.write_bytes(zip_path.read_bytes())

        unpack_dir = mission_dir / "unpacked"
        if unpack_dir.exists():
            for root, dirs, files in os.walk(unpack_dir, topdown=False):
                for f in files:
                    Path(root, f).unlink(missing_ok=True)
                for d in dirs:
                    Path(root, d).rmdir()
            unpack_dir.rmdir()
        unpack_dir.mkdir(parents=True, exist_ok=True)

        for p in tmp_dir.iterdir():
            os.rename(p, unpack_dir / p.name)

        # Parse meta/profile
        profile = meta.get("profile") or {}
        location_mode = profile.get("location_mode")
        stop_reason = meta.get("stop_reason")
        status = "COMPLETED"
        if stop_reason == "ABORT":
            status = "ABORTED"

        created_at = meta.get("created_at_epoch")
        started_at = meta.get("started_at_epoch")
        ended_at = meta.get("ended_at_epoch")

        # Telemetry
        telemetry_csv = unpack_dir / "telemetry.csv"
        telemetry_objs: list[TelemetryPoint] = []
        has_gps = False
        start_lat = start_lon = start_alt = None

        if telemetry_csv.exists():
            with telemetry_csv.open("r", encoding="utf-8") as f:
                rdr = csv.DictReader(f)
                for row in rdr:
                    ts = _to_float(row.get("ts_epoch"))
                    lat = _to_float(row.get("lat"))
                    lon = _to_float(row.get("lon"))
                    alt = _to_float(row.get("alt_m"))
                    fix_q = _to_int(row.get("fix_quality"))
                    sats = _to_int(row.get("satellites"))
                    hdop = _to_float(row.get("hdop"))
                    temp_c = _to_float(row.get("temp_c"))
                    hum_pct = _to_float(row.get("hum_pct"))
                    press_hpa = _to_float(row.get("press_hpa"))
                    gas_ohms = _to_float(row.get("gas_ohms"))

                    if not has_gps and lat is not None and lon is not None and (fix_q or 0) > 0:
                        has_gps = True

                    if start_lat is None and lat is not None and lon is not None:
                        start_lat, start_lon, start_alt = lat, lon, alt

                    telemetry_objs.append(TelemetryPoint(
                        mission_id=mission_id,
                        ts_epoch=ts if ts is not None else 0.0,
                        lat=lat, lon=lon, alt_m=alt,
                        fix_quality=fix_q, satellites=sats, hdop=hdop,
                        temp_c=temp_c, hum_pct=hum_pct, press_hpa=press_hpa, gas_ohms=gas_ohms,
                    ))

        # If fixed mode, prefer fixed_location as start
        fixed = profile.get("fixed_location") or {}
        if location_mode == "fixed" and fixed.get("lat") is not None and fixed.get("lon") is not None:
            start_lat = _to_float(fixed.get("lat"))
            start_lon = _to_float(fixed.get("lon"))
            start_alt = _to_float(fixed.get("alt_m"))

        # Images
        images_csv = unpack_dir / "images.csv"
        images_dir = unpack_dir / "images"
        image_objs: list[MissionImage] = []
        has_images = False

        if images_csv.exists():
            with images_csv.open("r", encoding="utf-8") as f:
                rdr = csv.DictReader(f)
                for row in rdr:
                    ts = _to_float(row.get("ts_epoch"))
                    lat = _to_float(row.get("lat"))
                    lon = _to_float(row.get("lon"))
                    alt = _to_float(row.get("alt_m"))
                    filename = str(row.get("filename") or "").strip()
                    if not filename:
                        continue
                    img_path = images_dir / filename
                    if img_path.exists():
                        has_images = True
                    image_objs.append(MissionImage(
                        mission_id=mission_id,
                        ts_epoch=ts,
                        lat=lat, lon=lon, alt_m=alt,
                        filename=filename,
                        path=str(img_path),
                    ))

        imported_at = int(time.time())

        mission = Mission(
            mission_id=mission_id,
            device_uuid=device_uuid,
            created_at_epoch=created_at,
            started_at_epoch=started_at,
            ended_at_epoch=ended_at,
            status=status,
            stop_reason=stop_reason,
            profile_json=json.dumps(profile),
            meta_json=json.dumps(meta),
            location_mode=location_mode,
            start_lat=start_lat,
            start_lon=start_lon,
            start_alt_m=start_alt,
            has_gps=1 if has_gps else 0,
            has_images=1 if has_images else 0,
            raw_zip_path=str(raw_zip_final),
            unpacked_path=str(unpack_dir),
            imported_at_epoch=imported_at,
        )

        # Upsert mission + replace points
        self.missions_repo.upsert_mission(mission)
        self.missions_repo.replace_mission_points(mission_id, telemetry_objs, image_objs)

        return ImportResult(
            mission_id=mission_id,
            telemetry_rows=len(telemetry_objs),
            image_rows=len(image_objs),
            has_gps=has_gps,
            has_images=has_images,
            start_lat=start_lat,
            start_lon=start_lon,
            start_alt_m=start_alt,
            raw_zip_path=str(raw_zip_final),
            unpacked_path=str(unpack_dir),
        )
        