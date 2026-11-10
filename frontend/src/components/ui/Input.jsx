import { useId } from "react";
import "./Input.css";

function Input({ label, id, error, type = "text", className = "", ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="ui-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`ui-input ${error ? "ui-input-invalid" : ""}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        {...props}
      />
      {error && (
        <p id={errorId} className="ui-input-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
