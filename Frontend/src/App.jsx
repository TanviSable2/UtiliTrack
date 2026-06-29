import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/admin/Dashboard";
import Buildings from "./pages/admin/Buildings";
import Units from "./pages/admin/Units";
import Tenants from "./pages/admin/Tenants";
import MeterReadings from "./pages/admin/MeterReadings";
import Bills from "./pages/admin/Bills";
import Payments from "./pages/admin/Payments";
import Disputes from "./pages/admin/Disputes";
import Rates from "./pages/admin/Rates";
import BillingCalendar from "./pages/admin/BillingCalendar";
import TenantPortal from "./pages/tenant/TenantPortal";
import { PageLoader } from "./components/ui/Spinner";

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/tenant" replace />;
  return children;
}

function TenantRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "TENANT") return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user?.role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === "TENANT") return <Navigate to="/tenant" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="buildings" element={<Buildings />} />
        <Route path="units" element={<Units />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="meters" element={<MeterReadings />} />
        <Route path="bills" element={<Bills />} />
        <Route path="payments" element={<Payments />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="rates" element={<Rates />} />
        <Route path="calendar" element={<BillingCalendar />} />
      </Route>

      <Route
        path="/tenant"
        element={
          <TenantRoute>
            <TenantPortal />
          </TenantRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontSize: 13, borderRadius: 8, fontFamily: "Inter, sans-serif" },
            success: { iconTheme: { primary: "#1e3a5f", secondary: "#fff" } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}