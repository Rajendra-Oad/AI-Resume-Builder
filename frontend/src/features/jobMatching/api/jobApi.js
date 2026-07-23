import apiClient from "../../../api/axiosInstance";

const unwrap = (response) => response.data.data;

export const listJobs = () => apiClient.get("/api/v1/jobs").then(unwrap);
export const createJob = (payload) => apiClient.post("/api/v1/jobs", payload).then(unwrap);
export const deleteJob = (id) => apiClient.delete(`/api/v1/jobs/${id}`);
