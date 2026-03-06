from __future__ import annotations

from math import cos, radians, floor
from flask import Blueprint, jsonify, request
from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.db.models import Mission, TelemetryPoint

missions_db_bp = Blueprint("missions_db", __name__)

# Allowed metrics for heatmap aggregation
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
    """
    Lists missions imported in the local DB.
    Optional query param:
      - device_uuid: filter missions for a specific device
    """
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
                    "device_uuid": m.device_uuid,
                    "created_at_epoch": m.created_at_epoch,
                    "started_at_epoch": m.started_at_epoch,
                    "ended_at_epoch": m.ended_at_epoch,
                    "status": m.status,
                    "stop_reason": m.stop_reason,
                    "location_mode": m.location_mode,
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
    """
    Returns GPS points for map polylines.
    """
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


@missions_db_bp.get("/db/missions/<mission_id>/stats")
def db_mission_stats(mission_id: str):
    """
    Simple aggregates for Analytics charts.
    """
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
    """
    Builds a grid heatmap for a mission using telemetry points.

    Query:
      - mission_id (required)
      - metric: temp_c|hum_pct|press_hpa|gas_ohms (default temp_c)
      - cell_m: grid resolution in meters (default 15)
      - min_lat/min_lon/max_lat/max_lon (optional bbox)
    """
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
        # If bbox not provided, compute it from points for this mission + metric
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

            # Small padding so edge points still fall inside the grid
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

        # Fetch points inside bbox
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

        # Aggregate per cell (i, j)
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
