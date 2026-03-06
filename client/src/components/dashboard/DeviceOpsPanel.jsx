import React, { useMemo, useState } from "react";
import {
  FiActivity,
  FiDownload,
  FiDatabase,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiChevronDown,
} from "react-icons/fi";

import {
  getDeviceHealth,
  getDeviceMissions,
  getDeviceStatus,
  getDbMissions,
  importNewMissions,
} from "../../services/deviceOpsApi";

function okIcon(ok) {
  return ok ? (
    <FiCheckCircle className="text-success" />
  ) : (
    <FiXCircle className="text-error" />
  );
}

function showNone(v) {
  if (v === null || v === undefined) return "None";
  const s = String(v).trim();
  return s ? s : "None";
}

export default function DeviceOpsPanel({
  selectedDeviceId = "none",
  deviceStatus = "inactive", // connected|inactive|out_of_range
}) {
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState("");

  const [statusData, setStatusData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [missionsData, setMissionsData] = useState(null);
  const [dbMissions, setDbMissions] = useState([]);
  const [syncResult, setSyncResult] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

  const derived = useMemo(() => {
    const deviceMissionIds = missionsData?.missions || [];
    const incompleteIds = missionsData?.incomplete_missions || [];
    const dbIds = new Set((dbMissions || []).map((m) => m.mission_id));
    const newIds = deviceMissionIds.filter((id) => !dbIds.has(id));
    return {
      deviceMissionIds,
      incompleteIds,
      dbIds,
      newIds,
      deviceCount: deviceMissionIds.length,
      dbCount: dbIds.size,
      newCount: newIds.length,
    };
  }, [missionsData, dbMissions]);

  async function refreshAll() {
    setLoading(true);
    setError("");
    setSyncResult(null);

    try {
      // Fetch in parallel
      const [st, hl, ms, db] = await Promise.all([
        getDeviceStatus(),
        getDeviceHealth(),
        getDeviceMissions(),
        getDbMissions(selectedDeviceId && selectedDeviceId !== "none" ? selectedDeviceId : null),
      ]);

      setStatusData(st);
      setHealthData(hl);
      setMissionsData(ms);
      setDbMissions(db);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Failed to fetch device info";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckStatus(e) {
    // Prevent <summary> toggle side effects when pressing the button
    e?.preventDefault?.();
    if (!open) setOpen(true);
    await refreshAll();
  }

  async function handleImportNew(e) {
    e?.preventDefault?.();
    setSyncLoading(true);
    setError("");
    try {
      const res = await importNewMissions();
      setSyncResult(res);
      // Refresh to update "new vs imported" counters
      await refreshAll();
    } catch (e2) {
      const msg = e2?.response?.data?.error || e2?.message || "Import failed";
      setError(msg);
    } finally {
      setSyncLoading(false);
    }
  }

  function downloadZip(missionId) {
    // Use the app server export endpoint (streams the ZIP)
    const url = `${apiBase}/missions/${missionId}/export`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function downloadAllNew() {
    derived.newIds.forEach((mid) => downloadZip(mid));
  }

  const canOperate = selectedDeviceId !== "none";
  const canSync = canOperate && deviceStatus === "connected" && !syncLoading;

  return (
    <details
      className="collapse collapse-arrow bg-base-100 border border-base-300 shadow-sm"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="collapse-title">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-semibold">
              <FiActivity />
              Device diagnostics & sync
              <FiChevronDown className="opacity-0" aria-hidden="true" />
            </div>
            <div className="text-xs opacity-60">
              Health, runtime status, missions list, import/download
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="btn btn-sm btn-outline rounded-xl"
              onClick={handleCheckStatus}
              disabled={!canOperate || loading}
              title={!canOperate ? "Select a device first" : "Fetch status/health/missions"}
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              {loading ? "Checking..." : "Check status"}
            </button>
          </div>
        </div>
      </summary>

      <div className="collapse-content">
        {!canOperate && (
          <div className="alert alert-info">
            <FiAlertTriangle />
            <span>Select a device first, then press “Check status”.</span>
          </div>
        )}

        {error && (
          <div className="alert alert-warning mt-3">
            <FiAlertTriangle />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* LEFT: Runtime status + health */}
          <div className="space-y-4">
            <div className="rounded-box border border-base-300 bg-base-200 p-4">
              <div className="text-sm font-semibold">Runtime status</div>

              {!statusData ? (
                <div className="text-sm opacity-60 mt-2">No data yet.</div>
              ) : (
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">State</span>
                    <span className="font-medium">{showNone(statusData.state)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Running</span>
                    <span className="font-medium">{String(Boolean(statusData.running))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Mission ID</span>
                    <span className="font-mono text-xs">{showNone(statusData.mission_id)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">PID</span>
                    <span className="font-medium">{showNone(statusData.pid)}</span>
                  </div>

                  {statusData.error && (
                    <div className="mt-2 alert alert-error">
                      <FiAlertTriangle />
                      <span className="text-sm">{statusData.error}</span>
                    </div>
                  )}

                  {Array.isArray(statusData.warnings) && statusData.warnings.length > 0 && (
                    <div className="mt-2 alert alert-warning">
                      <FiAlertTriangle />
                      <span className="text-sm">
                        {statusData.warnings.join(" | ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-box border border-base-300 bg-base-200 p-4">
              <div className="text-sm font-semibold">Health checks</div>

              {!healthData ? (
                <div className="text-sm opacity-60 mt-2">No data yet.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Overall</span>
                    <span className="inline-flex items-center gap-2 font-medium">
                      {okIcon(Boolean(healthData.ok))}
                      {healthData.ok ? "OK" : "Issues"}
                    </span>
                  </div>

                  <div className="divider my-2" />

                  {Object.entries(healthData.checks || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="opacity-80">{k}</span>
                      <span className="inline-flex items-center gap-2">
                        {okIcon(Boolean(v?.ok))}
                        <span className="font-medium">{v?.ok ? "OK" : "Fail"}</span>
                      </span>
                    </div>
                  ))}

                  {Array.isArray(healthData.warnings) && healthData.warnings.length > 0 && (
                    <div className="mt-3 alert alert-warning">
                      <FiAlertTriangle />
                      <span className="text-sm">
                        {healthData.warnings.join(" | ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Missions + Sync */}
          <div className="space-y-4">
            <div className="rounded-box border border-base-300 bg-base-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Missions</div>
                  <div className="text-xs opacity-60">
                    Compare device missions vs local DB and sync new ones
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-primary rounded-xl"
                  disabled={!canSync}
                  onClick={handleImportNew}
                  title={!canSync ? "Device must be connected to import" : "Import all new missions into DB"}
                >
                  <FiDatabase />
                  {syncLoading ? "Importing..." : "Import new"}
                </button>
              </div>

              {/* Counters */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="stat bg-base-100 rounded-box border border-base-300">
                  <div className="stat-title">On device</div>
                  <div className="stat-value text-lg">{derived.deviceCount}</div>
                </div>
                <div className="stat bg-base-100 rounded-box border border-base-300">
                  <div className="stat-title">In DB</div>
                  <div className="stat-value text-lg">{derived.dbCount}</div>
                </div>
                <div className="stat bg-base-100 rounded-box border border-base-300">
                  <div className="stat-title">New</div>
                  <div className="stat-value text-lg">{derived.newCount}</div>
                </div>
              </div>

              {syncResult && (
                <div className="mt-3 alert alert-success">
                  <FiCheckCircle />
                  <span className="text-sm">
                    Imported: {syncResult.imported_count ?? 0} • Skipped: {syncResult.skipped_count ?? 0} • Errors: {syncResult.errors_count ?? 0}
                  </span>
                </div>
              )}

              <div className="divider my-3" />

              {/* New missions list */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">New missions</div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline rounded-xl"
                  disabled={derived.newCount === 0}
                  onClick={downloadAllNew}
                  title="Download all new mission ZIPs"
                >
                  <FiDownload />
                  Download all
                </button>
              </div>

              {derived.newCount === 0 ? (
                <div className="text-sm opacity-60 mt-2">No new missions.</div>
              ) : (
                <div className="mt-2 rounded-box border border-base-300 bg-base-100 overflow-hidden">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Mission ID</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {derived.newIds.map((mid) => (
                        <tr key={mid}>
                          <td className="font-mono text-xs break-all">{mid}</td>
                          <td className="text-right">
                            <button
                              type="button"
                              className="btn btn-xs btn-outline"
                              onClick={() => downloadZip(mid)}
                            >
                              <FiDownload />
                              ZIP
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Incomplete missions */}
              {derived.incompleteIds.length > 0 && (
                <div className="mt-3 alert alert-warning">
                  <FiAlertTriangle />
                  <span className="text-sm">
                    Incomplete missions on device: {derived.incompleteIds.join(", ")}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-box border border-base-300 bg-base-200 p-4">
              <div className="text-sm font-semibold">Download any mission</div>
              <div className="text-xs opacity-60">
                Uses /api/missions/&lt;id&gt;/export (streams ZIP)
              </div>

              {!missionsData?.missions?.length ? (
                <div className="text-sm opacity-60 mt-2">No mission list loaded.</div>
              ) : (
                <div className="mt-3 rounded-box border border-base-300 bg-base-100 overflow-hidden">
                  <ul className="menu menu-sm max-h-56 overflow-y-auto">
                    {missionsData.missions.map((mid) => {
                      const inDb = derived.dbIds.has(mid);
                      return (
                        <li key={mid}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono text-xs break-all">
                              {mid}
                              <span className={`ml-2 badge badge-xs ${inDb ? "badge-outline" : "badge-warning"}`}>
                                {inDb ? "imported" : "new"}
                              </span>
                            </span>
                            <button
                              type="button"
                              className="btn btn-xs btn-outline"
                              onClick={() => downloadZip(mid)}
                            >
                              <FiDownload />
                              ZIP
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer refresh */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={refreshAll}
            disabled={!canOperate || loading}
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>
    </details>
  );
}
