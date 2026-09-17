import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  FiEye,
  FiEyeOff,
  FiUserPlus,
  FiShield,
  FiMail,
  FiLock,
  FiKey,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";

import api from "../services/api";

import styles from "../styles/createAdmin.module.css";

import logo from "../assets/images/logo.jpg";
import bg from "../assets/images/bg.jpg";

export default function CreateAdmin() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password || !secret) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);

      // ==========================================
      // FINANCE ADMIN CREATION
      // ==========================================

      const res = await api.post("/finance-auth/create-admin", {
        name: trimmedName,
        email: normalizedEmail,
        password,
        adminSecret: secret,
      });

      setMessage(
        res.data?.message || "Finance administrator created successfully.",
      );

      // ==========================================
      // CLEAR FORM AFTER SUCCESS
      // ==========================================

      setName("");
      setEmail("");
      setPassword("");
      setSecret("");
      setShowPassword(false);

      // ==========================================
      // RETURN TO FINANCE LOGIN
      // ==========================================

      setTimeout(() => {
        navigate("/finance/login");
      }, 2000);
    } catch (err) {
      console.error("Create finance admin error:", err);

      setError(
        err.response?.data?.message ||
          "Finance administrator creation failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.container}
      style={{
        backgroundImage: `url(${bg})`,
      }}
    >
      {/* ==========================================
          BACKGROUND LAYERS
      ========================================== */}

      <div className={styles.overlay} />

      <div className={styles.backgroundGlow} />

      {/* ==========================================
          TOP BRAND BAR
      ========================================== */}

      <div className={styles.topBrand}>
        <div className={styles.topBrandInner}>
          <img
            src={logo}
            alt="St Mary & St Gabriel Church"
            className={styles.topLogo}
          />

          <div>
            <strong>St Mary & St Gabriel</strong>
            <span>Finance Administration</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          MAIN CONTENT
      ========================================== */}

      <main className={styles.pageContent}>
        {/* ==========================================
            CREATE FINANCE ADMIN CARD
        ========================================== */}

        <section className={styles.card} aria-labelledby="create-admin-title">
          {/* ==========================================
              CARD TOP ACCENT
          ========================================== */}

          <div className={styles.cardAccent} />

          {/* ==========================================
              BRAND
          ========================================== */}

          <div className={styles.brand}>
            <div className={styles.logoWrapper}>
              <div className={styles.logoRing}>
                <img src={logo} className={styles.logo} alt="Church Logo" />
              </div>

              <span className={styles.logoBadge}>
                <FiShield />
              </span>
            </div>

            <div className={styles.eyebrow}>
              <span className={styles.eyebrowLine} />
              SECURE FINANCE ADMINISTRATION
              <span className={styles.eyebrowLine} />
            </div>

            <h1 id="create-admin-title">Create Finance Administrator</h1>

            <p>
              Set up a finance administrator account for St Mary & St Gabriel
              Ethiopian Orthodox Tewahedo Church.
            </p>

            <div className={styles.access}>
              <FiShield />
              <span>Finance Administration Access</span>
            </div>
          </div>

          {/* ==========================================
              SECURITY NOTICE
          ========================================== */}

          <div className={styles.notice}>
            <div className={styles.noticeIcon}>
              <FiShield />
            </div>

            <div className={styles.noticeContent}>
              <strong>Protected finance administrator account</strong>

              <span>
                Use a secure email address and password that only authorized
                finance administrators can access.
              </span>
            </div>
          </div>

          {/* ==========================================
              ERROR MESSAGE
          ========================================== */}

          {error && (
            <div
              className={`${styles.alert} ${styles.error}`}
              role="alert"
              aria-live="assertive"
            >
              <FiAlertCircle className={styles.alertIcon} />

              <div>
                <strong>Unable to create finance administrator</strong>

                <span>{error}</span>
              </div>
            </div>
          )}

          {/* ==========================================
              SUCCESS MESSAGE
          ========================================== */}

          {message && (
            <div
              className={`${styles.alert} ${styles.success}`}
              role="status"
              aria-live="polite"
            >
              <FiCheckCircle className={styles.alertIcon} />

              <div>
                <strong>Finance administrator created</strong>

                <span>{message}</span>
              </div>
            </div>
          )}

          {/* ==========================================
              CREATE FINANCE ADMIN FORM
          ========================================== */}

          <form
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate={false}
          >
            {/* ==========================================
                FINANCE ADMIN NAME
            ========================================== */}

            <div className={styles.group}>
              <label htmlFor="finance-admin-name">
                <span className={styles.labelIcon}>
                  <FiUserPlus />
                </span>

                <span>Finance Admin Name</span>
              </label>

              <div className={styles.inputWrapper}>
                <input
                  id="finance-admin-name"
                  type="text"
                  placeholder="Enter finance administrator name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                  }}
                  autoComplete="name"
                  autoCapitalize="words"
                  spellCheck={false}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* ==========================================
                FINANCE ADMIN EMAIL
            ========================================== */}

            <div className={styles.group}>
              <label htmlFor="finance-admin-email">
                <span className={styles.labelIcon}>
                  <FiMail />
                </span>

                <span>Finance Admin Email</span>
              </label>

              <div className={styles.inputWrapper}>
                <input
                  id="finance-admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  disabled={loading}
                />
              </div>

              <small>
                This email will be used for secure finance administrator login
                verification.
              </small>
            </div>

            {/* ==========================================
                FINANCE ADMIN PASSWORD
            ========================================== */}

            <div className={styles.group}>
              <label htmlFor="finance-admin-password">
                <span className={styles.labelIcon}>
                  <FiLock />
                </span>

                <span>Finance Admin Password</span>
              </label>

              <div className={styles.password}>
                <input
                  id="finance-admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className={styles.passwordToggle}
                  disabled={loading}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <small>
                Use at least 6 characters and avoid easily guessed information.
              </small>
            </div>

            {/* ==========================================
                FINANCE ADMIN SECRET KEY
            ========================================== */}

            <div className={styles.group}>
              <label htmlFor="finance-admin-secret">
                <span className={styles.labelIcon}>
                  <FiKey />
                </span>

                <span>Finance Admin Secret Key</span>
              </label>

              <div className={styles.inputWrapper}>
                <input
                  id="finance-admin-secret"
                  type="password"
                  placeholder="Enter the finance admin secret"
                  value={secret}
                  onChange={(e) => {
                    setSecret(e.target.value);
                    if (error) setError("");
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  required
                  disabled={loading}
                />
              </div>

              <small>
                Required to authorize creation of a finance administrator.
              </small>
            </div>

            {/* ==========================================
                CREATE BUTTON
            ========================================== */}

            <button
              type="submit"
              className={styles.createBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <FiLoader className={styles.spinner} />
                  <span>Creating Finance Administrator...</span>
                </>
              ) : (
                <>
                  <FiUserPlus />
                  <span>Create Finance Administrator</span>
                </>
              )}
            </button>

            {/* ==========================================
                BACK TO FINANCE LOGIN
            ========================================== */}

            <Link
              to="/finance/login"
              className={styles.back}
              onClick={(e) => {
                if (loading) e.preventDefault();
              }}
            >
              <FiArrowLeft />

              <span>Already have an account? Finance Admin Login</span>
            </Link>

            {/* ==========================================
                SECURITY FOOTER
            ========================================== */}

            <div className={styles.security}>
              <FiShield />

              <span>Finance Administrator Access Only</span>

              <span className={styles.securityDot} />

              <span>Secure</span>
            </div>
          </form>
        </section>

        {/* ==========================================
            PAGE FOOTER
        ========================================== */}

        <footer className={styles.footer}>
          <span>
            © {new Date().getFullYear()} St Mary & St Gabriel Ethiopian Orthodox
            Tewahedo Church
          </span>

          <span className={styles.footerDivider}>•</span>

          <span>Finance Administration Portal</span>
        </footer>
      </main>
    </div>
  );
}
