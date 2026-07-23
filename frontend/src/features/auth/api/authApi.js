import apiClient from "../../../api/axiosInstance";

const unwrap = (response) => response.data.data;
export const login = ({ email, password }) =>
  apiClient.post("/api/v1/auth/login", { identifier: email, password }).then(unwrap);
export const register = (payload) => apiClient.post("/api/v1/auth/register", payload).then(unwrap);
export const refreshSession = () => apiClient.post("/api/v1/auth/refresh", {}).then(unwrap);
export const logout = () => apiClient.post("/api/v1/auth/logout", {});
export const forgotPassword = (email) =>
  apiClient.post("/api/v1/auth/forgot-password", { email }).then(unwrap);
export const resetPassword = (token, newPassword) =>
  apiClient.post("/api/v1/auth/reset-password", { token, newPassword }).then(unwrap);
export const verifyEmail = (token) =>
  apiClient.post(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`).then(unwrap);
export const resendVerification = (email) =>
  apiClient.post("/api/v1/auth/resend-verification", { email }).then(unwrap);
export const changePassword = (payload) =>
  apiClient.post("/api/v1/auth/change-password", payload).then(unwrap);
