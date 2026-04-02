import React from "react";
import { FiDatabase } from "react-icons/fi";

import MissionsTabs from "./MissionsTabs";
import MissionsStats from "./MissionsStats";

export default function MissionsOverviewPanel({
  activeTab = "db",
  onTabChange = () => {},
  deviceDisabled = false,
  deviceConnected = false,
  deviceLabel = "Device",
  summary = { mission_count: 0, device_count: 0 },
  pendingImportCount = 0,
  distinctLocationCount = 0,
}) {
  const isDb = activeTab === "db";

  return (
    <section className="rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <FiDatabase className="shrink-0 text-[20px] text-primary" />
              <h2 className="text-lg font-semibold text-base-content sm:text-lg">
                {isDb ? "Mission database" : "Device missions"}
              </h2>
            </div>

            <p className="mt-0.5 max-w-2xl text-sm leading-7 text-base-content/65">
              {isDb
                ? "Browse, manage and organize missions stored in the local database."
                : "Inspect missions available on the active device and prepare them for import."}
            </p>
          </div>

          <div className="self-start">
            <MissionsTabs
              activeTab={activeTab}
              onChange={onTabChange}
              deviceDisabled={deviceDisabled}
              deviceConnected={deviceConnected}
              deviceLabel={deviceLabel}
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <MissionsStats
          summary={summary}
          pendingImportCount={pendingImportCount}
          distinctLocationCount={distinctLocationCount}
        />
      </div>
    </section>
  );
}
