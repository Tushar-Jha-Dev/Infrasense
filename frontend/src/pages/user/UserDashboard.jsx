import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Plus } from "lucide-react";
import { getMyComplaints } from "../../api/complaints.js";
import { COMPLAINT_STATUSES } from "../../constants/complaints.js";
import { formatDate } from "../../utils/formatDate.js";
import Alert from "../../components/ui/Alert.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import "./UserComplaints.css";

function formatAssetOrLocation(complaint) {
  if (complaint.asset) {
    return `${complaint.asset.assetId} – ${complaint.asset.name}`;
  }
  return complaint.location || "—";
}

function summarizeComplaints(list) {
  const total = list.length;
  const resolvedOrClosed = list.filter(
    (item) => item.status === "Resolved" || item.status === "Closed"
  ).length;
  return {
    total,
    open: total - resolvedOrClosed,
    resolvedOrClosed,
  };
}

function UserDashboard() {
  const [statusFilter, setStatusFilter] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, resolvedOrClosed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getMyComplaints({ status: statusFilter })
      .then((data) => {
        if (active) {
          const list = Array.isArray(data) ? data : [];
          setComplaints(list);
          if (!statusFilter) {
            setStats(summarizeComplaints(list));
          }
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load complaints");
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
  }, [statusFilter]);

  return (
    <div>
      <PageHeader
        title="My complaints"
        subtitle="Track infrastructure issues you have reported."
        actions={
          <Link to="/complaints/new" className="btn btn-primary">
            <Plus size={16} aria-hidden="true" />
            <span>Report a problem</span>
          </Link>
        }
      />

      <section className="user-stats-grid" aria-label="Complaint summary">
        <div className="user-stat-card">
          <div className="user-stat-label">Total</div>
          <div className="user-stat-value">{stats.total}</div>
        </div>
        <div className="user-stat-card">
          <div className="user-stat-label">Open</div>
          <div className="user-stat-value">{stats.open}</div>
        </div>
        <div className="user-stat-card">
          <div className="user-stat-label">Resolved or Closed</div>
          <div className="user-stat-value">{stats.resolvedOrClosed}</div>
        </div>
      </section>

      <div className="user-filter-bar">
        <div className="user-filter-select">
          <Select
            label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setLoading(true);
            }}
          >
            <option value="">All statuses</option>
            {COMPLAINT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>

        {statusFilter && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setStatusFilter("");
              setLoading(true);
            }}
          >
            Clear filter
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="complaint-loading-box">
          <Spinner label="Loading your complaints..." />
        </div>
      ) : !error && complaints.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            statusFilter
              ? `No ${statusFilter} complaints`
              : "No complaints yet"
          }
          description={
            statusFilter
              ? "Try choosing another status or clearing the filter."
              : "Report an infrastructure issue on campus to start tracking its repair."
          }
          action={
            statusFilter ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setStatusFilter("");
                  setLoading(true);
                }}
              >
                Clear filter
              </button>
            ) : (
              <Link to="/complaints/new" className="btn btn-primary">
                Report a problem
              </Link>
            )
          }
        />
      ) : !error ? (
        <>
          <div className="complaints-table-wrap">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Asset / Location</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <tr key={complaint._id}>
                    <td>
                      <Link
                        to={`/complaints/${complaint._id}`}
                        className="complaint-id-mono"
                      >
                        {complaint.complaintId}
                      </Link>
                    </td>
                    <td>
                      <Link
                        to={`/complaints/${complaint._id}`}
                        className="complaint-row-link"
                      >
                        {complaint.title}
                      </Link>
                    </td>
                    <td>{formatAssetOrLocation(complaint)}</td>
                    <td>
                      <StatusBadge status={complaint.status} />
                    </td>
                    <td>{formatDate(complaint.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="complaints-mobile-list">
            {complaints.map((complaint) => (
              <Link
                key={complaint._id}
                to={`/complaints/${complaint._id}`}
                className="complaint-mobile-card"
              >
                <div className="complaint-mobile-top">
                  <span className="complaint-id-mono">
                    {complaint.complaintId}
                  </span>
                  <StatusBadge status={complaint.status} />
                </div>
                <div className="complaint-mobile-title">{complaint.title}</div>
                <div className="complaint-mobile-meta">
                  <span>{formatAssetOrLocation(complaint)}</span>
                  <span>{formatDate(complaint.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default UserDashboard;
