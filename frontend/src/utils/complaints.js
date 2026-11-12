export function effectiveCategory(complaint) {
  return (
    complaint?.confirmedCategory ||
    complaint?.aiAnalysis?.category ||
    null
  );
}

export function effectiveSeverity(complaint) {
  return (
    complaint?.confirmedSeverity ||
    complaint?.aiAnalysis?.severity ||
    null
  );
}

export function isConfirmed(complaint) {
  return Boolean(
    complaint?.confirmedCategory || complaint?.confirmedSeverity
  );
}
