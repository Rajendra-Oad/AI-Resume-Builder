import apiClient from "../../../api/axiosInstance";

const unwrap = (response) => response.data.data;
export const login = (payload) => apiClient.post("/api/v1/auth/login", payload).then(unwrap);
export const register = (payload) => apiClient.post("/api/v1/auth/register", payload).then(unwrap);
export const refreshSession = () => apiClient.post("/api/v1/auth/refresh", {}).then(unwrap);
export const logout = () => apiClient.post("/api/v1/auth/logout", {});
export const forgotPassword = (email) =>
  apiClient.post("/api/v1/auth/forgot-password", { email }).then(unwrap);
export const resetPassword = (token, newPassword) =>
  apiClient.post("/api/v1/auth/reset-password", { token, newPassword }).then(unwrap);
export const changePassword = (payload) =>
  apiClient.post("/api/v1/auth/change-password", payload).then(unwrap);
