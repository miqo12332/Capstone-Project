import api from "./api";

export const fetchAssistantHistory = async (userId) => {
  if (!userId) {
    throw new Error("userId is required to load assistant history");
  }

  const response = await api.get("/assistant/history", {
    params: { userId },
  });
  return response.data;
};

export const sendAssistantMessage = async (userId, message) => {
  if (!userId) {
    throw new Error("userId is required to chat with the assistant");
  }
  if (!message || !message.trim()) {
    throw new Error("Message cannot be empty");
  }

  const response = await api.post("/assistant/chat", { userId, message });
  return response.data;
};

export const fetchAssistantProfile = async (userId) => {
  if (!userId) {
    throw new Error("userId is required to load the assistant profile");
  }

  const response = await api.get("/assistant/profile", { params: { userId } });
  return response.data;
};

export const saveAssistantProfile = async (userId, about) => {
  if (!userId) {
    throw new Error("userId is required to remember your profile");
  }
  if (!about || !about.trim()) {
    throw new Error("Please share something about yourself first");
  }

  const response = await api.post("/assistant/profile", { userId, about });
  return response.data;
};
