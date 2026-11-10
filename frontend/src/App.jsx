import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import Landing from "./pages/public/Landing.jsx";
import Login from "./pages/public/Login.jsx";
import Register from "./pages/public/Register.jsx";
import ComingSoon from "./pages/shared/ComingSoon.jsx";
import NotFound from "./pages/shared/NotFound.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* User routes */}
      <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<ComingSoon title="Dashboard" />} />
          <Route
            path="/complaints/new"
            element={<ComingSoon title="New Complaint" />}
          />
          <Route path="/assets" element={<ComingSoon title="Assets" />} />
        </Route>
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<ComingSoon title="Admin Dashboard" />} />
          <Route
            path="/admin/complaints"
            element={<ComingSoon title="Complaints" />}
          />
          <Route path="/admin/assets" element={<ComingSoon title="Assets" />} />
          <Route
            path="/admin/users"
            element={<ComingSoon title="Users and Technicians" />}
          />
          <Route
            path="/admin/analytics"
            element={<ComingSoon title="Analytics" />}
          />
        </Route>
      </Route>

      {/* Technician routes */}
      <Route element={<ProtectedRoute allowedRoles={["technician"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/technician" element={<ComingSoon title="My Tasks" />} />
        </Route>
      </Route>

      {/* Shared logged-in routes */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["user", "admin", "technician"]} />
        }
      >
        <Route element={<AppLayout />}>
          <Route path="/profile" element={<ComingSoon title="Profile" />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
