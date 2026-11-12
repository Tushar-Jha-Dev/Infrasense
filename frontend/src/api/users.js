import { apiRequest } from "./client.js";

export const listUsers = (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.role) searchParams.set("role", params.role);
  if (params.isActive !== undefined && params.isActive !== "") {
    searchParams.set("isActive", String(params.isActive));
  }
  if (params.search) searchParams.set("search", params.search);
  const query = searchParams.toString();
  return apiRequest(`/users${query ? `?${query}` : ""}`);
};
