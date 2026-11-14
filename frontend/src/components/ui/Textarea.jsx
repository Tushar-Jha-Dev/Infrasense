import { useId } from "react";
import "./Textarea.css";

function Textarea({
  label,
  id,
  error,
  hint,
  rows = 3,
  className = "",
  ...props
}) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const errorId = error ? `${textareaId}-error` : undefined;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && (
        <label htmlFor={textareaId} className="ui-label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`ui-textarea ${error ? "ui-textarea-invalid" : ""}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p id={hintId} className="ui-field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="ui-textarea-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default Textarea;
