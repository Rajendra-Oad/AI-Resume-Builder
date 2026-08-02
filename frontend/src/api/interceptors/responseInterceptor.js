import { notify } from "../../components/NotificationProvider";
import { captureApiFailure } from "../../observability";
import { authSession } from "../../services/authSession";
import { normalizeApiError } from "../errorHandler";
import { expireSession, refreshAccessToken } from "../tokenRefresh";

const isPublicAuthRequest = (url = "") =>
  /\/auth\/(login|register|refresh|forgot-password|reset-password|verify-email|resend-verification)(?:[/?]|$)/.test(
    url,
  );

const shouldRefresh = (error) =>
  error.response?.status === 401 &&
  Boolean(authSession.getToken()) &&
  !error.config?._retried &&
  !isPublicAuthRequest(error.config?.url);

export const installResponseInterceptor = (client) =>
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      captureApiFailure(error);
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
      const normalized = normalizeApiError(error);
      if (normalized.status === 429) {
        notify.warning({
          title: "Too many requests",
          message: normalized.message || "Please wait a moment before trying again.",
        });
      } else if (normalized.status >= 500) {
        notify.error({
          title: "Service unavailable",
          message: normalized.message,
          details: normalized.requestId
            ? `Request ID: ${normalized.requestId}`
            : normalized.message,
          copyError: true,
        });
      }
      return Promise.reject(normalized);
    },
  );
