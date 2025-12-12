import { API_BASE } from "../utils/apiConfig";

const BASE_URL = `${API_BASE}/tasks`;

export const getTasks = async (userId) => {
  const res = await fetch(`${BASE_URL}/user/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return await res.json();
};

export const createTask = async (task) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });

  if (!res.ok) {
    const errorPayload = await res.json().catch(() => ({}));
    throw new Error(errorPayload.error || "Failed to create task");
  }

  return await res.json();
};

export const updateTaskStatus = async (taskId, status) => {
  const res = await fetch(`${BASE_URL}/${taskId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const errorPayload = await res.json().catch(() => ({}));
    throw new Error(errorPayload.error || "Failed to update task status");
  }

  return await res.json();
};

export const deleteTask = async (taskId) => {
  const res = await fetch(`${BASE_URL}/${taskId}`, { method: "DELETE" });

  if (!res.ok) {
    const errorPayload = await res.json().catch(() => ({}));
    throw new Error(errorPayload.error || "Failed to delete task");
  }

  return true;
};
