import api from "./api";

export const getDailyChallengeSummary = async (userId) => {
  if (!userId) throw new Error("userId is required to load the daily challenge");
  const response = await api.get("/daily-challenge/summary", {
    params: { userId },
  });
  return response.data;
};
