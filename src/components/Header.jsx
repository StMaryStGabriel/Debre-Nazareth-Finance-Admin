import { FiMenu, FiBell } from "react-icons/fi";
import styles from "../styles/layout.module.css";

export default function Header({ toggleSidebar, title }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button onClick={toggleSidebar} className={styles.menuButton}>
          <FiMenu size={22} />
        </button>

        <div>
          {/* TOP SMALL TITLE */}
          <p
            style={{
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "var(--primary)",
              marginBottom: "2px",
            }}
          >
            St Mary St Gabriel Ethiopia Orthodox Tewahedo Church
          </p>

          {/* PAGE TITLE */}
          <h1 className={styles.title}>{title || "Dashboard"}</h1>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.notification}>
          <FiBell size={20} />
          <span className={styles.badge}></span>
        </div>
      </div>
    </header>
  );
}
