import api from "./api";

export const getProgressAnalytics = async (userId) => {
  if (!userId) {
    throw new Error("userId is required to fetch analytics");
  }

  const response = await api.get("/analytics/progress", {
    params: { userId },
  });

  return response.data;
};

export const formatPercent = (value, fractionDigits = 0) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0%";
  }
  return `${value.toFixed(fractionDigits)}%`;
};
