import hashlib
import json

from flask import Blueprint, jsonify, request, current_app

from app.services.mission_ai_summary import (
    build_mission_ai_summary,
    MissionAISummaryError,
)
from app.services.gemini_client import GeminiClient, GeminiClientError
from app.repositories.ai_reports_repo import AIReportsRepo


ai_analysis_bp = Blueprint("ai_analysis", __name__)


def _stable_hash(data: dict) -> str:
    payload = json.dumps(
        data,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _ai_enabled() -> bool:
    return bool(current_app.config.get("AI_ANALYSIS_ENABLED", False))


@ai_analysis_bp.get("/ai/reports/<mission_id>")
def get_ai_report(mission_id: str):
    """
    Returns the latest saved AI report for a mission.
    This endpoint does NOT call Gemini.
    """
    mission_id = str(mission_id or "").strip()

    if not mission_id:
        return jsonify({
            "ok": False,
            "error": "mission_id is required",
        }), 400

    report = AIReportsRepo().get_latest_for_mission(
        mission_id=mission_id,
        analysis_type="mission_summary",
    )

    if not report:
        return jsonify({
            "ok": True,
            "exists": False,
            "report": None,
        })

    return jsonify({
        "ok": True,
        "exists": True,
        "report": report,
    })


@ai_analysis_bp.post("/ai/analyze-mission")
def analyze_mission():
    """
    Generates or returns a cached AI analysis for one mission.

    Request body:
    {
      "mission_id": "...",
      "regenerate": false
    }

    If regenerate=false and a report with the same input_hash exists,
    Gemini is not called again.
    """
    if not _ai_enabled():
        return jsonify({
            "ok": False,
            "error": "AI analysis is disabled on this server.",
        }), 403

    payload = request.get_json(silent=True) or {}

    mission_id = str(payload.get("mission_id") or "").strip()
    regenerate = bool(payload.get("regenerate", False))

    if not mission_id:
        return jsonify({
            "ok": False,
            "error": "mission_id is required",
        }), 400

    try:
        summary = build_mission_ai_summary(mission_id)
        input_hash = _stable_hash(summary)

        repo = AIReportsRepo()

        if not regenerate:
            cached = repo.get_by_input_hash(
                mission_id=mission_id,
                input_hash=input_hash,
                analysis_type="mission_summary",
            )

            if cached:
                return jsonify({
                    "ok": True,
                    "cached": True,
                    "report": cached,
                })

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

        return jsonify({
            "ok": True,
            "cached": False,
            "report": saved,
        })

    except MissionAISummaryError as e:
        return jsonify({
            "ok": False,
            "error": str(e),
        }), 404

    except GeminiClientError as e:
        return jsonify({
            "ok": False,
            "error": str(e),
        }), 502

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": f"AI analysis failed: {e}",
        }), 500
        