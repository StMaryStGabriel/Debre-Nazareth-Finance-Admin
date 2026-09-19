import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  // ===================================================
  // FINANCE ADMIN SESSION
  // Uses Finance-specific localStorage keys.
  // ===================================================

  const token = localStorage.getItem("financeAdminToken");

  const expiry = localStorage.getItem("financeAdminExpiry");

  // ===================================================
  // NO FINANCE TOKEN
  // ===================================================

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // ===================================================
  // FINANCE SESSION EXPIRED
  // ===================================================

  if (expiry && Date.now() > Number(expiry)) {
    localStorage.removeItem("financeAdminToken");

    localStorage.removeItem("financeAdminName");

    localStorage.removeItem("financeAdminEmail");

    localStorage.removeItem("financeAdminId");

    localStorage.removeItem("financeAdminRole");

    localStorage.removeItem("financeAdminExpiry");

    return <Navigate to="/admin/login" replace />;
  }

  // ===================================================
  // AUTHENTICATED FINANCE ADMIN
  // ===================================================

  return children;
}
