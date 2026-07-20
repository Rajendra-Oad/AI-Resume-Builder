import apiClient from "../../../api/axiosInstance";
export const checkAtsHealth = () =>
  apiClient.get("/api/v1/ats/health").then((response) => response.data.data);
