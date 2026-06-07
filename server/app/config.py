import os
from pathlib import Path
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)


class Config:
    # Device URL default
    DEFAULT_DEVICE_URL = os.getenv(
        "DEFAULT_DEVICE_URL",
        "http://192.168.137.92:8000",
    )

    # Gemini / AI analysis
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    AI_ANALYSIS_ENABLED = os.getenv(
        "AI_ANALYSIS_ENABLED",
        "false",
    ).strip().lower() in ("1", "true", "yes", "on")
    