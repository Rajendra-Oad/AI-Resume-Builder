import apiClient from "../../../api/axiosInstance";

const unwrap = (response) => response.data.data;
export const listResumes = () => apiClient.get("/api/v1/resumes").then(unwrap);
export const getResume = (id) => apiClient.get(`/api/v1/resumes/${id}`).then(unwrap);
export const createResume = (payload) => apiClient.post("/api/v1/resumes", payload).then(unwrap);
export const updateResume = (id, payload) =>
  apiClient.put(`/api/v1/resumes/${id}`, payload).then(unwrap);
