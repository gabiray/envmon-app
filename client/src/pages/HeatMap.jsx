import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";

import HeatMapLayout from "../components/heatmap/HeatMapLayout";
import HeatMapSidebar from "../components/heatmap/HeatMapSidebar";
import HeatMapMapView from "../components/heatmap/HeatMapMapView";
import useHeatMapData from "../hooks/useHeatMapData";
import useHeatMapLayers from "../hooks/useHeatMapLayers";

const EMPTY_LAYERS = {
  track: false,
  heatmap: false,
  captures: false,
};

function missionHasMapLocation(mission) {
  return mission?.start?.lat != null && mission?.start?.lon != null;
}

function getDefaultMissionLayers(mission) {
  const hasMapLocation = missionHasMapLocation(mission);

  return {
    track: hasMapLocation,
    heatmap: hasMapLocation,
    captures: hasMapLocation && Boolean(mission?.hasImages),
  };
}

export default function HeatMap() {
  const {
    selectedDeviceId = "none",
    activeDevice = null,
    selectedProfileType = "drone",
    profiles = [],
    devicesRaw = [],
  } = useOutletContext() || {};

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedMissionId = (searchParams.get("missionId") || "").trim();

  const [profileType, setProfileType] = useState(
    selectedProfileType || "drone",
  );

  const [searchValue, setSearchValue] = useState("");
  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [selectedLocationKey, setSelectedLocationKey] = useState(null);
  const [expandedMissionIds, setExpandedMissionIds] = useState([]);

  const [returnLocationKey, setReturnLocationKey] = useState(null);
  const [pendingLayerMissionId, setPendingLayerMissionId] = useState(null);
  const suppressDeepLinkRef = useRef(false);
  const lastAutoLayerMissionRef = useRef(null);

  const [visibleLayers, setVisibleLayers] = useState(EMPTY_LAYERS);
  const [heatmapMetric, setHeatmapMetric] = useState("temp_c");
  const [heatmapCellM, setHeatmapCellM] = useState(15);

  // Keep profile synced with the active device only when the page is opened
  // normally. When opened with missionId, the mission decides the profile.
  useEffect(() => {
    if (requestedMissionId) return;

    setProfileType(selectedProfileType || "drone");
  }, [selectedProfileType, requestedMissionId]);

  const {
    loading,
    errorText,
    activeDeviceMissions,
    missionMap,
    allMissionMap,
    locationPins,
  } = useHeatMapData({
    selectedDeviceId,
    profileType,
    searchValue,
    devicesRaw,
  });

  const selectedMission = useMemo(() => {
    if (!selectedMissionId) return null;

    return missionMap.get(selectedMissionId) || null;
  }, [selectedMissionId, missionMap]);

  // If the selected mission no longer belongs to the current profile/filter,
  // clear the selected map layers.
  useEffect(() => {
    if (!selectedMissionId) return;

    if (!missionMap.has(selectedMissionId)) {
      setSelectedMissionId(null);
      setVisibleLayers(EMPTY_LAYERS);
      setPendingLayerMissionId(null);
    }
  }, [selectedMissionId, missionMap]);

  useEffect(() => {
    if (!selectedMission) {
      lastAutoLayerMissionRef.current = null;
      return;
    }

    const missionId = selectedMission.missionId;
    if (!missionId) return;

    if (pendingLayerMissionId && missionId !== pendingLayerMissionId) {
      return;
    }

    const shouldApplyDefaultLayers =
      pendingLayerMissionId === missionId ||
      lastAutoLayerMissionRef.current !== missionId;

    if (!shouldApplyDefaultLayers) {
      return;
    }

    setVisibleLayers(getDefaultMissionLayers(selectedMission));
    lastAutoLayerMissionRef.current = missionId;
    setPendingLayerMissionId(null);
  }, [pendingLayerMissionId, selectedMission]);

  const effectiveVisibleLayers = useMemo(() => {
    const hasMapLocation = missionHasMapLocation(selectedMission);

    return {
      track: Boolean(visibleLayers.track && hasMapLocation),
      heatmap: Boolean(visibleLayers.heatmap && hasMapLocation),
      captures: Boolean(
        visibleLayers.captures && hasMapLocation && selectedMission?.hasImages,
      ),
    };
  }, [visibleLayers, selectedMission]);

  const {
    loading: layerLoading,
    errorText: layerErrorText,
    trackGeoJson,
    trackEndpointsGeoJson,
    heatGrid,
    heatCellsGeoJson,
    imagePoints,
    imagePointsGeoJson,
    trackBounds,
    heatBounds,
    captureBounds,
  } = useHeatMapLayers({
    selectedMission,
    layerMode:
      effectiveVisibleLayers.track ||
      effectiveVisibleLayers.heatmap ||
      effectiveVisibleLayers.captures
        ? "mixed"
        : "none",
    showTrack: effectiveVisibleLayers.track,
    showHeatmap: effectiveVisibleLayers.heatmap,
    showCaptures: effectiveVisibleLayers.captures,
    heatmapMetric,
    heatmapCellM,
  });

  // Deep link behavior:
  // missionId is the source of truth.
  // deviceId from URL is ignored for selection because the device may be archived.
  useEffect(() => {
    if (!requestedMissionId) {
      suppressDeepLinkRef.current = false;
      return;
    }

    if (suppressDeepLinkRef.current) return;
    if (loading) return;

    const deepLinkedMission = allMissionMap.get(requestedMissionId);
    if (!deepLinkedMission) return;

    // If the mission belongs to another profile, switch local profile first.
    if (
      deepLinkedMission.profileType &&
      deepLinkedMission.profileType !== profileType
    ) {
      setProfileType(deepLinkedMission.profileType);
      return;
    }

    if (requestedMissionId === selectedMissionId) return;

    setSelectedMissionId(deepLinkedMission.missionId);
    setSelectedLocationKey(null);
    setReturnLocationKey(null);
    setVisibleLayers(EMPTY_LAYERS);
    setPendingLayerMissionId(deepLinkedMission.missionId);

    setExpandedMissionIds((prev) =>
      prev.includes(deepLinkedMission.missionId)
        ? prev
        : [...prev, deepLinkedMission.missionId],
    );
  }, [
    requestedMissionId,
    selectedMissionId,
    loading,
    allMissionMap,
    profileType,
  ]);

  function clearMissionSearchParams() {
    suppressDeepLinkRef.current = true;

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("missionId");
        next.delete("deviceId");
        return next;
      },
      { replace: true },
    );
  }

  function toggleLayer(layerName) {
    if (!selectedMission) return;

    if (
      (layerName === "track" || layerName === "heatmap") &&
      !missionHasMapLocation(selectedMission)
    ) {
      return;
    }

    if (layerName === "captures" && !selectedMission.hasImages) {
      return;
    }

    setVisibleLayers((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  }

  function handleProfileSelect(nextType) {
    // Local HeatMap filter only.
    // Do not call onProfileChange here, because that would try to configure
    // the active physical device. HeatMap must also work without active device.
    setProfileType(nextType);

    setSelectedMissionId(null);
    setSelectedLocationKey(null);
    setExpandedMissionIds([]);
    setVisibleLayers(EMPTY_LAYERS);
    setPendingLayerMissionId(null);
    setReturnLocationKey(null);

    if (requestedMissionId) {
      clearMissionSearchParams();
    }
  }

  function handleToggleMissionExpand(missionId) {
    setExpandedMissionIds((prev) =>
      prev.includes(missionId)
        ? prev.filter((item) => item !== missionId)
        : [...prev, missionId],
    );
  }

  function handleSelectLocationPin(locationKey) {
    setReturnLocationKey(locationKey);
    setSelectedLocationKey(locationKey);
    setSelectedMissionId(null);
    setVisibleLayers(EMPTY_LAYERS);
    setPendingLayerMissionId(null);

    clearMissionSearchParams();
  }

  function handleSelectMission(mission) {
    if (!mission?.missionId) return;

    if (selectedLocationKey) {
      setReturnLocationKey(selectedLocationKey);
    }

    suppressDeepLinkRef.current = false;

    setSelectedMissionId(mission.missionId);
    setSelectedLocationKey(null);
    setVisibleLayers(EMPTY_LAYERS);
    setPendingLayerMissionId(mission.missionId);

    setExpandedMissionIds((prev) =>
      prev.includes(mission.missionId) ? prev : [...prev, mission.missionId],
    );

    // Keep deviceId only as metadata in the URL.
    // Do not select/switch the active device from HeatMap.
    setSearchParams(
      {
        missionId: mission.missionId,
        ...(mission.deviceUuid ? { deviceId: mission.deviceUuid } : {}),
      },
      { replace: true },
    );
  }

  function handleBackToExplorer() {
    const locationToReturn = returnLocationKey;

    setSelectedMissionId(null);
    setVisibleLayers(EMPTY_LAYERS);
    setPendingLayerMissionId(null);

    setSelectedLocationKey(locationToReturn || null);
    setReturnLocationKey(null);

    clearMissionSearchParams();
  }

  function handleCloseLocationPopover() {
    setSelectedLocationKey(null);
  }

  function handleOpenAnalytics(mission) {
    if (!mission?.missionId) return;

    navigate(`/analytics?missionId=${encodeURIComponent(mission.missionId)}`);
  }

  return (
    <div className="h-[calc(100vh-9.5rem)] min-h-[680px]">
      <HeatMapLayout
        sidebar={
          <HeatMapSidebar
            activeDevice={activeDevice}
            selectedDeviceId={selectedDeviceId}
            profileType={profileType}
            profiles={profiles}
            searchValue={searchValue}
            onProfileChange={handleProfileSelect}
            onSearchChange={setSearchValue}
            missionCount={activeDeviceMissions.length}
            missions={activeDeviceMissions}
            loading={loading}
            errorText={errorText}
            selectedMission={selectedMission}
            selectedMissionId={selectedMissionId}
            expandedMissionIds={expandedMissionIds}
            onToggleMissionExpand={handleToggleMissionExpand}
            onSelectMission={handleSelectMission}
            onBackToExplorer={handleBackToExplorer}
            showTrack={effectiveVisibleLayers.track}
            showHeatmap={effectiveVisibleLayers.heatmap}
            showCaptures={effectiveVisibleLayers.captures}
            heatmapMetric={heatmapMetric}
            heatmapCellM={heatmapCellM}
            onToggleTrack={() => toggleLayer("track")}
            onToggleHeatmap={() => toggleLayer("heatmap")}
            onToggleCaptures={() => toggleLayer("captures")}
            onHeatmapMetricChange={setHeatmapMetric}
            onHeatmapCellMChange={setHeatmapCellM}
            onOpenAnalytics={handleOpenAnalytics}
          />
        }
        map={
          <HeatMapMapView
            activeDevice={activeDevice}
            selectedDeviceId={selectedDeviceId}
            profileLabel={
              profiles.find((item) => item.type === profileType)?.label ||
              profileType ||
              "Unknown profile"
            }
            selectedMission={selectedMission}
            locationPins={locationPins}
            selectedLocationKey={selectedLocationKey}
            onSelectLocationPin={handleSelectLocationPin}
            onSelectMission={handleSelectMission}
            onCloseLocationPopover={handleCloseLocationPopover}
            showTrack={effectiveVisibleLayers.track}
            showHeatmap={effectiveVisibleLayers.heatmap}
            showCaptures={effectiveVisibleLayers.captures}
            heatmapMetric={heatmapMetric}
            heatGrid={heatGrid}
            imagePoints={imagePoints}
            layerLoading={layerLoading}
            layerErrorText={layerErrorText}
            trackGeoJson={trackGeoJson}
            trackEndpointsGeoJson={trackEndpointsGeoJson}
            heatCellsGeoJson={heatCellsGeoJson}
            imagePointsGeoJson={imagePointsGeoJson}
            trackBounds={trackBounds}
            heatBounds={heatBounds}
            captureBounds={captureBounds}
          />
        }
      />
    </div>
  );
}
