import apiClient from "../../../api/axiosInstance";
export const checkJobHealth = () =>
  apiClient.get("/api/v1/jobs/health").then((response) => response.data.data);
