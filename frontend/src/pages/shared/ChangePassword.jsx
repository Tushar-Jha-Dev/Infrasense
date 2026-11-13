import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import { changePassword } from "../../api/auth.js";
import { useAuth } from "../../context/useAuth.js";
import { roleHome } from "../../utils/roleHome.js";
import Alert from "../../components/ui/Alert.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import "./ChangePassword.css";

function ChangePassword() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const isForced = Boolean(user?.mustChangePassword);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    } else if (newPassword === currentPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setServerError("");
    setLoading(true);

    try {
      await changePassword({ currentPassword, newPassword });
      await refreshUser();
      const targetHome = roleHome(user?.role);
      navigate(targetHome, { replace: true });
    } catch (err) {
      setServerError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <PageHeader
        title={isForced ? "Choose a New Password" : "Change Password"}
        subtitle={
          isForced
            ? "Your account was set up with a temporary password. Choose a secure personal password to continue."
            : "Update your account password to keep your credentials secure."
        }
      />

      <div className="change-password-card">
        {isForced && (
          <div className="change-password-notice">
            <Alert variant="warning">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <ShieldAlert size={18} aria-hidden="true" />
                <span>
                  Your administrator gave you a temporary password. Choose your own password to continue.
                </span>
              </div>
            </Alert>
          </div>
        )}

        {serverError && (
          <div className="change-password-notice">
            <Alert variant="danger">{serverError}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="change-password-form" noValidate>
          {/* Current Password */}
          <div className="ui-field">
            <label htmlFor="current-password-input" className="ui-label">
              Current password
            </label>
            <div className="change-password-input-wrap">
              <input
                id="current-password-input"
                type={showCurrent ? "text" : "password"}
                className={`ui-input ${
                  errors.currentPassword ? "ui-input-invalid" : ""
                }`.trim()}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="change-password-toggle-btn"
                onClick={() => setShowCurrent((prev) => !prev)}
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
              >
                {showCurrent ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="ui-input-error" role="alert">
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="ui-field">
            <label htmlFor="new-password-input" className="ui-label">
              New password
            </label>
            <div className="change-password-input-wrap">
              <input
                id="new-password-input"
                type={showNew ? "text" : "password"}
                className={`ui-input ${
                  errors.newPassword ? "ui-input-invalid" : ""
                }`.trim()}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="change-password-toggle-btn"
                onClick={() => setShowNew((prev) => !prev)}
                aria-label={showNew ? "Hide new password" : "Show new password"}
              >
                {showNew ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="ui-input-error" role="alert">
                {errors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="ui-field">
            <label htmlFor="confirm-password-input" className="ui-label">
              Confirm new password
            </label>
            <div className="change-password-input-wrap">
              <input
                id="confirm-password-input"
                type={showConfirm ? "text" : "password"}
                className={`ui-input ${
                  errors.confirmPassword ? "ui-input-invalid" : ""
                }`.trim()}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="change-password-toggle-btn"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirm ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="ui-input-error" role="alert">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="change-password-actions">
            {!isForced && (
              <Link to="/profile" className="btn btn-secondary">
                Cancel
              </Link>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <KeyRound size={16} aria-hidden="true" />
              <span>{loading ? "Changing password..." : "Set New Password"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
