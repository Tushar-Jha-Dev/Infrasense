import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { roleHome } from "../utils/roleHome.js";
import Spinner from "./ui/Spinner.jsx";

function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner fullPage label="Checking authentication..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
