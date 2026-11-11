import { useId } from "react";
import "./Textarea.css";

function Textarea({
  label,
  id,
  error,
  rows = 3,
  className = "",
  ...props
}) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const errorId = error ? `${textareaId}-error` : undefined;

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
        aria-describedby={errorId}
        {...props}
      />
      {error && (
        <p id={errorId} className="ui-textarea-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default Textarea;
