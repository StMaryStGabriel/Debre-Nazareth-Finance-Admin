import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// FINANCE ADMIN AUTHORIZATION
// Uses Finance-specific localStorage key.
// This prevents Main Admin and Finance Admin
// sessions from overwriting each other.
// =====================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("financeAdminToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// =====================================================
// FINANCE ADMIN AUTH ERROR HANDLING
// =====================================================

api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      // Remove ONLY Finance Admin session.
      // Do NOT touch Main Admin session.

      localStorage.removeItem("financeAdminToken");

      localStorage.removeItem("financeAdminName");

      localStorage.removeItem("financeAdminEmail");

      localStorage.removeItem("financeAdminId");

      localStorage.removeItem("financeAdminRole");

      localStorage.removeItem("financeAdminExpiry");

      window.location.href = "/finance/admin/login";
    }

    return Promise.reject(error);
  },
);

export default api;
