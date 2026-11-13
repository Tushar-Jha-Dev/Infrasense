import { formatDateTime } from "../../utils/formatDate.js";
import "./MaintenanceRecordView.css";

const inrCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatCost(cost) {
  if (typeof cost === "number" && !Number.isNaN(cost)) {
    return inrCurrencyFormatter.format(cost);
  }
  if (cost !== undefined && cost !== null && cost !== "") {
    const num = Number(cost);
    if (!Number.isNaN(num)) {
      return inrCurrencyFormatter.format(num);
    }
  }
  return "—";
}

function MaintenanceRecordView({ record }) {
  if (!record) {
    return null;
  }

  return (
    <dl className="maintenance-record-dl">
      <div>
        <dt>Completed date</dt>
        <dd>{formatDateTime(record.completedAt)}</dd>
      </div>
      <div>
        <dt>Technician</dt>
        <dd>{record.technician?.name || "—"}</dd>
      </div>
      <div>
        <dt>Diagnosis</dt>
        <dd className="maintenance-text-block">{record.diagnosis}</dd>
      </div>
      <div>
        <dt>Action taken</dt>
        <dd className="maintenance-text-block">{record.actionTaken}</dd>
      </div>
      <div>
        <dt>Resolution details</dt>
        <dd className="maintenance-text-block">{record.resolutionDetails}</dd>
      </div>
      <div>
        <dt>Parts used</dt>
        <dd>{record.partsUsed || "None"}</dd>
      </div>
      <div>
        <dt>Cost</dt>
        <dd className="maintenance-cost-mono">{formatCost(record.cost)}</dd>
      </div>
      <div>
        <dt>Notes</dt>
        <dd>{record.notes || "None"}</dd>
      </div>
    </dl>
  );
}

export default MaintenanceRecordView;
