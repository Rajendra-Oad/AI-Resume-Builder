import apiClient from "../../../api/axiosInstance";

const unwrap = (response) => response.data.data;
const unwrapPage = (response) => ({
  items: response.data.data,
  pagination: response.data.pagination,
});

export const getBillingPlans = () => apiClient.get("/api/v1/subscriptions/plans").then(unwrap);
export const getCurrentSubscription = () =>
  apiClient.get("/api/v1/subscriptions/current").then(unwrap);
export const getSubscriptionEntitlement = () =>
  apiClient.get("/api/v1/subscriptions/entitlement").then(unwrap);
export const getSubscriptionHistory = (page = 0, size = 20) =>
  apiClient.get("/api/v1/subscriptions/history", { params: { page, size } }).then(unwrapPage);
export const getPaymentHistory = (page = 0, size = 20) =>
  apiClient.get("/api/v1/subscriptions/payments", { params: { page, size } }).then(unwrapPage);
export const cancelSubscription = () =>
  apiClient.post("/api/v1/subscriptions/cancel").then(unwrap);
