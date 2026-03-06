import time
import json
from sqlalchemy import select, delete
from app.db.session import SessionLocal
from app.db.models import StartPoint


class StartPointsRepo:
    def list(self, device_uuid: str) -> list[dict]:
        with SessionLocal() as db:
            rows = db.execute(
                select(StartPoint)
                .where(StartPoint.device_uuid == device_uuid)
                .order_by(StartPoint.created_at_epoch.desc())
            ).scalars().all()
            return [self._to_dict(x) for x in rows]

    def create(self, device_uuid: str, name: str, lat: float, lon: float, alt_m: float | None,
               source: str = "manual", tags: list[str] | None = None) -> dict:
        now = int(time.time())
        sp = StartPoint(
            device_uuid=device_uuid,
            name=name,
            lat=lat,
            lon=lon,
            alt_m=alt_m,
            source=source or "manual",
            tags_json=json.dumps(tags or [], ensure_ascii=False),
            created_at_epoch=now,
            updated_at_epoch=now,
        )
        with SessionLocal() as db:
            db.add(sp)
            db.commit()
            db.refresh(sp)
            return self._to_dict(sp)

    def delete(self, start_point_id: str, device_uuid: str) -> bool:
        with SessionLocal() as db:
            res = db.execute(
                delete(StartPoint)
                .where(StartPoint.id == start_point_id)
                .where(StartPoint.device_uuid == device_uuid)
            )
            db.commit()
            return (res.rowcount or 0) > 0

    def rename(self, start_point_id: str, device_uuid: str, name: str) -> dict:
        now = int(time.time())
        with SessionLocal() as db:
            sp = db.get(StartPoint, start_point_id)
            if not sp or sp.device_uuid != device_uuid:
                raise KeyError("start_point not found")
            sp.name = name
            sp.updated_at_epoch = now
            db.commit()
            db.refresh(sp)
            return self._to_dict(sp)

    def _to_dict(self, sp: StartPoint) -> dict:
        try:
            tags = json.loads(sp.tags_json or "[]")
        except Exception:
            tags = []
        return {
            "id": sp.id,
            "device_uuid": sp.device_uuid,
            "name": sp.name,
            "lat": sp.lat,
            "lon": sp.lon,
            "alt_m": sp.alt_m,
            "source": sp.source,
            "tags": tags,
            "created_at_epoch": sp.created_at_epoch,
            "updated_at_epoch": sp.updated_at_epoch,
        }
