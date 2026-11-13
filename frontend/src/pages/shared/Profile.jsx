import { useNavigate } from "react-router-dom";
import { LogOut, Mail, Phone, Calendar, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../../context/useAuth.js";
import { formatDate } from "../../utils/formatDate.js";
import PageHeader from "../../components/ui/PageHeader.jsx";
import "./Profile.css";

function RoleBadge({ role }) {
  const normalized = (role || "").toLowerCase();
  let roleClass = "profile-role-user";
  let label = "User";

  if (normalized === "admin") {
    roleClass = "profile-role-admin";
    label = "Admin";
  } else if (normalized === "technician") {
    roleClass = "profile-role-technician";
    label = "Technician";
  }

  return (
    <span className={`ui-badge ${roleClass}`}>
      {label}
    </span>
  );
}

function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const phoneDisplay = user?.phone?.trim() ? user.phone : "Not provided";
  const memberSinceDisplay = user?.createdAt
    ? formatDate(user.createdAt)
    : "Not provided";

  return (
    <div className="profile-page">
      <PageHeader
        title="Profile"
        subtitle="View your account details and current role privileges."
      />

      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-avatar">
            <User size={36} aria-hidden="true" />
          </div>
          <div className="profile-identity">
            <h2 className="profile-name">{user?.name || "User"}</h2>
            <div className="profile-badges">
              <RoleBadge role={user?.role} />
            </div>
          </div>
        </div>

        <div className="profile-details-grid">
          <div className="profile-field">
            <div className="profile-field-label">
              <Mail size={16} aria-hidden="true" />
              <span>Email</span>
            </div>
            <div className="profile-field-value">{user?.email || "—"}</div>
          </div>

          <div className="profile-field">
            <div className="profile-field-label">
              <Phone size={16} aria-hidden="true" />
              <span>Phone</span>
            </div>
            <div className="profile-field-value">{phoneDisplay}</div>
          </div>

          <div className="profile-field">
            <div className="profile-field-label">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Role</span>
            </div>
            <div className="profile-field-value" style={{ textTransform: "capitalize" }}>
              {user?.role || "User"}
            </div>
          </div>

          <div className="profile-field">
            <div className="profile-field-label">
              <Calendar size={16} aria-hidden="true" />
              <span>Member since</span>
            </div>
            <div className="profile-field-value">{memberSinceDisplay}</div>
          </div>
        </div>

        <div className="profile-actions">
          <button
            type="button"
            className="btn btn-secondary profile-logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
