import React, { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiChevronDown,
  FiChevronUp,
  FiLayers,
  FiMapPin,
  FiMaximize2,
  FiNavigation,
  FiRefreshCw,
  FiSliders,
  FiTrendingUp,
} from "react-icons/fi";

import AnalyticsSingleMissionChart from "../charts/AnalyticsSingleMissionChart";
import AnalyticsMultiMissionChart from "../charts/AnalyticsMultiMissionChart";
import {
  applyGpsFilter,
  isFiniteNumber,
  sliceByRange,
} from "../../../utils/analyticsUtils";

const SERIES_COLORS = ["#8b5cf6", "#2563eb", "#10b981", "#f59e0b", "#ec4899"];

function formatAxisValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "";
  }
  return Number(value).toFixed(2);
}

function buildMissionTelemetry(
  raw = [],
  rangePreset = "full",
  gpsFilter = "all",
) {
  const sliced = sliceByRange(Array.isArray(raw) ? raw : [], rangePreset);
  return applyGpsFilter(sliced, gpsFilter);
}

function buildAltitudeSummary(points = []) {
  const values = points
    .map((row) => Number(row?.alt_m))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return {
      minAltitude: null,
      maxAltitude: null,
      avgAltitude: null,
      spread: null,
      samples: 0,
    };
  }

  const minAltitude = Math.min(...values);
  const maxAltitude = Math.max(...values);
  const avgAltitude =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    minAltitude,
    maxAltitude,
    avgAltitude,
    spread: maxAltitude - minAltitude,
    samples: values.length,
  };
}

function buildAltitudeSeriesForMission(
  mission,
  telemetry,
  color = "#8b5cf6",
  xMode = "time", // time | progress
) {
  if (!mission || !Array.isArray(telemetry) || telemetry.length === 0) {
    return null;
  }

  let points = telemetry
    .filter(
      (row) => isFiniteNumber(row?.alt_m) && isFiniteNumber(row?.ts_epoch),
    )
    .map((row, index) => ({
      x: Number(row.ts_epoch),
      y: Number(row.alt_m),
      ts_epoch: row.ts_epoch ?? null,
      lat: row.lat ?? null,
      lon: row.lon ?? null,
      alt_m: row.alt_m ?? null,
      fix_quality: row.fix_quality ?? null,
      satellites: row.satellites ?? null,
      hdop: row.hdop ?? null,
      rawIndex: index,
    }));

  if (!points.length) return null;

  if (xMode === "time") {
    const firstTs = Number(points[0]?.ts_epoch || 0);

    points = points.map((point) => ({
      ...point,
      x: (Number(point.ts_epoch) - firstTs) / 60,
    }));
  }

  if (xMode === "progress") {
    const firstTs = Number(points[0]?.ts_epoch || 0);
    const lastTs = Number(points[points.length - 1]?.ts_epoch || firstTs);
    const span = lastTs - firstTs;

    points = points.map((point, index) => {
      let progress = 0;

      if (span > 0) {
        progress = ((Number(point.ts_epoch) - firstTs) / span) * 100;
      } else if (points.length > 1) {
        progress = (index / (points.length - 1)) * 100;
      }

      return {
        ...point,
        x: progress,
      };
    });
  }

  return {
    id: `altitude-${mission.mission_id}`,
    label: mission.mission_name || mission.mission_id,
    shortLabel: mission.mission_name || mission.mission_id,
    color,
    points,
  };
}

function SectionCard({
  title,
  description,
  icon: Icon,
  actions = null,
  children,
}) {
  return (
    <section className="rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
              <Icon className="text-base" />
            </div>

            <div className="min-w-0">
              <div className="text-base font-semibold text-base-content">
                {title}
              </div>
              <div className="mt-1 text-sm leading-6 text-base-content/60">
                {description}
              </div>
            </div>
          </div>

          {actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : null}
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

function StatCard({ label, value, hint = "", tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning/10"
      : tone === "success"
        ? "border-success/30 bg-success/10"
        : tone === "info"
          ? "border-info/30 bg-info/10"
          : "border-base-300 bg-base-100";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-base-content">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs leading-5 text-base-content/60">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-base-300 bg-base-100 px-4 py-3">
      <div className="text-sm text-base-content/60">{label}</div>
      <div className="text-sm font-medium text-base-content text-right">
        {value}
      </div>
    </div>
  );
}

function ToggleChip({ active = false, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "btn btn-sm rounded-xl",
        active
          ? "btn-primary border-none text-white"
          : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "0.1",
  placeholder = "",
}) {
  return (
    <label className="form-control w-full">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
        {label}
      </div>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input input-bordered w-full rounded-xl bg-base-100"
      />
    </label>
  );
}

function MissionSummaryItem({
  item,
  expanded = false,
  onToggle,
  formatNumber,
}) {
  const missionName =
    item?.mission?.mission_name || item?.mission?.mission_id || "Mission";

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-base-200/45"
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-base-content truncate">
            {missionName}
          </div>
          <div className="mt-1 text-xs text-base-content/55 truncate">
            {item?.mission?.mission_id || "—"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="badge badge-outline">
            {item?.summary?.samples ?? 0} pts
          </span>

          <span className="text-base-content/55">
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-base-300 px-4 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoRow
              label="Max altitude"
              value={formatNumber(item?.summary?.maxAltitude, 1, " m")}
            />
            <InfoRow
              label="Avg altitude"
              value={formatNumber(item?.summary?.avgAltitude, 1, " m")}
            />
            <InfoRow
              label="Min altitude"
              value={formatNumber(item?.summary?.minAltitude, 1, " m")}
            />
            <InfoRow
              label="Spread"
              value={formatNumber(item?.summary?.spread, 1, " m")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AxisControlsPanel({
  yMinInput,
  yMaxInput,
  setYMinInput,
  setYMaxInput,
  handleResetYAxis,
}) {
  return (
    <div className="mt-4 rounded-3xl border border-base-300 bg-base-200/35 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
            <FiMaximize2 className="text-primary" />
            Axis calibration
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            Fine-tune the visible Y range for the altitude chart.
          </div>
        </div>

        <button
          type="button"
          className="btn btn-sm rounded-xl border-base-300 bg-base-100"
          onClick={handleResetYAxis}
        >
          <FiRefreshCw />
          Reset scale
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberField
          label="Y min"
          value={yMinInput}
          onChange={setYMinInput}
          placeholder="Detected minimum"
        />

        <NumberField
          label="Y max"
          value={yMaxInput}
          onChange={setYMaxInput}
          placeholder="Detected maximum"
        />
      </div>
    </div>
  );
}

export default function DroneProfileAnalytics({
  mission = null,
  missions = [],
  telemetry = [],
  telemetryMap = {},
  sameLocation = true,
  rangePreset = "full",
  gpsFilter = "all",
  trendSummary = null,
  formatNumber,
}) {
  const isMultiMission = Array.isArray(missions) && missions.length > 1;

  const [xAxisMode, setXAxisMode] = useState("progress");
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [chartControlsOpen, setChartControlsOpen] = useState(false);

  const [yMinInput, setYMinInput] = useState("");
  const [yMaxInput, setYMaxInput] = useState("");

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [expandedMap, setExpandedMap] = useState({});

  const singleSummary = useMemo(() => {
    return buildAltitudeSummary(Array.isArray(telemetry) ? telemetry : []);
  }, [telemetry]);

  const singleSeries = useMemo(() => {
    if (!mission) return [];
    const series = buildAltitudeSeriesForMission(
      mission,
      Array.isArray(telemetry) ? telemetry : [],
      "#8b5cf6",
      "time",
    );
    return series ? [series] : [];
  }, [mission, telemetry]);

  const missionRows = useMemo(() => {
    if (!isMultiMission) return [];

    return missions.map((itemMission) => {
      const raw = telemetryMap[itemMission.mission_id] || [];
      const filtered = buildMissionTelemetry(raw, rangePreset, gpsFilter);

      return {
        mission: itemMission,
        telemetry: filtered,
        summary: buildAltitudeSummary(filtered),
      };
    });
  }, [isMultiMission, missions, telemetryMap, rangePreset, gpsFilter]);

  const multiSeries = useMemo(() => {
    if (!isMultiMission) return [];

    return missions
      .map((itemMission, index) => {
        const raw = telemetryMap[itemMission.mission_id] || [];
        const filtered = buildMissionTelemetry(raw, rangePreset, gpsFilter);

        return buildAltitudeSeriesForMission(
          itemMission,
          filtered,
          SERIES_COLORS[index % SERIES_COLORS.length],
          xAxisMode,
        );
      })
      .filter(Boolean);
  }, [
    isMultiMission,
    missions,
    telemetryMap,
    rangePreset,
    gpsFilter,
    xAxisMode,
  ]);

  const offsetsBySeries = useMemo(() => {
    if (!overlayEnabled) return {};

    const result = {};
    multiSeries.forEach((item, index) => {
      result[item.id] = index * 2.5;
    });
    return result;
  }, [overlayEnabled, multiSeries]);

  const overallSummary = useMemo(() => {
    const maxValues = missionRows
      .map((item) => item?.summary?.maxAltitude)
      .filter((value) => Number.isFinite(value));

    const avgValues = missionRows
      .map((item) => item?.summary?.avgAltitude)
      .filter((value) => Number.isFinite(value));

    const spreadValues = missionRows
      .map((item) => item?.summary?.spread)
      .filter((value) => Number.isFinite(value));

    return {
      maxAltitude: maxValues.length ? Math.max(...maxValues) : null,
      avgAltitude: avgValues.length
        ? avgValues.reduce((sum, value) => sum + value, 0) / avgValues.length
        : null,
      avgSpread: spreadValues.length
        ? spreadValues.reduce((sum, value) => sum + value, 0) /
          spreadValues.length
        : null,
    };
  }, [missionRows]);

  const detectedYRange = useMemo(() => {
    const sourceSeries = isMultiMission ? multiSeries : singleSeries;

    const values = sourceSeries
      .flatMap((item) => item?.points || [])
      .map((point) => Number(point?.y))
      .filter((value) => Number.isFinite(value));

    if (!values.length) {
      return { min: null, max: null };
    }

    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [isMultiMission, multiSeries, singleSeries]);

  useEffect(() => {
    setYMinInput(formatAxisValue(detectedYRange.min));
    setYMaxInput(formatAxisValue(detectedYRange.max));
  }, [
    detectedYRange.min,
    detectedYRange.max,
    isMultiMission,
    xAxisMode,
    rangePreset,
    gpsFilter,
  ]);

  useEffect(() => {
    if (!missionRows.length) {
      setExpandedMap({});
      return;
    }

    setExpandedMap((prev) => {
      const next = {};
      missionRows.forEach((item) => {
        const missionId = item?.mission?.mission_id;
        next[missionId] = prev[missionId] ?? false;
      });
      return next;
    });
  }, [missionRows]);

  const parsedYMin = Number(yMinInput);
  const parsedYMax = Number(yMaxInput);

  const yMinOverride = Number.isFinite(parsedYMin) ? parsedYMin : null;
  const yMaxOverride = Number.isFinite(parsedYMax) ? parsedYMax : null;

  function handleResetYAxis() {
    setYMinInput(formatAxisValue(detectedYRange.min));
    setYMaxInput(formatAxisValue(detectedYRange.max));
  }

  function handleToggleMission(missionId) {
    setExpandedMap((prev) => ({
      ...prev,
      [missionId]: !prev[missionId],
    }));
  }

  function handleExpandAll() {
    const next = {};
    missionRows.forEach((item) => {
      const missionId = item?.mission?.mission_id;
      next[missionId] = true;
    });
    setExpandedMap(next);
  }

  function handleCollapseAll() {
    const next = {};
    missionRows.forEach((item) => {
      const missionId = item?.mission?.mission_id;
      next[missionId] = false;
    });
    setExpandedMap(next);
  }

  if (isMultiMission) {
    return (
      <div className="space-y-5">
        <SectionCard
          title="Drone comparison"
          description={
            sameLocation
              ? "Altitude comparison across drone missions from the same location context."
              : "Altitude comparison across drone missions from different locations."
          }
          icon={FiLayers}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Selected missions"
              value={String(missions.length)}
              hint="Drone missions in comparison"
              tone="info"
            />
            <StatCard
              label="Highest altitude"
              value={formatNumber(overallSummary.maxAltitude, 1, " m")}
            />
            <StatCard
              label="Average altitude"
              value={formatNumber(overallSummary.avgAltitude, 1, " m")}
            />
            <StatCard
              label="Average spread"
              value={formatNumber(overallSummary.avgSpread, 1, " m")}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Altitude comparison"
          description={
            xAxisMode === "progress"
              ? "Missions are normalized on X by progress (0–100%), so similar routes can be compared even if durations differ."
              : "Missions are aligned by elapsed time from mission start."
          }
          icon={FiTrendingUp}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <ToggleChip
              active={xAxisMode === "progress"}
              label="X: Progress"
              onClick={() => setXAxisMode("progress")}
            />
            <ToggleChip
              active={xAxisMode === "time"}
              label="X: Elapsed time"
              onClick={() => setXAxisMode("time")}
            />
            <ToggleChip
              active={overlayEnabled}
              label="Overlay"
              onClick={() => setOverlayEnabled((prev) => !prev)}
            />

            <button
              type="button"
              className={[
                "btn btn-sm btn-square rounded-xl",
                chartControlsOpen
                  ? "btn-primary border-none text-white"
                  : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
              ].join(" ")}
              onClick={() => setChartControlsOpen((prev) => !prev)}
              aria-label="Toggle chart controls"
              title="Chart controls"
            >
              <FiSliders />
            </button>
          </div>

          {chartControlsOpen ? (
            <AxisControlsPanel
              yMinInput={yMinInput}
              yMaxInput={yMaxInput}
              setYMinInput={setYMinInput}
              setYMaxInput={setYMaxInput}
              handleResetYAxis={handleResetYAxis}
            />
          ) : null}

          <div className={chartControlsOpen ? "mt-4" : ""}>
            {multiSeries.length ? (
              <AnalyticsMultiMissionChart
                metricLabel="Altitude"
                unit="m"
                series={multiSeries}
                displayMode="line"
                smoothMode="off"
                normalizeMode="off"
                offsetsBySeries={offsetsBySeries}
                brushEnabled={true}
                valueDecimals={2}
                xAxisMode={xAxisMode}
                yMinOverride={yMinOverride}
                yMaxOverride={yMaxOverride}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
                No altitude data available for the selected missions.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Mission altitude summary"
          description="Expandable summary for each selected drone mission."
          icon={FiActivity}
          actions={
            <button
              type="button"
              className="btn btn-sm btn-square rounded-xl border-base-300 bg-base-100 text-base-content hover:bg-base-200"
              onClick={() => setSummaryOpen((prev) => !prev)}
              aria-label="Toggle mission summary"
              title="Toggle mission summary"
            >
              {summaryOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>
          }
        >
          {summaryOpen ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-base-content/60">
                  {missionRows.length} mission
                  {missionRows.length === 1 ? "" : "s"} in summary
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                    onClick={handleExpandAll}
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm rounded-xl border-base-300 bg-base-100"
                    onClick={handleCollapseAll}
                  >
                    Collapse all
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {missionRows.length ? (
                  missionRows.map((item) => {
                    const missionId = item?.mission?.mission_id;
                    return (
                      <MissionSummaryItem
                        key={missionId}
                        item={item}
                        expanded={Boolean(expandedMap[missionId])}
                        onToggle={() => handleToggleMission(missionId)}
                        formatNumber={formatNumber}
                      />
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
                    No mission comparison data available.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 px-4 py-4 text-center text-sm text-base-content/55">
              Summary is collapsed. Expand it to see the mission list.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Flight interpretation"
          description="Context notes for drone comparison."
          icon={FiMapPin}
        >
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <InfoRow label="Profile" value="Drone" />
            <InfoRow
              label="X comparison mode"
              value={
                xAxisMode === "progress" ? "Mission progress" : "Elapsed time"
              }
            />
            <InfoRow
              label="Recommended focus"
              value={
                sameLocation
                  ? "Altitude differences and repeated flight behavior"
                  : "Altitude differences only"
              }
            />
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Drone analysis"
        description="Profile-specific interpretation for aerial missions."
        icon={FiNavigation}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Max altitude"
            value={formatNumber(singleSummary.maxAltitude, 1, " m")}
            hint="Highest recorded altitude"
          />
          <StatCard
            label="Avg altitude"
            value={formatNumber(singleSummary.avgAltitude, 1, " m")}
            hint="Average altitude"
          />
          <StatCard
            label="Altitude spread"
            value={formatNumber(singleSummary.spread, 1, " m")}
            hint="Difference between min and max"
          />
          <StatCard
            label="Metric trend"
            value={trendSummary?.directionLabel || "—"}
            hint="Trend of the selected metric"
            tone={
              trendSummary?.direction === "up"
                ? "warning"
                : trendSummary?.direction === "down"
                  ? "info"
                  : "success"
            }
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Altitude profile"
        description="Altitude over elapsed mission time."
        icon={FiTrendingUp}
        actions={
          <button
            type="button"
            className={[
              "btn btn-sm btn-square rounded-xl",
              chartControlsOpen
                ? "btn-primary border-none text-white"
                : "border-base-300 bg-base-100 text-base-content hover:bg-base-200",
            ].join(" ")}
            onClick={() => setChartControlsOpen((prev) => !prev)}
            aria-label="Toggle chart controls"
            title="Chart controls"
          >
            <FiSliders />
          </button>
        }
      >
        {chartControlsOpen ? (
          <AxisControlsPanel
            yMinInput={yMinInput}
            yMaxInput={yMaxInput}
            setYMinInput={setYMinInput}
            setYMaxInput={setYMaxInput}
            handleResetYAxis={handleResetYAxis}
          />
        ) : null}

        <div className={chartControlsOpen ? "mt-4" : ""}>
          {singleSeries.length ? (
            <AnalyticsSingleMissionChart
              metricLabel="Altitude"
              unit="m"
              series={singleSeries}
              displayMode="line"
              smoothMode="off"
              brushEnabled={true}
              valueDecimals={2}
              yMinOverride={yMinOverride}
              yMaxOverride={yMaxOverride}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
              No altitude data available for the selected mission.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
