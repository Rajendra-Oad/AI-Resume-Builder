import apiClient from "../../../api/axiosInstance";

const unwrap = (response) => response.data.data;
export const listResumes = () => apiClient.get("/api/v1/resumes").then(unwrap);
export const getResume = (id) => apiClient.get(`/api/v1/resumes/${id}`).then(unwrap);
export const createResume = (payload) => apiClient.post("/api/v1/resumes", payload).then(unwrap);
export const updateResume = (id, payload) =>
  apiClient.put(`/api/v1/resumes/${id}`, payload).then(unwrap);
export const duplicateResume = (id) =>
  apiClient.post(`/api/v1/resumes/${id}/duplicate`).then(unwrap);
export const deleteResume = (id) => apiClient.delete(`/api/v1/resumes/${id}`);
export const listDeletedResumes = () => apiClient.get("/api/v1/resumes/deleted").then(unwrap);
export const restoreResume = (id) => apiClient.post(`/api/v1/resumes/${id}/restore`).then(unwrap);
export const listSections = (id) => apiClient.get(`/api/v1/resumes/${id}/sections`).then(unwrap);
export const createSection = ({resumeId,payload}) => apiClient.post(`/api/v1/resumes/${resumeId}/sections`,payload).then(unwrap);
export const updateSection = ({resumeId,sectionId,payload}) => apiClient.put(`/api/v1/resumes/${resumeId}/sections/${sectionId}`,payload).then(unwrap);
export const deleteSection = ({resumeId,sectionId}) => apiClient.delete(`/api/v1/resumes/${resumeId}/sections/${sectionId}`);
export const reorderSections = ({resumeId,sectionIds}) => apiClient.patch(`/api/v1/resumes/${resumeId}/sections/order`,{sectionIds}).then(unwrap);
export const listVersions = (id) => apiClient.get(`/api/v1/resumes/${id}/versions`).then((response)=>({items:response.data.data,pagination:response.data.pagination}));
export const getVersion = ({resumeId,versionId}) => apiClient.get(`/api/v1/resumes/${resumeId}/versions/${versionId}`).then(unwrap);
export const rollbackVersion = ({resumeId,versionId}) => apiClient.post(`/api/v1/resumes/${resumeId}/versions/${versionId}/rollback`).then(unwrap);
export const publishResume = (id) => apiClient.post(`/api/v1/resumes/${id}/publish`).then(unwrap);
export const listPdfExports = (id, page = 0, size = 100) =>
  apiClient.get(`/api/v1/pdf/resumes/${id}/history`, { params: { page, size } }).then(unwrap);

export const downloadResumePdf = async (id, title = "resume") => {
  const response = await apiClient.post(`/api/v1/pdf/resumes/${id}`, null, { responseType: "blob" });
  const url = window.URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.replace(/[^a-z0-9._-]+/gi, "-") || "resume"}.pdf`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
