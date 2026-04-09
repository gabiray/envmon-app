import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./layout/AppShell";
import Dashboard from "./pages/Dashboard";
import HeatMap from "./pages/HeatMap";
import Missions from "./pages/Missions";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import MissionControl from "./pages/MissionControl";

export default function App() {
  return (
    <Routes>
      {/* Layout route */}
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/heatmap" element={<HeatMap />} />
        <Route path="/missions" element={<Missions />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/mission-control" element={<MissionControl />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
