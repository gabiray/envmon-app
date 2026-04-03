import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import MissionsToolbar from "../components/missions/MissionsToolbar";
import MissionsTable from "../components/missions/MissionsTable";
import DeleteMissionModal from "../components/missions/DeleteMissionModal";
import MissionsOverviewPanel from "../components/missions/MissionsOverviewPanel";
import MissionsTablePanel from "../components/missions/MissionsTablePanel";

import { useDeviceConnection } from "../hooks/useDeviceConnection";
import {
  fetchDbSummary,
  fetchDbMissions,
  fetchDbMissionDetails,
  fetchDeviceMissions,
  deleteDbMission,
  deleteDeviceMission,
  renameDbMission,
  renameDeviceMission,
  importNewMissions,
  importSelectedMissions,
} from "../services/missionsApi";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getProfileLabel(profileType, profiles = []) {
  const found = profiles.find((item) => item.type === profileType);
  return found?.label || profileType || "Unknown";
}

function inferLocationLabel(mission) {
  const explicitName =
    typeof mission?.location_name === "string"
      ? mission.location_name.trim()
      : "";

  if (explicitName) {
    return explicitName;
  }

  const start = mission?.start || null;

  if (start?.lat != null && start?.lon != null) {
    return `${Number(start.lat).toFixed(4)}, ${Number(start.lon).toFixed(4)}`;
  }

  if (mission?.location_mode === "fixed") return "Fixed point";
  if (mission?.location_mode === "gps") return "GPS";

  return "Unknown";
}

function getMissionDateEpoch(mission) {
  return (
    mission?.started_at_epoch ||
    mission?.created_at_epoch ||
    mission?.imported_at_epoch ||
    null
  );
}

function normalizeDbMission(mission, profiles) {
  return {
    mission_id: mission.mission_id,
    mission_name: mission.mission_name || mission.mission_id,
    device_uuid: mission.device_uuid || null,
    profile_type: mission.profile_type || null,
    profile_label:
      mission.profile_label || getProfileLabel(mission.profile_type, profiles),
    location_label: inferLocationLabel(mission),
    date_epoch: getMissionDateEpoch(mission),
    status: mission.status || "Unknown",
    source: "db",
    in_db: true,
    on_device: false,
    has_gps: Boolean(mission.has_gps),
    has_images: Boolean(mission.has_images),
    raw: mission,
  };
}

function normalizeDeviceMission(missionId, meta = {}, activeDevice, profiles) {
  return {
    mission_id: missionId,
    mission_name: meta.mission_name || missionId,
    device_uuid: activeDevice?.device_uuid || null,
    profile_type:
      meta.profile_type || activeDevice?.active_profile_type || null,
    profile_label:
      meta.profile_label ||
      activeDevice?.active_profile_label ||
      getProfileLabel(meta.profile_type, profiles),
    location_label: inferLocationLabel(meta),
    date_epoch: getMissionDateEpoch(meta),
    status: meta.status || meta.stop_reason || "Unknown",
    source: "device",
    in_db: false,
    on_device: true,
    has_gps: Boolean(meta.has_gps),
    has_images: Boolean(meta.has_images),
    raw: {
      mission_id: missionId,
      ...meta,
    },
  };
}

function mergeMissionSources(dbRows = [], deviceRows = []) {
  const map = new Map();

  for (const mission of dbRows) {
    map.set(mission.mission_id, { ...mission });
  }

  for (const mission of deviceRows) {
    if (map.has(mission.mission_id)) {
      const prev = map.get(mission.mission_id);

      map.set(mission.mission_id, {
        ...prev,
        ...mission,
        mission_name: prev.mission_name || mission.mission_name,
        profile_type: prev.profile_type || mission.profile_type,
        profile_label: prev.profile_label || mission.profile_label,
        location_label:
          prev.location_label && prev.location_label !== "Unknown"
            ? prev.location_label
            : mission.location_label,
        date_epoch: prev.date_epoch || mission.date_epoch,
        status: prev.status || mission.status,
        source: "synced",
        in_db: true,
        on_device: true,
        raw: {
          ...(prev.raw || {}),
          ...(mission.raw || {}),
        },
      });
    } else {
      map.set(mission.mission_id, { ...mission });
    }
  }

  return Array.from(map.values());
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Missions() {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};

  const {
    setPageTitle,
    activeDevice = null,
    selectedDeviceId = "none",
    onDeviceChange = async () => {},
    profiles = [],
    devicesRaw = [],
  } = outlet;

  const { uiStatus = "inactive" } = useDeviceConnection(selectedDeviceId);

  const deviceConnected = uiStatus === "connected";

  const [activeTab, setActiveTab] = useState("db");

  // ── Data state ────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState({ mission_count: 0, device_count: 0 });
  const [dbRows, setDbRows] = useState([]);
  const [deviceRows, setDeviceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableBusy, setTableBusy] = useState(false);

  // ── Details state ─────────────────────────────────────────────────────────
  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [, setSelectedMissionDetails] = useState(null);
  const [, setDetailsLoading] = useState(false);

  // ── Toolbar / filter state ────────────────────────────────────────────────
  const [searchValue, setSearchValue] = useState("");
  const [selectedProfileFilter, setSelectedProfileFilter] = useState("all");
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState("all");
  const [selectedLocationIds, setSelectedLocationIds] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [selectedIds, setSelectedIds] = useState([]);

  // ── Delete modal ──────────────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState(null);

  // Device selection logic:
  // filter has priority; fallback to topbar selected device
  const effectiveDeviceId =
    selectedDeviceFilter !== "all"
      ? selectedDeviceFilter
      : selectedDeviceId !== "none"
        ? selectedDeviceId
        : null;

  // Active device detection should compare with selectedDeviceId from topbar
  const isEffectiveDeviceActive =
    Boolean(effectiveDeviceId) &&
    selectedDeviceId !== "none" &&
    effectiveDeviceId === selectedDeviceId;

  const canReadLiveDeviceMissions = isEffectiveDeviceActive && deviceConnected;

  // Device tab disabled only when no device is selected anywhere
  const deviceTabDisabled = !effectiveDeviceId;

  useEffect(() => {
    setPageTitle?.("Missions");
  }, [setPageTitle]);

  // Sync topbar -> local filter
  useEffect(() => {
    if (selectedDeviceId && selectedDeviceId !== "none") {
      setSelectedDeviceFilter(selectedDeviceId);
    } else {
      setSelectedDeviceFilter("all");
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    if (deviceTabDisabled && activeTab === "device") {
      setActiveTab("db");
    }
  }, [deviceTabDisabled, activeTab]);

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const dbDeviceUuid =
        activeTab === "device" ? effectiveDeviceId : undefined;

      const [dbSummary, dbMissions] = await Promise.all([
        fetchDbSummary(dbDeviceUuid),
        fetchDbMissions(dbDeviceUuid),
      ]);

      setSummary({
        mission_count: dbSummary?.mission_count ?? 0,
        device_count: dbSummary?.device_count ?? 0,
      });

      setDbRows(
        (dbMissions || []).map((item) => normalizeDbMission(item, profiles)),
      );

      if (canReadLiveDeviceMissions) {
        try {
          const deviceRes = await fetchDeviceMissions();
          const ids = Array.isArray(deviceRes?.missions)
            ? deviceRes.missions
            : [];
          const metaMap = deviceRes?.missions_meta || {};

          setDeviceRows(
            ids.map((mid) =>
              normalizeDeviceMission(
                mid,
                metaMap?.[mid] || {},
                activeDevice,
                profiles,
              ),
            ),
          );
        } catch {
          setDeviceRows([]);
        }
      } else {
        setDeviceRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    effectiveDeviceId,
    canReadLiveDeviceMissions,
    activeDevice,
    profiles,
  ]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (activeTab !== "device") return;
    if (deviceTabDisabled) return;

    loadPage();
  }, [activeTab, deviceTabDisabled, loadPage]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const deviceTabRows = useMemo(
    () => mergeMissionSources(dbRows, deviceRows),
    [dbRows, deviceRows],
  );

  const mergedRows = useMemo(
    () => mergeMissionSources(dbRows, deviceRows),
    [dbRows, deviceRows],
  );

  const baseRows = useMemo(() => {
    if (activeTab === "device") {
      return deviceTabRows;
    }

    return dbRows;
  }, [activeTab, deviceTabRows, dbRows]);

  const pendingImportCount = useMemo(
    () => deviceTabRows.filter((m) => m.on_device && !m.in_db).length,
    [deviceTabRows],
  );

  const distinctLocationCount = useMemo(
    () =>
      new Set(
        baseRows
          .map((m) => m.location_label)
          .filter((v) => v && v !== "Unknown"),
      ).size,
    [baseRows],
  );

  const locationOptions = useMemo(() => {
    const map = new Map();

    for (const mission of baseRows) {
      const raw = mission?.raw || {};
      const lat = raw?.start?.lat;
      const lon = raw?.start?.lon;

      if (lat == null || lon == null) continue;
      if (!mission.location_label || mission.location_label === "Unknown") {
        continue;
      }

      const key = `${Number(lat).toFixed(4)}_${Number(lon).toFixed(4)}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: mission.location_label,
          latlng: {
            lat: Number(lat),
            lng: Number(lon),
          },
        });
      }
    }

    return Array.from(map.values());
  }, [baseRows]);

  const filteredRows = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    let rows = [...baseRows];

    // Database tab ignores selected device
    // Device tab respects selected device
    if (activeTab === "device" && selectedDeviceFilter !== "all") {
      rows = rows.filter((m) => m.device_uuid === selectedDeviceFilter);
    }

    if (selectedProfileFilter !== "all") {
      rows = rows.filter((m) => m.profile_type === selectedProfileFilter);
    }

    if (startDate) {
      const epoch = new Date(`${startDate}T00:00:00`).getTime();
      rows = rows.filter((m) => m.date_epoch && m.date_epoch * 1000 >= epoch);
    }

    if (endDate) {
      const epoch = new Date(`${endDate}T23:59:59`).getTime();
      rows = rows.filter((m) => m.date_epoch && m.date_epoch * 1000 <= epoch);
    }

    if (selectedLocationIds.length > 0) {
      rows = rows.filter((m) => {
        const raw = m?.raw || {};
        const lat = raw?.start?.lat;
        const lon = raw?.start?.lon;

        if (lat == null || lon == null) return false;

        const key = `${Number(lat).toFixed(4)}_${Number(lon).toFixed(4)}`;
        return selectedLocationIds.includes(key);
      });
    }

    if (q) {
      rows = rows.filter((m) =>
        [
          m.mission_name,
          m.mission_id,
          m.profile_label,
          m.location_label,
          m.device_uuid,
          m.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    rows.sort((a, b) => {
      if (sortBy === "name_asc") {
        return String(a.mission_name).localeCompare(String(b.mission_name));
      }

      if (sortBy === "name_desc") {
        return String(b.mission_name).localeCompare(String(a.mission_name));
      }

      if (sortBy === "date_asc") {
        return Number(a.date_epoch || 0) - Number(b.date_epoch || 0);
      }

      return Number(b.date_epoch || 0) - Number(a.date_epoch || 0);
    });

    return rows;
  }, [
    activeTab,
    baseRows,
    searchValue,
    selectedDeviceFilter,
    selectedProfileFilter,
    selectedLocationIds,
    startDate,
    endDate,
    sortBy,
  ]);

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => filteredRows.some((row) => row.mission_id === id)),
    );
  }, [filteredRows]);

  useEffect(() => {
    setSelectedMissionId((prev) =>
      prev && filteredRows.some((row) => row.mission_id === prev) ? prev : null,
    );
  }, [filteredRows]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleOpenDetails(mission) {
    setSelectedMissionId(mission.mission_id);
    setSelectedMissionDetails(null);

    if (!mission.in_db) return;

    setDetailsLoading(true);
    try {
      const details = await fetchDbMissionDetails(mission.mission_id);
      setSelectedMissionDetails(details);
    } catch {
      setSelectedMissionDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleRename(mission) {
    if (!mission) return;

    const nextName = window.prompt(
      "Rename mission",
      mission.mission_name || "",
    );
    const trimmed = String(nextName || "").trim();

    if (!trimmed || trimmed === mission.mission_name) return;

    setTableBusy(true);

    try {
      if (mission.source === "synced") {
        await Promise.allSettled([
          renameDbMission(mission.mission_id, trimmed),
          renameDeviceMission(mission.mission_id, trimmed),
        ]);
      } else if (mission.source === "device") {
        await renameDeviceMission(mission.mission_id, trimmed);
      } else {
        await renameDbMission(mission.mission_id, trimmed);
      }

      await loadPage();
    } finally {
      setTableBusy(false);
    }
  }

  async function handleImportMission(mission) {
    if (!mission || mission.in_db) return;

    setTableBusy(true);
    try {
      await importSelectedMissions([mission.mission_id]);
      await loadPage();
    } finally {
      setTableBusy(false);
    }
  }

  async function handleImportSelected() {
    const importableIds = filteredRows
      .filter((m) => selectedIds.includes(m.mission_id))
      .filter((m) => m.on_device && !m.in_db)
      .map((m) => m.mission_id);

    if (!importableIds.length) return;

    setTableBusy(true);
    try {
      await importSelectedMissions(importableIds);
      await loadPage();
    } finally {
      setTableBusy(false);
    }
  }

  async function handleImportNew() {
    setTableBusy(true);
    try {
      await importNewMissions();
      await loadPage();
    } finally {
      setTableBusy(false);
    }
  }

  function handleDeleteRequest(mission) {
    if (!mission) return;
    setMissionToDelete(mission);
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete(mode) {
    if (!missionToDelete || !mode) return;

    setTableBusy(true);

    try {
      if (mode === "both") {
        await Promise.allSettled([
          deleteDbMission(missionToDelete.mission_id),
          deleteDeviceMission(missionToDelete.mission_id),
        ]);
      } else if (mode === "device") {
        await deleteDeviceMission(missionToDelete.mission_id);
      } else {
        await deleteDbMission(missionToDelete.mission_id);
      }

      setSelectedIds((prev) =>
        prev.filter((id) => id !== missionToDelete.mission_id),
      );

      if (selectedMissionId === missionToDelete.mission_id) {
        setSelectedMissionId(null);
        setSelectedMissionDetails(null);
      }

      setDeleteModalOpen(false);
      setMissionToDelete(null);

      await loadPage();
    } finally {
      setTableBusy(false);
    }
  }

  function handleToggleSelect(missionId) {
    setSelectedIds((prev) =>
      prev.includes(missionId)
        ? prev.filter((id) => id !== missionId)
        : [...prev, missionId],
    );
  }

  function handleToggleSelectAll() {
    const visibleIds = filteredRows.map((row) => row.mission_id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  }

  async function handleDeviceFilterChange(nextDeviceId) {
    setSelectedDeviceFilter(nextDeviceId);

    const normalized =
      nextDeviceId && nextDeviceId !== "all" ? nextDeviceId : "none";

    if (normalized !== selectedDeviceId) {
      try {
        await onDeviceChange(normalized);
      } catch {
        // keep local filter even if topbar sync fails
      }
    }
  }

  const deviceTabLabel =
    selectedDeviceFilter !== "all"
      ? devicesRaw.find((d) => d.device_uuid === selectedDeviceFilter)
          ?.nickname ||
        devicesRaw.find((d) => d.device_uuid === selectedDeviceFilter)
          ?.hostname ||
        "Device"
      : activeDevice?.nickname || "Device";

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-col gap-6">
        <MissionsOverviewPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          deviceDisabled={deviceTabDisabled}
          deviceConnected={canReadLiveDeviceMissions}
          deviceLabel={deviceTabLabel}
          summary={summary}
          pendingImportCount={pendingImportCount}
          distinctLocationCount={distinctLocationCount}
        />

        <MissionsTablePanel
          title={activeTab === "db" ? "Database missions" : "Device missions"}
          description={
            activeTab === "db"
              ? "Review stored missions, open analytics and manage imported records."
              : canReadLiveDeviceMissions
                ? "Review database missions for the selected device and live missions available on the active device."
                : effectiveDeviceId
                  ? "Review database missions for the selected device. Live device missions are available only when that device is active and online."
                  : "Select a device from the top bar or filters to inspect device-specific missions."
          }
          toolbar={
            <MissionsToolbar
              devicesRaw={devicesRaw}
              selectedDeviceId={selectedDeviceFilter}
              onDeviceChange={handleDeviceFilterChange}
              profiles={profiles}
              selectedProfileFilter={selectedProfileFilter}
              onProfileFilterChange={setSelectedProfileFilter}
              locationOptions={locationOptions}
              selectedLocationIds={selectedLocationIds}
              onSelectedLocationIdsChange={setSelectedLocationIds}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              sortBy={sortBy}
              onSortChange={setSortBy}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
            />
          }
        >
          <MissionsTable
            loading={loading || tableBusy}
            rows={filteredRows}
            selectedIds={selectedIds}
            selectedMissionId={selectedMissionId}
            sortBy={sortBy}
            onSortChange={setSortBy}
            deviceConnected={canReadLiveDeviceMissions}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onClearSelection={() => setSelectedIds([])}
            onOpenAnalyticsForSelected={() => {
              const analyzableIds = filteredRows
                .filter((m) => selectedIds.includes(m.mission_id))
                .filter((m) => m.in_db)
                .map((m) => m.mission_id);

              if (!analyzableIds.length) return;
              navigate(`/analytics?missionIds=${analyzableIds.join(",")}`);
            }}
            onOpenDetails={handleOpenDetails}
            onOpenHeatmap={(m) =>
              navigate(`/heatmap?missionId=${m.mission_id}`)
            }
            onOpenAnalytics={(m) =>
              navigate(`/analytics?missionId=${m.mission_id}`)
            }
            onRename={handleRename}
            onDelete={handleDeleteRequest}
            onImport={handleImportMission}
            onImportNew={handleImportNew}
            onImportSelected={handleImportSelected}
            activeTab={activeTab}
          />
        </MissionsTablePanel>
      </div>

      <DeleteMissionModal
        open={deleteModalOpen}
        mission={missionToDelete}
        deviceConnected={canReadLiveDeviceMissions}
        busy={tableBusy}
        onClose={() => {
          if (tableBusy) return;
          setDeleteModalOpen(false);
          setMissionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
