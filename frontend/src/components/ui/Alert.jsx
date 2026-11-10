import { AlertCircle, CheckCircle2 } from "lucide-react";
import "./Alert.css";

function Alert({ variant = "error", children, className = "" }) {
  if (!children) {
    return null;
  }

  const isSuccess = variant === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={`ui-alert ${isSuccess ? "ui-alert-success" : "ui-alert-error"} ${className}`.trim()}
      role={isSuccess ? "status" : "alert"}
    >
      <Icon size={18} className="ui-alert-icon" aria-hidden="true" />
      <span className="ui-alert-text">{children}</span>
    </div>
  );
}

export default Alert;
