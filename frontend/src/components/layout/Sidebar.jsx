import { useEffect, useRef } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Package,
  PlusCircle,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { roleHome } from "../../utils/roleHome.js";
import "./Sidebar.css";

const NAV_LINKS_BY_ROLE = {
  user: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/complaints/new", label: "New Complaint", icon: PlusCircle },
    { to: "/assets", label: "Assets", icon: Package },
    { to: "/profile", label: "Profile", icon: User },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/complaints", label: "Complaints", icon: ClipboardList },
    { to: "/admin/assets", label: "Assets", icon: Package },
    { to: "/admin/users", label: "Users and Technicians", icon: Users },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/profile", label: "Profile", icon: User },
  ],
  technician: [
    { to: "/technician", label: "My Tasks", icon: Wrench, end: true },
    { to: "/profile", label: "Profile", icon: User },
  ],
};

function Sidebar({ role, isOpen, onClose, returnFocusRef }) {
  const closeButtonRef = useRef(null);
  const links = NAV_LINKS_BY_ROLE[role] || [];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        returnFocusRef?.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, returnFocusRef]);

  const handleCloseClick = () => {
    onClose();
    returnFocusRef?.current?.focus();
  };

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={`sidebar ${isOpen ? "sidebar-open" : ""}`.trim()}
        aria-label="Sidebar navigation"
      >
        <div className="sidebar-header">
          <Link
            to={roleHome(role)}
            className="sidebar-brand"
            onClick={onClose}
          >
            InfraSense
          </Link>

          <button
            ref={closeButtonRef}
            type="button"
            className="sidebar-close-btn"
            aria-label="Close navigation menu"
            onClick={handleCloseClick}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <ul className="sidebar-list">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? "sidebar-link-active" : ""}`.trim()
                    }
                  >
                    <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
