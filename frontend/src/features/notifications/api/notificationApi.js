import apiClient from "../../../api/axiosInstance";
export const checkNotificationHealth = () =>
  apiClient.get("/api/v1/notifications/health").then((response) => response.data.data);
