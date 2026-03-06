import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { fixLeafletIcons } from "../../lib/leafletIcons";
import StartPointNameModal from "./StartPointNameModal";
import LiveMetricsOverlay from "./LiveMetricsOverlay";

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default function EmbeddedStartPointMap({
  startPoints = [],
  selectedStartPointId = null,
  onAddStartPoint = () => {},
  onSelectStartPoint = () => {},
  metrics,
}) {
  const [pendingLatLng, setPendingLatLng] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const selected = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId],
  );

  const center = selected?.latlng ?? { lat: 47.651, lng: 26.255 }; // fallback
  const zoom = selected ? 16 : 13;

  function handlePick(latlng) {
    setPendingLatLng(latlng);
    setModalOpen(true);
  }

  async function handleSave(name) {
    if (!pendingLatLng) return;

    try {
      const created = await onAddStartPoint({
        name,
        latlng: pendingLatLng,
      });

      if (created?.id) {
        onSelectStartPoint(created.id);
      }
    } finally {
      setModalOpen(false);
      setPendingLatLng(null);
    }
  }

  return (
    <div className="relative h-full w-full">
      {/* Overlay live metrics */}
      <LiveMetricsOverlay
        metrics={metrics}
        selectedStartName={selected ? selected.name : null}
      />

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler onPick={handlePick} />

        {startPoints.map((p) => (
          <Marker
            key={p.id}
            position={p.latlng}
            eventHandlers={{ click: () => onSelectStartPoint(p.id) }}
          />
        ))}
      </MapContainer>

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
