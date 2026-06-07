from pathlib import Path
import json
import sys

SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))

from sqlalchemy import select

from app import create_app
from app.db.session import SessionLocal
from app.db.models import Mission
from app.services.mission_ai_summary import build_mission_ai_summary


def list_recent_missions(limit: int = 10):
    with SessionLocal() as db:
        rows = db.execute(
            select(Mission)
            .order_by(Mission.started_at_epoch.desc().nullslast())
            .limit(limit)
        ).scalars().all()

        return [
            {
                "mission_id": m.mission_id,
                "mission_name": m.mission_name or m.mission_id,
                "profile_type": m.profile_type,
                "location_name": m.location_name,
                "started_at_epoch": m.started_at_epoch,
            }
            for m in rows
        ]


def main():
    app = create_app()

    with app.app_context():
        if len(sys.argv) < 2:
            print("Usage:")
            print("  python scripts/test_mission_ai_summary.py <mission_id>")
            print()
            print("Recent missions:")
            print(json.dumps(list_recent_missions(), indent=2, ensure_ascii=False))
            return 0

        mission_id = sys.argv[1]
        summary = build_mission_ai_summary(mission_id)

        print(json.dumps(summary, indent=2, ensure_ascii=False))
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
  