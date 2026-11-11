import "./Badge.css";

const ASSET_STATUS_VARIANT = {
  Operational: "success",
  "Under Maintenance": "warning",
  "Out of Service": "neutral",
};

const ASSET_CONDITION_VARIANT = {
  Good: "success",
  Fair: "warning",
  Poor: "danger",
};

const COMPLAINT_STATUS_VARIANT = {
  Submitted: "st-submitted",
  "Under Review": "st-review",
  Assigned: "st-assigned",
  "In Progress": "st-progress",
  Resolved: "st-resolved",
  Closed: "st-closed",
};

function Badge({ variant = "neutral", children, className = "" }) {
  return (
    <span className={`ui-badge ui-badge-${variant} ${className}`.trim()}>
      {children}
    </span>
  );
}

export function AssetStatusBadge({ status }) {
  const variant = ASSET_STATUS_VARIANT[status] || "neutral";
  return <Badge variant={variant}>{status}</Badge>;
}

export function AssetConditionBadge({ condition }) {
  const variant = ASSET_CONDITION_VARIANT[condition] || "neutral";
  return <Badge variant={variant}>{condition}</Badge>;
}

export function StatusBadge({ status }) {
  const variant = COMPLAINT_STATUS_VARIANT[status] || "neutral";
  return <Badge variant={variant}>{status}</Badge>;
}

export default Badge;
