import { useId } from "react";
import "./Select.css";

function Select({
  label,
  id,
  error,
  hint,
  className = "",
  children,
  ...props
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && (
        <label htmlFor={selectId} className="ui-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`ui-select ${error ? "ui-select-invalid" : ""}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </select>
      {hint && (
        <p id={hintId} className="ui-field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="ui-select-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default Select;
