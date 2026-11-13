import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { roleHome } from "../utils/roleHome.js";
import Spinner from "./ui/Spinner.jsx";

function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner fullPage label="Checking authentication..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Forced password change: when mustChangePassword is true, every route
  // except /change-password (and logout, handled in Topbar) redirects to /change-password
  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
