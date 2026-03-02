import React from "react";
import MissionPanelInline from "./MissionPanelInline";
import EmbeddedStartPointMap from "../map/EmbeddedStartPointMap";

export default function MissionMapPanel({
  deviceStatus = "connected",
  startPoints = [],
  selectedStartPointId = null,
  onAddStartPoint = () => {},
  onSelectStartPoint = () => {},
  metrics,
}) {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 xl:grid-cols-2">
        {/* LEFT */}
        <div className="p-4 border-b xl:border-b-0 xl:border-r border-base-300">
          <MissionPanelInline
            deviceStatus={deviceStatus}
            startPoints={startPoints}
            selectedStartPointId={selectedStartPointId}
            onSelectStartPoint={onSelectStartPoint}
          />
        </div>

        {/* RIGHT */}
        <div className="relative bg-base-200">
          <div className="h-155">
            <EmbeddedStartPointMap
              startPoints={startPoints}
              selectedStartPointId={selectedStartPointId}
              onAddStartPoint={onAddStartPoint}
              onSelectStartPoint={onSelectStartPoint}
              metrics={metrics}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
