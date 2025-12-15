import api from "./api";

const mapNotification = (payload) => ({
  id: payload.id,
  title: payload.title,
  message: payload.message,
  type: payload.type,
  category: payload.category,
  priority: payload.priority,
  metadata: payload.metadata || {},
  scheduledFor: payload.scheduledFor || payload.scheduled_for || null,
  createdAt: payload.createdAt || payload.created_at || null,
  isRead: typeof payload.isRead === "boolean" ? payload.isRead : Boolean(payload.is_read),
  readAt: payload.readAt || payload.read_at || null,
  ctaLabel: payload.ctaLabel || payload.cta_label || null,
  ctaUrl: payload.ctaUrl || payload.cta_url || null,
});

export const fetchNotifications = async (userId, params = {}) => {
  if (!userId) {
    return { notifications: [], summary: null };
  }
  const { data } = await api.get(`/notifications/${userId}`, { params });
  return {
    notifications: Array.isArray(data.notifications)
      ? data.notifications.map(mapNotification)
      : [],
    summary: data.summary || null,
  };
};

export const fetchNotificationSummary = async (userId) => {
  if (!userId) {
    return { summary: null, preferences: null };
  }
  const { data } = await api.get(`/notifications/${userId}/summary`);
  return data;
};

export const markNotificationRead = async (id, isRead = true) => {
  const { data } = await api.patch(`/notifications/${id}/read`, { isRead });
  return mapNotification(data.notification);
};

export const markAllNotificationsRead = async (userId) => {
  if (!userId) {
    return { updated: 0 };
  }
  const { data } = await api.patch(`/notifications/${userId}/read-all`);
  return data;
};

export const createNotification = async (payload) => {
  const { data } = await api.post("/notifications", payload);
  return mapNotification(data.notification);
};

export const deleteNotification = async (id, userId) => {
  if (!id) {
    throw new Error("Notification id is required to delete a reminder");
  }

  const { data } = await api.delete(`/notifications/${id}`, {
    data: userId ? { userId } : {},
  });
  return mapNotification(data.notification);
};

export const refreshNotifications = async (userId) => {
  if (!userId) {
    return { processed: 0 };
  }
  const { data } = await api.post(`/notifications/${userId}/refresh`);
  return data;
};
