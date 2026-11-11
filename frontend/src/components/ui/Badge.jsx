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

export default Badge;
