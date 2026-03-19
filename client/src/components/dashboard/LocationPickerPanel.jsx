import React, { useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiCrosshair,
  FiMapPin,
  FiNavigation,
  FiSearch,
  FiX,
} from "react-icons/fi";

function formatCoord(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(6);
}

function ModeChip({ active = false, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "btn btn-sm rounded-xl",
        active
          ? "btn-primary text-white border-none"
          : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
      ].join(" ")}
    >
      <Icon />
      {label}
    </button>
  );
}

export default function LocationPickerPanel({
  mode = "chooser", // chooser | gps-new
  locationMode = "gps",
  gpsDraftCoords = null,
  startPoints = [],
  selectedStartPointId = null,
  pendingMapPick = null,
  mapPickEnabled = false,
  busy = false,
  errorText = "",
  onSelectStartPoint = () => {},
  onChooseGpsMode = () => {},
  onChooseFixedMode = () => {},
  onToggleMapPick = () => {},
  onClearPendingMapPick = () => {},
  onSavePickedLocation = async () => null,
  onSaveGpsNamedLocation = async () => {},
  onConfirmFixed = () => {},
  onBack = () => {},
}) {
  const [search, setSearch] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const [gpsLocationName, setGpsLocationName] = useState("");

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return startPoints;

    return startPoints.filter((item) =>
      String(item.name || "").toLowerCase().includes(q)
    );
  }, [search, startPoints]);

  const selectedPoint = useMemo(
    () => startPoints.find((p) => p.id === selectedStartPointId) || null,
    [startPoints, selectedStartPointId]
  );

  async function handleSaveNewFixedLocation() {
    if (!pendingMapPick || !newLocationName.trim()) return;

    const created = await onSavePickedLocation({
      name: newLocationName.trim(),
      latlng: pendingMapPick,
    });

    if (created?.id) {
      setNewLocationName("");
    }
  }

  async function handleSaveGpsLocation() {
    if (!gpsLocationName.trim()) return;
    await onSaveGpsNamedLocation(gpsLocationName.trim());
  }

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3 border-b border-base-300 pb-4">
        <div>
          <div className="text-base font-semibold">
            {mode === "gps-new" ? "Name GPS location" : "Location source"}
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            {mode === "gps-new"
              ? "This GPS fix is new. Save it before the mission starts."
              : "Choose GPS or switch to a fixed saved location."}
          </div>
        </div>

        <button className="btn btn-sm rounded-xl" onClick={onBack}>
          <FiArrowLeft />
          Back
        </button>
      </div>

      {mode === "gps-new" ? (
        <>
          <div className="mt-5 rounded-2xl border border-info/30 bg-info/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FiNavigation className="text-info" />
              New GPS location
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-base-content/45">
                  Latitude
                </div>
                <div className="mt-1 font-mono text-sm">
                  {formatCoord(gpsDraftCoords?.lat)}
                </div>
              </div>

              <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-base-content/45">
                  Longitude
                </div>
                <div className="mt-1 font-mono text-sm">
                  {formatCoord(gpsDraftCoords?.lng)}
                </div>
              </div>
            </div>

            <label className="form-control mt-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                Location name
              </div>
              <input
                className="input input-sm input-bordered rounded-xl"
                value={gpsLocationName}
                onChange={(e) => setGpsLocationName(e.target.value)}
                placeholder="e.g. Parcel A - South Edge"
                autoFocus
              />
            </label>
          </div>

          {errorText ? (
            <div className="mt-4 rounded-2xl border border-error/30 bg-error/10 px-3 py-3 text-sm text-error">
              {errorText}
            </div>
          ) : null}

          <div className="mt-5">
            <button
              className="btn btn-primary btn-sm rounded-xl px-5"
              disabled={!gpsLocationName.trim() || busy}
              onClick={handleSaveGpsLocation}
            >
              {busy ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <FiCheck />
              )}
              Save and continue
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ModeChip
              active={locationMode === "gps"}
              icon={FiNavigation}
              label="GPS source"
              onClick={onChooseGpsMode}
            />
            <ModeChip
              active={locationMode === "fixed"}
              icon={FiMapPin}
              label="Fixed location"
              onClick={onChooseFixedMode}
            />
          </div>

          {locationMode === "gps" ? (
            <div className="mt-5 rounded-2xl border border-info/30 bg-info/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FiNavigation className="text-info" />
                Use live GPS at start
              </div>
              <div className="mt-2 text-sm text-base-content/70">
                At mission start, the app validates the GPS fix and reuses a saved
                location if one exists nearby.
              </div>

              <div className="mt-4">
                <button
                  className="btn btn-sm btn-primary rounded-xl"
                  onClick={onChooseGpsMode}
                >
                  Keep GPS source
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-2xl border border-base-300 bg-base-200/50 p-3">
                <label className="flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3 py-2 shadow-sm">
                  <FiSearch className="text-base-content/40" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Search saved locations..."
                  />
                </label>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    className={`btn btn-sm rounded-xl ${
                      mapPickEnabled
                        ? "btn-warning"
                        : "border-base-300 bg-base-100 text-base-content hover:bg-base-200"
                    }`}
                    onClick={onToggleMapPick}
                  >
                    <FiCrosshair />
                    {mapPickEnabled ? "Picking enabled" : "Pick on map"}
                  </button>

                  {pendingMapPick ? (
                    <button
                      className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                      onClick={onClearPendingMapPick}
                    >
                      <FiX />
                      Clear pin
                    </button>
                  ) : null}
                </div>
              </div>

              {pendingMapPick ? (
                <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FiMapPin />
                    New fixed location from map
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-base-content/45">
                        Latitude
                      </div>
                      <div className="mt-1 font-mono text-sm">
                        {formatCoord(pendingMapPick.lat)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-base-300 bg-base-100 px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-base-content/45">
                        Longitude
                      </div>
                      <div className="mt-1 font-mono text-sm">
                        {formatCoord(pendingMapPick.lng)}
                      </div>
                    </div>
                  </div>

                  <label className="form-control mt-4">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                      Location name
                    </div>
                    <input
                      className="input input-sm input-bordered rounded-xl"
                      placeholder="e.g. Parcel A - North Gate"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                    />
                  </label>

                  <div className="mt-4">
                    <button
                      className="btn btn-sm btn-primary rounded-xl"
                      disabled={!newLocationName.trim()}
                      onClick={handleSaveNewFixedLocation}
                    >
                      <FiCheck />
                      Save location
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm font-semibold">Saved locations</div>
                <span className="badge badge-outline">{filteredPoints.length}</span>
              </div>

              <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-base-300 bg-base-100 p-2">
                {filteredPoints.length === 0 ? (
                  <div className="flex h-full min-h-40 items-center justify-center text-center text-sm text-base-content/55">
                    No locations found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPoints.map((point) => {
                      const active = point.id === selectedStartPointId;

                      return (
                        <button
                          key={point.id}
                          type="button"
                          onClick={() => {
                            onClearPendingMapPick();
                            onSelectStartPoint(point.id);
                          }}
                          className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                            active
                              ? "border-primary/40 bg-primary/5"
                              : "border-base-300 bg-base-100 hover:bg-base-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                {point.name}
                              </div>
                              <div className="mt-1 font-mono text-[11px] text-base-content/55">
                                {formatCoord(point.latlng.lat)},{" "}
                                {formatCoord(point.latlng.lng)}
                              </div>
                            </div>

                            {active ? (
                              <span className="badge badge-primary badge-sm">
                                Selected
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="text-xs text-base-content/60">
                  {selectedPoint
                    ? `Current selection: ${selectedPoint.name}`
                    : "No fixed location selected yet."}
                </div>

                <button
                  className="btn btn-sm btn-primary rounded-xl"
                  disabled={!selectedPoint}
                  onClick={onConfirmFixed}
                >
                  Use fixed location
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
