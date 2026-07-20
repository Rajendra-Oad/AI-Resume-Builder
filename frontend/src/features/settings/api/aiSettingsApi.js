import apiClient from "../../../api/axiosInstance";

export const getAiSettings = () =>
  apiClient.get("/api/v1/ai/settings").then((response) => response.data.data);
export const updateAiSettings = (payload) =>
  apiClient.put("/api/v1/ai/settings", payload).then((response) => response.data.data);
export const saveProviderCredential = (provider, apiKey) =>
  apiClient
    .put(`/api/v1/ai/settings/credentials/${provider}`, { apiKey })
    .then((response) => response.data.data);
export const deleteProviderCredential = (provider) =>
  apiClient
    .delete(`/api/v1/ai/settings/credentials/${provider}`)
    .then((response) => response.data.data);
