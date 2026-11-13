import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileSearch } from "lucide-react";
import {
  getComplaint,
  getComplaintMaintenance,
} from "../../api/complaints.js";
import { useAuth } from "../../context/useAuth.js";
import { formatDateTime } from "../../utils/formatDate.js";
import Alert from "../../components/ui/Alert.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Timeline from "../../components/ui/Timeline.jsx";
import "./UserComplaints.css";

function ComplaintDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [resolution, setResolution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getComplaint(id)
      .then((data) => {
        if (!active) return;
        setComplaint(data);
        setNotFound(false);
        setError("");

        if (
          (data.status === "Resolved" || data.status === "Closed") &&
          user?.role === "user"
        ) {
          getComplaintMaintenance(id)
            .then((maint) => {
              if (active) {
                setResolution(maint || null);
              }
            })
            .catch(() => {
              if (active) {
                setResolution(null);
              }
            });
        } else {
          setResolution(null);
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
  }, [id, user]);

  if (loading) {
    return (
      <div className="complaint-loading-box">
        <Spinner label="Loading complaint details..." />
      </div>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Complaint not found"
        description="This complaint does not exist or you do not have access to view it."
        action={
          <Link to="/dashboard" className="btn btn-primary">
            Back to dashboard
          </Link>
        }
      />
    );
  }

  if (error || !complaint) {
    return (
      <div>
        <Link to="/dashboard" className="complaint-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to my complaints</span>
        </Link>
        <Alert variant="error">{error || "Unable to load complaint"}</Alert>
      </div>
    );
  }

  const timelineItems = (complaint.statusHistory || []).map((entry) => ({
    status: entry.status,
    date: formatDateTime(entry.changedAt),
    by: entry.changedBy?.name,
    note: entry.note,
  }));

  return (
    <div>
      <Link to="/dashboard" className="complaint-back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to my complaints</span>
      </Link>

      <PageHeader
        title={complaint.title}
        subtitle={
          <div className="complaint-details-sub">
            <span className="complaint-id-mono">{complaint.complaintId}</span>
            <StatusBadge status={complaint.status} />
          </div>
        }
      />

      <div className="complaint-details-grid">
        <div className="complaint-details-col">
          <section
            className="complaint-panel"
            aria-labelledby="complaint-details-heading"
          >
            <h2 id="complaint-details-heading" className="complaint-panel-title">
              Details
            </h2>

            <p className="complaint-description">{complaint.description}</p>

            <dl className="complaint-dl">
              <div className="complaint-dl-item">
                <dt>Asset</dt>
                <dd>
                  {complaint.asset
                    ? `${complaint.asset.assetId} – ${complaint.asset.name}`
                    : "—"}
                </dd>
              </div>
              <div className="complaint-dl-item">
                <dt>Location</dt>
                <dd>{complaint.location || "—"}</dd>
              </div>
              <div className="complaint-dl-item complaint-dl-full">
                <dt>Submitted</dt>
                <dd>{formatDateTime(complaint.createdAt)}</dd>
              </div>
            </dl>
          </section>

          {resolution && (
            <section
              className="complaint-panel"
              aria-labelledby="complaint-resolution-heading"
            >
              <h2
                id="complaint-resolution-heading"
                className="complaint-panel-title"
              >
                Resolution
              </h2>

              <p className="complaint-description">
                {resolution.resolutionDetails}
              </p>

              <dl className="complaint-dl">
                <div className="complaint-dl-item">
                  <dt>Completed</dt>
                  <dd>{formatDateTime(resolution.completedAt)}</dd>
                </div>
                <div className="complaint-dl-item">
                  <dt>Technician</dt>
                  <dd>{resolution.technician?.name || "—"}</dd>
                </div>
              </dl>
            </section>
          )}
        </div>

        <section
          className="complaint-panel"
          aria-labelledby="complaint-progress-heading"
        >
          <h2 id="complaint-progress-heading" className="complaint-panel-title">
            Progress
          </h2>
          <Timeline items={timelineItems} />
        </section>
      </div>
    </div>
  );
}

export default ComplaintDetails;
