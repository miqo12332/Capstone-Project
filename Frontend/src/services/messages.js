import { apiGet, apiPost, apiPut } from "./api";

export const fetchThreads = (userId) => apiGet(`/messages/${userId}/threads`);
export const fetchConversation = (userId, otherId) =>
  apiGet(`/messages/${userId}/with/${otherId}`);
export const sendMessage = (userId, payload) =>
  apiPost(`/messages/${userId}`, payload);
export const markConversationRead = (userId, otherId) =>
  apiPut(`/messages/${userId}/with/${otherId}/read`, {});
