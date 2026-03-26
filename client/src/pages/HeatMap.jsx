import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import HeatMapLayout from "../components/heatmap/HeatMapLayout";
import HeatMapSidebar from "../components/heatmap/HeatMapSidebar";
import HeatMapMapView from "../components/heatmap/HeatMapMapView";
import useHeatMapData from "../hooks/useHeatMapData";
import useHeatMapLayers from "../hooks/useHeatMapLayers";

export default function HeatMap() {
  const {
    selectedDeviceId,
    activeDevice,
    selectedProfileType,
    profiles,
    devicesRaw,
    onDeviceChange,
    onProfileChange,
  } = useOutletContext();

  const [profileType, setProfileType] = useState(
    selectedProfileType || "drone",
  );
  const [searchValue, setSearchValue] = useState("");
  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [selectedLocationKey, setSelectedLocationKey] = useState(null);
  const [expandedMissionIds, setExpandedMissionIds] = useState([]);
  const [visibleLayers, setVisibleLayers] = useState({
    track: false,
    heatmap: false,
  });
  const [heatmapMetric, setHeatmapMetric] = useState("temp_c");
  const [heatmapCellM, setHeatmapCellM] = useState(15);

  useEffect(() => {
    setProfileType(selectedProfileType || "drone");
  }, [selectedProfileType, selectedDeviceId]);

  const { loading, errorText, activeDeviceMissions, missionMap, locationPins } =
    useHeatMapData({
      selectedDeviceId,
      profileType,
      searchValue,
      devicesRaw,
    });

  const selectedMission = useMemo(() => {
    if (!selectedMissionId) return null;
    return missionMap.get(selectedMissionId) || null;
  }, [selectedMissionId, missionMap]);

  useEffect(() => {
    if (!selectedMissionId) return;
    if (!missionMap.has(selectedMissionId)) {
      setSelectedMissionId(null);
      setVisibleLayers({ track: false, heatmap: false });
    }
  }, [selectedMissionId, missionMap]);

  const {
    loading: layerLoading,
    errorText: layerErrorText,
    trackGeoJson,
    trackEndpointsGeoJson,
    heatGrid,
    heatCellsGeoJson,
    trackBounds,
    heatBounds,
  } = useHeatMapLayers({
    selectedMission,
    layerMode: visibleLayers.track || visibleLayers.heatmap ? "mixed" : "none",
    showTrack: visibleLayers.track,
    showHeatmap: visibleLayers.heatmap,
    heatmapMetric,
    heatmapCellM,
  });

  function handleProfileSelect(nextType) {
    setProfileType(nextType);
    setSelectedMissionId(null);
    setSelectedLocationKey(null);
    setExpandedMissionIds([]);
    setVisibleLayers({ track: false, heatmap: false });

    if (activeDevice) {
      onProfileChange(nextType);
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
    setSelectedLocationKey(locationKey);
  }

  async function handleSelectMission(mission) {
    if (!mission) return;

    // deschide imediat details
    setSelectedMissionId(mission.missionId);
    setSelectedLocationKey(null);

    if (mission.deviceUuid && mission.deviceUuid !== selectedDeviceId) {
      await onDeviceChange(mission.deviceUuid);
    }
  }

  function handleBackToExplorer() {
    setSelectedMissionId(null);
  }

  function handleCloseLocationPopover() {
    setSelectedLocationKey(null);
  }

  return (
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
          showTrack={visibleLayers.track}
          showHeatmap={visibleLayers.heatmap}
          heatmapMetric={heatmapMetric}
          heatmapCellM={heatmapCellM}
          onToggleTrack={() =>
            setVisibleLayers((prev) => ({ ...prev, track: !prev.track }))
          }
          onToggleHeatmap={() =>
            setVisibleLayers((prev) => ({ ...prev, heatmap: !prev.heatmap }))
          }
          onHeatmapMetricChange={setHeatmapMetric}
          onHeatmapCellMChange={setHeatmapCellM}
        />
      }
      map={
        <HeatMapMapView
          activeDevice={activeDevice}
          selectedDeviceId={selectedDeviceId}
          profileLabel={
            profiles.find((item) => item.type === profileType)?.label ||
            "Unknown profile"
          }
          selectedMission={selectedMission}
          locationPins={locationPins}
          selectedLocationKey={selectedLocationKey}
          onSelectLocationPin={handleSelectLocationPin}
          onSelectMission={handleSelectMission}
          onCloseLocationPopover={handleCloseLocationPopover}
          showTrack={visibleLayers.track}
          showHeatmap={visibleLayers.heatmap}
          heatmapMetric={heatmapMetric}
          layerLoading={layerLoading}
          layerErrorText={layerErrorText}
          trackGeoJson={trackGeoJson}
          trackEndpointsGeoJson={trackEndpointsGeoJson}
          heatGrid={heatGrid}
          heatCellsGeoJson={heatCellsGeoJson}
          trackBounds={trackBounds}
          heatBounds={heatBounds}
        />
      }
    />
  );
}
