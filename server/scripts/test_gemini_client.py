
from pathlib import Path
import sys

SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))

from app import create_app
from app.services.gemini_client import GeminiClient


SAMPLE_MISSION_SUMMARY = {
    "mission_id": "demo_static_001",
    "mission_name": "Demo Static Monitoring",
    "profile_type": "static",
    "profile_label": "Static Station",
    "duration_s": 600,
    "telemetry_points": 1200,
    "valid_gps_points": 1200,
    "image_count": 0,
    "metrics": {
        "temp_c": {
            "min": 23.4,
            "max": 27.1,
            "avg": 25.2,
            "start": 23.8,
            "end": 26.7,
        },
        "hum_pct": {
            "min": 42.0,
            "max": 51.5,
            "avg": 46.8,
            "start": 50.1,
            "end": 43.2,
        },
        "press_hpa": {
            "min": 979.1,
            "max": 980.4,
            "avg": 979.8,
            "start": 979.6,
            "end": 979.9,
        },
        "gas_ohms": {
            "min": 9100,
            "max": 12400,
            "avg": 10850,
            "start": 12100,
            "end": 9400,
        },
    },
    "local_flags": [
        "temperature increased during the mission",
        "humidity decreased during the mission",
        "gas resistance decreased toward the end",
    ],
}


def main():
    app = create_app()

    with app.app_context():
        client = GeminiClient()
        result = client.analyze_mission_summary(SAMPLE_MISSION_SUMMARY)

    print("AI analysis result:")
    print(result)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
  