import api from "./api";

export const runScheduleAgent = async (userId, payload) => {
  if (!userId) throw new Error("userId is required to add a schedule");

  const response = await api.post("/schedule-agent", {
    userId,
    ...payload,
  });

  return response.data;
};
