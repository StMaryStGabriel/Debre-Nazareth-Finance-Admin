import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ==============================
// PUBLIC ADMIN PAGES
// ==============================

import Login from "./pages/Login";
import CreateAdmin from "./pages/CreateAdmin";

// ==============================
// ADMIN PAGES
// ==============================

import Dashboard from "./pages/Dashboard";

import Donate from "./pages/Donate";
import Event from "./pages/Event";
import AdminMonthlyPayment from "./pages/AdminMonthlyPayment";
import AddDonate from "./pages/addDonate";
import Expense from "./pages/Expense";

// ==============================
// NEW ANNOUNCEMENT PAGE
// ==============================

import AdminAnnouncement from "./pages/AdminAnnouncement";

// ==============================
// PROTECTION
// ==============================

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =====================
            DEFAULT REDIRECT
        ====================== */}

        <Route path="/" element={<Navigate to="/admin/login" replace />} />

        {/* =====================
            PUBLIC ADMIN AUTH
        ====================== */}

        <Route path="/admin/login" element={<Login />} />

        <Route path="/admin/create-admin" element={<CreateAdmin />} />

        {/* =====================
            PROTECTED ADMIN ROUTES
        ====================== */}

        {/* DASHBOARD */}

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* DONATIONS */}

        <Route
          path="/admin/donate"
          element={
            <ProtectedRoute>
              <Donate />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/add-donate"
          element={
            <ProtectedRoute>
              <AddDonate />
            </ProtectedRoute>
          }
        />

        {/* MONTHLY PAYMENTS */}

        <Route
          path="/admin/monthly-payment"
          element={
            <ProtectedRoute>
              <AdminMonthlyPayment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/expenses"
          element={
            <ProtectedRoute>
              <Expense />
            </ProtectedRoute>
          }
        />
        {/* EVENTS */}

        <Route
          path="/admin/events"
          element={
            <ProtectedRoute>
              <Event />
            </ProtectedRoute>
          }
        />

        {/* =====================
            ANNOUNCEMENTS
        ====================== */}

        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute>
              <AdminAnnouncement />
            </ProtectedRoute>
          }
        />

        {/* =====================
            FALLBACK
        ====================== */}

        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
