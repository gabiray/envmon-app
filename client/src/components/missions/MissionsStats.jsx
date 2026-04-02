import React from "react";
import { FiDatabase, FiDownload, FiHardDrive, FiMapPin } from "react-icons/fi";

function StatCard({ label, value, hint, icon, tone = "blue" }) {
  // Culorile sunt acum aplicate doar pe iconita pentru un aspect mult mai curat
  const toneMap = {
    blue: "bg-primary/10 text-primary",
    violet: "bg-secondary/10 text-secondary",
    amber: "bg-warning/10 text-warning",
    teal: "bg-success/10 text-success",
  };

  const iconStyle = toneMap[tone] || toneMap.blue;

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
            {label}
          </div>
          {/* Dimensiunea textului a fost redusa de la 3xl la 2xl */}
          <div className="mt-1 text-2xl font-bold text-base-content">
            {value}
          </div>
          {hint ? (
            <div className="mt-1 text-xs text-base-content/50">{hint}</div>
          ) : null}
        </div>

        {/* Iconita a fost micsorata si are designul de accent */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle} ring-1 ring-inset ring-white/20`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function MissionsStats({
  summary = { mission_count: 0, device_count: 0 },
  pendingImportCount = 0,
  distinctLocationCount = 0,
  className = "",
}) {
  return (
    <section
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className}`}
    >
      <StatCard
        label="Database missions"
        value={summary?.mission_count ?? 0}
        hint="Stored in local database"
        icon={<FiDatabase className="text-base" />}
        tone="blue"
      />

      <StatCard
        label="Registered devices"
        value={summary?.device_count ?? 0}
        hint="Found in mission history"
        icon={<FiHardDrive className="text-base" />}
        tone="violet"
      />

      <StatCard
        label="Pending import"
        value={pendingImportCount}
        hint="Available on device only"
        icon={<FiDownload className="text-base" />}
        tone="amber"
      />

      <StatCard
        label="Distinct locations"
        value={distinctLocationCount}
        hint="Unique starting points"
        icon={<FiMapPin className="text-base" />}
        tone="teal"
      />
    </section>
  );
}
