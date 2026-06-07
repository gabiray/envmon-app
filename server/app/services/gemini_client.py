import json
import re
from typing import Any

from flask import current_app, has_app_context
from google import genai

from app.config import Config


class GeminiClientError(RuntimeError):
    pass


def _config_value(name: str, default: Any = None) -> Any:
    """
    Reads config both inside Flask request context and from scripts.
    """
    if has_app_context():
        return current_app.config.get(name, default)

    return getattr(Config, name, default)


def _extract_json(text: str) -> dict:
    """
    Gemini should return JSON only, but this function also handles cases where
    the response is wrapped in ```json ... ```.
    """
    if not text or not text.strip():
        raise GeminiClientError("Empty response from Gemini.")

    cleaned = text.strip()

    fence_match = re.search(
        r"```(?:json)?\s*(\{.*?\})\s*```",
        cleaned,
        flags=re.DOTALL | re.IGNORECASE,
    )

    if fence_match:
        cleaned = fence_match.group(1).strip()
    else:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start : end + 1]

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise GeminiClientError(f"Gemini response was not valid JSON: {e}") from e


class GeminiClient:
    def __init__(self):
        self.api_key = str(_config_value("GEMINI_API_KEY", "") or "").strip()
        self.model = str(
            _config_value("GEMINI_MODEL", "gemini-2.5-flash-lite") or ""
        ).strip()

        if not self.api_key:
            raise GeminiClientError("GEMINI_API_KEY is missing.")

        if not self.model:
            raise GeminiClientError("GEMINI_MODEL is missing.")

        self.client = genai.Client(api_key=self.api_key)

    def analyze_mission_summary(self, mission_summary: dict) -> dict:
        """
        Sends a compact mission summary to Gemini and expects a structured JSON response.
        The raw telemetry CSV is not sent here.
        """
        prompt = self._build_mission_analysis_prompt(mission_summary)

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )
        except Exception as e:
            raise GeminiClientError(f"Gemini request failed: {e}") from e

        return _extract_json(response.text or "")

    def _build_mission_analysis_prompt(self, mission_summary: dict) -> str:
        summary_json = json.dumps(
            mission_summary,
            ensure_ascii=False,
            indent=2,
        )

        return f"""
You are an AI analysis module for EnvMon, an environmental monitoring application.

Analyze the following mission summary. The data may come from a drone, car, bicycle, or static environmental monitoring profile.

Important rules:
- Respond in English.
- Return ONLY valid JSON.
- Do not use Markdown.
- Do not invent measurements that are not present in the input.
- If the data is insufficient, say that clearly.
- Base every conclusion on the provided numeric evidence.
- For temporal trends, use the "start", "end", and "delta" fields.
- Use "min" and "max" only to describe the measured range, not the start-to-end change.
- Do not mention image analysis. Images are not included in this analysis version.
- Analyze only telemetry, GPS coverage, mission metadata, and computed metric statistics.
- Keep the interpretation useful for an environmental monitoring dashboard.

Required JSON schema:
{{
  "overall_status": "normal | watch | anomaly | insufficient_data",
  "summary": "short English summary",
  "key_findings": [
    {{
      "title": "finding title",
      "severity": "low | medium | high",
      "evidence": "numeric evidence from the mission summary",
      "interpretation": "what this may indicate"
    }}
  ],
  "data_quality": {{
    "status": "good | partial | poor",
    "notes": ["short note"]
  }},
  "recommendations": [
    "short practical recommendation"
  ],
  "confidence": "low | medium | high"
}}

Mission summary:
{summary_json}
""".strip()
