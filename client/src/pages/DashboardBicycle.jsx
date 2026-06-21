import React from "react";

export default function DashboardBicycle() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Bicycle profile
        </p>

        <h1 className="mt-2 text-2xl font-bold text-base-content">
          Bicycle Dashboard
        </h1>

        <p className="mt-2 text-sm text-base-content/60">
          Dashboard page reserved for the bicycle monitoring profile.
        </p>
      </div>
    </div>
  );
}
