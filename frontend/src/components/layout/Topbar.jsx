import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/useAuth.js";
import { getInitials, getAvatarColor } from "../../utils/imageCrop.js";
import "./Topbar.css";

function Topbar({ isSidebarOpen, onOpenSidebar, menuButtonRef }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          ref={menuButtonRef}
          type="button"
          className="topbar-menu-btn"
          aria-label="Open navigation menu"
          aria-expanded={isSidebarOpen}
          aria-controls="app-sidebar"
          onClick={onOpenSidebar}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="topbar-right">
        <div className="topbar-user">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={`Profile photo of ${user?.name || "user"}`}
              className="topbar-avatar"
            />
          ) : (
            <span
              className="topbar-avatar-initials"
              style={{ backgroundColor: getAvatarColor(user?.name) }}
              aria-hidden="true"
            >
              {getInitials(user?.name)}
            </span>
          )}
          <span className="topbar-user-name">{user?.name}</span>
          <span className="topbar-role-badge">{user?.role}</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleLogout}
        >
          <LogOut size={15} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

export default Topbar;
