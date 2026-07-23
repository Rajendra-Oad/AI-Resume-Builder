import { normalizeApiError } from "../errorHandler";
import { expireSession, refreshAccessToken } from "../tokenRefresh";

const shouldRefresh = (error) =>
  error.response?.status === 401 &&
  !error.config?._retried &&
  !error.config?.url?.includes("/auth/refresh");

export const installResponseInterceptor = (client) =>
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const request = error.config;
      if (shouldRefresh(error)) {
        request._retried = true;
        try {
          const accessToken = await refreshAccessToken();
          request.headers.Authorization = `Bearer ${accessToken}`;
          return client(request);
        } catch {
          expireSession();
        }
      }
      return Promise.reject(normalizeApiError(error));
    },
  );
