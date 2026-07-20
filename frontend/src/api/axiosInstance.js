import axios from "axios";
import { config } from "../config/env";
import { normalizeApiError } from "./errorHandler";
import { authSession } from "../services/authSession";

const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.requestTimeout,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((request) => {
  const token = authSession.getToken();
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

let refreshPromise = null;
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (
      error.response?.status === 401 &&
      !request?._retried &&
      !request?.url?.includes("/auth/refresh")
    ) {
      request._retried = true;
      try {
        refreshPromise ??= axios.post(
          `${config.apiBaseUrl}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const refreshed = await refreshPromise;
        authSession.setToken(refreshed.data.data.accessToken);
        window.dispatchEvent(
          new window.CustomEvent("auth:refreshed", { detail: refreshed.data.data }),
        );
        request.headers.Authorization = `Bearer ${authSession.getToken()}`;
        return apiClient(request);
      } catch {
        authSession.clear();
        window.dispatchEvent(new window.Event("auth:expired"));
      } finally {
        refreshPromise = null;
      }
    }
    return Promise.reject(normalizeApiError(error));
  },
);

export default apiClient;
