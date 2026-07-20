import apiClient from "../../../api/axiosInstance";
export const generateContent = (workflow, input) =>
  apiClient
    .post("/api/v1/ai/generate", { workflow, input, locale: "en-US" })
    .then((response) => response.data.data);
export const getAiUsage = () =>
  apiClient.get("/api/v1/ai/usage").then((response) => response.data.data);
