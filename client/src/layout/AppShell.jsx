import React, { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

const ROUTE_META = [
  { path: "/dashboard", title: "Dashboard" },
  { path: "/heatmap", title: "HeatMap" },
  { path: "/missions", title: "Missions" },
  { path: "/analytics", title: "Analytics" },
];

export default function AppShell() {
  const location = useLocation();

  const pageTitle = useMemo(() => {
    const found = ROUTE_META.find((r) => location.pathname.startsWith(r.path));
    return found?.title || "EnvMon";
  }, [location.pathname]);

  // UI-only mock
  const [selectedDeviceId, setSelectedDeviceId] = useState("d1");
  const devices = [
    { id: "d1", label: "Drona 1 (…adf)" },
    { id: "d2", label: "Drona 2 (…b12)" },
  ];

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <div className="drawer lg:drawer-open">
        <input id="envmon-drawer" type="checkbox" className="drawer-toggle" />

        <div className="drawer-content flex flex-col min-h-screen">
          <Topbar
            pageTitle={pageTitle}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onDeviceChange={setSelectedDeviceId}
            onScan={() => console.log("scan")}
            isScanning={false}
          />

          <main className="px-4 py-6">
            <Outlet />
          </main>
        </div>

        <div className="drawer-side">
          <label htmlFor="envmon-drawer" className="drawer-overlay" />
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
