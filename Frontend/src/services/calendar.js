import { apiGet, apiDelete } from "./api";

const API_BASE = "http://localhost:5001/api";

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.append(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

export const fetchCalendarOverview = (userId, params = {}) =>
  apiGet(`/calendar/user/${userId}${buildQuery(params)}`);

export const syncCalendar = async (userId, payload) => {
  const response = await fetch(`${API_BASE}/calendar/user/${userId}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.detail || "Failed to sync calendar";
    throw new Error(message);
  }
  return data;
};

export const disconnectIntegration = (integrationId, userId) =>
  apiDelete(`/calendar/integrations/${integrationId}${buildQuery({ userId })}`);

export default {
  fetchCalendarOverview,
  syncCalendar,
  disconnectIntegration,
};
