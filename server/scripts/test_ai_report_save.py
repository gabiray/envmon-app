from pathlib import Path
import hashlib
import json
import sys

SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))

from app import create_app
from app.services.mission_ai_summary import build_mission_ai_summary
from app.services.gemini_client import GeminiClient
from app.repositories.ai_reports_repo import AIReportsRepo


def stable_hash(data: dict) -> str:
    payload = json.dumps(
        data,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def main():
    app = create_app()

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python scripts/test_ai_report_save.py <mission_id>")
        return 1

    mission_id = sys.argv[1]

    with app.app_context():
        summary = build_mission_ai_summary(mission_id)
        input_hash = stable_hash(summary)

        repo = AIReportsRepo()
        cached = repo.get_by_input_hash(
            mission_id=mission_id,
            input_hash=input_hash,
            analysis_type="mission_summary",
        )

        if cached:
            print("Using cached AI report from DB.")
            print(json.dumps(cached, indent=2, ensure_ascii=False))
            return 0

        client = GeminiClient()
        result = client.analyze_mission_summary(summary)

        saved = repo.save_report(
            mission_id=mission_id,
            analysis_type="mission_summary",
            model=client.model,
            input_hash=input_hash,
            input_summary=summary,
            result=result,
        )

        print("AI report saved successfully.")
        print(json.dumps(saved, indent=2, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
  