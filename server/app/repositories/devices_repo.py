import time
from sqlalchemy import select
from app.db.session import SessionLocal
from app.db.models import Device

class DevicesRepo:
    def upsert_seen(self, device_uuid: str, hostname: str | None, base_url: str | None):
        now = int(time.time())
        with SessionLocal() as db:
            d = db.get(Device, device_uuid)
            if not d:
                d = Device(
                    device_uuid=device_uuid,
                    nickname=None,
                    hostname=hostname,
                    first_seen_epoch=now,
                    last_seen_epoch=now,
                    last_base_url=base_url,
                )
                db.add(d)
            else:
                d.hostname = hostname or d.hostname
                d.last_seen_epoch = now
                d.last_base_url = base_url or d.last_base_url
            db.commit()

    def set_nickname(self, device_uuid: str, nickname: str):
        with SessionLocal() as db:
            d = db.get(Device, device_uuid)
            if not d:
                raise KeyError("device not found")
            d.nickname = nickname
            db.commit()

    def get_map(self) -> dict[str, dict]:
        with SessionLocal() as db:
            rows = db.execute(select(Device)).scalars().all()
            out = {}
            for d in rows:
                out[d.device_uuid] = {
                    "device_uuid": d.device_uuid,
                    "nickname": d.nickname,
                    "hostname": d.hostname,
                    "first_seen_epoch": d.first_seen_epoch,
                    "last_seen_epoch": d.last_seen_epoch,
                    "last_base_url": d.last_base_url,
                }
            return out