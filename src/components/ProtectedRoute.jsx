import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("adminToken");

  const expiry = localStorage.getItem("adminExpiry");

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (expiry && Date.now() > Number(expiry)) {
    localStorage.removeItem("adminToken");

    localStorage.removeItem("adminExpiry");

    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
