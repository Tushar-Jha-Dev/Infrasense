import { apiRequest } from "./client.js";

export const getAnalyticsSummary = () => apiRequest("/analytics/summary");
