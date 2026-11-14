import { StatusBadge } from "./Badge.jsx";
import "./Timeline.css";

function Timeline({ items = [] }) {
  if (!items || items.length === 0) {
    return <p className="ui-timeline-empty">No updates recorded yet.</p>;
  }

  return (
    <ol className="ui-timeline">
      {items.map((item, index) => (
        <li
          key={`${item.status}-${item.date}-${index}`}
          className="ui-timeline-item"
        >
          <span className="ui-timeline-dot" aria-hidden="true" />
          <div className="ui-timeline-content">
            <div className="ui-timeline-top">
              <StatusBadge status={item.status} />
              {item.date && <span className="ui-timeline-date">{item.date}</span>}
            </div>
            {item.by && (
              <p className="ui-timeline-by">
                {index === 0 && item.status === "Submitted"
                  ? `Submitted by ${item.by}`
                  : `Updated by ${item.by}`}
              </p>
            )}
            {item.note && <p className="ui-timeline-note">{item.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default Timeline;
