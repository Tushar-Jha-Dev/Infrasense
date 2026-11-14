import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, FileSearch } from "lucide-react";
import {
  assignComplaint,
  closeComplaint,
  getComplaint,
  getComplaintMaintenance,
  reviewComplaint,
} from "../../api/complaints.js";
import { listUsers } from "../../api/users.js";
import { CATEGORIES } from "../../constants/categories.js";
import { SEVERITIES } from "../../constants/complaints.js";
import { formatDateTime } from "../../utils/formatDate.js";
import Alert from "../../components/ui/Alert.jsx";
import Badge, {
  SeverityBadge,
  StatusBadge,
} from "../../components/ui/Badge.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import MaintenanceRecordView from "../../components/ui/MaintenanceRecordView.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Timeline from "../../components/ui/Timeline.jsx";
import "./AdminComplaintReview.css";

function AdminComplaintReview() {
  const { id } = useParams();

  const [complaint, setComplaint] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [confirmedCategory, setConfirmedCategory] = useState("");
  const [confirmedSeverity, setConfirmedSeverity] = useState("");

  const [technicianId, setTechnicianId] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");

  const [closeNote, setCloseNote] = useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const syncFormState = useCallback((data) => {
    setConfirmedCategory(
      data.confirmedCategory || data.aiAnalysis?.category || ""
    );
    setConfirmedSeverity(
      data.confirmedSeverity || data.aiAnalysis?.severity || ""
    );
    setTechnicianId(data.assignedTo?._id || "");
    setAssignmentNotes(data.assignmentNotes || "");
  }, []);

  const loadComplaint = useCallback(async () => {
    const data = await getComplaint(id);
    setComplaint(data);
    setNotFound(false);
    setError("");
    syncFormState(data);

    if (data.status === "Resolved" || data.status === "Closed") {
      setMaintenanceLoading(true);
      try {
        const maint = await getComplaintMaintenance(id);
        setMaintenance(maint);
        setMaintenanceError("");
      } catch (maintErr) {
        setMaintenanceError(
          maintErr.message || "Failed to load maintenance record"
        );
      } finally {
        setMaintenanceLoading(false);
      }
    } else {
      setMaintenance(null);
      setMaintenanceError("");
    }

    return data;
  }, [id, syncFormState]);

  useEffect(() => {
    let active = true;

    Promise.all([
      getComplaint(id),
      listUsers({ role: "technician", isActive: true }).catch(() => []),
    ])
      .then(([complaintData, techData]) => {
        if (!active) return;
        setComplaint(complaintData);
        setNotFound(false);
        setError("");
        syncFormState(complaintData);
        setTechnicians(Array.isArray(techData) ? techData : []);

        if (
          complaintData.status === "Resolved" ||
          complaintData.status === "Closed"
        ) {
          setMaintenanceLoading(true);
          getComplaintMaintenance(id)
            .then((maint) => {
              if (active) {
                setMaintenance(maint);
                setMaintenanceError("");
              }
            })
            .catch((maintErr) => {
              if (active) {
                setMaintenanceError(
                  maintErr.message || "Failed to load maintenance record"
                );
              }
            })
            .finally(() => {
              if (active) {
                setMaintenanceLoading(false);
              }
            });
        } else {
          setMaintenance(null);
          setMaintenanceError("");
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 404) {
          setNotFound(true);
          setError("");
        } else {
          setError(err.message || "Failed to load complaint");
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
  }, [id, syncFormState]);

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setActionError("");
    setSuccessMessage("");
    setSubmitting(true);

    try {
      const payload = {};
      if (confirmedCategory) payload.confirmedCategory = confirmedCategory;
      if (confirmedSeverity) payload.confirmedSeverity = confirmedSeverity;

      await reviewComplaint(id, payload);
      await loadComplaint();
      setSuccessMessage("Complaint review saved.");
    } catch (err) {
      setActionError(err.message || "Failed to save review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (event) => {
    event.preventDefault();
    setActionError("");
    setSuccessMessage("");

    if (!technicianId) {
      setActionError("Please select a technician.");
      return;
    }

    setSubmitting(true);
    try {
      await assignComplaint(id, {
        technicianId,
        notes: assignmentNotes.trim(),
      });
      await loadComplaint();
      setSuccessMessage("Technician assigned.");
    } catch (err) {
      setActionError(err.message || "Failed to assign technician");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmClose = async () => {
    setActionError("");
    setSuccessMessage("");
    setSubmitting(true);

    try {
      await closeComplaint(id, { note: closeNote.trim() });
      setConfirmCloseOpen(false);
      setCloseNote("");
      await loadComplaint();
      setSuccessMessage("Complaint closed.");
    } catch (err) {
      setConfirmCloseOpen(false);
      setActionError(err.message || "Failed to close complaint");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-review-loading">
        <Spinner label="Loading complaint..." />
      </div>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Complaint not found"
        description="This complaint does not exist."
        action={
          <Link to="/admin/complaints" className="btn btn-primary">
            Back to complaints
          </Link>
        }
      />
    );
  }

  if (error || !complaint) {
    return (
      <div>
        <Link to="/admin/complaints" className="admin-review-back">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to complaints</span>
        </Link>
        <Alert variant="error">{error || "Unable to load complaint"}</Alert>
      </div>
    );
  }

  const canReview = ["Submitted", "Under Review"].includes(complaint.status);
  const canAssign = ["Submitted", "Under Review", "Assigned"].includes(
    complaint.status
  );
  const canClose = complaint.status === "Resolved";

  const ai = complaint.aiAnalysis;
  const hasAi = Boolean(ai && (ai.category || ai.severity || ai.source));

  const timelineItems = (complaint.statusHistory || []).map((entry) => ({
    status: entry.status,
    date: formatDateTime(entry.changedAt),
    by: entry.changedBy?.name,
    note: entry.note,
  }));

  return (
    <div>
      <Link to="/admin/complaints" className="admin-review-back">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to complaints</span>
      </Link>

      <PageHeader
        title={complaint.title}
        subtitle={
          <span className="admin-review-id">{complaint.complaintId}</span>
        }
        actions={<StatusBadge status={complaint.status} />}
      />

      {successMessage && (
        <div className="admin-review-alert">
          <Alert variant="success">{successMessage}</Alert>
        </div>
      )}
      {actionError && (
        <div className="admin-review-alert">
          <Alert variant="error">{actionError}</Alert>
        </div>
      )}

      <div className="admin-review-grid">
        <section className="admin-review-card">
          <h2 className="admin-review-card-title">Details</h2>
          <p className="admin-review-description">{complaint.description}</p>
          <dl className="admin-review-meta">
            <div>
              <dt>Asset</dt>
              <dd>
                {complaint.asset
                  ? `${complaint.asset.assetId} – ${complaint.asset.name}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{complaint.location || "—"}</dd>
            </div>
            <div>
              <dt>Submitted by</dt>
              <dd>
                {complaint.submittedBy?.name || "—"}
                {complaint.submittedBy?.email
                  ? ` (${complaint.submittedBy.email})`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>Submitted on</dt>
              <dd>{formatDateTime(complaint.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-review-card">
          <div className="admin-review-card-head">
            <h2 className="admin-review-card-title">AI analysis</h2>
            <div className="admin-review-badge-group">
              <Badge variant="neutral">AI suggestion</Badge>
              {ai?.source && (
                <span className="ai-source-muted">
                  {ai.source === "llm"
                    ? "Generated by AI model"
                    : ai.source === "rules"
                    ? "Generated by keyword rules"
                    : null}
                </span>
              )}
            </div>
          </div>

          {!hasAi ? (
            <p className="admin-review-muted">No AI analysis available</p>
          ) : (
            <>
              {ai.needsReview && (
                <div className="admin-review-warning" role="status">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <span>
                    Flagged for review: the description was vague, or the AI and the keyword rules disagreed.
                  </span>
                </div>
              )}
              <dl className="admin-review-meta">
                <div>
                  <dt>Category</dt>
                  <dd>{ai.category || "—"}</dd>
                </div>
                <div>
                  <dt>Severity</dt>
                  <dd>
                    {ai.severity ? (
                      <SeverityBadge severity={ai.severity} />
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{ai.source || "—"}</dd>
                </div>
              </dl>
              {Array.isArray(ai.possibleCauses) &&
                ai.possibleCauses.length > 0 && (
                  <div className="admin-review-causes">
                    <h3 className="admin-review-subhead">Possible causes</h3>
                    <ul>
                      {ai.possibleCauses.map((cause, idx) => (
                        <li key={idx}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </>
          )}
        </section>

        {canReview && (
          <section className="admin-review-card">
            <h2 className="admin-review-card-title">Review</h2>
            <form onSubmit={handleReviewSubmit} className="admin-review-form">
              <Select
                label="Confirmed category"
                value={confirmedCategory}
                onChange={(e) => setConfirmedCategory(e.target.value)}
                disabled={submitting}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
              <Select
                label="Confirmed severity"
                value={confirmedSeverity}
                onChange={(e) => setConfirmedSeverity(e.target.value)}
                disabled={submitting}
              >
                <option value="">Select severity</option>
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev}>
                    {sev}
                  </option>
                ))}
              </Select>
              <div className="admin-review-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Confirm review"}
                </button>
              </div>
            </form>
          </section>
        )}

        {canAssign && (
          <section className="admin-review-card">
            <h2 className="admin-review-card-title">Assign technician</h2>
            {complaint.assignedTo && (
              <p className="admin-review-current-assign">
                Currently assigned to{" "}
                <strong>{complaint.assignedTo.name}</strong>
                {complaint.assignmentNotes
                  ? ` — Notes: ${complaint.assignmentNotes}`
                  : ""}
              </p>
            )}
            <form onSubmit={handleAssignSubmit} className="admin-review-form">
              <Select
                label="Technician"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                disabled={submitting}
              >
                <option value="">Select active technician</option>
                {technicians.map((tech) => (
                  <option key={tech._id} value={tech._id}>
                    {tech.name} ({tech.email})
                  </option>
                ))}
              </Select>
              <div>
                <Textarea
                  label="Assignment notes (optional)"
                  maxLength={500}
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  disabled={submitting}
                />
                <div className="admin-review-counter">
                  {assignmentNotes.length}/500
                </div>
              </div>
              <div className="admin-review-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !technicianId}
                >
                  {submitting ? "Assigning..." : "Assign"}
                </button>
              </div>
            </form>
          </section>
        )}

        {canClose && (
          <section className="admin-review-card">
            <h2 className="admin-review-card-title">Close complaint</h2>
            <div className="admin-review-form">
              <div>
                <Textarea
                  label="Closing note (optional)"
                  maxLength={300}
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  disabled={submitting}
                />
                <div className="admin-review-counter">
                  {closeNote.length}/300
                </div>
              </div>
              <div className="admin-review-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setConfirmCloseOpen(true)}
                  disabled={submitting}
                >
                  Close complaint
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="admin-review-card">
          <h2 className="admin-review-card-title">Progress</h2>
          <Timeline items={timelineItems} />
        </section>

        <section className="admin-review-card">
          <h2 className="admin-review-card-title">Maintenance record</h2>
          {maintenanceLoading ? (
            <div className="admin-review-loading-record">
              <Spinner label="Loading maintenance record..." />
            </div>
          ) : maintenanceError ? (
            <Alert variant="error">{maintenanceError}</Alert>
          ) : (complaint.status === "Resolved" ||
              complaint.status === "Closed") &&
            maintenance ? (
            <MaintenanceRecordView record={maintenance} />
          ) : (
            <p className="admin-review-muted">
              Appears here once a technician resolves the complaint.
            </p>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmCloseOpen}
        title="Close complaint?"
        message="This marks the resolved complaint as closed. You cannot reopen it from here."
        confirmLabel="Close complaint"
        loading={submitting}
        onConfirm={handleConfirmClose}
        onCancel={() => setConfirmCloseOpen(false)}
      />
    </div>
  );
}

export default AdminComplaintReview;
