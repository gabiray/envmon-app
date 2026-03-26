import { useEffect, useMemo, useState } from "react";
import { fetchHeatGrid, fetchMissionTrack } from "../services/heatmapApi";

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeTrackPoints(points) {
  return (points || [])
    .filter((item) => item?.lon != null && item?.lat != null)
    .map((item) => ({
      lat: Number(item.lat),
      lon: Number(item.lon),
      ts: item.ts ?? item.t ?? item.timestamp ?? null,
    }));
}

function buildTrackGeoJson(points) {
  const coords = normalizeTrackPoints(points).map((item) => [item.lon, item.lat]);

  if (coords.length < 2) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      },
    ],
  };
}

function buildTrackEndpointsGeoJson(points) {
  const normalized = normalizeTrackPoints(points);

  if (!normalized.length) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const first = normalized[0];
  const last = normalized[normalized.length - 1];

  if (normalized.length === 1) {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            role: "start",
            label: "Start",
          },
          geometry: {
            type: "Point",
            coordinates: [first.lon, first.lat],
          },
        },
      ],
    };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          role: "start",
          label: "Start",
        },
        geometry: {
          type: "Point",
          coordinates: [first.lon, first.lat],
        },
      },
      {
        type: "Feature",
        properties: {
          role: "end",
          label: "End",
        },
        geometry: {
          type: "Point",
          coordinates: [last.lon, last.lat],
        },
      },
    ],
  };
}

function buildHeatCellsGeoJson(heatGrid) {
  const cells = Array.isArray(heatGrid?.cells) ? heatGrid.cells : [];
  const min = Number(heatGrid?.value_min);
  const max = Number(heatGrid?.value_max);
  const range = max - min;

  return {
    type: "FeatureCollection",
    features: cells.map((cell, index) => {
      const value = Number(cell.value);
      const normalized =
        Number.isFinite(min) && Number.isFinite(max) && range > 0
          ? clamp01((value - min) / range)
          : 0.5;

      return {
        type: "Feature",
        properties: {
          id: index,
          value,
          samples: Number(cell.samples || 0),
          normalized,
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [Number(cell.min_lon), Number(cell.min_lat)],
            [Number(cell.max_lon), Number(cell.min_lat)],
            [Number(cell.max_lon), Number(cell.max_lat)],
            [Number(cell.min_lon), Number(cell.max_lat)],
            [Number(cell.min_lon), Number(cell.min_lat)],
          ]],
        },
      };
    }),
  };
}

export default function useHeatMapLayers({
  selectedMission = null,
  layerMode = "none",
  showTrack = false,
  showHeatmap = false,
  heatmapMetric = "temp_c",
  heatmapCellM = 15,
}) {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [trackPoints, setTrackPoints] = useState([]);
  const [heatGrid, setHeatGrid] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLayerData() {
      const hasMission = Boolean(selectedMission?.missionId);
      const hasAnyLayer = showTrack || showHeatmap;

      if (!hasMission || !hasAnyLayer || layerMode === "none") {
        setLoading(false);
        setErrorText("");
        setTrackPoints([]);
        setHeatGrid(null);
        return;
      }

      setLoading(true);
      setErrorText("");

      try {
        const [trackResult, heatmapResult] = await Promise.all([
          showTrack
            ? fetchMissionTrack(selectedMission.missionId)
            : Promise.resolve([]),
          showHeatmap
            ? fetchHeatGrid({
                mission_id: selectedMission.missionId,
                metric: heatmapMetric,
                cell_m: heatmapCellM,
              })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setTrackPoints(Array.isArray(trackResult) ? trackResult : []);
        setHeatGrid(heatmapResult || null);
      } catch (error) {
        if (cancelled) return;

        setTrackPoints([]);
        setHeatGrid(null);
        setErrorText(
          error?.response?.data?.error ||
            error?.message ||
            "Failed to load map layer data."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLayerData();

    return () => {
      cancelled = true;
    };
  }, [
    selectedMission,
    layerMode,
    showTrack,
    showHeatmap,
    heatmapMetric,
    heatmapCellM,
  ]);

  const trackGeoJson = useMemo(() => {
    return buildTrackGeoJson(trackPoints);
  }, [trackPoints]);

  const trackEndpointsGeoJson = useMemo(() => {
    return buildTrackEndpointsGeoJson(trackPoints);
  }, [trackPoints]);

  const heatCellsGeoJson = useMemo(() => {
    return buildHeatCellsGeoJson(heatGrid);
  }, [heatGrid]);

  const trackBounds = useMemo(() => {
    return normalizeTrackPoints(trackPoints).map((item) => [item.lon, item.lat]);
  }, [trackPoints]);

  const heatBounds = useMemo(() => {
    const bbox = heatGrid?.bbox;
    if (!bbox) return null;

    return [
      [Number(bbox.min_lon), Number(bbox.min_lat)],
      [Number(bbox.max_lon), Number(bbox.max_lat)],
    ];
  }, [heatGrid]);

  return {
    loading,
    errorText,
    trackPoints,
    trackGeoJson,
    trackEndpointsGeoJson,
    heatGrid,
    heatCellsGeoJson,
    trackBounds,
    heatBounds,
  };
}
