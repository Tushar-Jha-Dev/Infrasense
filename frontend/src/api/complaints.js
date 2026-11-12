import { apiRequest } from "./client.js";

export const createComplaint = (data) =>
  apiRequest("/complaints", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMyComplaints = (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  const query = searchParams.toString();
  return apiRequest(`/complaints/mine${query ? `?${query}` : ""}`);
};

export const getComplaint = (id) => apiRequest(`/complaints/${id}`);

export const listComplaints = (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.severity) searchParams.set("severity", params.severity);
  if (params.category) searchParams.set("category", params.category);
  if (params.needsReview) searchParams.set("needsReview", "true");
  if (params.search) searchParams.set("search", params.search);
  const query = searchParams.toString();
  return apiRequest(`/complaints${query ? `?${query}` : ""}`);
};

export const reviewComplaint = (id, data) =>
  apiRequest(`/complaints/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const assignComplaint = (id, data) =>
  apiRequest(`/complaints/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const closeComplaint = (id, data = {}) =>
  apiRequest(`/complaints/${id}/close`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
