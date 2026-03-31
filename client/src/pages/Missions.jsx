import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FiPlus } from "react-icons/fi";

import MissionsTabs from "../components/missions/MissionsTabs";
import MissionsStats from "../components/missions/MissionsStats";
import MissionsToolbar from "../components/missions/MissionsToolbar";
import MissionsTable from "../components/missions/MissionsTable";
import MissionDetailsModal from "../components/missions/MissionDetailsModal";

import {
  fetchDbSummary,
  fetchDbMissions,
  fetchDbMissionDetails,
  fetchDeviceMissions,
  deleteDbMission,
  deleteDeviceMission,
  downloadDbMissionZip,
  downloadDeviceMissionZip,
  importNewMissions,
  renameDbMission,
  renameDeviceMission,
} from "../services/missionsApi";

function getProfileLabel(profileType, profiles = []) {
  const found = profiles.find((item) => item.type === profileType);
  return found?.label || profileType || "Unknown";
}

function inferLocationLabel(mission) {
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
    source: "db",
    in_db: true,
    on_device: false,
    has_gps: Boolean(mission.has_gps),
    has_images: Boolean(mission.has_images),
    location_mode: mission.location_mode || null,
    status: mission.status || null,
    imported_at_epoch: mission.imported_at_epoch || null,
    raw: mission,
  };
}

function normalizeDeviceMission(missionId, meta = {}, activeDevice, profiles) {
  return {
    mission_id: missionId,
    mission_name: meta.mission_name || missionId,
    device_uuid: activeDevice?.device_uuid || null,
    profile_type: meta.profile_type || activeDevice?.active_profile_type || null,
    profile_label:
      meta.profile_label ||
      activeDevice?.active_profile_label ||
      getProfileLabel(
        meta.profile_type || activeDevice?.active_profile_type,
        profiles,
      ),
    location_label: inferLocationLabel(meta),
    date_epoch: getMissionDateEpoch(meta),
    source: "device",
    in_db: false,
    on_device: true,
    has_gps: Boolean(meta.has_gps),
    has_images: Boolean(meta.has_images),
    location_mode: meta.location_mode || null,
    status: meta.status || null,
    imported_at_epoch: null,
    raw: meta,
  };
}

function mergeMissionSources(dbRows, deviceRows) {
  const map = new Map();

  for (const item of dbRows) {
    map.set(item.mission_id, { ...item });
  }

  for (const item of deviceRows) {
    const existing = map.get(item.mission_id);

    if (!existing) {
      map.set(item.mission_id, { ...item });
      continue;
    }

    map.set(item.mission_id, {
      ...existing,
      on_device: true,
      source: "synced",
      profile_type: existing.profile_type || item.profile_type,
      profile_label: existing.profile_label || item.profile_label,
      location_label:
        existing.location_label && existing.location_label !== "Unknown"
          ? existing.location_label
          : item.location_label,
      has_gps: existing.has_gps || item.has_gps,
      has_images: existing.has_images || item.has_images,
    });
  }

  return Array.from(map.values());
}

export default function Missions() {
  const navigate = useNavigate();
  const { selectedDeviceId, activeDevice, profiles, devicesRaw } =
    useOutletContext();

  const [activeTab, setActiveTab] = useState("db");

  const [summary, setSummary] = useState({
    mission_count: 0,
    device_count: 0,
  });

  const [dbRows, setDbRows] = useState([]);
  const [deviceRows, setDeviceRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [tableBusy, setTableBusy] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState("all");
  const [selectedProfileFilter, setSelectedProfileFilter] = useState("all");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [selectedMissionIds, setSelectedMissionIds] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMissionDetails, setSelectedMissionDetails] = useState(null);

  const deviceTabDisabled = !activeDevice || selectedDeviceId === "none";

  useEffect(() => {
    if (deviceTabDisabled && activeTab === "device") {
      setActiveTab("db");
    }
  }, [deviceTabDisabled, activeTab]);

  async function loadPage() {
    setLoading(true);

    try {
      const [dbSummary, dbMissions] = await Promise.all([
        fetchDbSummary(),
        fetchDbMissions(),
      ]);

      setSummary({
        mission_count: dbSummary?.mission_count ?? 0,
        device_count: dbSummary?.device_count ?? 0,
      });

      setDbRows(
        (dbMissions || []).map((item) => normalizeDbMission(item, profiles)),
      );

      if (!deviceTabDisabled) {
        try {
          const deviceRes = await fetchDeviceMissions();
          const ids = Array.isArray(deviceRes?.missions) ? deviceRes.missions : [];
          const metaMap = deviceRes?.missions_meta || {};

          const normalized = ids.map((missionId) =>
            normalizeDeviceMission(
              missionId,
              metaMap?.[missionId] || {},
              activeDevice,
              profiles,
            ),
          );

          setDeviceRows(normalized);
        } catch {
          setDeviceRows([]);
        }
      } else {
        setDeviceRows([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  const mergedRows = useMemo(
    () => mergeMissionSources(dbRows, deviceRows),
    [dbRows, deviceRows],
  );

  const baseRows = useMemo(() => {
    if (activeTab === "device") {
      return mergedRows.filter((item) => item.on_device);
    }

    return mergedRows.filter((item) => item.in_db);
  }, [activeTab, mergedRows]);

  const locationOptions = useMemo(() => {
    return Array.from(
      new Set(
        mergedRows
          .map((item) => item.location_label)
          .filter((value) => value && value !== "Unknown"),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [mergedRows]);

  const filteredRows = useMemo(() => {
    const q = searchValue.trim().toLowerCase();

    let rows = [...baseRows];

    if (selectedDeviceFilter !== "all") {
      rows = rows.filter((item) => item.device_uuid === selectedDeviceFilter);
    }

    if (selectedProfileFilter !== "all") {
      rows = rows.filter((item) => item.profile_type === selectedProfileFilter);
    }

    if (selectedLocationFilter !== "all") {
      rows = rows.filter((item) => item.location_label === selectedLocationFilter);
    }

    if (startDate) {
      const startEpoch = new Date(`${startDate}T00:00:00`).getTime();
      rows = rows.filter(
        (item) => item.date_epoch && item.date_epoch * 1000 >= startEpoch,
      );
    }

    if (endDate) {
      const endEpoch = new Date(`${endDate}T23:59:59`).getTime();
      rows = rows.filter(
        (item) => item.date_epoch && item.date_epoch * 1000 <= endEpoch,
      );
    }

    if (q) {
      rows = rows.filter((item) => {
        return (
          String(item.mission_name).toLowerCase().includes(q) ||
          String(item.mission_id).toLowerCase().includes(q) ||
          String(item.profile_label).toLowerCase().includes(q) ||
          String(item.location_label).toLowerCase().includes(q)
        );
      });
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
    baseRows,
    searchValue,
    selectedDeviceFilter,
    selectedProfileFilter,
    selectedLocationFilter,
    startDate,
    endDate,
    sortBy,
  ]);

  const selectedMission = useMemo(() => {
    return mergedRows.find((item) => item.mission_id === selectedMissionId) || null;
  }, [mergedRows, selectedMissionId]);

  const pendingImportCount = useMemo(() => {
    return mergedRows.filter((item) => item.on_device && !item.in_db).length;
  }, [mergedRows]);

  const distinctLocationCount = useMemo(() => {
    return new Set(
      mergedRows
        .map((item) => item.location_label)
        .filter((value) => value && value !== "Unknown"),
    ).size;
  }, [mergedRows]);

  async function handleOpenDetails(mission) {
    setSelectedMissionId(mission.mission_id);
    setSelectedMissionDetails(null);
    setDetailsOpen(true);

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

  function handleToggleSelect(missionId) {
    setSelectedMissionIds((prev) =>
      prev.includes(missionId)
        ? prev.filter((item) => item !== missionId)
        : [...prev, missionId],
    );
  }

  function handleToggleSelectAll(visibleRows) {
    const visibleIds = visibleRows.map((item) => item.mission_id);

    setSelectedMissionIds((prev) => {
      const allVisibleSelected = visibleIds.every((id) => prev.includes(id));

      if (allVisibleSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...prev, ...visibleIds]));
    });
  }

  function handleClearSelection() {
    setSelectedMissionIds([]);
  }

  function handleOpenAnalyticsForSelected() {
    if (selectedMissionIds.length === 0) return;

    const params = new URLSearchParams();
    params.set("missionIds", selectedMissionIds.join(","));
    navigate(`/analytics?${params.toString()}`);
  }

  async function handleRename(mission) {
    if (!mission) return;

    const nextName = window.prompt("Rename mission", mission.mission_name || "");
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

      if (selectedMissionId === mission.mission_id && selectedMissionDetails) {
        setSelectedMissionDetails((prev) =>
          prev ? { ...prev, mission_name: trimmed } : prev,
        );
      }

      await loadPage();
    } catch (error) {
      console.error("Rename failed", error);
    } finally {
      setTableBusy(false);
    }
  }

  async function handleDownload(mission) {
    if (!mission) return;

    try {
      if (mission.in_db) {
        await downloadDbMissionZip(mission.mission_id);
        return;
      }

      if (mission.on_device) {
        await downloadDeviceMissionZip(mission.mission_id);
      }
    } catch (error) {
      console.error("Download failed", error);
    }
  }

  async function handleDelete(mission) {
    if (!mission) return;

    const confirmed = window.confirm(
      mission.source === "synced"
        ? "Delete this mission from both database and device?"
        : mission.source === "device"
          ? "Delete this mission from device?"
          : "Delete this mission from database?",
    );

    if (!confirmed) return;

    setTableBusy(true);

    try {
      if (mission.source === "synced") {
        await deleteDeviceMission(mission.mission_id);
        await deleteDbMission(mission.mission_id);
      } else if (mission.source === "device") {
        await deleteDeviceMission(mission.mission_id);
      } else {
        await deleteDbMission(mission.mission_id);
      }

      setSelectedMissionIds((prev) =>
        prev.filter((item) => item !== mission.mission_id),
      );

      if (selectedMissionId === mission.mission_id) {
        setSelectedMissionId(null);
        setSelectedMissionDetails(null);
        setDetailsOpen(false);
      }

      await loadPage();
    } catch (error) {
      console.error("Delete failed", error);
    } finally {
      setTableBusy(false);
    }
  }

  async function handleImportNew() {
    setTableBusy(true);

    try {
      await importNewMissions();
      await loadPage();
    } catch (error) {
      console.error("Import failed", error);
    } finally {
      setTableBusy(false);
    }
  }

  return (
    <>
      <div className="flex h-full flex-col gap-5">
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MissionsTabs
              activeTab={activeTab}
              onChange={setActiveTab}
              deviceDisabled={deviceTabDisabled}
            />

            <button
              type="button"
              className="btn btn-md btn-primary rounded-xl px-4"
              onClick={handleImportNew}
              disabled={tableBusy || deviceTabDisabled}
            >
              <FiPlus className="text-base" />
              Import new
            </button>
          </div>

          <MissionsStats
            summary={summary}
            pendingImportCount={pendingImportCount}
            distinctLocationCount={distinctLocationCount}
          />

          <MissionsToolbar
            devicesRaw={devicesRaw}
            profiles={profiles}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            selectedDeviceFilter={selectedDeviceFilter}
            onDeviceFilterChange={setSelectedDeviceFilter}
            selectedProfileFilter={selectedProfileFilter}
            onProfileFilterChange={setSelectedProfileFilter}
            selectedLocationFilter={selectedLocationFilter}
            onLocationFilterChange={setSelectedLocationFilter}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            locationOptions={locationOptions}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <MissionsTable
            loading={loading || tableBusy}
            rows={filteredRows}
            selectedIds={selectedMissionIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onClearSelection={handleClearSelection}
            onOpenAnalyticsForSelected={handleOpenAnalyticsForSelected}
            onOpenDetails={handleOpenDetails}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </section>
      </div>

      <MissionDetailsModal
        open={detailsOpen}
        mission={selectedMission}
        details={selectedMissionDetails}
        loading={detailsLoading}
        profiles={profiles}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedMissionDetails(null);
        }}
        onOpenHeatmap={() => {
          if (!selectedMission) return;
          navigate(`/heatmap?missionId=${selectedMission.mission_id}`);
        }}
        onOpenAnalytics={() => {
          if (!selectedMission) return;
          navigate(`/analytics?missionId=${selectedMission.mission_id}`);
        }}
        onDownload={() => handleDownload(selectedMission)}
      />
    </>
  );
}
