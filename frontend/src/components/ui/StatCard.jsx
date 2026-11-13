import "./StatCard.css";

function StatCard({ label, value, isMono = false, helper, className = "" }) {
  return (
    <div className={`stat-card ${className}`.trim()}>
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${isMono ? "stat-card-value-mono" : ""}`}>
        {value}
      </div>
      {helper && <div className="stat-card-helper">{helper}</div>}
    </div>
  );
}

export default StatCard;
