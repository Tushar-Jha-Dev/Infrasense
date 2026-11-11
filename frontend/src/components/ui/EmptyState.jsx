import "./EmptyState.css";

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="ui-empty-state">
      {Icon && (
        <div className="ui-empty-icon">
          <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
        </div>
      )}
      <h2 className="ui-empty-title">{title}</h2>
      {description && <p className="ui-empty-desc">{description}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}

export default EmptyState;
