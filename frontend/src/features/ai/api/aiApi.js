import apiClient from "../../../api/axiosInstance";
export const generateResumeSummary = (input) =>
  apiClient
    .post("/api/v1/ai/generate", { workflow: "resume-summary", input, locale: "en-US" })
    .then((response) => response.data.data);
