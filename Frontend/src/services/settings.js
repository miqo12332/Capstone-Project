import api from "./api";

export const fetchUserSettings = async (userId, config = {}) => {
  if (!userId) {
    throw new Error("userId is required to load settings");
  }

  const response = await api.get(`/users/profile/${userId}`, config);
  return response.data;
};

export const saveUserSettings = async (userId, payload) => {
  if (!userId) {
    throw new Error("userId is required to save settings");
  }
  const response = await api.put(`/users/profile/${userId}`, payload);
  return response.data;
};
