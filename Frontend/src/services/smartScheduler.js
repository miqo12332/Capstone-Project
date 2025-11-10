import api from "./api";

export const getSmartSchedulerInsights = async (userId, days = 7) => {
  if (!userId) throw new Error("userId is required to load smart scheduler insights");
  const response = await api.get("/smart-scheduler/insights", {
    params: { userId, days },
  });
  return response.data;
};

export const autoPlanSmartSession = async (payload) => {
  const response = await api.post("/smart-scheduler/auto-plan", payload);
  return response.data;
};
