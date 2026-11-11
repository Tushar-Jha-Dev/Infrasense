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
