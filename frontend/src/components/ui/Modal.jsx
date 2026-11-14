import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import "./Modal.css";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Modal({
  open = true,
  onClose,
  title,
  subtitle,
  children,
  className = "",
  ariaLabelledBy,
}) {
  const generatedTitleId = useId();
  const titleId = ariaLabelledBy || generatedTitleId;
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;

    const modalEl = modalRef.current;
    if (modalEl) {
      const focusable = modalEl.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        const firstInput = modalEl.querySelector("input:not([disabled])");
        if (firstInput) {
          firstInput.focus();
        } else {
          focusable[0].focus();
        }
      } else {
        modalEl.focus();
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key === "Tab") {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = Array.from(
          modal.querySelectorAll(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      className="ui-modal-overlay"
      onClick={handleOverlayClick}
      data-testid="modal-overlay"
    >
      <div
        ref={modalRef}
        className={`ui-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="ui-modal-header">
          <div className="ui-modal-heading">
            <h2 id={titleId} className="ui-modal-title">
              {title}
            </h2>
            {subtitle && <p className="ui-modal-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="ui-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
