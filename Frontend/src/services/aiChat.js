import api from "./api";

export const fetchAiChatHistory = async (userId) => {
  if (!userId) throw new Error("userId is required to load chat history");

  const response = await api.get("/ai-chat/history", { params: { userId } });
  return response.data;
};

export const sendAiChatMessage = async (userId, message) => {
  if (!userId) throw new Error("userId is required to talk with the AI");
  if (!message || !message.trim()) throw new Error("Message cannot be empty");

  const response = await api.post("/ai-chat/message", { userId, message });
  return response.data;
};

export const deleteAiChatHistory = async (userId) => {
  if (!userId) throw new Error("userId is required to delete chat history");

  const response = await api.delete("/ai-chat/history", { params: { userId } });
  return response.data;
};
