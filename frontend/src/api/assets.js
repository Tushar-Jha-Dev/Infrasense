import { apiRequest } from "./client.js";

export const listAssets = (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set("category", params.category);
  if (params.status) searchParams.set("status", params.status);
  if (params.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  return apiRequest(`/assets${query ? `?${query}` : ""}`);
};

export const getAsset = (id) => apiRequest(`/assets/${id}`);

export const getAssetHistory = (id) => apiRequest(`/assets/${id}/history`);

export const createAsset = (data) =>
  apiRequest("/assets", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateAsset = (id, data) =>
  apiRequest(`/assets/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const updateAssetStatus = (id, data) =>
  apiRequest(`/assets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
