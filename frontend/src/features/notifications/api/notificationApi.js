import apiClient from "../../../api/axiosInstance";

export const listNotifications = (unreadOnly = false) =>
  apiClient
    .get("/api/v1/notifications", { params: { unreadOnly } })
    .then((response) => response.data.data);

export const markNotificationRead = (id) =>
  apiClient.patch(`/api/v1/notifications/${id}/read`).then((response) => response.data.data);

export const markAllNotificationsRead = () =>
  apiClient.patch("/api/v1/notifications/read-all").then((response) => response.data.data);

export const getNotificationPreferences = () =>
  apiClient.get("/api/v1/notifications/preferences").then((response) => response.data.data);

export const updateNotificationPreferences = (preferences) =>
  apiClient.put("/api/v1/notifications/preferences", preferences).then((response) => response.data.data);
