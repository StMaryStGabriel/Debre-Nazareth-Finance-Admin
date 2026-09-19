// =====================================================
// pages/FinanceLogin.jsx
// St. Mary & St. Gabriel Finance Administration Login
// =====================================================

import { useEffect, useRef, useState } from "react";

import { useNavigate, Link } from "react-router-dom";

import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiEyeOff,
  FiKey,
  FiLogIn,
  FiMail,
  FiRefreshCw,
  FiShield,
  FiUserPlus,
} from "react-icons/fi";

import api from "../services/api";

import styles from "../styles/login.module.css";

import logo from "../assets/images/logo.jpg";

import bg from "../assets/images/bg.jpg";

export default function FinanceLogin() {
  // ===================================================
  // LOGIN STATE
  // ===================================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  // ===================================================
  // VERIFICATION STATE
  // ===================================================

  const [verificationCode, setVerificationCode] = useState("");
  const [verificationStep, setVerificationStep] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  // ===================================================
  // GENERAL STATE
  // ===================================================

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();

  const verificationInputRef = useRef(null);

  // ===================================================
  // MASK EMAIL
  // ===================================================

  const maskEmail = (value) => {
    if (!value) return "";

    const parts = value.split("@");

    if (parts.length !== 2) {
      return value;
    }

    const username = parts[0];
    const domain = parts[1];

    if (username.length <= 2) {
      return `${username.charAt(0)}***@${domain}`;
    }

    const firstCharacter = username.charAt(0);
    const lastCharacter = username.charAt(username.length - 1);

    return `${firstCharacter}***${lastCharacter}@${domain}`;
  };

  // ===================================================
  // START RESEND COUNTDOWN
  // ===================================================

  const startResendCountdown = () => {
    setResendCountdown(60);
    setCanResend(false);
  };

  // ===================================================
  // RESEND COUNTDOWN TIMER
  // ===================================================

  useEffect(() => {
    if (!verificationStep) {
      return undefined;
    }

    if (resendCountdown <= 0) {
      setCanResend(true);
      return undefined;
    }

    const timer = setTimeout(() => {
      setResendCountdown((previous) => previous - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [verificationStep, resendCountdown]);

  // ===================================================
  // FOCUS VERIFICATION INPUT
  // ===================================================

  useEffect(() => {
    if (!verificationStep) {
      return undefined;
    }

    const timer = setTimeout(() => {
      verificationInputRef.current?.focus();
    }, 150);

    return () => clearTimeout(timer);
  }, [verificationStep]);

  // ===================================================
  // CLEAR FINANCE ADMIN SESSION
  // IMPORTANT:
  // Only Finance-specific keys are cleared.
  // Main Admin localStorage is NOT touched.
  // ===================================================

  const clearFinanceAdminSession = () => {
    localStorage.removeItem("financeAdminToken");
    localStorage.removeItem("financeAdminName");
    localStorage.removeItem("financeAdminEmail");
    localStorage.removeItem("financeAdminId");
    localStorage.removeItem("financeAdminRole");
    localStorage.removeItem("financeAdminExpiry");
  };

  // ===================================================
  // SAVE FINANCE ADMIN SESSION
  // IMPORTANT:
  // Finance now has completely separate localStorage keys.
  // ===================================================

  const saveFinanceAdminSession = (data) => {
    clearFinanceAdminSession();

    localStorage.setItem("financeAdminToken", data.token);
    localStorage.setItem("financeAdminName", data.name || "");
    localStorage.setItem("financeAdminEmail", data.email || "");
    localStorage.setItem("financeAdminId", data._id);
    localStorage.setItem("financeAdminRole", data.role || "finance");

    localStorage.setItem(
      "financeAdminExpiry",
      remember
        ? Date.now() + 7 * 24 * 60 * 60 * 1000
        : Date.now() + 24 * 60 * 60 * 1000,
    );
  };

  // ===================================================
  // LOGIN - STEP 1
  // ===================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Please enter your finance administrator email and password.");

      return;
    }

    try {
      setLoading(true);

      // ==============================================
      // FINANCE ADMIN LOGIN
      // ==============================================

      const res = await api.post("/finance-auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      // ==============================================
      // EMAIL VERIFICATION FLOW
      // ==============================================

      if (res.data?.requiresVerification && res.data?.adminId) {
        setAdminId(res.data.adminId);

        const returnedEmail = res.data.email || email.trim().toLowerCase();

        setVerificationEmail(returnedEmail);
        setVerificationCode("");
        setAttemptsRemaining(null);

        setMessage(
          res.data.message ||
            "A verification code has been sent to your email.",
        );

        setVerificationStep(true);

        startResendCountdown();

        return;
      }

      // ==============================================
      // SAFETY CHECK
      // ==============================================

      if (!res.data?.token) {
        setError("No authentication token received.");

        return;
      }

      // ==============================================
      // NORMAL LOGIN FALLBACK
      // ==============================================

      saveFinanceAdminSession(res.data);

      // App.jsx uses BrowserRouter basename="/finance".
      // Therefore this must be /admin/dashboard.
      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Finance admin login error:", err);

      setError(
        err.response?.data?.message ||
          "Invalid finance administrator email or password.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // VERIFICATION CODE INPUT
  // ===================================================

  const handleVerificationCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);

    setVerificationCode(value);

    if (error) {
      setError("");
    }
  };

  // ===================================================
  // VERIFY CODE - STEP 2
  // ===================================================

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Please enter the 6-digit verification code.");

      verificationInputRef.current?.focus();

      return;
    }

    if (!adminId) {
      setError(
        "Your verification session is no longer available. Please log in again.",
      );

      return;
    }

    try {
      setLoading(true);

      // ==============================================
      // FINANCE ADMIN CODE VERIFICATION
      // ==============================================

      const res = await api.post("/finance-auth/verify-login", {
        adminId,
        code: verificationCode,
      });

      if (!res.data?.token) {
        setError(
          "Verification succeeded, but no authentication token was received.",
        );

        return;
      }

      // ==============================================
      // SAVE FINANCE ADMIN SESSION
      // ==============================================

      saveFinanceAdminSession(res.data);

      // ==============================================
      // CLEAR VERIFICATION STATE
      // ==============================================

      setVerificationCode("");
      setAdminId("");
      setVerificationEmail("");
      setVerificationStep(false);
      setAttemptsRemaining(null);

      // ==============================================
      // GO TO FINANCE DASHBOARD
      // ==============================================

      // BrowserRouter uses basename="/finance".
      //
      // This:
      // navigate("/admin/dashboard")
      //
      // becomes:
      // /finance/admin/dashboard
      //
      // DO NOT use:
      // navigate("/finance/dashboard")
      // ==============================================

      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Finance admin verification error:", err);

      const responseData = err.response?.data;

      setError(
        responseData?.message ||
          "The verification code is incorrect or has expired.",
      );

      if (typeof responseData?.attemptsRemaining === "number") {
        setAttemptsRemaining(responseData.attemptsRemaining);
      }

      setVerificationCode("");

      setTimeout(() => {
        verificationInputRef.current?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // RESEND VERIFICATION CODE
  // ===================================================

  const handleResendCode = async () => {
    if (!canResend || resending || !adminId) {
      return;
    }

    setError("");
    setMessage("");

    try {
      setResending(true);

      const res = await api.post("/finance-auth/resend-login-code", {
        adminId,
      });

      setVerificationCode("");
      setAttemptsRemaining(null);

      setMessage(
        res.data?.message ||
          "A new verification code has been sent to your email.",
      );

      startResendCountdown();

      setTimeout(() => {
        verificationInputRef.current?.focus();
      }, 150);
    } catch (err) {
      console.error("Finance resend verification code error:", err);

      const responseData = err.response?.data;

      setError(
        responseData?.message || "Unable to send a new verification code.",
      );

      if (typeof responseData?.retryAfterSeconds === "number") {
        setResendCountdown(responseData.retryAfterSeconds);

        setCanResend(false);
      }
    } finally {
      setResending(false);
    }
  };

  // ===================================================
  // RETURN TO PASSWORD LOGIN
  // ===================================================

  const handleBackToLogin = () => {
    setVerificationStep(false);
    setVerificationCode("");
    setAdminId("");
    setVerificationEmail("");
    setAttemptsRemaining(null);
    setError("");
    setMessage("");
    setResendCountdown(60);
    setCanResend(false);
  };

  // ===================================================
  // VERIFICATION SCREEN
  // ===================================================

  if (verificationStep) {
    return (
      <div
        className={styles.container}
        style={{
          backgroundImage: `url(${bg})`,
        }}
      >
        <div className={styles.overlay} />

        <div className={`${styles.card} ${styles.verificationCard}`}>
          {/* BRAND */}

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

          {/* VERIFICATION HEADER */}

          <div className={styles.verificationHeader}>
            <div className={styles.verificationIcon}>
              <FiMail />
            </div>

            <div>
              <h3>Verify Your Finance Login</h3>

              <p>We sent a 6-digit confirmation code to your email.</p>
            </div>
          </div>

          {/* EMAIL */}

          <div className={styles.emailNotice}>
            <FiMail />

            <span>{maskEmail(verificationEmail)}</span>
          </div>

          {/* ERROR */}

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          {/* SUCCESS MESSAGE */}

          {message && !error && (
            <div className={styles.success} role="status">
              <FiCheckCircle />

              <span>{message}</span>
            </div>
          )}

          {/* VERIFICATION FORM */}

          <form className={styles.verificationForm} onSubmit={handleVerifyCode}>
            <div className={styles.verificationInputGroup}>
              <label htmlFor="finance-verification-code">
                Confirmation Code
              </label>

              <div className={styles.verificationInputWrapper}>
                <FiKey />

                <input
                  ref={verificationInputRef}
                  id="finance-verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={handleVerificationCodeChange}
                  aria-label="6-digit finance verification code"
                  disabled={loading}
                />
              </div>

              <div className={styles.codeHint}>
                Enter the 6-digit code from your email.
              </div>
            </div>

            {/* ATTEMPTS REMAINING */}

            {typeof attemptsRemaining === "number" && (
              <div className={styles.attemptsNotice}>
                <FiShield />

                <span>
                  {attemptsRemaining} attempt
                  {attemptsRemaining === 1 ? "" : "s"} remaining
                </span>
              </div>
            )}

            {/* VERIFY BUTTON */}

            <button
              className={styles.loginBtn}
              disabled={loading || verificationCode.length !== 6}
              type="submit"
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Verifying...
                </>
              ) : (
                <>
                  <FiCheckCircle />
                  Verify & Continue
                </>
              )}
            </button>
          </form>

          {/* RESEND */}

          <div className={styles.resendSection}>
            <span>Didn't receive the code?</span>

            {canResend ? (
              <button
                type="button"
                className={styles.resendBtn}
                onClick={handleResendCode}
                disabled={resending}
              >
                {resending ? (
                  <>
                    <span className={styles.smallSpinner} />
                    Sending...
                  </>
                ) : (
                  <>
                    <FiRefreshCw />
                    Resend Code
                  </>
                )}
              </button>
            ) : (
              <span className={styles.resendTimer}>
                <FiClock />
                Resend in <strong>{resendCountdown}s</strong>
              </span>
            )}
          </div>

          {/* BACK */}

          <button
            type="button"
            className={styles.backBtn}
            onClick={handleBackToLogin}
          >
            <FiArrowLeft />
            Back to login
          </button>

          {/* SECURITY */}

          <div className={styles.security}>
            <FiShield />

            <span>Secure Finance Administrator Verification</span>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // NORMAL FINANCE LOGIN SCREEN
  // ===================================================

  return (
    <div
      className={styles.container}
      style={{
        backgroundImage: `url(${bg})`,
      }}
    >
      <div className={styles.overlay} />

      <div className={styles.card}>
        {/* BRAND */}

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

        {/* ERROR */}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* EMAIL */}

          <div className={styles.inputGroup}>
            <label htmlFor="finance-admin-email">
              Finance Admin Email Address
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
              disabled={loading}
              required
            />
          </div>

          {/* PASSWORD */}

          <div className={styles.inputGroup}>
            <label htmlFor="finance-admin-password">Password</label>

            <div className={styles.passwordBox}>
              <input
                id="finance-admin-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter finance admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                required
              />

              <button
                type="button"
                className={styles.eye}
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {/* REMEMBER ME */}

          <div className={styles.options}>
            <label className={styles.rememberLabel}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />

              <span>Remember me</span>
            </label>
          </div>

          {/* LOGIN BUTTON */}

          <button className={styles.loginBtn} disabled={loading} type="submit">
            {loading ? (
              <>
                <span className={styles.spinner} />
                Sending code...
              </>
            ) : (
              <>
                <FiLogIn />
                Continue to Finance Login
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

            <span>Finance Administrator Access Only</span>
          </div>
        </form>
      </div>
    </div>
  );
}
