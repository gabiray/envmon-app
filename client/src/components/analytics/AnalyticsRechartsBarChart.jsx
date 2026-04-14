import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEFAULT_BAR_COLOR = "#2563eb";
const DEFAULT_EMPTY_COLOR = "rgba(37,99,235,0.18)";

function formatNumber(value, decimals = 0, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function CustomTooltip({
  active,
  payload,
  label,
  xLabel = "Period",
  yLabel = "Value",
  unit = "",
  valueDecimals = 0,
}) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
  const row = item?.payload || {};

  return (
    <div className="min-w-[220px] rounded-2xl border border-base-300 bg-base-100 px-3 py-3 shadow-lg">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/45">
        Details
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-start justify-between gap-4">
          <span className="text-base-content/55">{xLabel}</span>
          <span className="text-right font-medium text-base-content">
            {row.fullLabel || label || "—"}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <span className="text-base-content/55">{yLabel}</span>
          <span className="text-right font-medium text-base-content">
            {formatNumber(item?.value, valueDecimals, unit ? ` ${unit}` : "")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsRechartsBarChart({
  title = "",
  subtitle = "",
  data = [],
  xKey = "label",
  yKey = "value",
  xLabel = "Period",
  yLabel = "Value",
  height = 300,
  unit = "",
  showLegend = true,
  legendLabel = "Recorded missions",
  valueDecimals = 0,
  barColor = DEFAULT_BAR_COLOR,
  emptyBarColor = DEFAULT_EMPTY_COLOR,
  yMinOverride = 0,
  yMaxOverride = null,
}) {
  const chartData = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  if (!chartData.length) {
    return (
      <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
        No chart data available.
      </div>
    );
  }

  const maxValue = Math.max(
    ...chartData.map((item) => Number(item?.[yKey] || 0)),
    0,
  );

  const yDomain = [
    yMinOverride !== null ? Number(yMinOverride) : 0,
    yMaxOverride !== null
      ? Number(yMaxOverride)
      : maxValue <= 0
        ? 1
        : Math.max(Math.ceil(maxValue * 1.15), maxValue + 1),
  ];

  return (
    <div className="space-y-3">
      {(title || subtitle) ? (
        <div className="min-w-0">
          {title ? (
            <div className="text-sm font-semibold text-base-content">{title}</div>
          ) : null}
          {subtitle ? (
            <div className="text-xs text-base-content/55">{subtitle}</div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.22} />

              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 11 }}
                interval={0}
                angle={0}
                minTickGap={8}
              />

              <YAxis
                domain={yDomain}
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                width={46}
                tickFormatter={(value) => formatNumber(value, valueDecimals)}
              />

              <Tooltip
                content={
                  <CustomTooltip
                    xLabel={xLabel}
                    yLabel={yLabel}
                    unit={unit}
                    valueDecimals={valueDecimals}
                  />
                }
              />

              {showLegend ? (
                <Legend
                  payload={[
                    {
                      value: legendLabel,
                      type: "square",
                      color: barColor,
                    },
                  ]}
                  wrapperStyle={{
                    fontSize: "12px",
                    paddingTop: "6px",
                  }}
                />
              ) : null}

              <Bar
                dataKey={yKey}
                name={legendLabel}
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={Number(entry?.[yKey] || 0) > 0 ? barColor : emptyBarColor}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
