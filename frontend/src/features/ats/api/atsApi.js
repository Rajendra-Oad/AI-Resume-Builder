import apiClient from "../../../api/axiosInstance";

const unwrap = (response) => response.data.data;

export const analyzeResume = (resumeId, jobDescriptionId) =>
  apiClient.post("/api/v1/ats/analyze", { resumeId, jobDescriptionId }).then(unwrap);

export const getResumeReports = (resumeId) =>
  apiClient.get(`/api/v1/ats/resumes/${resumeId}/reports`).then(unwrap);
export const getAtsReport = (reportId) => apiClient.get(`/api/v1/ats/reports/${reportId}`).then(unwrap);
