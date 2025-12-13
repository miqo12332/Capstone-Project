import { API_BASE } from "../utils/apiConfig"

export const sendScheduleAgentMessage = async (userId, message) => {
  const response = await fetch(`${API_BASE}/schedule-agent/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, message }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error || "Failed to contact Habit AI")
  }

  return body
}

export const fetchScheduleAgentSnapshot = async (userId) => {
  const response = await fetch(`${API_BASE}/schedule-agent/schedules/${userId}`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error || "Unable to load schedule snapshot")
  }
  return body
}
