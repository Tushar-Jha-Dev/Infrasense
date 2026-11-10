import "./Spinner.css";

function Spinner({ label = "Loading...", fullPage = false }) {
  return (
    <div
      className={fullPage ? "ui-spinner-page" : "ui-spinner-wrap"}
      role="status"
      aria-live="polite"
    >
      <span className="ui-spinner" aria-hidden="true" />
      <span className="ui-sr-only">{label}</span>
    </div>
  );
}

export default Spinner;
