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

    if (!name || !email || !password || !secret) {
      setError("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      // ==========================================
      // FINANCE ADMIN CREATION
      // ==========================================

      const res = await api.post("/finance-auth/create-admin", {
        name,
        email,
        password,
        adminSecret: secret,
      });

      setMessage(
        res.data?.message || "Finance administrator created successfully",
      );

      setName("");
      setEmail("");
      setPassword("");
      setSecret("");

      setTimeout(() => {
        navigate("/admin/login");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Finance administrator creation failed",
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
          BACKGROUND OVERLAY
      ========================================== */}

      <div className={styles.overlay} />

      {/* ==========================================
          CREATE ADMIN CARD
      ========================================== */}

      <div className={styles.card}>
        {/* ==========================================
            BRAND
        ========================================== */}

        <div className={styles.brand}>
          <img src={logo} className={styles.logo} alt="Church Logo" />

          <h1>⛪ Create Finance Administrator</h1>

          <p>St Mary St Gabriel Ethiopian Orthodox Tewahedo Church</p>

          <span className={styles.access}>Finance Administration Access</span>
        </div>

        {/* ==========================================
            ERROR MESSAGE
        ========================================== */}

        {error && (
          <div className={styles.error} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {/* ==========================================
            SUCCESS MESSAGE
        ========================================== */}

        {message && (
          <div className={styles.success} role="status" aria-live="polite">
            {message}
          </div>
        )}

        {/* ==========================================
            FORM
        ========================================== */}

        <form
          onSubmit={handleSubmit}
          className={styles.form}
          noValidate={false}
        >
          {/* ==========================================
              FINANCE ADMIN NAME
          ========================================== */}

          <div className={styles.group}>
            <label htmlFor="finance-admin-name">Finance Admin Name</label>

            <input
              id="finance-admin-name"
              type="text"
              placeholder="Enter finance admin name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          {/* ==========================================
              FINANCE ADMIN EMAIL
          ========================================== */}

          <div className={styles.group}>
            <label htmlFor="finance-admin-email">
              <FiMail />
              <span>Finance Admin Email</span>
            </label>

            <input
              id="finance-admin-email"
              type="email"
              placeholder="Enter finance admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          {/* ==========================================
              FINANCE ADMIN PASSWORD
          ========================================== */}

          <div className={styles.group}>
            <label htmlFor="finance-admin-password">
              <FiLock />
              <span>Finance Admin Password</span>
            </label>

            <div className={styles.password}>
              <input
                id="finance-admin-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {/* ==========================================
              FINANCE ADMIN SECRET KEY
          ========================================== */}

          <div className={styles.group}>
            <label htmlFor="finance-admin-secret">
              <FiKey />
              <span>Finance Admin Secret Key</span>
            </label>

            <input
              id="finance-admin-secret"
              type="password"
              placeholder="Enter finance admin secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
              required
            />

            <small>
              Required for creating authorized finance administrators.
            </small>
          </div>

          {/* ==========================================
              CREATE BUTTON
          ========================================== */}

          <button type="submit" className={styles.createBtn} disabled={loading}>
            <FiUserPlus />

            {loading
              ? "Creating Finance Admin..."
              : "Create Finance Administrator"}
          </button>

          {/* ==========================================
              BACK TO LOGIN
          ========================================== */}

          <Link to="/admin/login" className={styles.back}>
            Already have an account? Login
          </Link>

          {/* ==========================================
              SECURITY
          ========================================== */}

          <div className={styles.security}>
            <FiShield />
            <span>Finance Administrator Access Only</span>
          </div>
        </form>
      </div>
    </div>
  );
}
