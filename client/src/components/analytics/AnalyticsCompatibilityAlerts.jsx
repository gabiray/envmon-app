import React from "react";
import { FiAlertTriangle, FiMapPin, FiLayers } from "react-icons/fi";

function AlertCard({ icon: Icon, title, description, tone = "warning" }) {
  const toneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning/10 text-warning-content"
      : "border-info/30 bg-info/10 text-base-content";

  const iconClass = tone === "warning" ? "text-warning" : "text-info";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon className={`text-base ${iconClass}`} />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-sm opacity-80">{description}</div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsCompatibilityAlerts({
  isMultiMission = false,
  sameProfile = true,
  sameLocation = true,
}) {
  if (!isMultiMission) return null;

  const items = [];

  if (!sameProfile) {
    items.push(
      <AlertCard
        key="mixed-profile"
        icon={FiLayers}
        title="Mixed profiles selected"
        description="Profile-specific analysis is hidden because the selected missions do not share the same operating profile."
      />,
    );
  }

  if (!sameLocation) {
    items.push(
      <AlertCard
        key="different-location"
        icon={FiMapPin}
        title="Different locations selected"
        description="The selected missions are from different locations. Time-based comparison remains available, but spatial interpretation should be treated with caution."
        tone="info"
      />,
    );
  }

  if (items.length === 0) return null;

  return <div className="space-y-3">{items}</div>;
}
