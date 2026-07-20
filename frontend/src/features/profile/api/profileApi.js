import apiClient from "../../../api/axiosInstance";
export const getProfile = () =>
  apiClient.get("/api/v1/users/me").then((response) => response.data.data);
