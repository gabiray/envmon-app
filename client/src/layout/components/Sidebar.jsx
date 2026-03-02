import React from "react";
import { NavLink } from "react-router-dom";
import { FiGrid, FiMap, FiList, FiBarChart2 } from "react-icons/fi";
import droneLogo from "../../assets/drone.png";
import styles from "../AppShell.module.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", Icon: FiGrid },
  { to: "/heatmap", label: "HeatMap", Icon: FiMap },
  { to: "/missions", label: "Missions", Icon: FiList },
  { to: "/analytics", label: "Analytics", Icon: FiBarChart2 },
];

export default function Sidebar() {
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
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
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

      <div className={styles.footer}>
        <div className={styles.user}>
          <div className={styles.avatar}>G</div>
          <div className={styles.userMeta}>
            <div className={styles.userName}>Gabriel</div>
            <div className={styles.userRole}>Operator</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
