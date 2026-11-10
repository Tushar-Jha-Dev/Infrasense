import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./context/useAuth.js";
import Landing from "./pages/public/Landing.jsx";
import Login from "./pages/public/Login.jsx";
import Register from "./pages/public/Register.jsx";
import NotFound from "./pages/shared/NotFound.jsx";

// TEMPORARY role-home placeholder for /dashboard, /admin, and /technician — to be replaced in the next step
function TempRoleHome() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <main
        className="container"
        style={{ paddingTop: "var(--space-7)", paddingBottom: "var(--space-7)" }}
      >
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <main
      className="container"
      style={{ paddingTop: "var(--space-7)", paddingBottom: "var(--space-7)" }}
    >
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          padding: "var(--space-6)",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
        }}
      >
        <h1 style={{ fontSize: "24px", marginBottom: "var(--space-3)" }}>
          Logged in as {user.name} ({user.role})
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
          Temporary dashboard placeholder until role layouts are added.
        </p>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* TEMPORARY role-home routes — replace with ProtectedRoute + real pages */}
      <Route path="/dashboard" element={<TempRoleHome />} />
      <Route path="/admin" element={<TempRoleHome />} />
      <Route path="/technician" element={<TempRoleHome />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
