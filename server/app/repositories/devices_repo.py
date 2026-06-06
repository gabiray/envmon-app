import time
from sqlalchemy import select, delete, func
from app.db.session import SessionLocal
from app.db.models import Device, Mission, StartPoint

DEFAULT_PROFILE_TYPE = "drone"
DEFAULT_PROFILE_LABEL = "Drone"


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
                    active_profile_type=DEFAULT_PROFILE_TYPE,
                    active_profile_label=DEFAULT_PROFILE_LABEL,
                )
                db.add(d)
            else:
                d.hostname = hostname or d.hostname
                d.last_seen_epoch = now
                d.last_base_url = base_url or d.last_base_url

                if not (d.active_profile_type or "").strip():
                    d.active_profile_type = DEFAULT_PROFILE_TYPE
                if not (d.active_profile_label or "").strip():
                    d.active_profile_label = DEFAULT_PROFILE_LABEL

            db.commit()

    def set_nickname(self, device_uuid: str, nickname: str):
        with SessionLocal() as db:
            d = db.get(Device, device_uuid)
            if not d:
                raise KeyError("device not found")

            d.nickname = nickname.strip()
            db.commit()
            db.refresh(d)
            return self._to_dict(d)

    def set_profile(self, device_uuid: str, profile_type: str, profile_label: str):
        with SessionLocal() as db:
            d = db.get(Device, device_uuid)
            if not d:
                raise KeyError("device not found")

            d.active_profile_type = profile_type
            d.active_profile_label = profile_label
            db.commit()
            db.refresh(d)
            return self._to_dict(d)

    def configure(self, device_uuid: str, nickname: str, profile_type: str, profile_label: str):
        with SessionLocal() as db:
            d = db.get(Device, device_uuid)
            if not d:
                raise KeyError("device not found")

            d.nickname = nickname.strip()
            d.active_profile_type = profile_type
            d.active_profile_label = profile_label
            db.commit()
            db.refresh(d)

            return self._to_dict(d)

    def get_one(self, device_uuid: str) -> dict | None:
        with SessionLocal() as db:
            d = db.get(Device, device_uuid)
            return self._to_dict(d) if d else None

    def get_map(self) -> dict[str, dict]:
        with SessionLocal() as db:
            rows = db.execute(select(Device)).scalars().all()
            return {d.device_uuid: self._to_dict(d) for d in rows}

    def _to_dict(self, d: Device) -> dict:
        nickname = (d.nickname or "").strip()

        profile_type = (d.active_profile_type or "").strip() or DEFAULT_PROFILE_TYPE
        profile_label = (d.active_profile_label or "").strip() or DEFAULT_PROFILE_LABEL

        is_configured = bool(nickname)

        return {
            "device_uuid": d.device_uuid,
            "nickname": d.nickname,
            "hostname": d.hostname,
            "first_seen_epoch": d.first_seen_epoch,
            "last_seen_epoch": d.last_seen_epoch,
            "last_base_url": d.last_base_url,
            "active_profile_type": profile_type,
            "active_profile_label": profile_label,
            "is_configured": is_configured,
            "needs_setup": not is_configured,
        }

    def count_missions(self, device_uuid: str) -> int:
        with SessionLocal() as db:
            return db.execute(
                select(func.count(Mission.mission_id))
                .where(Mission.device_uuid == device_uuid)
            ).scalar_one()

    def reset_configuration(self, device_uuid: str) -> bool:
        with SessionLocal() as db:
            d = db.get(Device, device_uuid)

            if not d:
                return False

            d.nickname = None
            d.active_profile_type = DEFAULT_PROFILE_TYPE
            d.active_profile_label = DEFAULT_PROFILE_LABEL

            db.commit()
            return True

    def delete_record(self, device_uuid: str) -> bool:
        with SessionLocal() as db:
            d = db.get(Device, device_uuid)

            if not d:
                return False

            db.execute(
                delete(StartPoint)
                .where(StartPoint.device_uuid == device_uuid)
            )

            db.delete(d)
            db.commit()

            return True
        