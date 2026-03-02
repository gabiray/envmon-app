import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { fixLeafletIcons } from "../../lib/leafletIcons";
import StartPointNameModal from "./StartPointNameModal";

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default function StartPointMap({
  startPoints = [],
  selectedStartPointId = null,
  onAddStartPoint = () => {},
  onSelectStartPoint = () => {},
}) {
  const [pendingLatLng, setPendingLatLng] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const selected = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId]
  );

  const center = selected?.latlng ?? { lat: 47.651, lng: 26.255 }; // fallback (Suceava-ish)
  const zoom = selected ? 16 : 13;

  function handlePick(latlng) {
    setPendingLatLng(latlng);
    setModalOpen(true);
  }

  function handleSave(name) {
    const newPoint = {
      id: crypto.randomUUID(),
      name,
      latlng: pendingLatLng,
      createdAt: new Date().toISOString(),
    };
    onAddStartPoint(newPoint);
    onSelectStartPoint(newPoint.id);
    setModalOpen(false);
    setPendingLatLng(null);
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="card-title text-sm">Map</h2>
            <div className="text-xs opacity-60">
              Click to set a start point • Save it with a name
            </div>
          </div>

          {selected ? (
            <div className="text-right">
              <div className="text-xs opacity-60">Selected start</div>
              <div className="font-semibold text-sm">{selected.name}</div>
            </div>
          ) : (
            <div className="badge badge-outline">No start selected</div>
          )}
        </div>

        <div className="mt-4 rounded-box overflow-hidden border border-base-300 bg-base-200">
          <div className="h-130">
            <MapContainer
              center={center}
              zoom={zoom}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <ClickHandler onPick={handlePick} />

              {startPoints.map((p) => (
                <Marker
                  key={p.id}
                  position={p.latlng}
                  eventHandlers={{
                    click: () => onSelectStartPoint(p.id),
                  }}
                />
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      <StartPointNameModal
        open={modalOpen}
        latlng={pendingLatLng}
        onClose={() => {
          setModalOpen(false);
          setPendingLatLng(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
