const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function formatHours(hours) {
  if (hours === null || hours === undefined || Number.isNaN(Number(hours))) {
    return "No data yet";
  }
  const h = Number(hours);
  return `${h.toFixed(1)} hrs`;
}

export function formatMonth(yearMonthStr, format = "short") {
  if (!yearMonthStr) return "—";
  const [y, m] = String(yearMonthStr).split("-").map(Number);
  if (!y || !m) return yearMonthStr;
  const d = new Date(Date.UTC(y, m - 1, 1));
  if (format === "full") {
    return d.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString("en-IN", {
    month: "short",
    timeZone: "UTC",
  });
}
