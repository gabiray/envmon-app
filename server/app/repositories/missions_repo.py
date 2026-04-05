from sqlalchemy import select, delete
from pathlib import Path
from app.db.session import SessionLocal
from app.db.models import Mission, TelemetryPoint, MissionImage

import shutil


class MissionsRepo:
    def exists(self, mission_id: str) -> bool:
        with SessionLocal() as db:
            return db.get(Mission, mission_id) is not None

    def upsert_mission(self, mission: Mission) -> None:
        with SessionLocal() as db:
            db.merge(mission)
            db.commit()

    def replace_mission_points(
        self,
        mission_id: str,
        telemetry_points: list[TelemetryPoint],
        images: list[MissionImage],
    ) -> None:
        with SessionLocal() as db:
            db.execute(delete(TelemetryPoint).where(TelemetryPoint.mission_id == mission_id))
            db.execute(delete(MissionImage).where(MissionImage.mission_id == mission_id))
            db.commit()

            if telemetry_points:
                db.bulk_save_objects(telemetry_points)
            if images:
                db.bulk_save_objects(images)

            db.commit()

    def list_missions(self, device_uuid: str | None = None) -> list[dict]:
        with SessionLocal() as db:
            q = select(Mission).order_by(Mission.started_at_epoch.desc().nullslast())
            if device_uuid:
                q = q.where(Mission.device_uuid == device_uuid)
            rows = db.execute(q).scalars().all()
            return [self._to_dict(m) for m in rows]

    def _to_dict(self, m: Mission) -> dict:
        return {
            "mission_id": m.mission_id,
            "mission_name": m.mission_name or m.mission_id,
            "device_uuid": m.device_uuid,
            "profile_type": m.profile_type,
            "profile_label": m.profile_label,
            "created_at_epoch": m.created_at_epoch,
            "started_at_epoch": m.started_at_epoch,
            "ended_at_epoch": m.ended_at_epoch,
            "status": m.status,
            "stop_reason": m.stop_reason,
            "location_mode": m.location_mode,
            "start": {
                "lat": m.start_lat,
                "lon": m.start_lon,
                "alt_m": m.start_alt_m,
            },
            "has_gps": bool(m.has_gps),
            "has_images": bool(m.has_images),
            "imported_at_epoch": m.imported_at_epoch,
        }
        
    def delete_mission(self, mission_id: str) -> bool:
        with SessionLocal() as db:
            mission = db.get(Mission, mission_id)
            if not mission:
                return False

            unpacked_path = mission.unpacked_path
            raw_zip_path = mission.raw_zip_path

            db.execute(delete(TelemetryPoint).where(TelemetryPoint.mission_id == mission_id))
            db.execute(delete(MissionImage).where(MissionImage.mission_id == mission_id))
            db.execute(delete(Mission).where(Mission.mission_id == mission_id))
            db.commit()

        try:
            if unpacked_path:
                unpacked_dir = Path(unpacked_path)
                if unpacked_dir.exists():
                    mission_dir = unpacked_dir.parent
                    shutil.rmtree(mission_dir, ignore_errors=True)
                elif raw_zip_path:
                    raw_zip = Path(raw_zip_path)
                    if raw_zip.exists():
                        shutil.rmtree(raw_zip.parent, ignore_errors=True)
        except Exception:
            pass

        return True
        