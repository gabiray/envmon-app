import json
import time
from typing import Any

from sqlalchemy import select, delete

from app.db.session import SessionLocal
from app.db.models import AIReport


def _json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def _json_loads(text: str | None, fallback):
    if not text:
        return fallback

    try:
        return json.loads(text)
    except Exception:
        return fallback


class AIReportsRepo:
    def get_latest_for_mission(
        self,
        mission_id: str,
        analysis_type: str = "mission_summary",
    ) -> dict | None:
        with SessionLocal() as db:
            row = db.execute(
                select(AIReport)
                .where(AIReport.mission_id == mission_id)
                .where(AIReport.analysis_type == analysis_type)
                .order_by(AIReport.updated_at_epoch.desc())
                .limit(1)
            ).scalar_one_or_none()

            return self._to_dict(row) if row else None

    def get_by_input_hash(
        self,
        mission_id: str,
        input_hash: str,
        analysis_type: str = "mission_summary",
    ) -> dict | None:
        with SessionLocal() as db:
            row = db.execute(
                select(AIReport)
                .where(AIReport.mission_id == mission_id)
                .where(AIReport.analysis_type == analysis_type)
                .where(AIReport.input_hash == input_hash)
                .order_by(AIReport.updated_at_epoch.desc())
                .limit(1)
            ).scalar_one_or_none()

            return self._to_dict(row) if row else None

    def save_report(
        self,
        mission_id: str,
        analysis_type: str,
        model: str,
        input_hash: str,
        input_summary: dict,
        result: dict,
    ) -> dict:
        now = int(time.time())

        with SessionLocal() as db:
            existing = db.execute(
                select(AIReport)
                .where(AIReport.mission_id == mission_id)
                .where(AIReport.analysis_type == analysis_type)
                .where(AIReport.input_hash == input_hash)
                .limit(1)
            ).scalar_one_or_none()

            if existing:
                existing.model = model
                existing.input_summary_json = _json_dumps(input_summary)
                existing.result_json = _json_dumps(result)
                existing.updated_at_epoch = now
                row = existing
            else:
                row = AIReport(
                    mission_id=mission_id,
                    analysis_type=analysis_type,
                    model=model,
                    input_hash=input_hash,
                    input_summary_json=_json_dumps(input_summary),
                    result_json=_json_dumps(result),
                    created_at_epoch=now,
                    updated_at_epoch=now,
                )
                db.add(row)

            db.commit()
            db.refresh(row)

            return self._to_dict(row)

    def delete_by_mission(self, mission_id: str) -> int:
        with SessionLocal() as db:
            result = db.execute(
                delete(AIReport).where(AIReport.mission_id == mission_id)
            )
            db.commit()
            return result.rowcount or 0

    def _to_dict(self, row: AIReport) -> dict:
        return {
            "id": row.id,
            "mission_id": row.mission_id,
            "analysis_type": row.analysis_type,
            "model": row.model,
            "input_hash": row.input_hash,
            "input_summary": _json_loads(row.input_summary_json, {}),
            "result": _json_loads(row.result_json, {}),
            "created_at_epoch": row.created_at_epoch,
            "updated_at_epoch": row.updated_at_epoch,
        }
        