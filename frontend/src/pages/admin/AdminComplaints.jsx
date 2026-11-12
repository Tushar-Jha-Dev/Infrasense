import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { listComplaints } from "../../api/complaints.js";
import { CATEGORIES } from "../../constants/categories.js";
import { COMPLAINT_STATUSES, SEVERITIES } from "../../constants/complaints.js";
import {
  effectiveCategory,
  effectiveSeverity,
  isConfirmed,
} from "../../utils/complaints.js";
import { formatDate } from "../../utils/formatDate.js";
import Alert from "../../components/ui/Alert.jsx";
import Badge, {
  SeverityBadge,
  StatusBadge,
} from "../../components/ui/Badge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import "./AdminComplaints.css";

function AdminComplaints() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [needsReview, setNeedsReview] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    listComplaints({
      search: debouncedSearch,
      status,
      severity,
      category,
      needsReview,
    })
      .then((data) => {
        if (active) {
          setComplaints(Array.isArray(data) ? data : []);
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
  }, [debouncedSearch, status, severity, category, needsReview]);

  const hasFilters = Boolean(
    debouncedSearch || status || severity || category || needsReview
  );

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatus("");
    setSeverity("");
    setCategory("");
    setNeedsReview(false);
  };

  return (
    <div>
      <PageHeader
        title="Complaints"
        subtitle="Review, classify, assign, and close reported issues."
      />

      <section className="admin-complaints-filters" aria-label="Filters">
        <div className="admin-filter-search">
          <Input
            label="Search"
            placeholder="Search ID or title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="">All severities</option>
          {SEVERITIES.map((sev) => (
            <option key={sev} value={sev}>
              {sev}
            </option>
          ))}
        </Select>
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>
        <label className="admin-filter-checkbox">
          <input
            type="checkbox"
            checked={needsReview}
            onChange={(e) => setNeedsReview(e.target.checked)}
          />
          <span>Needs review only</span>
        </label>
      </section>

      {error && (
        <div className="admin-complaints-alert">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="admin-complaints-loading">
          <Spinner label="Loading complaints..." />
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No complaints found"
          description={
            hasFilters
              ? "Try adjusting or clearing your filters."
              : "No complaints have been submitted yet."
          }
          action={
            hasFilters ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetFilters}
              >
                Clear filters
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="admin-complaints-table-wrap">
            <table className="admin-complaints-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Submitted by</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => {
                  const cat = effectiveCategory(c);
                  const sev = effectiveSeverity(c);
                  const confirmed = isConfirmed(c);
                  const showNeedsReview =
                    Boolean(c.aiAnalysis?.needsReview) && !confirmed;

                  return (
                    <tr key={c._id}>
                      <td className="admin-complaint-id-cell">
                        <Link
                          to={`/admin/complaints/${c._id}`}
                          className="admin-complaint-link"
                        >
                          <span className="admin-complaint-id">
                            {c.complaintId}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={`/admin/complaints/${c._id}`}
                          className="admin-complaint-title-link"
                        >
                          {c.title}
                        </Link>
                      </td>
                      <td>
                        {cat ? (
                          <span>{cat}</span>
                        ) : (
                          <span className="admin-not-analysed">
                            Not analysed
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="admin-severity-cell">
                          {sev ? (
                            <SeverityBadge severity={sev} />
                          ) : (
                            <span className="admin-not-analysed">
                              Not analysed
                            </span>
                          )}
                          {(cat || sev) && (
                            <Badge variant={confirmed ? "success" : "neutral"}>
                              {confirmed ? "Confirmed" : "AI suggestion"}
                            </Badge>
                          )}
                          {showNeedsReview && (
                            <Badge variant="warning">Needs review</Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td>{c.submittedBy?.name || "—"}</td>
                      <td>{formatDate(c.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-complaints-cards">
            {complaints.map((c) => {
              const cat = effectiveCategory(c);
              const sev = effectiveSeverity(c);
              const confirmed = isConfirmed(c);
              const showNeedsReview =
                Boolean(c.aiAnalysis?.needsReview) && !confirmed;

              return (
                <Link
                  key={c._id}
                  to={`/admin/complaints/${c._id}`}
                  className="admin-complaint-card"
                >
                  <div className="admin-complaint-card-top">
                    <span className="admin-complaint-id">{c.complaintId}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="admin-complaint-card-title">{c.title}</div>
                  <div className="admin-complaint-card-badges">
                    {sev ? (
                      <SeverityBadge severity={sev} />
                    ) : (
                      <span className="admin-not-analysed">Not analysed</span>
                    )}
                    {(cat || sev) && (
                      <Badge variant={confirmed ? "success" : "neutral"}>
                        {confirmed ? "Confirmed" : "AI suggestion"}
                      </Badge>
                    )}
                    {showNeedsReview && (
                      <Badge variant="warning">Needs review</Badge>
                    )}
                  </div>
                  <div className="admin-complaint-card-meta">
                    <span>{cat || "Not analysed"}</span>
                    <span>•</span>
                    <span>{c.submittedBy?.name || "—"}</span>
                    <span>•</span>
                    <span>{formatDate(c.createdAt)}</span>
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

export default AdminComplaints;
