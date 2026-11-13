import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  Edit3,
  LogOut,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Upload,
  Trash2,
} from "lucide-react";
import { updateMe } from "../../api/auth.js";
import { getMyComplaints, getAssignedComplaints } from "../../api/complaints.js";
import { getAnalyticsSummary } from "../../api/analytics.js";
import { useAuth } from "../../context/useAuth.js";
import { formatDate } from "../../utils/formatDate.js";
import {
  processProfileImage,
  getInitials,
  getAvatarColor,
} from "../../utils/imageCrop.js";
import Alert from "../../components/ui/Alert.jsx";
import Badge, { StatusBadge } from "../../components/ui/Badge.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
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

  return <span className={`ui-badge ${roleClass}`}>{label}</span>;
}

function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // Edit Profile modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");

  // Photo modal state
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);

  // Activity card state
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [activityData, setActivityData] = useState(null);
  const [activityTrigger, setActivityTrigger] = useState(0);

  const editModalTitleId = useId();
  const photoModalTitleId = useId();

  // Load activity data depending on role
  useEffect(() => {
    let active = true;
    const role = user?.role;
    if (!role) return;

    if (role === "user") {
      getMyComplaints()
        .then((complaints) => {
          if (!active) return;
          const list = Array.isArray(complaints) ? complaints : [];
          const openCount = list.filter((c) =>
            ["Submitted", "Under Review", "Assigned", "In Progress"].includes(c.status)
          ).length;
          const resolvedCount = list.filter((c) =>
            ["Resolved", "Closed"].includes(c.status)
          ).length;
          setActivityData({
            role: "user",
            openCount,
            resolvedCount,
            total: list.length,
            recent: list.slice(0, 3),
          });
          setActivityError("");
        })
        .catch((err) => {
          if (active) setActivityError(err.message || "Failed to load activity summary");
        })
        .finally(() => {
          if (active) setActivityLoading(false);
        });
    } else if (role === "technician") {
      getAssignedComplaints()
        .then((tasks) => {
          if (!active) return;
          const list = Array.isArray(tasks) ? tasks : [];
          const activeCount = list.filter((c) =>
            ["Assigned", "In Progress"].includes(c.status)
          ).length;
          const resolvedCount = list.filter((c) =>
            ["Resolved", "Closed"].includes(c.status)
          ).length;
          setActivityData({
            role: "technician",
            activeCount,
            resolvedCount,
            total: list.length,
            recent: list.slice(0, 3),
          });
          setActivityError("");
        })
        .catch((err) => {
          if (active) setActivityError(err.message || "Failed to load activity summary");
        })
        .finally(() => {
          if (active) setActivityLoading(false);
        });
    } else if (role === "admin") {
      getAnalyticsSummary()
        .then((summary) => {
          if (!active) return;
          const totals = summary?.totals || {};
          setActivityData({
            role: "admin",
            openCount: totals.openComplaints ?? 0,
            awaitingReview: totals.awaitingReview ?? 0,
            resolvedOrClosed: totals.resolvedOrClosed ?? 0,
          });
          setActivityError("");
        })
        .catch((err) => {
          if (active) setActivityError(err.message || "Failed to load activity summary");
        })
        .finally(() => {
          if (active) setActivityLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [user?.role, activityTrigger]);

  const reloadActivity = useCallback(() => {
    setActivityLoading(true);
    setActivityTrigger((prev) => prev + 1);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Open Edit Profile
  const handleOpenEdit = () => {
    setEditForm({
      name: user?.name || "",
      phone: user?.phone || "",
    });
    setEditErrors({});
    setEditError("");
    setIsEditOpen(true);
  };

  // Submit Edit Profile
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    const name = editForm.name.trim();
    const phone = editForm.phone.trim();

    if (!name) {
      errors.name = "Name is required";
    }

    if (phone && phone.length > 30) {
      errors.phone = "Phone number cannot exceed 30 characters";
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setEditLoading(true);
    setEditError("");

    try {
      const updated = await updateMe({ name, phone });
      setUser((prev) => ({ ...prev, ...updated }));
      setIsEditOpen(false);
      setFeedbackSuccess("Profile updated successfully");
      setTimeout(() => setFeedbackSuccess(""), 4000);
    } catch (err) {
      setEditError(err.message || "Failed to update profile");
    } finally {
      setEditLoading(false);
    }
  };

  // Open Photo modal
  const handleOpenPhoto = () => {
    setPhotoPreview(null);
    setPhotoError("");
    setIsPhotoOpen(true);
  };

  // Handle Photo File selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    try {
      const dataUrl = await processProfileImage(file);
      setPhotoPreview(dataUrl);
    } catch (err) {
      setPhotoError(err.message || "Failed to process image");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Save new photo
  const handleSavePhoto = async () => {
    if (!photoPreview) return;
    setPhotoLoading(true);
    setPhotoError("");
    try {
      const updated = await updateMe({ avatar: photoPreview });
      setUser((prev) => ({ ...prev, ...updated }));
      setIsPhotoOpen(false);
      setFeedbackSuccess("Profile photo updated successfully");
      setTimeout(() => setFeedbackSuccess(""), 4000);
    } catch (err) {
      setPhotoError(err.message || "Failed to save photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  // Remove photo
  const handleRemovePhoto = async () => {
    setPhotoLoading(true);
    setPhotoError("");
    try {
      const updated = await updateMe({ avatar: "" });
      setUser((prev) => ({ ...prev, ...updated }));
      setIsPhotoOpen(false);
      setFeedbackSuccess("Profile photo removed");
      setTimeout(() => setFeedbackSuccess(""), 4000);
    } catch (err) {
      setPhotoError(err.message || "Failed to remove photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const phoneDisplay = user?.phone?.trim() ? user.phone : "Not provided";
  const memberSinceDisplay = user?.createdAt
    ? formatDate(user.createdAt)
    : "Not provided";

  return (
    <div className="profile-page">
      <PageHeader
        title="Profile"
        subtitle="Manage your personal information, system credentials, and activity."
      />

      {feedbackSuccess && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Alert variant="success">{feedbackSuccess}</Alert>
        </div>
      )}

      {/* 1. Header Card */}
      <section className="profile-card profile-header-card" aria-label="Profile Header">
        <div className="profile-header-main">
          <div className="profile-avatar-wrap">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={`Profile photo of ${user?.name || "user"}`}
                className="profile-avatar-img"
              />
            ) : (
              <div
                className="profile-avatar-placeholder"
                style={{ backgroundColor: getAvatarColor(user?.name) }}
                aria-hidden="true"
              >
                {getInitials(user?.name)}
              </div>
            )}
            <button
              type="button"
              className="profile-avatar-edit-btn"
              onClick={handleOpenPhoto}
              title="Change photo"
              aria-label="Change photo"
            >
              <Camera size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="profile-header-identity">
            <h1 className="profile-header-name">{user?.name || "User"}</h1>
            <div className="profile-header-meta">
              <span className="profile-header-email">{user?.email}</span>
              <div className="profile-header-badges">
                <RoleBadge role={user?.role} />
                {user?.isPrimaryAdmin && (
                  <span className="ui-badge role-badge-primary-admin">
                    Primary admin
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleOpenEdit}
          >
            <Edit3 size={15} aria-hidden="true" />
            <span>Edit profile</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleOpenPhoto}
          >
            <Camera size={15} aria-hidden="true" />
            <span>Change photo</span>
          </button>
        </div>
      </section>

      {/* 2. Details Card & Activity Card Grid */}
      <div className="profile-grid">
        {/* Details Card */}
        <section className="profile-card profile-details-card" aria-label="Account Details">
          <h2 className="profile-section-title">Account Details</h2>

          <div className="profile-details-list">
            <div className="profile-detail-item">
              <span className="profile-detail-label">
                <Mail size={16} aria-hidden="true" />
                <span>Email address</span>
              </span>
              <span className="profile-detail-value">{user?.email || "—"}</span>
            </div>

            <div className="profile-detail-item">
              <span className="profile-detail-label">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>System role</span>
              </span>
              <span className="profile-detail-value" style={{ textTransform: "capitalize" }}>
                {user?.role || "User"}
              </span>
            </div>

            <div className="profile-detail-item">
              <span className="profile-detail-label">
                <Phone size={16} aria-hidden="true" />
                <span>Phone number</span>
              </span>
              <span className="profile-detail-value">{phoneDisplay}</span>
            </div>

            <div className="profile-detail-item">
              <span className="profile-detail-label">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>Account status</span>
              </span>
              <span className="profile-detail-value">
                <Badge variant={user?.isActive !== false ? "success" : "neutral"}>
                  {user?.isActive !== false ? "Active" : "Inactive"}
                </Badge>
              </span>
            </div>

            <div className="profile-detail-item">
              <span className="profile-detail-label">
                <Calendar size={16} aria-hidden="true" />
                <span>Member since</span>
              </span>
              <span className="profile-detail-value">{memberSinceDisplay}</span>
            </div>

            {user?.isPrimaryAdmin && (
              <div className="profile-detail-item">
                <span className="profile-detail-label">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>Authority</span>
                </span>
                <span className="profile-detail-value">
                  <span className="ui-badge role-badge-primary-admin">
                    Primary admin
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="profile-logout-wrap">
            <button
              type="button"
              className="btn btn-secondary btn-sm profile-logout-btn"
              onClick={handleLogout}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </section>

        {/* 3. Activity Card */}
        <section className="profile-card profile-activity-card" aria-label="Recent Activity">
          <h2 className="profile-section-title">
            {user?.role === "admin"
              ? "Operations Overview"
              : user?.role === "technician"
              ? "My Maintenance Activity"
              : "My Complaints Activity"}
          </h2>

          {activityLoading ? (
            <div className="profile-activity-loading">
              <Spinner size="md" />
            </div>
          ) : activityError ? (
            <Alert variant="danger">
              {activityError}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={reloadActivity}
                style={{ marginLeft: "var(--space-3)" }}
              >
                Retry
              </button>
            </Alert>
          ) : user?.role === "admin" ? (
            /* Admin Activity */
            <div className="profile-activity-content">
              <div className="profile-stats-row">
                <div className="profile-stat-box">
                  <span className="profile-stat-number">{activityData?.openCount ?? 0}</span>
                  <span className="profile-stat-label">Open complaints</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-number">{activityData?.awaitingReview ?? 0}</span>
                  <span className="profile-stat-label">Awaiting review</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-number">{activityData?.resolvedOrClosed ?? 0}</span>
                  <span className="profile-stat-label">Resolved / Closed</span>
                </div>
              </div>

              <div className="profile-activity-link-wrap">
                <Link to="/admin/complaints" className="btn btn-secondary btn-sm">
                  <span>Go to Complaints review</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <Link to="/admin/analytics" className="btn btn-secondary btn-sm">
                  <span>View Analytics</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : user?.role === "technician" ? (
            /* Technician Activity */
            <div className="profile-activity-content">
              <div className="profile-stats-row">
                <div className="profile-stat-box">
                  <span className="profile-stat-number">{activityData?.activeCount ?? 0}</span>
                  <span className="profile-stat-label">Active tasks</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-number">{activityData?.resolvedCount ?? 0}</span>
                  <span className="profile-stat-label">Resolved / Closed</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-number">{activityData?.total ?? 0}</span>
                  <span className="profile-stat-label">Total assigned</span>
                </div>
              </div>

              <div className="profile-recent-section">
                <h3 className="profile-recent-heading">Recent Assigned Tasks</h3>
                {activityData?.recent?.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No tasks assigned"
                    message="You do not have any tasks assigned to you currently."
                  />
                ) : (
                  <ul className="profile-recent-list">
                    {activityData?.recent?.map((item) => (
                      <li key={item._id} className="profile-recent-item">
                        <div className="profile-recent-item-info">
                          <span className="profile-recent-id">{item.complaintId}</span>
                          <span className="profile-recent-title">{item.title}</span>
                          <span className="profile-recent-date">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <div className="profile-recent-item-meta">
                          <StatusBadge status={item.status} />
                          <Link
                            to={`/technician/tasks/${item._id}`}
                            className="btn btn-secondary btn-sm"
                            aria-label={`View task ${item.complaintId}`}
                          >
                            <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            /* User Activity */
            <div className="profile-activity-content">
              <div className="profile-stats-row">
                <div className="profile-stat-box">
                  <span className="profile-stat-number">{activityData?.openCount ?? 0}</span>
                  <span className="profile-stat-label">Open</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-number">{activityData?.resolvedCount ?? 0}</span>
                  <span className="profile-stat-label">Resolved or Closed</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-number">{activityData?.total ?? 0}</span>
                  <span className="profile-stat-label">Total reported</span>
                </div>
              </div>

              <div className="profile-recent-section">
                <h3 className="profile-recent-heading">Recent Complaints</h3>
                {activityData?.recent?.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No complaints yet"
                    message="You haven't submitted any complaints yet."
                    action={
                      <Link to="/complaints/new" className="btn btn-primary btn-sm">
                        Submit a complaint
                      </Link>
                    }
                  />
                ) : (
                  <ul className="profile-recent-list">
                    {activityData?.recent?.map((item) => (
                      <li key={item._id} className="profile-recent-item">
                        <div className="profile-recent-item-info">
                          <span className="profile-recent-id">{item.complaintId}</span>
                          <span className="profile-recent-title">{item.title}</span>
                          <span className="profile-recent-date">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <div className="profile-recent-item-meta">
                          <StatusBadge status={item.status} />
                          <Link
                            to={`/complaints/${item._id}`}
                            className="btn btn-secondary btn-sm"
                            aria-label={`View complaint ${item.complaintId}`}
                          >
                            <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div
          className="profile-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !editLoading) {
              setIsEditOpen(false);
            }
          }}
        >
          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={editModalTitleId}
          >
            <div className="profile-modal-header">
              <h2 id={editModalTitleId} className="profile-modal-title">
                Edit Profile
              </h2>
              <button
                type="button"
                className="profile-modal-close"
                onClick={() => !editLoading && setIsEditOpen(false)}
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="profile-modal-form" noValidate>
              {editError && (
                <div style={{ marginBottom: "var(--space-2)" }}>
                  <Alert variant="danger">{editError}</Alert>
                </div>
              )}

              <Input
                label="Email (read-only)"
                value={user?.email || ""}
                disabled
                className="profile-field-readonly"
              />

              <Input
                label="Role (read-only)"
                value={user?.role || ""}
                disabled
                className="profile-field-readonly"
              />

              <Input
                label="Full Name"
                value={editForm.name}
                error={editErrors.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={editForm.phone}
                error={editErrors.phone}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />

              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditOpen(false)}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Photo Modal */}
      {isPhotoOpen && (
        <div
          className="profile-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !photoLoading) {
              setIsPhotoOpen(false);
            }
          }}
        >
          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={photoModalTitleId}
          >
            <div className="profile-modal-header">
              <h2 id={photoModalTitleId} className="profile-modal-title">
                Change Profile Photo
              </h2>
              <button
                type="button"
                className="profile-modal-close"
                onClick={() => !photoLoading && setIsPhotoOpen(false)}
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="profile-modal-form">
              {photoError && (
                <div style={{ marginBottom: "var(--space-2)" }}>
                  <Alert variant="danger">{photoError}</Alert>
                </div>
              )}

              <div className="profile-photo-preview-wrap">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={`Profile photo preview of ${user?.name || "user"}`}
                    className="profile-photo-preview-img"
                  />
                ) : user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`Current profile photo of ${user?.name || "user"}`}
                    className="profile-photo-preview-img"
                  />
                ) : (
                  <div
                    className="profile-avatar-placeholder profile-photo-preview-placeholder"
                    style={{ backgroundColor: getAvatarColor(user?.name) }}
                    aria-hidden="true"
                  >
                    {getInitials(user?.name)}
                  </div>
                )}
              </div>

              <div className="profile-photo-upload-controls">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  id="profile-photo-file-input"
                />
                <label
                  htmlFor="profile-photo-file-input"
                  className="btn btn-secondary"
                  style={{ cursor: "pointer" }}
                >
                  <Upload size={16} aria-hidden="true" />
                  <span>Choose Image</span>
                </label>
                <span className="profile-photo-hint">
                  Accepts JPEG, PNG, or WebP up to 5 MB. Image is cropped to 256×256.
                </span>
              </div>

              <div className="profile-modal-actions">
                {user?.avatar && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleRemovePhoto}
                    disabled={photoLoading}
                    style={{ marginRight: "auto" }}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Remove Photo</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPhotoOpen(false)}
                  disabled={photoLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSavePhoto}
                  disabled={photoLoading || !photoPreview}
                >
                  {photoLoading ? "Saving..." : "Save Photo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
