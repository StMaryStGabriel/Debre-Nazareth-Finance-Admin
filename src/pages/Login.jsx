import { useState } from "react";

import { useNavigate, Link } from "react-router-dom";

import { FiEye, FiEyeOff, FiLogIn, FiUserPlus, FiShield } from "react-icons/fi";

import api from "../services/api";

import styles from "../styles/login.module.css";

import logo from "../assets/images/logo.jpg";
import bg from "../assets/images/bg.jpg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      // ==========================================
      // FINANCE ADMIN LOGIN
      // ==========================================

      const res = await api.post("/main-auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      // ==========================================
      // CHECK TOKEN
      // ==========================================

      if (!res.data?.token) {
        setError("No authentication token received");
        return;
      }

      // ==========================================
      // CLEAR ANY PREVIOUS ADMIN SESSION
      // ==========================================

      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminName");
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminId");
      localStorage.removeItem("adminRole");
      localStorage.removeItem("adminExpiry");

      // ==========================================
      // SAVE FINANCE ADMIN SESSION
      // ==========================================

      localStorage.setItem("adminToken", res.data.token);

      // Save admin name for the sidebar profile
      localStorage.setItem("adminName", res.data.name || "");

      localStorage.setItem("adminEmail", res.data.email || "");

      localStorage.setItem("adminId", res.data._id);

      // Backend returns role: "main"
      // Keeping this unchanged so existing
      // authentication and authorization logic works.
      localStorage.setItem("adminRole", res.data.role || "main");

      // ==========================================
      // SESSION EXPIRY
      // ==========================================

      localStorage.setItem(
        "adminExpiry",
        remember
          ? Date.now() + 7 * 24 * 60 * 60 * 1000
          : Date.now() + 24 * 60 * 60 * 1000,
      );

      // ==========================================
      // GO TO FINANCE ADMIN DASHBOARD
      // ==========================================

      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Finance admin login error:", err);

      setError(
        err.response?.data?.message ||
          "Invalid finance administrator email or password",
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
      <div className={styles.overlay} />

      <div className={styles.card}>
        {/* ==========================================
            BRAND
        ========================================== */}

        <div className={styles.brand}>
          <img
            src={logo}
            alt="St Mary St Gabriel Church"
            className={styles.logo}
          />

          <h1>
            <span>⛪ St Mary St Gabriel</span>
          </h1>

          <h2>Ethiopian Orthodox Tewahedo Church</h2>

          <p>Finance Administration Portal</p>
        </div>

        {/* ==========================================
            ERROR
        ========================================== */}

        {error && <div className={styles.error}>{error}</div>}

        {/* ==========================================
            LOGIN FORM
        ========================================== */}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* EMAIL */}

          <div className={styles.inputGroup}>
            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter finance admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {/* PASSWORD */}

          <div className={styles.inputGroup}>
            <label>Password</label>

            <div className={styles.passwordBox}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter finance admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className={styles.eye}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {/* REMEMBER ME */}

          <div className={styles.options}>
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
          </div>

          {/* LOGIN BUTTON */}

          <button className={styles.loginBtn} disabled={loading} type="submit">
            {loading ? (
              "Signing in..."
            ) : (
              <>
                <FiLogIn />
                Login
              </>
            )}
          </button>

          {/* CREATE FINANCE ADMIN */}

          <Link to="/admin/create-admin" className={styles.createBtn}>
            <FiUserPlus />
            Create Finance Admin
          </Link>

          {/* SECURITY */}

          <div className={styles.security}>
            <FiShield />
            Finance Administrator Access Only
          </div>
        </form>
      </div>
    </div>
  );
}
