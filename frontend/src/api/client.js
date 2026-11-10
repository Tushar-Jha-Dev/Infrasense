const BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const TOKEN_KEY = "infrasense_token";

let unauthorizedHandler = null;

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
};

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON or empty response body leaves data as null
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    const error = new Error(data?.message || "Something went wrong");
    error.status = response.status;
    throw error;
  }

  return data;
}
