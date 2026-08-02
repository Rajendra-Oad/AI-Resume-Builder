import apiClient from "../../../api/axiosInstance";

export const getDashboardAnalytics = () =>
  apiClient.get("/api/v1/analytics/overview").then((response) => response.data.data);
