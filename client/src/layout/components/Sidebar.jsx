import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { FiGrid, FiMap, FiList, FiBarChart2, FiRadio } from "react-icons/fi";
import droneLogo from "../../assets/drone.png";
import styles from "../AppShell.module.css";

function getDashboardRoute(profileType) {
  switch (profileType) {
    case "car":
      return "/dashboard-car";
    default:
      return "/dashboard";
  }
}

export default function Sidebar({ selectedProfileType = "drone" }) {
  const navItems = useMemo(
    () => [
      { to: getDashboardRoute(selectedProfileType), label: "Dashboard", Icon: FiGrid },
      { to: "/mission-control", label: "Mission Control", Icon: FiRadio },
      { to: "/heatmap", label: "HeatMap", Icon: FiMap },
      { to: "/missions", label: "Missions", Icon: FiList },
      { to: "/analytics", label: "Analytics", Icon: FiBarChart2 },
    ],
    [selectedProfileType],
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <img src={droneLogo} alt="EnvMon logo" className={styles.logoImg} />
        </div>
        <div>
          <div className={styles.brandName}>EnvMon</div>
          <div className={styles.brandSub}>Ground Station</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={`${label}-${to}`}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ""}`
            }
          >
            <Icon className={styles.icon} />
            <span className={styles.navLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
