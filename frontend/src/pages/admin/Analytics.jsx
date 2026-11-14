import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Wrench } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { getAnalyticsSummary } from "../../api/analytics.js";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatHours, formatMonth } from "../../utils/formatDate.js";
import Alert from "../../components/ui/Alert.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import "./Analytics.css";

// Colors from styles/tokens.css
const STATUS_COLORS = {
  Submitted: "var(--st-submitted)",
  "Under Review": "var(--st-review)",
  Assigned: "var(--st-assigned)",
  "In Progress": "var(--st-progress)",
  Resolved: "var(--st-resolved)",
  Closed: "var(--st-closed)",
};

const SEVERITY_COLORS = {
  Low: "var(--sev-low)",
  Medium: "var(--sev-medium)",
  High: "var(--sev-high)",
  Critical: "var(--sev-critical)",
  "Not analysed": "var(--text-muted)",
};

const PRIMARY_COLOR = "var(--primary)";

function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getAnalyticsSummary()
      .then((res) => {
        if (active) {
          setData(res);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load analytics");
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
  }, []);

  if (loading) {
    return (
      <div className="analytics-loading-box">
        <Spinner label="Loading analytics..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          subtitle="System metrics, maintenance costs, and complaint distribution."
        />
        <Alert variant="error">{error || "Unable to load analytics."}</Alert>
      </div>
    );
  }

  const {
    totals,
    byStatus,
    byCategory,
    bySeverity,
    cost,
    frequentAssets,
    monthly,
    resolution,
    byLocation,
    technicians,
  } = data;

  // Max count for proportional bars in frequent assets
  const maxAssetCount = Math.max(
    ...(frequentAssets || []).map((a) => a.count),
    1
  );

  return (
    <div className="analytics-page">
      <PageHeader
        title="Analytics"
        subtitle="System metrics, maintenance trends, resolution times, and staff performance."
      />

      {/* a. Row of 4 StatCards */}
      <section
        className="analytics-top-stats-grid"
        aria-label="High-level performance metrics"
      >
        <StatCard
          label="Average resolution"
          value={formatHours(resolution?.averageResolutionHours)}
          isMono={resolution?.averageResolutionHours !== null}
          helper={
            resolution?.resolvedCount
              ? `Calculated across ${resolution.resolvedCount} resolved issues`
              : "No resolved complaints yet"
          }
        />
        <StatCard
          label="Open complaints"
          value={totals?.openComplaints ?? 0}
          helper="Awaiting review, assignment, or completion"
        />
        <StatCard
          label="Resolved or closed"
          value={totals?.resolvedComplaints ?? 0}
          helper="Completed infrastructure repairs"
        />
        <StatCard
          label="Total cost"
          value={formatCurrency(cost?.totalCost ?? 0)}
          isMono={true}
          helper={
            <span>
              {cost?.averageCost !== null && cost?.averageCost !== undefined
                ? `Average cost per record: ${formatCurrency(cost.averageCost)} · `
                : ""}
              <Link to="/admin/costs" className="stat-card-link">
                View cost details
              </Link>
            </span>
          }
        />
      </section>

      {totals?.complaints === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No complaints yet"
          description="Analytics and distribution charts will appear once complaints are submitted and processed."
        />
      ) : (
        <>
          {/* b. 6 Charts in a two-column grid */}
          <div className="analytics-charts-grid">
            {/* 1. Maintenance trends (bar, complaints reported per month) */}
            <div className="analytics-chart-card">
              <div className="analytics-chart-header">
                <h2 className="analytics-chart-title">Maintenance trends</h2>
                <p className="analytics-chart-desc">
                  Complaints reported per month over the past 6 months.
                </p>
              </div>
              <div
                className="analytics-chart-container"
                role="region"
                aria-label="Bar chart showing complaints reported per month"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={monthly || []}
                    margin={{ top: 20, right: 10, left: -15, bottom: 5 }}
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
                      labelFormatter={(m) => formatMonth(m, "full")}
                      formatter={(val) => [val, "Reported"]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DDD6CA",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="reported" fill={PRIMARY_COLOR} radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="reported"
                        position="top"
                        fill="#1F2A2B"
                        fontSize={12}
                        fontWeight={600}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Issues by category (horizontal bars) */}
            <div className="analytics-chart-card">
              <div className="analytics-chart-header">
                <h2 className="analytics-chart-title">Issues by category</h2>
                <p className="analytics-chart-desc">
                  Complaint volume grouped by effective category.
                </p>
              </div>
              <div
                className="analytics-chart-container"
                role="region"
                aria-label="Horizontal bar chart showing issues by category"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    layout="vertical"
                    data={byCategory || []}
                    margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#E2DDD5"
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: "#5E6B6C", fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={100}
                      tick={{ fill: "#5E6B6C", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(val) => [val, "Complaints"]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DDD6CA",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="count" fill={PRIMARY_COLOR} radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="count"
                        position="right"
                        fill="#1F2A2B"
                        fontSize={12}
                        fontWeight={600}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Issues by location (bars from byLocation) */}
            <div className="analytics-chart-card">
              <div className="analytics-chart-header">
                <h2 className="analytics-chart-title">Issues by location</h2>
                <p className="analytics-chart-desc">
                  Top locations reported (building or campus area).
                </p>
              </div>
              <div
                className="analytics-chart-container"
                role="region"
                aria-label="Horizontal bar chart showing issues by location"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    layout="vertical"
                    data={byLocation || []}
                    margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#E2DDD5"
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: "#5E6B6C", fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="location"
                      width={110}
                      tick={{ fill: "#5E6B6C", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(val) => [val, "Complaints"]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DDD6CA",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="count" fill={PRIMARY_COLOR} radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="count"
                        position="right"
                        fill="#1F2A2B"
                        fontSize={12}
                        fontWeight={600}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Maintenance cost (line, monthly cost in INR) */}
            <div className="analytics-chart-card">
              <div className="analytics-chart-header">
                <h2 className="analytics-chart-title">Maintenance cost</h2>
                <p className="analytics-chart-desc">
                  Completed repair expenditure per month in Indian rupees.
                </p>
              </div>
              <div
                className="analytics-chart-container"
                role="region"
                aria-label="Line chart showing monthly maintenance expenditure"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={monthly || []}
                    margin={{ top: 20, right: 15, left: 0, bottom: 5 }}
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
                      tick={{ fill: "#5E6B6C", fontSize: 11 }}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      labelFormatter={(m) => formatMonth(m, "full")}
                      formatter={(val) => [formatCurrency(val), "Cost"]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DDD6CA",
                        borderRadius: "6px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      name="Cost"
                      stroke={PRIMARY_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: PRIMARY_COLOR }}
                      activeDot={{ r: 6 }}
                    >
                      <LabelList
                        dataKey="cost"
                        position="top"
                        formatter={(v) => (v > 0 ? `₹${v}` : "0")}
                        fill="#1F2A2B"
                        fontSize={11}
                        fontWeight={600}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 5. Complaints by status (bars in lifecycle order, --st-* tokens) */}
            <div className="analytics-chart-card">
              <div className="analytics-chart-header">
                <h2 className="analytics-chart-title">Complaints by status</h2>
                <p className="analytics-chart-desc">
                  Distribution across all 6 lifecycle stages in order.
                </p>
              </div>
              <div
                className="analytics-chart-container"
                role="region"
                aria-label="Bar chart showing complaints by status"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={byStatus || []}
                    margin={{ top: 20, right: 10, left: -15, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2DDD5"
                    />
                    <XAxis
                      dataKey="status"
                      tick={{ fill: "#5E6B6C", fontSize: 12 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={45}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#5E6B6C", fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(val) => [val, "Complaints"]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DDD6CA",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(byStatus || []).map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] || PRIMARY_COLOR}
                        />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        fill="#1F2A2B"
                        fontSize={12}
                        fontWeight={600}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 6. Complaints by severity (bars, --sev-* tokens) */}
            <div className="analytics-chart-card">
              <div className="analytics-chart-header">
                <h2 className="analytics-chart-title">Complaints by severity</h2>
                <p className="analytics-chart-desc">
                  Effective severity level (confirmed or AI suggestion).
                </p>
              </div>
              <div
                className="analytics-chart-container"
                role="region"
                aria-label="Bar chart showing complaints by severity"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={bySeverity || []}
                    margin={{ top: 20, right: 10, left: -15, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2DDD5"
                    />
                    <XAxis
                      dataKey="severity"
                      tick={{ fill: "#5E6B6C", fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#5E6B6C", fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(val) => [val, "Complaints"]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DDD6CA",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(bySeverity || []).map((entry) => (
                        <Cell
                          key={entry.severity}
                          fill={SEVERITY_COLORS[entry.severity] || PRIMARY_COLOR}
                        />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        fill="#1F2A2B"
                        fontSize={12}
                        fontWeight={600}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* c. Most reported assets (ranked rows with proportional bar) */}
          <section
            className="analytics-section"
            aria-labelledby="ranked-assets-heading"
          >
            <div className="analytics-section-header">
              <h2 id="ranked-assets-heading" className="analytics-section-title">
                Most reported assets
              </h2>
              <p className="analytics-section-sub">
                Top assets ranked by total complaint volume (all time).
              </p>
            </div>

            {!frequentAssets || frequentAssets.length === 0 ? (
              <p className="analytics-empty-note">
                No asset-linked complaints recorded yet.
              </p>
            ) : (
              <div className="analytics-ranked-assets-wrap">
                <table className="analytics-ranked-table">
                  <thead>
                    <tr>
                      <th className="analytics-th-rank">#</th>
                      <th>Asset ID</th>
                      <th>Name</th>
                      <th>Building</th>
                      <th className="analytics-th-bar">Volume</th>
                      <th className="analytics-th-count">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frequentAssets.map((asset, index) => {
                      const pct = Math.round(
                        (asset.count / maxAssetCount) * 100
                      );
                      return (
                        <tr key={asset._id}>
                          <td className="analytics-td-rank">{index + 1}</td>
                          <td>
                            <Link
                              to={`/admin/assets/${asset._id}`}
                              className="asset-id-mono analytics-asset-id-link"
                            >
                              {asset.assetId}
                            </Link>
                          </td>
                          <td>
                            <Link
                              to={`/admin/assets/${asset._id}`}
                              className="analytics-asset-name-link"
                            >
                              {asset.name}
                            </Link>
                          </td>
                          <td>{asset.building || "—"}</td>
                          <td className="analytics-td-bar">
                            <div className="analytics-bar-track">
                              <div
                                className="analytics-bar-fill"
                                style={{ width: `${pct}%` }}
                                title={`${asset.count} complaints`}
                              />
                            </div>
                          </td>
                          <td className="analytics-td-count">
                            <span className="analytics-count-mono">
                              {asset.count}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* d. NEW: Technician performance */}
          <section
            className="analytics-section"
            aria-labelledby="tech-perf-heading"
          >
            <div className="analytics-section-header">
              <h2 id="tech-perf-heading" className="analytics-section-title">
                Technician performance
              </h2>
              <p className="analytics-section-sub">
                Workload and resolution speed for maintenance staff.
              </p>
            </div>

            {!technicians || technicians.length === 0 ? (
              <p className="analytics-empty-note">
                No technician accounts found.
              </p>
            ) : (
              <div className="analytics-tech-grid">
                {technicians.map((tech) => (
                  <div key={tech._id} className="analytics-tech-card">
                    <div className="analytics-tech-header">
                      <div className="analytics-tech-name-box">
                        <Wrench
                          size={16}
                          className="analytics-tech-icon"
                          aria-hidden="true"
                        />
                        <span className="analytics-tech-name">{tech.name}</span>
                      </div>
                      <div className="analytics-tech-status-badges">
                        {!tech.isActive && (
                          <span className="tech-badge-inactive">Inactive</span>
                        )}
                        <span
                          className={`tech-badge-active-tasks ${
                            tech.activeTasks > 0
                              ? "tech-badge-has-tasks"
                              : "tech-badge-no-tasks"
                          }`}
                        >
                          {tech.activeTasks > 0
                            ? `${tech.activeTasks} active`
                            : "No active tasks"}
                        </span>
                      </div>
                    </div>

                    <div className="analytics-tech-metrics">
                      <div className="analytics-tech-metric">
                        <span className="analytics-tech-metric-label">
                          Resolved tasks:
                        </span>
                        <span className="analytics-tech-metric-val">
                          {tech.resolvedCount}
                        </span>
                      </div>
                      <div className="analytics-tech-metric">
                        <span className="analytics-tech-metric-label">
                          Avg. resolution time:
                        </span>
                        <span className="analytics-tech-metric-val">
                          {tech.averageResolutionHours !== null
                            ? `${tech.averageResolutionHours} hrs`
                            : "No data yet"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Analytics;
