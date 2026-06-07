import json
from typing import Any

from sqlalchemy import select

from app.db.session import SessionLocal
from app.db.models import Mission, TelemetryPoint


class MissionAISummaryError(RuntimeError):
    pass


def _round(value: Any, digits: int = 3):
    if value is None:
        return None

    try:
        return round(float(value), digits)
    except Exception:
        return None


def _safe_json_loads(value: str | None, fallback):
    if not value:
        return fallback

    try:
        return json.loads(value)
    except Exception:
        return fallback


def _first_not_none(values: list[float]) -> float | None:
    for value in values:
        if value is not None:
            return value
    return None


def _last_not_none(values: list[float]) -> float | None:
    for value in reversed(values):
        if value is not None:
            return value
    return None


def _metric_stats(rows: list[TelemetryPoint], attr_name: str) -> dict:
    """
    Builds compact statistics for one telemetry metric.

    Important:
    - start/end are based on first and last available values in time order.
    - min/max describe the measured range.
    - delta = end - start.
    """
    ordered_values = []

    for row in rows:
        raw_value = getattr(row, attr_name, None)

        if raw_value is None:
            ordered_values.append(None)
            continue

        try:
            ordered_values.append(float(raw_value))
        except Exception:
            ordered_values.append(None)

    values = [value for value in ordered_values if value is not None]

    if not values:
        return {
            "available": False,
            "count": 0,
            "min": None,
            "max": None,
            "avg": None,
            "start": None,
            "end": None,
            "delta": None,
            "range": None,
        }

    start = _first_not_none(ordered_values)
    end = _last_not_none(ordered_values)
    min_v = min(values)
    max_v = max(values)
    avg_v = sum(values) / len(values)

    return {
        "available": True,
        "count": len(values),
        "min": _round(min_v),
        "max": _round(max_v),
        "avg": _round(avg_v),
        "start": _round(start),
        "end": _round(end),
        "delta": _round(end - start) if start is not None and end is not None else None,
        "range": _round(max_v - min_v),
    }


def _percentage(part: int, total: int) -> float:
    if not total:
        return 0.0

    return _round((part / total) * 100.0, 2)


def _gps_quality_summary(rows: list[TelemetryPoint]) -> dict:
    total = len(rows)

    valid_gps_rows = [
        row for row in rows
        if row.lat is not None and row.lon is not None
    ]

    fix_rows = [
        row for row in valid_gps_rows
        if row.fix_quality is not None and int(row.fix_quality or 0) > 0
    ]

    good_gps_rows = [
        row for row in fix_rows
        if (
            row.hdop is not None
            and float(row.hdop) <= 4.0
            and (row.satellites is None or int(row.satellites or 0) >= 4)
        )
    ]

    hdop_values = [
        float(row.hdop)
        for row in fix_rows
        if row.hdop is not None
    ]

    satellite_values = [
        int(row.satellites)
        for row in fix_rows
        if row.satellites is not None
    ]

    return {
        "total_points": total,
        "valid_coordinate_points": len(valid_gps_rows),
        "fix_points": len(fix_rows),
        "good_gps_points": len(good_gps_rows),
        "valid_coordinate_coverage_pct": _percentage(len(valid_gps_rows), total),
        "fix_coverage_pct": _percentage(len(fix_rows), total),
        "good_gps_coverage_pct": _percentage(len(good_gps_rows), total),
        "hdop": {
            "min": _round(min(hdop_values), 2) if hdop_values else None,
            "max": _round(max(hdop_values), 2) if hdop_values else None,
            "avg": _round(sum(hdop_values) / len(hdop_values), 2) if hdop_values else None,
        },
        "satellites": {
            "min": min(satellite_values) if satellite_values else None,
            "max": max(satellite_values) if satellite_values else None,
            "avg": _round(sum(satellite_values) / len(satellite_values), 2)
            if satellite_values
            else None,
        },
    }


def _first_last_location(rows: list[TelemetryPoint]) -> dict:
    valid_rows = [
        row for row in rows
        if row.lat is not None and row.lon is not None
    ]

    if not valid_rows:
        return {
            "first": None,
            "last": None,
        }

    first = valid_rows[0]
    last = valid_rows[-1]

    return {
        "first": {
            "lat": _round(first.lat, 7),
            "lon": _round(first.lon, 7),
            "alt_m": _round(first.alt_m, 2),
            "ts_epoch": _round(first.ts_epoch, 3),
        },
        "last": {
            "lat": _round(last.lat, 7),
            "lon": _round(last.lon, 7),
            "alt_m": _round(last.alt_m, 2),
            "ts_epoch": _round(last.ts_epoch, 3),
        },
    }


def _mission_duration_s(mission: Mission, rows: list[TelemetryPoint]) -> float | None:
    if mission.started_at_epoch is not None and mission.ended_at_epoch is not None:
        return _round(float(mission.ended_at_epoch) - float(mission.started_at_epoch), 3)

    if len(rows) >= 2:
        return _round(float(rows[-1].ts_epoch) - float(rows[0].ts_epoch), 3)

    return None


def _build_local_flags(
    metrics: dict,
    telemetry_points: int,
    gps_summary: dict,
) -> list[str]:
    flags = []

    if telemetry_points == 0:
        return ["No telemetry points are available."]

    valid_coordinate_coverage = gps_summary.get("valid_coordinate_coverage_pct") or 0
    good_gps_coverage = gps_summary.get("good_gps_coverage_pct") or 0

    if valid_coordinate_coverage == 0:
        flags.append("No valid GPS coordinates are available.")
    elif valid_coordinate_coverage < 50:
        flags.append("Less than 50% of telemetry points have valid GPS coordinates.")
    elif valid_coordinate_coverage < 90:
        flags.append("Some telemetry points are missing valid GPS coordinates.")

    if valid_coordinate_coverage > 0 and good_gps_coverage < 50:
        flags.append("GPS quality appears weak based on fix quality, HDOP, or satellite count.")

    temp = metrics.get("temp_c") or {}
    hum = metrics.get("hum_pct") or {}
    press = metrics.get("press_hpa") or {}
    gas = metrics.get("gas_ohms") or {}

    if temp.get("available") and temp.get("delta") is not None:
        if temp["delta"] >= 1.0:
            flags.append("Temperature increased during the mission.")
        elif temp["delta"] <= -1.0:
            flags.append("Temperature decreased during the mission.")

    if temp.get("available") and temp.get("range") is not None:
        if temp["range"] >= 5.0:
            flags.append("Temperature range was relatively high during the mission.")

    if hum.get("available") and hum.get("delta") is not None:
        if hum["delta"] >= 5.0:
            flags.append("Humidity increased noticeably during the mission.")
        elif hum["delta"] <= -5.0:
            flags.append("Humidity decreased noticeably during the mission.")

    if hum.get("available") and hum.get("range") is not None:
        if hum["range"] >= 15.0:
            flags.append("Humidity range was relatively high during the mission.")

    if press.get("available") and press.get("range") is not None:
        if press["range"] >= 2.0:
            flags.append("Pressure variation was relatively high for this mission.")

    if gas.get("available") and gas.get("delta") is not None:
        if gas["delta"] >= 1000:
            flags.append("Gas resistance increased noticeably toward the end of the mission.")
        elif gas["delta"] <= -1000:
            flags.append("Gas resistance decreased noticeably toward the end of the mission.")

    if gas.get("available") and gas.get("range") is not None:
        if gas["range"] >= 5000:
            flags.append("Gas resistance range was relatively high during the mission.")

    if not flags:
        flags.append("No major local warning flags were detected by the backend summary step.")

    return flags


def _build_data_quality(
    telemetry_points: int,
    metrics: dict,
    gps_summary: dict,
) -> dict:
    if telemetry_points == 0:
        return {
            "status": "poor",
            "notes": ["Mission has no telemetry points."],
        }

    notes = []

    available_metrics = [
        name for name, stats in metrics.items()
        if stats.get("available")
    ]

    if len(available_metrics) == 4:
        notes.append("All main environmental metrics are available.")
    elif available_metrics:
        notes.append(
            "Only some environmental metrics are available: "
            + ", ".join(available_metrics)
            + "."
        )
    else:
        notes.append("No environmental metric values are available.")

    valid_coordinate_coverage = gps_summary.get("valid_coordinate_coverage_pct") or 0
    good_gps_coverage = gps_summary.get("good_gps_coverage_pct") or 0

    if valid_coordinate_coverage >= 90:
        notes.append("Most telemetry points include valid GPS coordinates.")
    elif valid_coordinate_coverage > 0:
        notes.append("GPS coordinates are only partially available.")
    else:
        notes.append("GPS coordinates are not available for this mission.")

    if good_gps_coverage >= 75:
        notes.append("GPS quality appears good for most samples.")
    elif good_gps_coverage > 0:
        notes.append("GPS quality is mixed across the mission.")
    elif valid_coordinate_coverage > 0:
        notes.append("Coordinates exist, but GPS quality indicators are weak or incomplete.")

    if len(available_metrics) >= 3 and valid_coordinate_coverage >= 70:
        status = "good"
    elif len(available_metrics) >= 2 or valid_coordinate_coverage > 0:
        status = "partial"
    else:
        status = "poor"

    return {
        "status": status,
        "notes": notes,
    }


def _compact_simulation_context(simulation: dict | None) -> dict:
    if not isinstance(simulation, dict):
        return {
            "enabled": False,
        }

    return {
        "enabled": bool(simulation.get("enabled")),
        "engine": simulation.get("engine"),
        "route_id": simulation.get("route_id"),
        "profile_type": simulation.get("profile_type"),
        "ideal_sensor_model": simulation.get("ideal_sensor_model"),
        "nominal_duration_s": simulation.get("nominal_duration_s"),
        "actual_duration_s": simulation.get("actual_duration_s"),
        "route_distance_m": simulation.get("route_distance_m"),
    }
    

def build_mission_ai_summary(mission_id: str) -> dict:
    """
    Builds a compact telemetry-only summary for AI analysis.

    This function does NOT read or send mission images.
    It only uses:
    - mission metadata;
    - telemetry values;
    - GPS quality fields;
    - computed backend statistics.
    """
    mission_id = str(mission_id or "").strip()

    if not mission_id:
        raise MissionAISummaryError("mission_id is required")

    with SessionLocal() as db:
        mission = db.get(Mission, mission_id)

        if not mission:
            raise MissionAISummaryError(f"Mission not found: {mission_id}")

        rows = db.execute(
            select(TelemetryPoint)
            .where(TelemetryPoint.mission_id == mission_id)
            .order_by(TelemetryPoint.ts_epoch.asc())
        ).scalars().all()

        telemetry_points = len(rows)

        metrics = {
            "temp_c": _metric_stats(rows, "temp_c"),
            "hum_pct": _metric_stats(rows, "hum_pct"),
            "press_hpa": _metric_stats(rows, "press_hpa"),
            "gas_ohms": _metric_stats(rows, "gas_ohms"),
        }

        gps_summary = _gps_quality_summary(rows)

        local_flags = _build_local_flags(
            metrics=metrics,
            telemetry_points=telemetry_points,
            gps_summary=gps_summary,
        )

        data_quality = _build_data_quality(
            telemetry_points=telemetry_points,
            metrics=metrics,
            gps_summary=gps_summary,
        )

        profile_json = _safe_json_loads(mission.profile_json, {})
        meta_json = _safe_json_loads(mission.meta_json, {})

        return {
            "mission": {
                "mission_id": mission.mission_id,
                "mission_name": mission.mission_name or mission.mission_id,
                "device_uuid": mission.device_uuid,
                "profile_type": mission.profile_type,
                "profile_label": mission.profile_label,
                "status": mission.status,
                "stop_reason": mission.stop_reason,
                "created_at_epoch": mission.created_at_epoch,
                "started_at_epoch": mission.started_at_epoch,
                "ended_at_epoch": mission.ended_at_epoch,
                "duration_s": _mission_duration_s(mission, rows),
            },

            "location": {
                "location_mode": mission.location_mode,
                "start_point_id": mission.start_point_id,
                "location_name": mission.location_name,
                "configured_start": {
                    "lat": _round(mission.start_lat, 7),
                    "lon": _round(mission.start_lon, 7),
                    "alt_m": _round(mission.start_alt_m, 2),
                },
                "observed": _first_last_location(rows),
            },

            "data_volume": {
                "telemetry_points": telemetry_points,
                "has_gps": bool(mission.has_gps),
            },

            "gps_quality": gps_summary,

            "metrics": metrics,

            "local_backend_flags": local_flags,

            "data_quality": data_quality,

            "mission_profile_config": {
                "duration_s": profile_json.get("duration_s"),
                "sample_hz": profile_json.get("sample_hz"),
                "gps_mode": profile_json.get("gps_mode"),
                "location_mode": profile_json.get("location_mode"),
                "fixed_location": profile_json.get("fixed_location"),
            },

            "mission_meta_context": {
              "simulation": _compact_simulation_context(meta_json.get("simulation")),
              "bme_baseline_available": bool(meta_json.get("bme_baseline")),
              "gps_ready": meta_json.get("gps_ready"),
            },

            "analysis_scope": {
                "uses_telemetry": True,
                "uses_mission_metadata": True,
                "uses_gps_quality": True,
                "uses_images": False,
                "note": (
                    "This analysis is based only on telemetry, GPS quality, "
                    "mission metadata, and computed metric statistics. "
                    "Mission images are intentionally excluded."
                ),
            },

            "ai_input_note": (
                "This is a compact preprocessed summary generated by the backend. "
                "The raw telemetry CSV and mission images are not sent to the AI model."
            ),
        }
        