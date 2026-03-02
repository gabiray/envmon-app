from flask import Blueprint, jsonify, request
from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.db.models import Mission, TelemetryPoint

missions_db_bp = Blueprint("missions_db", __name__)

@missions_db_bp.get("/db/missions")
def db_list_missions():
    device_uuid = request.args.get("device_uuid")
    with SessionLocal() as db:
        q = select(Mission).order_by(Mission.started_at_epoch.desc().nullslast())
        if device_uuid:
            q = q.where(Mission.device_uuid == device_uuid)
        rows = db.execute(q).scalars().all()
        return jsonify([{
            "mission_id": m.mission_id,
            "device_uuid": m.device_uuid,
            "started_at_epoch": m.started_at_epoch,
            "ended_at_epoch": m.ended_at_epoch,
            "status": m.status,
            "stop_reason": m.stop_reason,
            "location_mode": m.location_mode,
            "start": {"lat": m.start_lat, "lon": m.start_lon, "alt_m": m.start_alt_m},
            "has_gps": bool(m.has_gps),
            "has_images": bool(m.has_images),
        } for m in rows])

@missions_db_bp.get("/db/missions/<mission_id>/track")
def db_mission_track(mission_id: str):
    """
    Returns GPS points for map polyline.
    """
    with SessionLocal() as db:
        rows = db.execute(
            select(TelemetryPoint.ts_epoch, TelemetryPoint.lat, TelemetryPoint.lon, TelemetryPoint.alt_m)
            .where(TelemetryPoint.mission_id == mission_id)
            .where(TelemetryPoint.lat.is_not(None))
            .where(TelemetryPoint.lon.is_not(None))
            .order_by(TelemetryPoint.ts_epoch.asc())
        ).all()

        return jsonify([{"ts_epoch": r[0], "lat": r[1], "lon": r[2], "alt_m": r[3]} for r in rows])

@missions_db_bp.get("/db/missions/<mission_id>/stats")
def db_mission_stats(mission_id: str):
    """
    Simple aggregates for Analytics charts.
    """
    with SessionLocal() as db:
        agg = db.execute(
            select(
                func.count(TelemetryPoint.id),
                func.min(TelemetryPoint.temp_c), func.max(TelemetryPoint.temp_c), func.avg(TelemetryPoint.temp_c),
                func.min(TelemetryPoint.hum_pct), func.max(TelemetryPoint.hum_pct), func.avg(TelemetryPoint.hum_pct),
                func.min(TelemetryPoint.press_hpa), func.max(TelemetryPoint.press_hpa), func.avg(TelemetryPoint.press_hpa),
                func.min(TelemetryPoint.gas_ohms), func.max(TelemetryPoint.gas_ohms), func.avg(TelemetryPoint.gas_ohms),
            )
            .where(TelemetryPoint.mission_id == mission_id)
        ).one()

        return jsonify({
            "mission_id": mission_id,
            "samples": int(agg[0] or 0),
            "temp_c": {"min": agg[1], "max": agg[2], "avg": agg[3]},
            "hum_pct": {"min": agg[4], "max": agg[5], "avg": agg[6]},
            "press_hpa": {"min": agg[7], "max": agg[8], "avg": agg[9]},
            "gas_ohms": {"min": agg[10], "max": agg[11], "avg": agg[12]},
        })