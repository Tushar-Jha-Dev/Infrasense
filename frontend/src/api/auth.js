import { apiRequest } from "./client.js";

export const login = (email, password) =>
  apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const register = (data) =>
  apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMe = () => apiRequest("/auth/me");

export const updateMe = (data) =>
  apiRequest("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
