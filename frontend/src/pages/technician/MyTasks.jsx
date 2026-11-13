import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";
import { getAssignedComplaints } from "../../api/complaints.js";
import { effectiveSeverity } from "../../utils/complaints.js";
import { formatDate } from "../../utils/formatDate.js";
import Alert from "../../components/ui/Alert.jsx";
import {
  SeverityBadge,
  StatusBadge,
} from "../../components/ui/Badge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import "./MyTasks.css";

const TECHNICIAN_STATUS_OPTIONS = [
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
];

function formatAsset(asset) {
  if (!asset) return "—";
  return `${asset.assetId} – ${asset.name}`;
}

function MyTasks() {
  const [status, setStatus] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getAssignedComplaints(status)
      .then((data) => {
        if (active) {
          setTasks(Array.isArray(data) ? data : []);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load assigned tasks");
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
  }, [status]);

  return (
    <div>
      <PageHeader
        title="My Tasks"
        subtitle="Manage and resolve maintenance complaints assigned to you."
      />

      <section className="technician-tasks-filters" aria-label="Filters">
        <div className="technician-filter-select">
          <Select
            label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {TECHNICIAN_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </Select>
        </div>
      </section>

      {error && (
        <div className="technician-tasks-alert">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="technician-tasks-loading">
          <Spinner label="Loading tasks..." />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No tasks found"
          description={
            status
              ? "No tasks match the selected status filter."
              : "You have no tasks assigned at the moment."
          }
          action={
            status ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStatus("")}
              >
                Clear filter
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="technician-tasks-table-wrap">
            <table className="technician-tasks-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Asset</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Assigned Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const sev = effectiveSeverity(task);
                  return (
                    <tr key={task._id}>
                      <td className="technician-task-id-cell">
                        <Link
                          to={`/technician/tasks/${task._id}`}
                          className="technician-task-id"
                        >
                          {task.complaintId}
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={`/technician/tasks/${task._id}`}
                          className="technician-task-title-link"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td>{formatAsset(task.asset)}</td>
                      <td>{task.location || "—"}</td>
                      <td>
                        {sev ? (
                          <SeverityBadge severity={sev} />
                        ) : (
                          <span className="technician-muted">Not analysed</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={task.status} />
                      </td>
                      <td>{formatDate(task.assignedAt || task.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="technician-tasks-cards">
            {tasks.map((task) => {
              const sev = effectiveSeverity(task);
              return (
                <Link
                  key={task._id}
                  to={`/technician/tasks/${task._id}`}
                  className="technician-task-card"
                >
                  <div className="technician-task-card-top">
                    <span className="technician-task-id">
                      {task.complaintId}
                    </span>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="technician-task-card-title">{task.title}</div>
                  <div className="technician-task-card-badges">
                    {sev ? (
                      <SeverityBadge severity={sev} />
                    ) : (
                      <span className="technician-muted">Not analysed</span>
                    )}
                  </div>
                  <div className="technician-task-card-meta">
                    <div>
                      <strong>Asset:</strong> {formatAsset(task.asset)}
                    </div>
                    <div>
                      <strong>Location:</strong> {task.location || "—"}
                    </div>
                    <div>
                      <strong>Assigned:</strong>{" "}
                      {formatDate(task.assignedAt || task.createdAt)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default MyTasks;
