import React, { useMemo, useState } from "react";

import MissionPanelInline from "./MissionPanelInline";
import LocationPickerPanel from "./LocationPickerPanel";
import MissionDashboardMap from "../map/MissionDashboardMap";

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
  const [pickerMode, setPickerMode] = useState("chooser");
  const [locationMode, setLocationMode] = useState("gps");
  const [mapPickEnabled, setMapPickEnabled] = useState(false);
  const [pendingMapPick, setPendingMapPick] = useState(null);
  const [gpsDraftCoords, setGpsDraftCoords] = useState(null);
  const [gpsPendingPayload, setGpsPendingPayload] = useState(null);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerErrorText, setPickerErrorText] = useState("");

  const [gpsPreviewPoint, setGpsPreviewPoint] = useState(null);
  const [gpsPreviewBusy, setGpsPreviewBusy] = useState(false);
  const [gpsPreviewError, setGpsPreviewError] = useState("");

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
    setGpsPreviewError("");
    setPickerMode("chooser");
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    setPickerMode("chooser");
    setMapPickEnabled(false);
    setPendingMapPick(null);
    setPickerErrorText("");
    setGpsPreviewError("");
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
    setGpsPreviewError("");
    setGpsPreviewPoint(null);
  }

  function handleConfirmFixed() {
    if (!selectedStartPoint) return;
    setLocationMode("fixed");
    setPendingMapPick(null);
    setMapPickEnabled(false);
    setGpsPreviewPoint(null);
    setGpsPreviewError("");
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

  async function handlePreviewGpsOnMap() {
    setGpsPreviewBusy(true);
    setGpsPreviewError("");

    try {
      const gps = deviceState?.gps || {};
      const hasCurrentFix = Boolean(gps?.has_fix);
      const fix = hasCurrentFix ? gps?.last_good_fix || null : null;

      if (fix?.lat == null || fix?.lon == null) {
        setGpsPreviewPoint(null);
        setGpsPreviewError("No valid GPS fix available yet.");
        return;
      }

      setGpsPreviewPoint({
        lat: Number(fix.lat),
        lng: Number(fix.lon),
        alt_m: fix.alt_m ?? null,
        satellites: fix.satellites ?? gps?.satellites ?? null,
        hdop: fix.hdop ?? gps?.hdop ?? null,
      });

      setPendingMapPick(null);
      setMapPickEnabled(false);
    } finally {
      setGpsPreviewBusy(false);
    }
  }

  function handleClearGpsPreview() {
    setGpsPreviewPoint(null);
    setGpsPreviewError("");
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-xl">
      <div className="flex min-h-165 flex-col xl:flex-row">
        <div className="w-full shrink-0 border-b border-base-300 bg-base-100 xl:w-[430px] xl:border-b-0 xl:border-r">
          <div className="h-full">
            {pickerOpen ? (
              <div className="h-full overflow-y-auto">
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
                  gpsPreviewBusy={gpsPreviewBusy}
                  gpsPreviewError={gpsPreviewError}
                  gpsPreviewPoint={gpsPreviewPoint}
                  onSelectStartPoint={onSelectStartPoint}
                  onChooseGpsMode={handleChooseGpsMode}
                  onChooseFixedMode={handleChooseFixedMode}
                  onToggleMapPick={() => {
                    setGpsPreviewPoint(null);
                    setGpsPreviewError("");
                    setMapPickEnabled((prev) => !prev);
                  }}
                  onClearPendingMapPick={() => setPendingMapPick(null)}
                  onSavePickedLocation={handleSavePickedLocation}
                  onSaveGpsNamedLocation={handleSaveGpsNamedLocation}
                  onConfirmFixed={handleConfirmFixed}
                  onPreviewGpsOnMap={handlePreviewGpsOnMap}
                  onClearGpsPreview={handleClearGpsPreview}
                  onBack={closePicker}
                />
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
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
            )}
          </div>
        </div>

        <div className="relative min-h-130 flex-1 bg-base-200 xl:min-h-0">
          <div className="absolute inset-0">
            <MissionDashboardMap
              startPoints={startPoints}
              selectedStartPointId={selectedStartPointId}
              pendingMapPick={pendingMapPick}
              gpsPreviewPoint={gpsPreviewPoint}
              mapPickEnabled={
                pickerOpen && locationMode === "fixed" && mapPickEnabled
              }
              onMapPick={setPendingMapPick}
              onSelectStartPoint={(id) => {
                setPendingMapPick(null);
                setGpsPreviewPoint(null);
                onSelectStartPoint(id);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
