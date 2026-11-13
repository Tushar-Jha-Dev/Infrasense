import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, Search, UserCheck, UserX, UserMinus, Pencil, Trash2, X, ShieldAlert } from "lucide-react";
import { createUser, deleteUser, listUsers, updateUser } from "../../api/users.js";
import { useAuth } from "../../context/useAuth.js";
import { formatDate } from "../../utils/formatDate.js";
import Alert from "../../components/ui/Alert.jsx";
import Badge from "../../components/ui/Badge.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import "./UsersManagement.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RoleBadge({ role }) {
  const normalized = (role || "").toLowerCase();
  let roleClass = "role-badge-user";
  let label = "User";

  if (normalized === "admin") {
    roleClass = "role-badge-admin";
    label = "Admin";
  } else if (normalized === "technician") {
    roleClass = "role-badge-technician";
    label = "Technician";
  }

  return (
    <span className={`ui-badge ${roleClass}`}>
      {label}
    </span>
  );
}

function ActiveBadge({ isActive }) {
  return (
    <Badge variant={isActive ? "success" : "neutral"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

function UsersManagement() {
  const { user: currentUser } = useAuth();
  const isViewerPrimary = Boolean(currentUser?.isPrimaryAdmin);

  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  // Add User Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "technician",
  });
  const [addErrors, setAddErrors] = useState({});
  const [addApiError, setAddApiError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit User Modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
  });
  const [editErrors, setEditErrors] = useState({});
  const [editApiError, setEditApiError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Status toggle confirm dialog
  const [statusUser, setStatusUser] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Promote confirm dialog
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [promoteLoading, setPromoteLoading] = useState(false);

  // Demote confirm dialog
  const [demoteTarget, setDemoteTarget] = useState(null);
  const [demoteLoading, setDemoteLoading] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const addModalTitleId = useId();
  const editModalTitleId = useId();
  const addModalFirstRef = useRef(null);
  const editModalFirstRef = useRef(null);

  useEffect(() => {
    let active = true;
    const params = {};
    if (roleFilter !== "all") {
      params.role = roleFilter;
    }

    listUsers(params)
      .then((data) => {
        if (active) {
          setUsers(Array.isArray(data) ? data : []);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load users");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [roleFilter, refreshTrigger]);

  const reloadUsers = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Client-side filtering by name or email
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, searchQuery]);

  // Trap focus / close modal on Escape
  useEffect(() => {
    if (!isAddOpen) return;
    addModalFirstRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !addLoading) {
        setIsAddOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAddOpen, addLoading]);

  useEffect(() => {
    if (!editingUser) return;
    editModalFirstRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !editLoading) {
        setEditingUser(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingUser, editLoading]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setAddForm({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "technician",
    });
    setAddErrors({});
    setAddApiError("");
    setIsAddOpen(true);
  };

  // Submit Add
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    const name = addForm.name.trim();
    const email = addForm.email.trim().toLowerCase();
    const password = addForm.password;
    const phone = addForm.phone.trim();
    const role = addForm.role;

    if (!name) {
      errors.name = "Name is required";
    }

    if (!email) {
      errors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (phone && phone.length > 30) {
      errors.phone = "Phone number cannot exceed 30 characters";
    }

    if (role !== "technician" && role !== "admin") {
      errors.role = "Role must be technician or admin";
    }

    if (role === "admin" && !isViewerPrimary) {
      errors.role = "Only the primary admin can create admins";
    }

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    setAddLoading(true);
    setAddApiError("");

    try {
      const payload = {
        name,
        email,
        password,
        role,
      };
      if (phone) {
        payload.phone = phone;
      }
      await createUser(payload);
      setIsAddOpen(false);
      reloadUsers();
    } catch (err) {
      if (
        err.status === 409 ||
        err.message?.toLowerCase().includes("email already exists") ||
        err.message?.toLowerCase().includes("already registered")
      ) {
        setAddApiError(
          "Email already exists. To make an existing user an admin, use Promote on their row."
        );
      } else {
        setAddApiError(err.message || "Failed to create user");
      }
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (targetUser) => {
    setEditingUser(targetUser);
    setEditForm({
      name: targetUser.name || "",
      phone: targetUser.phone || "",
    });
    setEditErrors({});
    setEditApiError("");
  };

  // Submit Edit
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
    setEditApiError("");

    try {
      await updateUser(editingUser._id, {
        name,
        phone,
      });
      setEditingUser(null);
      reloadUsers();
    } catch (err) {
      setEditApiError(err.message || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  // Confirm Status Toggle
  const handleConfirmStatusToggle = async () => {
    if (!statusUser) return;
    setStatusLoading(true);
    setActionError("");
    try {
      await updateUser(statusUser._id, {
        isActive: !statusUser.isActive,
      });
      setStatusUser(null);
      reloadUsers();
    } catch (err) {
      setActionError(err.message || "Failed to update status");
      setStatusUser(null);
    } finally {
      setStatusLoading(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setActionError("");
    try {
      await deleteUser(deleteTarget._id);
      setDeleteTarget(null);
      reloadUsers();
    } catch (err) {
      setActionError(err.message || "Failed to delete user");
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Confirm Promote to admin
  const handleConfirmPromote = async () => {
    if (!promoteTarget) return;
    setPromoteLoading(true);
    setActionError("");
    try {
      await updateUser(promoteTarget._id, { role: "admin" });
      setPromoteTarget(null);
      reloadUsers();
    } catch (err) {
      setActionError(err.message || "Failed to promote user");
      setPromoteTarget(null);
    } finally {
      setPromoteLoading(false);
    }
  };

  // Confirm Demote to user
  const handleConfirmDemote = async () => {
    if (!demoteTarget) return;
    setDemoteLoading(true);
    setActionError("");
    try {
      await updateUser(demoteTarget._id, { role: "user" });
      setDemoteTarget(null);
      reloadUsers();
    } catch (err) {
      setActionError(err.message || "Failed to demote user");
      setDemoteTarget(null);
    } finally {
      setDemoteLoading(false);
    }
  };

  return (
    <div className="users-page">
      <PageHeader
        title="Users and Technicians"
        subtitle="Manage accounts, staff roles, and system access."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Add technician or admin</span>
          </button>
        }
      />

      {actionError && (
        <div className="users-alert-wrap">
          <Alert variant="danger">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span>{actionError}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActionError("")}
              >
                Dismiss
              </button>
            </div>
          </Alert>
        </div>
      )}

      <section className="users-filters-bar" aria-label="Filters">
        <div className="users-search-box">
          <Input
            label="Search"
            placeholder="Filter by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="users-role-filter">
          <Select
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="technician">Technician</option>
            <option value="admin">Admin</option>
          </Select>
        </div>

        {(searchQuery || roleFilter !== "all") && (
          <div className="users-reset-filter">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("all");
              }}
            >
              Reset
            </button>
          </div>
        )}
      </section>

      {error && (
        <div className="users-alert-wrap">
          <Alert variant="danger">
            {error}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={reloadUsers}
              style={{ marginLeft: "var(--space-3)" }}
            >
              Retry
            </button>
          </Alert>
        </div>
      )}

      {loading ? (
        <div className="users-loading-state">
          <Spinner size="lg" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No users found"
          message={
            searchQuery || roleFilter !== "all"
              ? "No accounts match your current filter criteria."
              : "No users have been registered yet."
          }
          action={
            searchQuery || roleFilter !== "all" ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("all");
                }}
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAdd}
              >
                <Plus size={16} aria-hidden="true" />
                <span>Add technician or admin</span>
              </button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => {
                  const isSelf = currentUser?._id === item._id;
                  const isTargetPrimary = Boolean(item.isPrimaryAdmin);
                  const isTargetAdmin = item.role === "admin";
                  const canManageThisAdmin = isViewerPrimary || !isTargetAdmin;

                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="users-name-cell">
                          <span className="users-user-name">{item.name}</span>
                          {isSelf && (
                            <span className="users-self-badge">(You)</span>
                          )}
                        </div>
                      </td>
                      <td className="users-email-cell">{item.email}</td>
                      <td>
                        <div className="users-role-badges-wrap">
                          <RoleBadge role={item.role} />
                          {isTargetPrimary && (
                            <span className="ui-badge role-badge-primary-admin">
                              Primary admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="users-phone-cell">
                        {item.phone || "—"}
                      </td>
                      <td>
                        <ActiveBadge isActive={item.isActive} />
                      </td>
                      <td className="users-date-cell">
                        {formatDate(item.createdAt)}
                      </td>
                      <td>
                        <div className="users-actions-cell">
                          {isTargetAdmin && !canManageThisAdmin ? (
                            <span
                              className="users-restricted-hint"
                              title="Only the primary admin can manage other admins"
                            >
                              Managed by primary admin
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEdit(item)}
                                title="Edit user details"
                              >
                                <Pencil size={14} aria-hidden="true" />
                                <span>Edit</span>
                              </button>

                              {item.role === "user" && item.isActive && isViewerPrimary && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm users-promote-btn"
                                  title="Promote user to administrator"
                                  onClick={() => setPromoteTarget(item)}
                                >
                                  <ShieldAlert size={14} aria-hidden="true" />
                                  <span>Promote to admin</span>
                                </button>
                              )}

                              {item.role === "admin" && !isTargetPrimary && isViewerPrimary && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm users-demote-btn"
                                  title="Demote to user"
                                  onClick={() => setDemoteTarget(item)}
                                >
                                  <UserMinus size={14} aria-hidden="true" />
                                  <span>Demote to user</span>
                                </button>
                              )}

                              {!isTargetPrimary && (
                                <>
                                  {item.isActive ? (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm users-deactivate-btn"
                                      disabled={isSelf}
                                      title={
                                        isSelf
                                          ? "You cannot deactivate your own account"
                                          : "Deactivate user"
                                      }
                                      onClick={() => setStatusUser(item)}
                                    >
                                      <UserX size={14} aria-hidden="true" />
                                      <span>Deactivate</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm users-activate-btn"
                                      title="Activate user"
                                      onClick={() => setStatusUser(item)}
                                    >
                                      <UserCheck size={14} aria-hidden="true" />
                                      <span>Activate</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm users-delete-btn"
                                    disabled={isSelf}
                                    title={
                                      isSelf
                                        ? "You cannot delete your own account"
                                        : "Delete user permanently"
                                    }
                                    onClick={() => setDeleteTarget(item)}
                                  >
                                    <Trash2 size={14} aria-hidden="true" />
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards View */}
          <div className="users-cards-list">
            {filteredUsers.map((item) => {
              const isSelf = currentUser?._id === item._id;
              const isTargetPrimary = Boolean(item.isPrimaryAdmin);
              const isTargetAdmin = item.role === "admin";
              const canManageThisAdmin = isViewerPrimary || !isTargetAdmin;

              return (
                <div key={item._id} className="users-card">
                  <div className="users-card-header">
                    <div className="users-card-identity">
                      <div className="users-card-name-row">
                        <span className="users-card-name">{item.name}</span>
                        {isSelf && (
                          <span className="users-self-badge">(You)</span>
                        )}
                      </div>
                      <span className="users-card-email">{item.email}</span>
                    </div>
                    <div className="users-card-badges">
                      <RoleBadge role={item.role} />
                      {isTargetPrimary && (
                        <span className="ui-badge role-badge-primary-admin">
                          Primary admin
                        </span>
                      )}
                      <ActiveBadge isActive={item.isActive} />
                    </div>
                  </div>

                  <div className="users-card-details">
                    <div className="users-card-row">
                      <span className="users-card-label">Phone:</span>
                      <span className="users-card-value">{item.phone || "—"}</span>
                    </div>
                    <div className="users-card-row">
                      <span className="users-card-label">Created:</span>
                      <span className="users-card-value">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="users-card-actions">
                    {isTargetAdmin && !canManageThisAdmin ? (
                      <span
                        className="users-restricted-hint"
                        title="Only the primary admin can manage other admins"
                      >
                        Managed by primary admin
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          <span>Edit</span>
                        </button>

                        {item.role === "user" && item.isActive && isViewerPrimary && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm users-promote-btn"
                            title="Promote to admin"
                            onClick={() => setPromoteTarget(item)}
                          >
                            <ShieldAlert size={14} aria-hidden="true" />
                            <span>Promote</span>
                          </button>
                        )}

                        {item.role === "admin" && !isTargetPrimary && isViewerPrimary && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm users-demote-btn"
                            title="Demote to user"
                            onClick={() => setDemoteTarget(item)}
                          >
                            <UserMinus size={14} aria-hidden="true" />
                            <span>Demote</span>
                          </button>
                        )}

                        {!isTargetPrimary && (
                          <>
                            {item.isActive ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm users-deactivate-btn"
                                disabled={isSelf}
                                title={
                                  isSelf
                                    ? "You cannot deactivate your own account"
                                    : "Deactivate user"
                                }
                                onClick={() => setStatusUser(item)}
                              >
                                <UserX size={14} aria-hidden="true" />
                                <span>Deactivate</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm users-activate-btn"
                                onClick={() => setStatusUser(item)}
                              >
                                <UserCheck size={14} aria-hidden="true" />
                                <span>Activate</span>
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-danger btn-sm users-delete-btn"
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "You cannot delete your own account"
                                  : "Delete user permanently"
                              }
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add User Modal */}
      {isAddOpen && (
        <div
          className="users-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !addLoading) {
              setIsAddOpen(false);
            }
          }}
        >
          <div
            className="users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={addModalTitleId}
          >
            <div className="users-modal-header">
              <h2 id={addModalTitleId} className="users-modal-title">
                Add technician or admin
              </h2>
              <button
                type="button"
                className="users-modal-close"
                onClick={() => !addLoading && setIsAddOpen(false)}
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="users-modal-form" noValidate>
              {addApiError && (
                <div style={{ marginBottom: "var(--space-3)" }}>
                  <Alert variant="danger">{addApiError}</Alert>
                </div>
              )}

              <Input
                ref={addModalFirstRef}
                label="Full Name"
                placeholder="e.g. Ramesh Kumar"
                value={addForm.name}
                error={addErrors.name}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="e.g. ramesh@institution.edu"
                value={addForm.email}
                error={addErrors.email}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />

              <div className="users-field-with-hint">
                <Input
                  label="Temporary password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={addForm.password}
                  error={addErrors.password}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                />
                <p className="users-field-hint">
                  The person will be asked to choose their own password at first login.
                </p>
              </div>

              <Input
                label="Phone Number (optional)"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={addForm.phone}
                error={addErrors.phone}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />

              <Select
                label="Role"
                value={addForm.role}
                error={addErrors.role}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, role: e.target.value }))
                }
              >
                <option value="technician">Technician</option>
                {isViewerPrimary && <option value="admin">Admin</option>}
              </Select>

              {!isViewerPrimary && (
                <p className="users-primary-only-note">
                  <ShieldAlert size={14} aria-hidden="true" />
                  <span>Only the primary admin can create other admin accounts.</span>
                </p>
              )}

              <div className="users-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddOpen(false)}
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addLoading}
                >
                  {addLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="users-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !editLoading) {
              setEditingUser(null);
            }
          }}
        >
          <div
            className="users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={editModalTitleId}
          >
            <div className="users-modal-header">
              <h2 id={editModalTitleId} className="users-modal-title">
                Edit User Details
              </h2>
              <button
                type="button"
                className="users-modal-close"
                onClick={() => !editLoading && setEditingUser(null)}
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="users-modal-form" noValidate>
              {editApiError && (
                <div style={{ marginBottom: "var(--space-3)" }}>
                  <Alert variant="danger">{editApiError}</Alert>
                </div>
              )}

              <Input
                label="Email"
                value={editingUser.email}
                disabled
                className="users-field-readonly"
              />

              <Input
                ref={editModalFirstRef}
                label="Full Name"
                value={editForm.name}
                error={editErrors.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />

              <Input
                label="Phone Number (optional)"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={editForm.phone}
                error={editErrors.phone}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />

              <div className="users-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingUser(null)}
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

      {/* Activate / Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(statusUser)}
        title={
          statusUser?.isActive
            ? `Deactivate ${statusUser?.name}?`
            : `Activate ${statusUser?.name}?`
        }
        message={
          statusUser?.isActive
            ? `Are you sure you want to deactivate ${statusUser?.name}? They will no longer be able to log in to InfraSense.`
            : `Are you sure you want to activate ${statusUser?.name}? They will regain access to their account.`
        }
        confirmLabel={statusUser?.isActive ? "Deactivate" : "Activate"}
        confirmVariant={statusUser?.isActive ? "danger" : "primary"}
        loading={statusLoading}
        onConfirm={handleConfirmStatusToggle}
        onCancel={() => !statusLoading && setStatusUser(null)}
      />

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name}?`}
        message={`Are you sure you want to permanently delete ${deleteTarget?.name} (${deleteTarget?.email})? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleteLoading && setDeleteTarget(null)}
      />

      {/* Promote to Admin Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(promoteTarget)}
        title={`Promote ${promoteTarget?.name} to Admin?`}
        message={`${promoteTarget?.name} will get full admin access. They keep their own password and must log in again to see admin pages.`}
        confirmLabel="Promote to admin"
        confirmVariant="primary"
        loading={promoteLoading}
        onConfirm={handleConfirmPromote}
        onCancel={() => !promoteLoading && setPromoteTarget(null)}
      />

      {/* Demote to User Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(demoteTarget)}
        title={`Demote ${demoteTarget?.name} to user?`}
        message={`${demoteTarget?.name} will lose admin access and become a normal user. They must log in again.`}
        confirmLabel="Demote to user"
        confirmVariant="danger"
        loading={demoteLoading}
        onConfirm={handleConfirmDemote}
        onCancel={() => !demoteLoading && setDemoteTarget(null)}
      />
    </div>
  );
}

export default UsersManagement;
