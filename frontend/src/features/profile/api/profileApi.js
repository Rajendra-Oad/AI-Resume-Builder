import apiClient from "../../../api/axiosInstance";
export const getProfile = () =>
  apiClient.get("/api/v1/users/me").then((response) => response.data.data);

export const updateProfile = (profile) =>
  apiClient.patch("/api/v1/users/me", profile).then((response) => response.data.data);

export const completeOnboarding = (preferences) =>
  apiClient.patch("/api/v1/users/me/onboarding", preferences).then((response) => response.data.data);
export const uploadProfilePhoto = (photo) => { const body=new window.FormData();body.append("photo",photo);return apiClient.put("/api/v1/users/me/photo",body).then((response)=>response.data.data); };
export const deleteProfilePhoto = () => apiClient.delete("/api/v1/users/me/photo");
export const getProfilePhoto = () => apiClient.get("/api/v1/users/me/photo",{responseType:"blob"}).then((response)=>response.data);
