import apiClient from "../../../api/axiosInstance";
export const createPrompt = (payload) =>
  apiClient.post("/api/v1/admin/ai/prompts", payload).then((r) => r.data.data);
export const providerHealth = () =>
  apiClient.get("/api/v1/admin/ai/prompts/providers/health").then((r) => r.data.data);
export const transitionPrompt = (workflow, version, action) =>
  apiClient
    .post(`/api/v1/admin/ai/prompts/${workflow}/${version}/${action}`)
    .then((r) => r.data.data);
