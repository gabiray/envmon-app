import React, { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiImage, FiNavigation } from "react-icons/fi";
import { buildMissionImageUrl } from "../../services/analyticsApi";

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function formatNumber(value, decimals = 2, suffix = "") {
  if (!isFiniteNumber(value)) return "—";
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function formatEpoch(epoch) {
  if (!epoch) return "—";
  try {
    return new Date(Number(epoch) * 1000).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDurationSeconds(totalSeconds) {
  if (!isFiniteNumber(totalSeconds)) return "—";

  const seconds = Math.max(0, Math.round(Number(totalSeconds)));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function Badge({ children, tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning/10 text-warning"
      : tone === "success"
        ? "border-success/30 bg-success/10 text-success"
        : tone === "primary"
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-base-300 bg-base-200 text-base-content/75";

  return (
    <span
      className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, hint = "", tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning/10"
      : tone === "success"
        ? "border-success/30 bg-success/10"
        : "border-base-300 bg-base-100";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-base-content">{value}</div>
      {hint ? <div className="mt-1 text-xs text-base-content/60">{hint}</div> : null}
    </div>
  );
}

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-3xl border border-base-300 bg-base-100 shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <Icon className="text-base" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-semibold text-base-content">{title}</div>
            <div className="mt-1 text-sm text-base-content/60">{description}</div>
          </div>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

export default function AnalyticsInsightsSection({
  missionId,
  activeMission,
  telemetry = [],
  images = [],
  airAnomalies = { intervals: [] },
  baselineComparison = null,
  movementStats = {
    stationaryPct: null,
    stationaryDurationS: null,
    totalDistanceM: null,
    avgMovingSpeedMps: null,
  },
  densityCells = [],
  denseTop = [],
  carDenseGasComparison = null,
  DensityMiniMap = null,
}) {
  const [selectedImageId, setSelectedImageId] = useState(null);

  useEffect(() => {
    setSelectedImageId(images?.[0]?.id || null);
  }, [images]);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) || null,
    [images, selectedImageId]
  );

  const correlatedTelemetry = useMemo(() => {
    if (!selectedImage || !Array.isArray(telemetry) || telemetry.length === 0) {
      return null;
    }

    let best = null;
    let bestDelta = Number.POSITIVE_INFINITY;

    telemetry.forEach((point) => {
      const delta = Math.abs(
        Number(point.ts_epoch || 0) - Number(selectedImage.ts_epoch || 0)
      );

      if (delta < bestDelta) {
        best = point;
        bestDelta = delta;
      }
    });

    return best;
  }, [selectedImage, telemetry]);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Air quality"
        description="Gas baseline comparison and persistent suspect intervals."
        icon={FiAlertTriangle}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Suspect intervals"
                value={String(airAnomalies?.intervals?.length || 0)}
                tone={airAnomalies?.intervals?.length ? "warning" : "default"}
              />

              <StatCard
                label="Lowest gas value"
                value={
                  airAnomalies?.intervals?.length
                    ? formatNumber(
                        Math.min(...airAnomalies.intervals.map((item) => item.minValue)),
                        0,
                        " Ω"
                      )
                    : "—"
                }
              />

              <StatCard
                label="Total suspect duration"
                value={
                  airAnomalies?.intervals?.length
                    ? formatDurationSeconds(
                        airAnomalies.intervals.reduce(
                          (acc, item) => acc + Number(item.durationS || 0),
                          0
                        )
                      )
                    : "—"
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="text-sm font-semibold">Baseline comparison</div>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Baseline gas
                  </div>
                  <div className="mt-1 font-medium">
                    {baselineComparison
                      ? formatNumber(baselineComparison.baseline, 0, " Ω")
                      : "No baseline"}
                  </div>
                </div>

                <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Relative delta
                  </div>
                  <div className="mt-1 font-medium">
                    {baselineComparison
                      ? formatNumber(baselineComparison.deltaPct, 1, "%")
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="text-sm font-semibold">Suspect periods / areas</div>

              <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {airAnomalies?.intervals?.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-base-300 px-3 py-6 text-center text-sm text-base-content/55">
                    No persistent air-quality anomalies detected in the selected range.
                  </div>
                ) : (
                  airAnomalies.intervals.map((interval, index) => (
                    <div
                      key={`${interval.startTs}-${index}`}
                      className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-warning">
                          Suspect interval #{index + 1}
                        </div>

                        <Badge tone="warning">
                          {formatDurationSeconds(interval.durationS)}
                        </Badge>
                      </div>

                      <div className="mt-2 text-xs text-base-content/70">
                        {formatEpoch(interval.startTs)} → {formatEpoch(interval.endTs)}
                      </div>

                      <div className="mt-2 text-sm text-base-content/80">
                        Lowest gas value: {formatNumber(interval.minValue, 0, " Ω")}
                      </div>

                      {isFiniteNumber(interval.lat) && isFiniteNumber(interval.lon) ? (
                        <div className="mt-1 text-xs text-base-content/60">
                          Approx. area: {Number(interval.lat).toFixed(5)},{" "}
                          {Number(interval.lon).toFixed(5)}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Mobility / density"
        description="Dense GPS areas, stationary time and route concentration."
        icon={FiNavigation}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {DensityMiniMap ? <DensityMiniMap cells={denseTop} /> : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Stationary time"
                value={formatNumber(movementStats.stationaryPct, 0, "%")}
                hint={formatDurationSeconds(movementStats.stationaryDurationS)}
                tone={movementStats.stationaryPct > 35 ? "warning" : "default"}
              />
              <StatCard
                label="Dense areas"
                value={String(densityCells.length)}
                hint="Grid cells with repeated valid GPS samples"
              />
              <StatCard
                label="Total distance"
                value={formatNumber(movementStats.totalDistanceM / 1000, 2, " km")}
              />
              <StatCard
                label="Avg moving speed"
                value={formatNumber(movementStats.avgMovingSpeedMps, 2, " m/s")}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <div className="text-sm font-semibold">
              {activeMission.profile_type === "car"
                ? "Traffic-like zones"
                : activeMission.profile_type === "bicycle"
                  ? "Dense route segments"
                  : activeMission.profile_type === "drone"
                    ? "Coverage concentration"
                    : "Dense sample zones"}
            </div>

            <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {denseTop.length === 0 ? (
                <div className="rounded-xl border border-dashed border-base-300 px-3 py-6 text-center text-sm text-base-content/55">
                  No dense GPS zones detected in the selected range.
                </div>
              ) : (
                denseTop.map((cell, index) => (
                  <div
                    key={`${cell.cellKey || index}`}
                    className="rounded-xl border border-base-300 bg-base-200/40 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">Zone #{index + 1}</div>
                      <Badge>{cell.samples || 0} samples</Badge>
                    </div>

                    <div className="mt-2 text-xs text-base-content/70">
                      Center:{" "}
                      {isFiniteNumber(cell.lat)
                        ? Number(cell.lat).toFixed(5)
                        : "—"}
                      ,{" "}
                      {isFiniteNumber(cell.lon)
                        ? Number(cell.lon).toFixed(5)
                        : "—"}
                    </div>
                  </div>
                ))
              )}
            </div>

            {activeMission?.profile_type === "car" && carDenseGasComparison ? (
              <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4">
                <div className="text-sm font-semibold text-warning">
                  Dense zone gas comparison
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div className="rounded-xl border border-warning/30 bg-base-100 px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                      Dense zones avg gas
                    </div>
                    <div className="mt-1 font-medium">
                      {formatNumber(carDenseGasComparison.denseAvg, 0, " Ω")}
                    </div>
                  </div>

                  <div className="rounded-xl border border-warning/30 bg-base-100 px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                      Moving zones avg gas
                    </div>
                    <div className="mt-1 font-medium">
                      {formatNumber(carDenseGasComparison.movingAvg, 0, " Ω")}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Image correlation"
        description="Inspect captured images and correlate them with nearby telemetry."
        icon={FiImage}
      >
        {!Array.isArray(images) || images.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
            No images available for this mission.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
              {selectedImage ? (
                <img
                  src={buildMissionImageUrl(missionId, selectedImage.id)}
                  alt={selectedImage.filename}
                  className="h-[320px] w-full rounded-xl object-cover"
                />
              ) : null}

              {selectedImage ? (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                      Image time
                    </div>
                    <div className="mt-1 font-medium">
                      {formatEpoch(selectedImage.ts_epoch)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                      Coordinates
                    </div>
                    <div className="mt-1 font-medium">
                      {isFiniteNumber(selectedImage.lat) && isFiniteNumber(selectedImage.lon)
                        ? `${Number(selectedImage.lat).toFixed(5)}, ${Number(selectedImage.lon).toFixed(5)}`
                        : "No GPS"}
                    </div>
                  </div>

                  {correlatedTelemetry ? (
                    <>
                      <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                          Temperature
                        </div>
                        <div className="mt-1 font-medium">
                          {formatNumber(correlatedTelemetry.temp_c, 2, " °C")}
                        </div>
                      </div>

                      <div className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                          Gas resistance
                        </div>
                        <div className="mt-1 font-medium">
                          {formatNumber(correlatedTelemetry.gas_ohms, 0, " Ω")}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
              <div className="mb-3 text-sm font-semibold">Image timeline</div>

              <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {images.map((image) => {
                  const active = image.id === selectedImageId;

                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSelectedImageId(image.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-primary/40 bg-primary/10"
                          : "border-base-300 bg-base-100 hover:bg-base-200"
                      }`}
                    >
                      <div className="h-14 w-18 overflow-hidden rounded-lg bg-base-200">
                        <img
                          src={buildMissionImageUrl(missionId, image.id)}
                          alt={image.filename}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {image.filename}
                        </div>
                        <div className="mt-1 text-xs text-base-content/55">
                          {formatEpoch(image.ts_epoch)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
