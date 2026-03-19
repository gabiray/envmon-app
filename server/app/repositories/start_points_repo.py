import json
import math
import time

from sqlalchemy import delete, select
from app.db.session import SessionLocal
from app.db.models import StartPoint


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)

    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


class StartPointsRepo:
    def list(self, device_uuid: str) -> list[dict]:
        with SessionLocal() as db:
            rows = db.execute(
                select(StartPoint)
                .where(StartPoint.device_uuid == device_uuid)
                .order_by(StartPoint.updated_at_epoch.desc(), StartPoint.created_at_epoch.desc())
            ).scalars().all()
            return [self._to_dict(x) for x in rows]

    def search(self, device_uuid: str, query: str, limit: int = 20) -> list[dict]:
        q = str(query or "").strip().lower()
        if not q:
            return self.list(device_uuid)[:limit]

        with SessionLocal() as db:
            rows = db.execute(
                select(StartPoint)
                .where(StartPoint.device_uuid == device_uuid)
                .order_by(StartPoint.updated_at_epoch.desc(), StartPoint.created_at_epoch.desc())
            ).scalars().all()

            ranked = []
            for sp in rows:
                name = (sp.name or "").lower()
                if q in name:
                    score = 0 if name.startswith(q) else 1
                    ranked.append((score, sp))

            ranked.sort(key=lambda item: (item[0], -(item[1].updated_at_epoch or 0)))
            return [self._to_dict(sp) for _, sp in ranked[:limit]]

    def match_near(
        self,
        device_uuid: str,
        lat: float,
        lon: float,
        radius_m: float = 20.0,
    ) -> dict | None:
        with SessionLocal() as db:
            rows = db.execute(
                select(StartPoint).where(StartPoint.device_uuid == device_uuid)
            ).scalars().all()

            best = None
            best_d = None

            for sp in rows:
                d = _haversine_m(lat, lon, sp.lat, sp.lon)
                if best_d is None or d < best_d:
                    best = sp
                    best_d = d

            if best is None or best_d is None or best_d > radius_m:
                return None

            item = self._to_dict(best)
            item["distance_m"] = round(best_d, 2)
            return item

    def create(
        self,
        device_uuid: str,
        name: str,
        lat: float,
        lon: float,
        alt_m: float | None,
        source: str = "manual",
        tags: list[str] | None = None,
    ) -> dict:
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
        