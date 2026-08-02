import apiClient from "../../../api/axiosInstance";

const unwrap = (response) => response.data.data;

export const listJobs = (page = 0, size = 100) => apiClient.get("/api/v1/jobs", { params: { page, size } }).then(unwrap);
export const createJob = (payload) => apiClient.post("/api/v1/jobs", payload).then(unwrap);
export const deleteJob = (id) => apiClient.delete(`/api/v1/jobs/${id}`);
