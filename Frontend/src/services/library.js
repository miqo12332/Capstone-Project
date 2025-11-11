import api from "./api";

export const getLibrary = async (filters = {}) => {
  const { data } = await api.get("/library", { params: filters });
  return data;
};

export const getLibraryHighlights = async () => {
  const { data } = await api.get("/library/highlights");
  return data;
};

export const getLibraryRecommendations = async (userId) => {
  if (!userId) {
    return { suggestions: [], context: {} };
  }
  const { data } = await api.get(`/library/recommendations/${userId}`);
  return data;
};

export const getLibraryWindows = async (userId) => {
  if (!userId) {
    return { windows: [] };
  }
  const { data } = await api.post(`/library/${userId}/refresh`);
  return data;
};

export const addHabitFromLibrary = async (userId, habit) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  const payload = {
    user_id: userId,
    title: habit.title || habit.name,
    description: habit.description || "",
    category: habit.category || null,
  };

  const { data } = await api.post("/habits", payload);
  return data;
};