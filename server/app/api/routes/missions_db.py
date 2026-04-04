from __future__ import annotations

import json
import os
import shutil
from math import cos, radians, floor

from flask import Blueprint, jsonify, request, send_file
from sqlalchemy import select, func, distinct

from app.db.session import SessionLocal
from app.db.models import Mission, TelemetryPoint, MissionImage

missions_db_bp = Blueprint("missions_db", __name__)

_ALLOWED_METRICS = {
    "temp_c": TelemetryPoint.temp_c,
    "hum_pct": TelemetryPoint.hum_pct,
    "press_hpa": TelemetryPoint.press_hpa,
    "gas_ohms": TelemetryPoint.gas_ohms,
}


def _as_float(name: str) -> float | None:
    v = request.args.get(name)
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    return float(s)


@missions_db_bp.get("/db/missions")
def db_list_missions():
    device_uuid = (request.args.get("device_uuid") or "").strip() or None

    with SessionLocal() as db:
        q = select(Mission).order_by(Mission.started_at_epoch.desc().nullslast())
        if device_uuid:
            q = q.where(Mission.device_uuid == device_uuid)

        rows = db.execute(q).scalars().all()

        return jsonify(
            [
                {
                    "mission_id": m.mission_id,
                    "mission_name": m.mission_name or m.mission_id,
                    "device_uuid": m.device_uuid,
                    "profile_type": m.profile_type,
                    "profile_label": m.profile_label,
                    "created_at_epoch": m.created_at_epoch,
                    "started_at_epoch": m.started_at_epoch,
                    "ended_at_epoch": m.ended_at_epoch,
                    "status": m.status,
                    "stop_reason": m.stop_reason,
                    "location_mode": m.location_mode,
                    "start_point_id": m.start_point_id,
                    "location_name": m.location_name,
                    "start": {
                        "lat": m.start_lat,
                        "lon": m.start_lon,
                        "alt_m": m.start_alt_m,
                    },
                    "has_gps": bool(m.has_gps),
                    "has_images": bool(m.has_images),
                    "imported_at_epoch": m.imported_at_epoch,
                }
                for m in rows
            ]
        )


@missions_db_bp.get("/db/missions/<mission_id>/track")
def db_mission_track(mission_id: str):
    with SessionLocal() as db:
        rows = db.execute(
            select(
                TelemetryPoint.ts_epoch,
                TelemetryPoint.lat,
                TelemetryPoint.lon,
                TelemetryPoint.alt_m,
            )
            .where(TelemetryPoint.mission_id == mission_id)
            .where(TelemetryPoint.lat.is_not(None))
            .where(TelemetryPoint.lon.is_not(None))
            .order_by(TelemetryPoint.ts_epoch.asc())
        ).all()

        return jsonify(
            [
                {"ts_epoch": r[0], "lat": r[1], "lon": r[2], "alt_m": r[3]}
                for r in rows
            ]
        )


@missions_db_bp.get("/db/missions/<mission_id>/telemetry")
def db_mission_telemetry(mission_id: str):
    with SessionLocal() as db:
        rows = db.execute(
            select(
                TelemetryPoint.ts_epoch,
                TelemetryPoint.lat,
                TelemetryPoint.lon,
                TelemetryPoint.alt_m,
                TelemetryPoint.fix_quality,
                TelemetryPoint.satellites,
                TelemetryPoint.hdop,
                TelemetryPoint.temp_c,
                TelemetryPoint.hum_pct,
                TelemetryPoint.press_hpa,
                TelemetryPoint.gas_ohms,
            )
            .where(TelemetryPoint.mission_id == mission_id)
            .order_by(TelemetryPoint.ts_epoch.asc())
        ).all()

        return jsonify(
            [
                {
                    "ts_epoch": r[0],
                    "lat": r[1],
                    "lon": r[2],
                    "alt_m": r[3],
                    "fix_quality": r[4],
                    "satellites": r[5],
                    "hdop": r[6],
                    "temp_c": r[7],
                    "hum_pct": r[8],
                    "press_hpa": r[9],
                    "gas_ohms": r[10],
                }
                for r in rows
            ]
        )


@missions_db_bp.get("/db/missions/<mission_id>/images")
def db_mission_images(mission_id: str):
    with SessionLocal() as db:
        rows = db.execute(
            select(
                MissionImage.id,
                MissionImage.ts_epoch,
                MissionImage.lat,
                MissionImage.lon,
                MissionImage.alt_m,
                MissionImage.filename,
            )
            .where(MissionImage.mission_id == mission_id)
            .order_by(MissionImage.ts_epoch.asc(), MissionImage.id.asc())
        ).all()

        return jsonify(
            [
                {
                    "id": r[0],
                    "ts_epoch": r[1],
                    "lat": r[2],
                    "lon": r[3],
                    "alt_m": r[4],
                    "filename": r[5],
                }
                for r in rows
            ]
        )


@missions_db_bp.get("/db/missions/<mission_id>/images/<int:image_id>/file")
def db_mission_image_file(mission_id: str, image_id: int):
    with SessionLocal() as db:
        img = db.get(MissionImage, image_id)
        if not img or img.mission_id != mission_id:
            return jsonify({"ok": False, "error": "Image not found"}), 404

        image_path = img.path

    if not image_path or not os.path.exists(image_path):
        return jsonify({"ok": False, "error": "Image file not found on server"}), 404

    return send_file(image_path, mimetype="image/jpeg")


@missions_db_bp.get("/db/missions/<mission_id>/stats")
def db_mission_stats(mission_id: str):
    with SessionLocal() as db:
        agg = db.execute(
            select(
                func.count(TelemetryPoint.id),
                func.min(TelemetryPoint.temp_c),
                func.max(TelemetryPoint.temp_c),
                func.avg(TelemetryPoint.temp_c),
                func.min(TelemetryPoint.hum_pct),
                func.max(TelemetryPoint.hum_pct),
                func.avg(TelemetryPoint.hum_pct),
                func.min(TelemetryPoint.press_hpa),
                func.max(TelemetryPoint.press_hpa),
                func.avg(TelemetryPoint.press_hpa),
                func.min(TelemetryPoint.gas_ohms),
                func.max(TelemetryPoint.gas_ohms),
                func.avg(TelemetryPoint.gas_ohms),
            ).where(TelemetryPoint.mission_id == mission_id)
        ).one()

        return jsonify(
            {
                "mission_id": mission_id,
                "samples": int(agg[0] or 0),
                "temp_c": {"min": agg[1], "max": agg[2], "avg": agg[3]},
                "hum_pct": {"min": agg[4], "max": agg[5], "avg": agg[6]},
                "press_hpa": {"min": agg[7], "max": agg[8], "avg": agg[9]},
                "gas_ohms": {"min": agg[10], "max": agg[11], "avg": agg[12]},
            }
        )


@missions_db_bp.get("/db/heatmap")
def db_heatmap():
    mission_id = (request.args.get("mission_id") or "").strip()
    if not mission_id:
        return jsonify({"ok": False, "error": "mission_id is required"}), 400

    metric_key = (request.args.get("metric") or "temp_c").strip()
    if metric_key not in _ALLOWED_METRICS:
        return jsonify({"ok": False, "error": f"invalid metric: {metric_key}"}), 400

    try:
        cell_m = float(request.args.get("cell_m") or 15.0)
        if cell_m <= 0:
            raise ValueError()
    except Exception:
        return jsonify({"ok": False, "error": "cell_m must be a positive number"}), 400

    min_lat = _as_float("min_lat")
    min_lon = _as_float("min_lon")
    max_lat = _as_float("max_lat")
    max_lon = _as_float("max_lon")

    metric_col = _ALLOWED_METRICS[metric_key]

    with SessionLocal() as db:
        if None in (min_lat, min_lon, max_lat, max_lon):
            ext = db.execute(
                select(
                    func.min(TelemetryPoint.lat),
                    func.min(TelemetryPoint.lon),
                    func.max(TelemetryPoint.lat),
                    func.max(TelemetryPoint.lon),
                )
                .where(TelemetryPoint.mission_id == mission_id)
                .where(TelemetryPoint.lat.is_not(None))
                .where(TelemetryPoint.lon.is_not(None))
                .where(metric_col.is_not(None))
            ).one()

            if ext[0] is None:
                return jsonify(
                    {
                        "ok": True,
                        "mission_id": mission_id,
                        "metric": metric_key,
                        "cell_m": cell_m,
                        "bbox": None,
                        "value_min": None,
                        "value_max": None,
                        "cells": [],
                    }
                )

            min_lat = float(ext[0]) if min_lat is None else min_lat
            min_lon = float(ext[1]) if min_lon is None else min_lon
            max_lat = float(ext[2]) if max_lat is None else max_lat
            max_lon = float(ext[3]) if max_lon is None else max_lon

            pad = 0.0003
            min_lat -= pad
            min_lon -= pad
            max_lat += pad
            max_lon += pad

        lat_mid = (min_lat + max_lat) / 2.0
        meters_per_deg_lat = 111_320.0
        meters_per_deg_lon = 111_320.0 * max(cos(radians(lat_mid)), 1e-6)

        dlat = cell_m / meters_per_deg_lat
        dlon = cell_m / meters_per_deg_lon

        rows = db.execute(
            select(TelemetryPoint.lat, TelemetryPoint.lon, metric_col)
            .where(TelemetryPoint.mission_id == mission_id)
            .where(TelemetryPoint.lat.is_not(None))
            .where(TelemetryPoint.lon.is_not(None))
            .where(metric_col.is_not(None))
            .where(TelemetryPoint.lat >= min_lat)
            .where(TelemetryPoint.lat <= max_lat)
            .where(TelemetryPoint.lon >= min_lon)
            .where(TelemetryPoint.lon <= max_lon)
        ).all()

        agg: dict[tuple[int, int], tuple[float, int]] = {}
        for lat, lon, val in rows:
            i = int(floor((float(lat) - min_lat) / dlat))
            j = int(floor((float(lon) - min_lon) / dlon))
            key = (i, j)
            s, c = agg.get(key, (0.0, 0))
            agg[key] = (s + float(val), c + 1)

        cells = []
        vmin = None
        vmax = None

        for (i, j), (s, c) in agg.items():
            avg = s / c

            lat0 = min_lat + i * dlat
            lon0 = min_lon + j * dlon
            lat1 = lat0 + dlat
            lon1 = lon0 + dlon

            cells.append(
                {
                    "min_lat": lat0,
                    "min_lon": lon0,
                    "max_lat": lat1,
                    "max_lon": lon1,
                    "value": avg,
                    "samples": c,
                }
            )

            vmin = avg if vmin is None else min(vmin, avg)
            vmax = avg if vmax is None else max(vmax, avg)

        return jsonify(
            {
                "ok": True,
                "mission_id": mission_id,
                "metric": metric_key,
                "cell_m": cell_m,
                "bbox": {
                    "min_lat": min_lat,
                    "min_lon": min_lon,
                    "max_lat": max_lat,
                    "max_lon": max_lon,
                },
                "value_min": vmin,
                "value_max": vmax,
                "cells": cells,
            }
        )


@missions_db_bp.get("/db/summary")
def db_summary():
    device_uuid = (request.args.get("device_uuid") or "").strip() or None

    with SessionLocal() as db:
        q_missions = select(func.count()).select_from(Mission)
        q_devices = select(func.count(distinct(Mission.device_uuid))).select_from(Mission)

        if device_uuid:
            q_missions = q_missions.where(Mission.device_uuid == device_uuid)
            q_devices = q_devices.where(Mission.device_uuid == device_uuid)

        mission_count = int(db.execute(q_missions).scalar() or 0)
        device_count = int(db.execute(q_devices).scalar() or 0)

    return jsonify({
        "ok": True,
        "mission_count": mission_count,
        "device_count": device_count,
    })


@missions_db_bp.get("/db/missions/<mission_id>")
def db_get_mission(mission_id: str):
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if not m:
            return jsonify({"ok": False, "error": "Mission not found"}), 404

        telemetry_count = int(
            db.execute(
                select(func.count()).select_from(TelemetryPoint).where(TelemetryPoint.mission_id == mission_id)
            ).scalar() or 0
        )

        image_count = int(
            db.execute(
                select(func.count()).select_from(MissionImage).where(MissionImage.mission_id == mission_id)
            ).scalar() or 0
        )

        try:
            profile = json.loads(m.profile_json or "{}")
        except Exception:
            profile = {}

        try:
            meta = json.loads(m.meta_json or "{}")
        except Exception:
            meta = {}

        return jsonify({
            "ok": True,
            "item": {
                "mission_id": m.mission_id,
                "mission_name": m.mission_name or m.mission_id,
                "device_uuid": m.device_uuid,
                "profile_type": m.profile_type,
                "profile_label": m.profile_label,
                "created_at_epoch": m.created_at_epoch,
                "started_at_epoch": m.started_at_epoch,
                "ended_at_epoch": m.ended_at_epoch,
                "status": m.status,
                "stop_reason": m.stop_reason,
                "location_mode": m.location_mode,
                "start_point_id": m.start_point_id,
                "location_name": m.location_name,
                "start": {
                    "lat": m.start_lat,
                    "lon": m.start_lon,
                    "alt_m": m.start_alt_m,
                },
                "has_gps": bool(m.has_gps),
                "has_images": bool(m.has_images),
                "imported_at_epoch": m.imported_at_epoch,
                "raw_zip_path": m.raw_zip_path,
                "unpacked_path": m.unpacked_path,
                "telemetry_count": telemetry_count,
                "image_count": image_count,
                "profile": profile,
                "meta": meta,
            }
        })


@missions_db_bp.patch("/db/missions/<mission_id>")
def db_rename_mission(mission_id: str):
    payload = request.get_json(silent=True) or {}
    mission_name = str(payload.get("mission_name") or "").strip()

    if not mission_name:
        return jsonify({"ok": False, "error": "mission_name required"}), 400

    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if not m:
            return jsonify({"ok": False, "error": "Mission not found"}), 404

        m.mission_name = mission_name
        db.commit()

    return jsonify({
        "ok": True,
        "mission_id": mission_id,
        "mission_name": mission_name,
    })


@missions_db_bp.delete("/db/missions/<mission_id>")
def db_delete_mission(mission_id: str):
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if not m:
            return jsonify({"ok": False, "error": "Mission not found"}), 404

        raw_zip_path = m.raw_zip_path
        unpacked_path = m.unpacked_path

        db.delete(m)
        db.commit()

    if raw_zip_path and os.path.exists(raw_zip_path):
        try:
            os.remove(raw_zip_path)
        except Exception:
            pass

    if unpacked_path and os.path.exists(unpacked_path):
        try:
            shutil.rmtree(unpacked_path, ignore_errors=True)
        except Exception:
            pass

    return jsonify({"ok": True, "mission_id": mission_id})


@missions_db_bp.get("/db/missions/<mission_id>/export")
def db_export_mission(mission_id: str):
    with SessionLocal() as db:
        m = db.get(Mission, mission_id)
        if not m:
            return jsonify({"ok": False, "error": "Mission not found"}), 404

        zip_path = m.raw_zip_path

    if not zip_path or not os.path.exists(zip_path):
        return jsonify({"ok": False, "error": "ZIP file not found on server"}), 404

    return send_file(
        zip_path,
        as_attachment=True,
        download_name=f"{mission_id}.zip",
        mimetype="application/zip",
    )
    