import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Lightbulb } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getAnalyticsSummary } from "../../api/analytics.js";
import { listComplaints } from "../../api/complaints.js";
import { effectiveSeverity } from "../../utils/complaints.js";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDate, formatMonth } from "../../utils/formatDate.js";
import { buildInsights } from "../../utils/insights.js";
import Alert from "../../components/ui/Alert.jsx";
import { SeverityBadge } from "../../components/ui/Badge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import "./AdminDashboard.css";

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

function AdminDashboard() {
  // Shared analytics state
  const [summary, setSummary] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  // New submitted complaints state (independent)
  const [submittedComplaints, setSubmittedComplaints] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState("");

  useEffect(() => {
    let active = true;

    // Run summary analytics and newest submitted complaints in parallel
    Promise.all([
      getAnalyticsSummary()
        .then((data) => {
          if (active) {
            setSummary(data);
            setAnalyticsError("");
          }
        })
        .catch((err) => {
          if (active) {
            setAnalyticsError(err.message || "Failed to load summary analytics");
          }
        })
        .finally(() => {
          if (active) {
            setAnalyticsLoading(false);
          }
        }),

      listComplaints({ status: "Submitted" })
        .then((data) => {
          if (active) {
            const list = Array.isArray(data) ? data : [];
            setSubmittedComplaints(list.slice(0, 5));
            setTableError("");
          }
        })
        .catch((err) => {
          if (active) {
            setTableError(err.message || "Failed to load submitted complaints");
          }
        })
        .finally(() => {
          if (active) {
            setTableLoading(false);
          }
        }),
    ]);

    return () => {
      active = false;
    };
  }, []);

  // Filter non-zero categories for the issue distribution donut chart
  const donutData = (summary?.byCategory || []).filter((c) => c.count > 0);
  const totalIssues = donutData.reduce((sum, d) => sum + d.count, 0);

  // Compute insights
  const insights = summary ? buildInsights(summary) : [];

  return (
    <div className="admin-dashboard-page">
      <PageHeader
        title="Admin dashboard"
        subtitle="Operational overview, maintenance trends, and complaints awaiting administrative review."
      />

      {/* a. Row of 4 StatCards */}
      <section className="admin-dashboard-stats-wrap" aria-label="Key metrics">
        {analyticsLoading ? (
          <div className="admin-dashboard-loading-box">
            <Spinner label="Loading metrics..." />
          </div>
        ) : analyticsError ? (
          <Alert variant="error">{analyticsError}</Alert>
        ) : (
          <div className="admin-dashboard-stats-grid">
            <StatCard
              label="Total complaints"
              value={summary?.totals?.complaints ?? 0}
            />
            <StatCard
              label="Open complaints"
              value={summary?.totals?.openComplaints ?? 0}
              helper="Awaiting review, assignment, or work"
            />
            <StatCard
              label="Resolved or closed"
              value={summary?.totals?.resolvedComplaints ?? 0}
            />
            <StatCard
              label="Total maintenance cost"
              value={formatCurrency(summary?.cost?.totalCost ?? 0)}
              isMono={true}
              helper={`${summary?.cost?.recordCount ?? 0} maintenance records`}
            />
          </div>
        )}
      </section>

      {/* b. NEW: Two chart cards side by side */}
      <section
        className="admin-dashboard-charts-section"
        aria-label="Maintenance overview and issue distribution"
      >
        {analyticsLoading ? (
          <div className="admin-dashboard-loading-box">
            <Spinner label="Loading charts..." />
          </div>
        ) : analyticsError ? (
          <Alert variant="error">{analyticsError}</Alert>
        ) : summary?.totals?.complaints === 0 ? (
          <div className="admin-dashboard-chart-card">
            <EmptyState
              title="No chart data available"
              description="Maintenance trends and issue distribution will appear once complaints are submitted."
            />
          </div>
        ) : (
          <div className="admin-dashboard-charts-grid">
            {/* Chart 1: Maintenance overview */}
            <div className="admin-dashboard-chart-card">
              <div className="admin-dashboard-chart-header">
                <h2 className="admin-dashboard-chart-title">
                  Maintenance overview
                </h2>
                <p className="admin-dashboard-chart-sub">
                  Reported vs resolved complaints per month (past 6 months).
                </p>
              </div>
              <div
                className="admin-dashboard-chart-container"
                role="region"
                aria-label="Line chart showing reported vs resolved complaints over the past 6 months"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={summary?.monthly || []}
                    margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2DDD5"
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(m) => formatMonth(m, "short")}
                      tick={{ fill: "#5E6B6C", fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#5E6B6C", fontSize: 12 }}
                    />
                    <Tooltip
                      labelFormatter={(label) => formatMonth(label, "full")}
                      formatter={(val, name) => [val, name]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DDD6CA",
                        borderRadius: "6px",
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                      type="monotone"
                      dataKey="reported"
                      name="Reported"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "var(--primary)" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      name="Resolved"
                      stroke="var(--sev-low)"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={{ r: 4, fill: "var(--sev-low)" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Issue distribution */}
            <div className="admin-dashboard-chart-card">
              <div className="admin-dashboard-chart-header">
                <h2 className="admin-dashboard-chart-title">
                  Issue distribution
                </h2>
                <p className="admin-dashboard-chart-sub">
                  Proportion of complaints by infrastructure category.
                </p>
              </div>
              <div
                className="admin-dashboard-donut-wrap"
                role="region"
                aria-label="Donut chart showing complaint distribution by category"
              >
                <div className="admin-dashboard-donut-chart-box">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="count"
                        nameKey="category"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {donutData.map((entry, index) => (
                          <Cell
                            key={entry.category}
                            fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} (${totalIssues > 0 ? Math.round((value / totalIssues) * 100) : 0}%)`,
                          name,
                        ]}
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #DDD6CA",
                          borderRadius: "6px",
                        }}
                      />
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="admin-donut-center-total"
                      >
                        {totalIssues}
                      </text>
                      <text
                        x="50%"
                        y="62%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="admin-donut-center-label"
                      >
                        Issues
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut Legend */}
                <div className="admin-donut-legend">
                  {donutData.map((item, index) => {
                    const pct =
                      totalIssues > 0
                        ? Math.round((item.count / totalIssues) * 100)
                        : 0;
                    return (
                      <div
                        key={item.category}
                        className="admin-donut-legend-item"
                      >
                        <span
                          className="admin-donut-legend-color"
                          style={{
                            backgroundColor:
                              CHART_PALETTE[index % CHART_PALETTE.length],
                          }}
                        />
                        <span className="admin-donut-legend-name">
                          {item.category}
                        </span>
                        <span className="admin-donut-legend-count">
                          {item.count}
                        </span>
                        <span className="admin-donut-legend-pct">
                          ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* c. Keep the Awaiting review table */}
      <section
        className="admin-dashboard-section"
        aria-labelledby="submitted-complaints-heading"
      >
        <div className="admin-dashboard-section-header">
          <div>
            <h2
              id="submitted-complaints-heading"
              className="admin-dashboard-section-title"
            >
              Complaints awaiting review
            </h2>
            <p className="admin-dashboard-section-sub">
              Newest complaints with status Submitted.
            </p>
          </div>
          <Link to="/admin/complaints" className="admin-dashboard-view-all">
            <span>View all complaints</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        {tableLoading ? (
          <div className="admin-dashboard-loading-box">
            <Spinner label="Loading submitted complaints..." />
          </div>
        ) : tableError ? (
          <Alert variant="error">{tableError}</Alert>
        ) : submittedComplaints.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No complaints awaiting review"
            description="All submitted complaints have been reviewed or assigned."
            action={
              <Link to="/admin/complaints" className="btn btn-secondary">
                View all complaints
              </Link>
            }
          />
        ) : (
          <>
            <div className="admin-dashboard-table-wrap">
              <table className="admin-dashboard-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submittedComplaints.map((complaint) => (
                    <tr key={complaint._id}>
                      <td>
                        <Link
                          to={`/admin/complaints/${complaint._id}`}
                          className="complaint-id-mono"
                        >
                          {complaint.complaintId}
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={`/admin/complaints/${complaint._id}`}
                          className="admin-dashboard-title-link"
                        >
                          {complaint.title}
                        </Link>
                      </td>
                      <td>
                        <SeverityBadge
                          severity={effectiveSeverity(complaint)}
                        />
                      </td>
                      <td>{formatDate(complaint.createdAt)}</td>
                      <td>
                        <Link
                          to={`/admin/complaints/${complaint._id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card stack */}
            <div className="admin-dashboard-mobile-list">
              {submittedComplaints.map((complaint) => (
                <Link
                  key={complaint._id}
                  to={`/admin/complaints/${complaint._id}`}
                  className="admin-dashboard-mobile-card"
                >
                  <div className="admin-dashboard-mobile-card-top">
                    <span className="complaint-id-mono">
                      {complaint.complaintId}
                    </span>
                    <SeverityBadge severity={effectiveSeverity(complaint)} />
                  </div>
                  <div className="admin-dashboard-mobile-card-title">
                    {complaint.title}
                  </div>
                  <div className="admin-dashboard-mobile-card-meta">
                    <span>{formatDate(complaint.createdAt)}</span>
                    <span className="admin-dashboard-mobile-action">
                      Review &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* d. NEW: Automated insights */}
      <section
        className="admin-dashboard-section admin-dashboard-insights-section"
        aria-labelledby="automated-insights-heading"
      >
        <div className="admin-dashboard-section-header">
          <div>
            <h2
              id="automated-insights-heading"
              className="admin-dashboard-section-title"
            >
              Automated insights
            </h2>
            <p className="admin-dashboard-section-sub">
              Calculated from complaint data using fixed rules. These are
              statistics, not predictions.
            </p>
          </div>
        </div>

        {analyticsLoading ? (
          <div className="admin-dashboard-loading-box">
            <Spinner label="Calculating insights..." />
          </div>
        ) : analyticsError ? (
          <Alert variant="error">{analyticsError}</Alert>
        ) : insights.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="Not enough data yet"
            description="Automated rule-based insights will appear once complaints are recorded."
          />
        ) : (
          <div className="admin-insights-grid">
            {insights.map((insight) => (
              <div key={insight.id} className="admin-insight-card">
                <div className="admin-insight-chips">
                  <span className="insight-chip-type">{insight.type}</span>
                  <span className="insight-chip-rule">Rule-based</span>
                </div>
                <p className="admin-insight-text">{insight.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
