import { useEffect, useId, useRef } from "react";
import "./ConfirmDialog.css";

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousFocus = document.activeElement;
    cancelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    };
  }, [open, loading, onCancel]);

  if (!open) {
    return null;
  }

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !loading) {
      onCancel();
    }
  };

  return (
    <div className="ui-dialog-overlay" onClick={handleOverlayClick}>
      <div
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <h2 id={titleId} className="ui-dialog-title">
          {title}
        </h2>
        <p id={messageId} className="ui-dialog-message">
          {message}
        </p>
        <div className="ui-dialog-actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${
              confirmVariant === "danger" ? "btn-danger" : "btn-primary"
            }`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
