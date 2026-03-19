import React, { useMemo, useState } from "react";

import MissionPanelInline from "./MissionPanelInline";
import LocationPickerPanel from "./LocationPickerPanel";
import MissionMapLibreMap from "../map/MissionMapLibreMap";

export default function MissionMapPanel({
  deviceStatus = "inactive",
  deviceState = null,
  startPoints = [],
  selectedStartPointId = null,
  onAddStartPoint = async () => null,
  onSelectStartPoint = () => {},
  missionRunning = false,
  busy = false,
  onStartMission = async () => ({ ok: false }),
  onStopMission = () => {},
  onAbortMission = () => {},
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("chooser"); // chooser | gps-new
  const [locationMode, setLocationMode] = useState("gps");
  const [mapPickEnabled, setMapPickEnabled] = useState(false);
  const [pendingMapPick, setPendingMapPick] = useState(null);
  const [gpsDraftCoords, setGpsDraftCoords] = useState(null);
  const [gpsPendingPayload, setGpsPendingPayload] = useState(null);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerErrorText, setPickerErrorText] = useState("");

  const selectedStartPoint = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId],
  );

  async function handleSavePickedLocation({ name, latlng }) {
    const created = await onAddStartPoint({
      name,
      latlng,
      source: "manual",
      tags: ["fixed"],
    });

    if (created?.id) {
      onSelectStartPoint(created.id);
      setPendingMapPick(null);
      setMapPickEnabled(false);
    }

    return created;
  }

  function openChooserPanel() {
    setPickerErrorText("");
    setPickerMode("chooser");
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    setPickerMode("chooser");
    setMapPickEnabled(false);
    setPendingMapPick(null);
    setPickerErrorText("");
  }

  function handleChooseGpsMode() {
    setLocationMode("gps");
    setPendingMapPick(null);
    setMapPickEnabled(false);
    setPickerMode("chooser");
    setPickerOpen(false);
  }

  function handleChooseFixedMode() {
    setLocationMode("fixed");
  }

  function handleConfirmFixed() {
    if (!selectedStartPoint) return;
    setLocationMode("fixed");
    setPendingMapPick(null);
    setMapPickEnabled(false);
    setPickerOpen(false);
  }

  function handleNeedGpsLocationName({ coords, payload }) {
    setGpsDraftCoords(coords || null);
    setGpsPendingPayload(payload || null);
    setPickerErrorText("");
    setPickerMode("gps-new");
    setPickerOpen(true);
  }

  async function handleSaveGpsNamedLocation(name) {
    if (!gpsPendingPayload) return;

    setPickerBusy(true);
    setPickerErrorText("");

    try {
      const result = await onStartMission({
        ...gpsPendingPayload,
        gps_location_name: name,
      });

      if (result?.ok) {
        setPickerOpen(false);
        setPickerMode("chooser");
        setGpsDraftCoords(null);
        setGpsPendingPayload(null);
        return;
      }

      setPickerErrorText(result?.error || "Mission could not be started.");
    } finally {
      setPickerBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-xl flex flex-col xl:flex-row min-h-[800px]">
      {/* Panoul Lateral */}
      <div className="w-full xl:w-[450px] shrink-0 border-b border-base-300 bg-base-100 xl:border-b-0 xl:border-r relative overflow-hidden z-10">
        <div
          className={`flex h-full w-[200%] transition-transform duration-300 ease-in-out ${
            pickerOpen ? "-translate-x-1/2" : "translate-x-0"
          }`}
        >
          {/* Mission Control Panel */}
          <div className="w-1/2 h-full overflow-y-auto">
            <MissionPanelInline
              runtimeState={deviceState?.state || null}
              deviceStatus={deviceStatus}
              deviceState={deviceState}
              locationMode={locationMode}
              selectedStartPoint={selectedStartPoint}
              missionRunning={missionRunning}
              busy={busy}
              onOpenLocationPicker={openChooserPanel}
              onRequestGpsLocationName={handleNeedGpsLocationName}
              onStartMission={onStartMission}
              onStopMission={onStopMission}
              onAbortMission={onAbortMission}
            />
          </div>

          {/* Location Picker Panel */}
          <div className="w-1/2 h-full overflow-y-auto border-l border-base-200">
            <LocationPickerPanel
              mode={pickerMode}
              locationMode={locationMode}
              gpsDraftCoords={gpsDraftCoords}
              startPoints={startPoints}
              selectedStartPointId={selectedStartPointId}
              pendingMapPick={pendingMapPick}
              mapPickEnabled={mapPickEnabled}
              busy={pickerBusy}
              errorText={pickerErrorText}
              onSelectStartPoint={onSelectStartPoint}
              onChooseGpsMode={handleChooseGpsMode}
              onChooseFixedMode={handleChooseFixedMode}
              onToggleMapPick={() => setMapPickEnabled((prev) => !prev)}
              onClearPendingMapPick={() => setPendingMapPick(null)}
              onSavePickedLocation={handleSavePickedLocation}
              onSaveGpsNamedLocation={handleSaveGpsNamedLocation}
              onConfirmFixed={handleConfirmFixed}
              onBack={closePicker}
            />
          </div>
        </div>
      </div>

      {/* Harta - Fără margini/padding */}
      <div className="relative flex-1 bg-base-200 min-h-[400px] xl:min-h-full">
        <MissionMapLibreMap
          startPoints={startPoints}
          selectedStartPointId={selectedStartPointId}
          pendingMapPick={pendingMapPick}
          mapPickEnabled={
            pickerOpen && locationMode === "fixed" && mapPickEnabled
          }
          onMapPick={setPendingMapPick}
          onSelectStartPoint={(id) => {
            setPendingMapPick(null);
            onSelectStartPoint(id);
          }}
        />
      </div>
    </section>
  );
}
