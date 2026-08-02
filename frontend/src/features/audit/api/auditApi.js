import apiClient from "../../../api/axiosInstance";

export const getPersonalAuditHistory = (page = 0, size = 20) =>
  apiClient.get("/api/v1/audit", { params: { page, size } }).then((response) => ({
    items: response.data.data,
    pagination: response.data.pagination,
  }));
