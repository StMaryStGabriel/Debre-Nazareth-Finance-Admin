import { NavLink } from "react-router-dom";

import styles from "../styles/layout.module.css";

import {
  FiHome,
  FiBook,
  FiUsers,
  FiImage,
  FiCalendar,
  FiLogOut,
  FiX,
  FiDollarSign,
  FiBell,
  FiCreditCard,
  FiUserX,
  FiMessageSquare,
  FiMail,
} from "react-icons/fi";

import logo from "../assets/images/logo.jpg";

export default function Sidebar({ isOpen, toggleSidebar }) {
  // ==========================================
  // GET ADMIN INFORMATION
  // ==========================================

  const getAdminInfo = () => {
    let name = "";

    let email = "";

    // ------------------------------------------
    // Check individual localStorage values
    // ------------------------------------------

    name =
      localStorage.getItem("adminName") ||
      localStorage.getItem("admin_name") ||
      "";

    email =
      localStorage.getItem("adminEmail") ||
      localStorage.getItem("admin_email") ||
      "";

    // ------------------------------------------
    // Check possible stored admin objects
    // ------------------------------------------

    const possibleAdminKeys = [
      "admin",
      "adminUser",
      "adminData",
      "currentAdmin",
      "user",
    ];

    for (const key of possibleAdminKeys) {
      if (name && email) {
        break;
      }

      try {
        const storedAdmin = localStorage.getItem(key);

        if (!storedAdmin) {
          continue;
        }

        const parsedAdmin = JSON.parse(storedAdmin);

        if (parsedAdmin && typeof parsedAdmin === "object") {
          name =
            name ||
            parsedAdmin.name ||
            parsedAdmin.fullName ||
            parsedAdmin.adminName ||
            "";

          email = email || parsedAdmin.email || parsedAdmin.adminEmail || "";
        }
      } catch {
        // Ignore invalid localStorage data
      }
    }

    // ------------------------------------------
    // Final fallback
    // ------------------------------------------

    return {
      name: name || "Administrator",
      email: email || "Admin account",
    };
  };

  const admin = getAdminInfo();

  // ==========================================
  // CREATE AVATAR INITIALS
  // ==========================================

  const getInitials = (name) => {
    if (!name) {
      return "A";
    }

    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return (
      words[0].charAt(0) + words[words.length - 1].charAt(0)
    ).toUpperCase();
  };

  const adminInitials = getInitials(admin.name);

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminExpiry");

    window.location.href = "/admin/login";
  };

  // ==========================================
  // CLOSE MOBILE SIDEBAR AFTER CLICK
  // ==========================================

  const handleNavigation = () => {
    if (isOpen) {
      toggleSidebar();
    }
  };

  // ==========================================
  // NAV LINK CLASS
  // ==========================================

  const navClass = ({ isActive }) => {
    return isActive ? styles.active : "";
  };

  return (
    <>
      {/* ==========================================
          MOBILE OVERLAY
      ========================================== */}

      {isOpen && (
        <div
          className={styles.overlay}
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* ==========================================
          SIDEBAR
      ========================================== */}

      <aside
        className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}
        aria-label="Finance administrator navigation"
      >
        {/* ==========================================
            MOBILE CLOSE BUTTON
        ========================================== */}

        <button
          type="button"
          className={styles.closeBtn}
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        >
          <FiX size={22} />
        </button>

        {/* ==========================================
            LOGO SECTION
        ========================================== */}

        <div className={styles.sidebarLogoBox}>
          <img
            src={logo}
            alt="St Mary St Gabriel Ethiopian Orthodox Tewahedo Church"
            className={styles.sidebarLogo}
          />

          <h2 className={styles.sidebarBrand}>St Mary St Gabriel</h2>

          <p className={styles.sidebarSubtitle}>
            Ethiopian Orthodox Tewahedo Church
          </p>
        </div>

        {/* ==========================================
            NAVIGATION
        ========================================== */}

        <nav
          className={styles.nav}
          aria-label="Finance administrator navigation"
        >
          {/* DASHBOARD */}

          <NavLink
            to="/admin/dashboard"
            className={navClass}
            onClick={handleNavigation}
          >
            <FiHome />

            <span>Dashboard</span>
          </NavLink>

          {/* DONATIONS */}

          <NavLink
            to="/admin/donate"
            className={navClass}
            onClick={handleNavigation}
          >
            <FiDollarSign />

            <span>Donations</span>
          </NavLink>

          {/* MONTHLY PAYMENT */}

          <NavLink
            to="/admin/monthly-payment"
            className={navClass}
            onClick={handleNavigation}
          >
            <FiCreditCard />

            <span>Monthly Payment</span>
          </NavLink>
          <NavLink
            to="/admin/expenses"
            className={navClass}
            onClick={handleNavigation}
          >
            <FiFileText />
            <span>Expenses</span>
          </NavLink>

          {/* EVENTS MANAGEMENT */}

          <NavLink
            to="/admin/events"
            className={navClass}
            onClick={handleNavigation}
          >
            <FiCalendar />

            <span>Events</span>
          </NavLink>

          {/* ANNOUNCEMENTS */}

          <NavLink
            to="/admin/announcements"
            className={navClass}
            onClick={handleNavigation}
          >
            <FiBell />

            <span>Announcements</span>
          </NavLink>
        </nav>

        {/* ==========================================
            FINANCE ADMIN PROFILE
            ABOVE LOGOUT
        ========================================== */}

        <div
          className={styles.adminProfile}
          aria-label="Current finance administrator"
        >
          {/* Avatar */}

          <div className={styles.adminAvatar}>
            <span>{adminInitials}</span>

            <span className={styles.adminOnlineDot} aria-hidden="true" />
          </div>

          {/* Admin information */}

          <div className={styles.adminProfileInfo}>
            <div className={styles.adminProfileName}>{admin.name}</div>

            <div className={styles.adminProfileEmail}>
              <FiMail size={12} />

              <span>{admin.email}</span>
            </div>
          </div>
        </div>

        {/* ==========================================
            LOGOUT BUTTON
        ========================================== */}

        <button type="button" className={styles.logout} onClick={handleLogout}>
          <FiLogOut />

          <span>Logout</span>
        </button>
      </aside>
    </>
  );
}
