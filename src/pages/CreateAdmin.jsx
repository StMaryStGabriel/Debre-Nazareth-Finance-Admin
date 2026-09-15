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
      <div className={styles.card}>
        <div className={styles.brand}>
          <img src={logo} className={styles.logo} alt="Church Logo" />

          <h1>⛪ Create Finance Administrator</h1>

          <p>St Mary St Gabriel Ethiopian Orthodox Tewahedo Church</p>

          <span className={styles.access}>Finance Administration Access</span>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {message && <div className={styles.success}>{message}</div>}

        <form onSubmit={handleSubmit}>
          {/* FINANCE ADMIN NAME */}
          <div className={styles.group}>
            <label>Finance Admin Name</label>

            <input
              type="text"
              placeholder="Enter finance admin name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* FINANCE ADMIN EMAIL */}
          <div className={styles.group}>
            <label>
              <FiMail />
              Finance Admin Email
            </label>

            <input
              type="email"
              placeholder="Enter finance admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* FINANCE ADMIN PASSWORD */}
          <div className={styles.group}>
            <label>
              <FiLock />
              Finance Admin Password
            </label>

            <div className={styles.password}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {/* FINANCE ADMIN SECRET KEY */}
          <div className={styles.group}>
            <label>
              <FiKey />
              Finance Admin Secret Key
            </label>

            <input
              type="password"
              placeholder="Enter finance admin secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
            />

            <small>
              Required for creating authorized finance administrators.
            </small>
          </div>

          {/* CREATE BUTTON */}
          <button type="submit" className={styles.createBtn} disabled={loading}>
            <FiUserPlus />

            {loading
              ? "Creating Finance Admin..."
              : "Create Finance Administrator"}
          </button>

          {/* BACK TO LOGIN */}
          <Link to="/admin/login" className={styles.back}>
            Already have an account? Login
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
