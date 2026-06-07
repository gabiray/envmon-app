from pathlib import Path
import sys

from dotenv import load_dotenv
from google import genai


SERVER_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = SERVER_DIR / ".env"

load_dotenv(ENV_FILE)


def main():
    import os

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

    if not api_key:
        print("ERROR: GEMINI_API_KEY is missing from server/.env")
        return 1

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents=(
                "Raspunde in romana, intr-o singura propozitie: "
                "Gemini API functioneaza pentru aplicatia EnvMon."
            ),
        )

        print("Gemini response:")
        print(response.text)
        return 0

    except Exception as e:
        print("ERROR: Gemini request failed")
        print(str(e))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
  