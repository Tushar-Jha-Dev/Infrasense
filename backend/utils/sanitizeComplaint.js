/**
 * Sanitizes a complaint document (or array of documents) for the viewing user.
 * Hides internal `assignmentNotes` from users with role "user" (complaint owners).
 * Admins and the assigned technician are permitted to see assignment notes.
 * Also redacts internal assignment notes if they were copied into statusHistory notes.
 *
 * @param {Object|Array} complaintData - A Mongoose document, plain object, or array of them.
 * @param {Object} user - The authenticated user (`req.user`).
 * @returns {Object|Array} Sanitized complaint data.
 */
export function sanitizeComplaint(complaintData, user) {
  if (!complaintData) {
    return complaintData;
  }

  if (Array.isArray(complaintData)) {
    return complaintData.map((item) => sanitizeComplaint(item, user));
  }

  // Admins always have access to internal assignment notes
  if (user?.role === "admin") {
    return complaintData;
  }

  const complaint =
    typeof complaintData.toObject === "function"
      ? complaintData.toObject()
      : JSON.parse(JSON.stringify(complaintData));

  // The assigned technician is allowed to view assignment notes
  if (user?.role === "technician") {
    const assignedId =
      complaint.assignedTo?._id?.toString?.() ||
      complaint.assignedTo?.toString?.();
    const currentUserId = user?._id?.toString?.();

    if (assignedId && currentUserId && assignedId === currentUserId) {
      return complaint;
    }
  }

  // Hide assignmentNotes from users (owners) or unassigned roles
  const internalNotes = complaint.assignmentNotes;
  delete complaint.assignmentNotes;

  // Redact assignment notes text if duplicated into statusHistory notes
  if (
    internalNotes &&
    typeof internalNotes === "string" &&
    internalNotes.trim() &&
    Array.isArray(complaint.statusHistory)
  ) {
    const targetText = internalNotes.trim();
    complaint.statusHistory = complaint.statusHistory.map((item) => {
      const entry = { ...item };
      if (typeof entry.note === "string" && entry.note.includes(targetText)) {
        entry.note = entry.note.replace(targetText, "[Internal note redacted]").trim();
      }
      return entry;
    });
  }

  return complaint;
}
