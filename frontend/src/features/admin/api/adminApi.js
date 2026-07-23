import apiClient from "../../../api/axiosInstance";
const page = (response) => ({ items: response.data.data, pagination: response.data.pagination });
export const listUsers = (pageNumber = 0) => apiClient.get("/api/v1/admin/users", { params: { page: pageNumber, size: 20 } }).then(page);
export const changeUserRole = ({ id, value }) => apiClient.patch(`/api/v1/admin/users/${id}/role`, { value }).then((r) => r.data.data);
export const changeUserStatus = ({ id, value }) => apiClient.patch(`/api/v1/admin/users/${id}/status`, { value }).then((r) => r.data.data);
export const listAdminActions = () => apiClient.get("/api/v1/admin/actions", { params: { size: 20 } }).then(page);
export const listAuditEntries = () => apiClient.get("/api/v1/admin/audit", { params: { size: 20 } }).then(page);
