from pathlib import Path
import json
import sys

SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))

from app import create_app
from app.services.mission_ai_summary import build_mission_ai_summary
from app.services.gemini_client import GeminiClient


def main():
    app = create_app()

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python scripts/test_ai_analyze_mission.py <mission_id>")
        return 1

    mission_id = sys.argv[1]

    with app.app_context():
        summary = build_mission_ai_summary(mission_id)

        print("Mission summary built successfully.")
        print("Sending compact summary to Gemini...")
        print()

        client = GeminiClient()
        result = client.analyze_mission_summary(summary)

        print("AI analysis result:")
        print(json.dumps(result, indent=2, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
  