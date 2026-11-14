import { apiRequest, getToken } from "./client.js";

const BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export const getAnalyticsSummary = () => apiRequest("/analytics/summary");

export const getCostDetails = (params = {}) => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return apiRequest(`/analytics/costs${query ? `?${query}` : ""}`);
};

export const downloadCostsCsv = async (params = {}) => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  const token = getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${BASE_URL}/analytics/costs/export${query ? `?${query}` : ""}`,
    {
      headers,
    }
  );

  if (!response.ok) {
    let msg = "Failed to export maintenance costs";
    try {
      const errJson = await response.json();
      if (errJson.message) msg = errJson.message;
    } catch {
      // non-JSON error
    }
    throw new Error(msg);
  }

  const blob = await response.blob();
  const contentDisp = response.headers.get("content-disposition");
  let filename = "costs.csv";
  if (contentDisp) {
    const match = contentDisp.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
