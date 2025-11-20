import api from "./api";

export const logHabitProgress = async (habitId, payload) => {
  const response = await api.post(`/progress/${habitId}/log`, payload);
  return response.data;
};

export const updateHabitProgressCount = async (habitId, payload) => {
  const response = await api.put(`/progress/${habitId}/logs`, payload);
  return response.data;
};

export const getTodayProgressLogs = async (userId) => {
  if (!userId) {
    throw new Error("userId is required to fetch progress");
  }
  const response = await api.get(`/progress/today/${userId}`);
  return response.data;
};
