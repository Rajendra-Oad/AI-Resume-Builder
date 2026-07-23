import apiClient from "../../../api/axiosInstance";
const unwrap = (response) => response.data.data;
export const listTemplates = () => apiClient.get("/api/v1/templates").then(unwrap);
export const applyTemplate = ({ templateId, resumeId }) =>
  apiClient.post(`/api/v1/templates/${templateId}/apply/${resumeId}`).then(unwrap);
