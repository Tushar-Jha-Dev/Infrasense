import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileSearch } from "lucide-react";
import {
  getComplaint,
  getComplaintMaintenance,
  resolveComplaint,
  startComplaint,
} from "../../api/complaints.js";
import { formatDateTime } from "../../utils/formatDate.js";
import Alert from "../../components/ui/Alert.jsx";
import Badge, {
  SeverityBadge,
  StatusBadge,
} from "../../components/ui/Badge.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Timeline from "../../components/ui/Timeline.jsx";
import "./TaskDetails.css";

function TaskDetails() {
  const { id } = useParams();

  const [complaint, setComplaint] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Resolution form state
  const [diagnosis, setDiagnosis] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadData = useCallback(async () => {
    const complaintData = await getComplaint(id);
    setComplaint(complaintData);
    setNotFound(false);
    setError("");

    if (
      complaintData.status === "Resolved" ||
      complaintData.status === "Closed"
    ) {
      try {
        const maintData = await getComplaintMaintenance(id);
        setMaintenance(maintData);
      } catch {
        setMaintenance(null);
      }
    } else {
      setMaintenance(null);
    }
    return complaintData;
  }, [id]);

  useEffect(() => {
    let active = true;

    getComplaint(id)
      .then(async (complaintData) => {
        if (!active) return;
        setComplaint(complaintData);
        setNotFound(false);
        setError("");

        if (
          complaintData.status === "Resolved" ||
          complaintData.status === "Closed"
        ) {
          try {
            const maintData = await getComplaintMaintenance(id);
            if (active) {
              setMaintenance(maintData);
            }
          } catch {
            if (active) {
              setMaintenance(null);
            }
          }
        } else {
          setMaintenance(null);
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 404) {
          setNotFound(true);
          setError("");
        } else {
          setError(err.message || "Failed to load task details");
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
  }, [id]);

  const handleStartWork = async () => {
    setActionError("");
    setSuccessMessage("");
    setStarting(true);

    try {
      await startComplaint(id);
      await loadData();
      setSuccessMessage("Work started successfully. You can now resolve the task when finished.");
    } catch (err) {
      setActionError(err.message || "Failed to start work");
    } finally {
      setStarting(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!diagnosis.trim()) {
      errors.diagnosis = "Diagnosis is required";
    } else if (diagnosis.trim().length > 1000) {
      errors.diagnosis = "Diagnosis must be 1000 characters or fewer";
    }

    if (!actionTaken.trim()) {
      errors.actionTaken = "Action taken is required";
    } else if (actionTaken.trim().length > 1000) {
      errors.actionTaken = "Action taken must be 1000 characters or fewer";
    }

    if (!resolutionDetails.trim()) {
      errors.resolutionDetails = "Resolution details are required";
    } else if (resolutionDetails.trim().length > 1000) {
      errors.resolutionDetails = "Resolution details must be 1000 characters or fewer";
    }

    if (partsUsed.trim().length > 500) {
      errors.partsUsed = "Parts used must be 500 characters or fewer";
    }

    if (notes.trim().length > 500) {
      errors.notes = "Notes must be 500 characters or fewer";
    }

    if (cost.trim() !== "") {
      const numCost = Number(cost);
      if (Number.isNaN(numCost) || numCost < 0) {
        errors.cost = "Cost must be a number greater than or equal to 0";
      } else if (!Number.isFinite(numCost) || numCost > 10000000) {
        errors.cost = "Cost must be a finite number under 10,000,000";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    setActionError("");
    setSuccessMessage("");

    if (validateForm()) {
      setConfirmOpen(true);
    }
  };

  const handleConfirmResolve = async () => {
    setActionError("");
    setSuccessMessage("");
    setSubmitting(true);

    try {
      const payload = {
        diagnosis: diagnosis.trim(),
        actionTaken: actionTaken.trim(),
        resolutionDetails: resolutionDetails.trim(),
      };

      if (partsUsed.trim()) {
        payload.partsUsed = partsUsed.trim();
      }

      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      if (cost.trim() !== "") {
        payload.cost = Number(cost);
      }

      await resolveComplaint(id, payload);
      setConfirmOpen(false);
      await loadData();
      setSuccessMessage("Complaint resolved and maintenance record saved.");
    } catch (err) {
      setConfirmOpen(false);
      setActionError(err.message || "Failed to resolve complaint");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="task-details-loading">
        <Spinner label="Loading task details..." />
      </div>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Task not found"
        description="This task does not exist or is not assigned to you."
        action={
          <Link to="/technician" className="btn btn-primary">
            Back to my tasks
          </Link>
        }
      />
    );
  }

  if (error || !complaint) {
    return (
      <div>
        <Link to="/technician" className="task-details-back">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to my tasks</span>
        </Link>
        <Alert variant="error">{error || "Unable to load task"}</Alert>
      </div>
    );
  }

  const timelineItems = (complaint.statusHistory || []).map((entry) => ({
    status: entry.status,
    date: formatDateTime(entry.changedAt),
    by: entry.changedBy?.name,
    note: entry.note,
  }));

  const isAssigned = complaint.status === "Assigned";
  const isInProgress = complaint.status === "In Progress";
  const isResolvedOrClosed =
    complaint.status === "Resolved" || complaint.status === "Closed";

  const ai = complaint.aiAnalysis;

  return (
    <div>
      <Link to="/technician" className="task-details-back">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to my tasks</span>
      </Link>

      <PageHeader
        title={complaint.title}
        subtitle={<span className="task-id-mono">{complaint.complaintId}</span>}
        actions={<StatusBadge status={complaint.status} />}
      />

      {successMessage && (
        <div className="task-details-alert">
          <Alert variant="success">{successMessage}</Alert>
        </div>
      )}
      {actionError && (
        <div className="task-details-alert">
          <Alert variant="error">{actionError}</Alert>
        </div>
      )}

      {complaint.assignmentNotes && (
        <div className="task-assignment-notes-banner">
          <strong>Notes from admin:</strong> {complaint.assignmentNotes}
        </div>
      )}

      <div className="task-details-grid">
        {/* Left Column: Complaint Details & Asset */}
        <div className="task-details-col">
          <section className="task-details-card">
            <h2 className="task-card-title">Complaint details</h2>
            <p className="task-description">{complaint.description}</p>
            <dl className="task-meta-grid">
              <div>
                <dt>Location</dt>
                <dd>{complaint.location || "—"}</dd>
              </div>
              <div>
                <dt>Submitted by</dt>
                <dd>{complaint.submittedBy?.name || "—"}</dd>
              </div>
              <div>
                <dt>Submitted on</dt>
                <dd>{formatDateTime(complaint.createdAt)}</dd>
              </div>
              <div>
                <dt>Assigned on</dt>
                <dd>{formatDateTime(complaint.assignedAt)}</dd>
              </div>
            </dl>
          </section>

          {complaint.asset && (
            <section className="task-details-card">
              <h2 className="task-card-title">Asset details</h2>
              <dl className="task-meta-grid">
                <div>
                  <dt>Asset ID</dt>
                  <dd className="task-id-mono">{complaint.asset.assetId}</dd>
                </div>
                <div>
                  <dt>Asset Name</dt>
                  <dd>{complaint.asset.name}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{complaint.asset.category || "—"}</dd>
                </div>
                <div>
                  <dt>Building</dt>
                  <dd>{complaint.asset.building || "—"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{complaint.asset.location || "—"}</dd>
                </div>
              </dl>
            </section>
          )}

          <section className="task-details-card">
            <h2 className="task-card-title">Classification</h2>
            <dl className="task-meta-grid">
              <div>
                <dt>Category</dt>
                <dd className="task-tag-row">
                  {complaint.confirmedCategory ? (
                    <>
                      <span>{complaint.confirmedCategory}</span>
                      <Badge variant="success">Confirmed by admin</Badge>
                    </>
                  ) : ai?.category ? (
                    <>
                      <span>{ai.category}</span>
                      <Badge variant="neutral">AI suggestion</Badge>
                    </>
                  ) : (
                    <span className="task-muted">Not analysed</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Severity</dt>
                <dd className="task-tag-row">
                  {complaint.confirmedSeverity ? (
                    <>
                      <SeverityBadge severity={complaint.confirmedSeverity} />
                      <Badge variant="success">Confirmed by admin</Badge>
                    </>
                  ) : ai?.severity ? (
                    <>
                      <SeverityBadge severity={ai.severity} />
                      <Badge variant="neutral">AI suggestion</Badge>
                    </>
                  ) : (
                    <span className="task-muted">Not analysed</span>
                  )}
                </dd>
              </div>
            </dl>

            {Array.isArray(ai?.possibleCauses) && ai.possibleCauses.length > 0 && (
              <div className="task-causes-section">
                <div className="task-causes-head">
                  <span className="task-causes-label">Possible causes:</span>
                  <Badge variant="neutral">AI suggestion</Badge>
                </div>
                <ul className="task-causes-list">
                  {ai.possibleCauses.map((cause, idx) => (
                    <li key={idx}>{cause}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="task-details-card">
            <h2 className="task-card-title">Progress history</h2>
            <Timeline items={timelineItems} />
          </section>
        </div>

        {/* Right Column: Workflow Actions */}
        <div className="task-details-col">
          {/* Status: Assigned -> Start work */}
          {isAssigned && (
            <section className="task-details-card task-action-card">
              <h2 className="task-card-title">Start work</h2>
              <p className="task-action-desc">
                When you are ready to begin investigating and resolving this
                complaint, start the task to mark it as In Progress.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartWork}
                disabled={starting}
              >
                {starting ? "Starting work..." : "Start work"}
              </button>
            </section>
          )}

          {/* Status: In Progress -> Resolution Form */}
          {isInProgress && (
            <section className="task-details-card">
              <h2 className="task-card-title">Record maintenance resolution</h2>
              <p className="task-action-desc">
                Fill in the repair details to complete this task and create the
                maintenance record.
              </p>

              <form onSubmit={handleFormSubmit} className="task-resolve-form">
                <div>
                  <Textarea
                    label="Diagnosis"
                    rows={3}
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    error={formErrors.diagnosis}
                    placeholder="Root cause or fault found during inspection..."
                    maxLength={1000}
                    disabled={submitting}
                  />
                  <div className="task-field-counter">
                    {diagnosis.length}/1000
                  </div>
                </div>

                <div>
                  <Textarea
                    label="Action taken"
                    rows={3}
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    error={formErrors.actionTaken}
                    placeholder="Specific repair or replacement steps executed..."
                    maxLength={1000}
                    disabled={submitting}
                  />
                  <div className="task-field-counter">
                    {actionTaken.length}/1000
                  </div>
                </div>

                <div>
                  <Textarea
                    label="Resolution details"
                    rows={3}
                    value={resolutionDetails}
                    onChange={(e) => setResolutionDetails(e.target.value)}
                    error={formErrors.resolutionDetails}
                    placeholder="Outcome of testing, verification, or current state..."
                    maxLength={1000}
                    disabled={submitting}
                  />
                  <div className="task-field-counter">
                    {resolutionDetails.length}/1000
                  </div>
                </div>

                <div>
                  <Input
                    label="Parts used (optional)"
                    type="text"
                    value={partsUsed}
                    onChange={(e) => setPartsUsed(e.target.value)}
                    error={formErrors.partsUsed}
                    placeholder="e.g. 45uF Capacitor, 10A Fuse"
                    maxLength={500}
                    disabled={submitting}
                  />
                  <div className="task-field-counter">
                    {partsUsed.length}/500
                  </div>
                </div>

                <div>
                  <Input
                    label="Cost in ₹ (optional)"
                    type="number"
                    min="0"
                    step="any"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    error={formErrors.cost}
                    placeholder="e.g. 150"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <Textarea
                    label="Notes (optional)"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    error={formErrors.notes}
                    placeholder="Additional recommendations or follow-up notes..."
                    maxLength={500}
                    disabled={submitting}
                  />
                  <div className="task-field-counter">
                    {notes.length}/500
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  Resolve complaint
                </button>
              </form>
            </section>
          )}

          {/* Status: Resolved or Closed -> Read-only Maintenance Record */}
          {isResolvedOrClosed && (
            <section className="task-details-card">
              <h2 className="task-card-title">Maintenance record</h2>
              {maintenance ? (
                <dl className="task-maintenance-dl">
                  <div>
                    <dt>Resolved on</dt>
                    <dd>{formatDateTime(maintenance.completedAt)}</dd>
                  </div>
                  <div>
                    <dt>Technician</dt>
                    <dd>{maintenance.technician?.name || "—"}</dd>
                  </div>
                  <div>
                    <dt>Diagnosis</dt>
                    <dd className="task-text-block">{maintenance.diagnosis}</dd>
                  </div>
                  <div>
                    <dt>Action taken</dt>
                    <dd className="task-text-block">
                      {maintenance.actionTaken}
                    </dd>
                  </div>
                  <div>
                    <dt>Resolution details</dt>
                    <dd className="task-text-block">
                      {maintenance.resolutionDetails}
                    </dd>
                  </div>
                  <div>
                    <dt>Parts used</dt>
                    <dd>{maintenance.partsUsed || "None"}</dd>
                  </div>
                  <div>
                    <dt>Cost</dt>
                    <dd className="task-cost-mono">
                      {maintenance.cost !== undefined &&
                      maintenance.cost !== null
                        ? `₹${maintenance.cost}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Notes</dt>
                    <dd>{maintenance.notes || "None"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="task-muted">
                  Maintenance record is not yet available.
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Resolve complaint?"
        message="Are you sure you want to resolve this task? This will record your maintenance actions and mark the complaint as Resolved."
        confirmLabel="Resolve complaint"
        loading={submitting}
        onConfirm={handleConfirmResolve}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export default TaskDetails;
