import { config } from "./config/env";

let sentryPromise;

const loadSentry = () => {
  if (!config.sentryDsn) return Promise.resolve(null);
  sentryPromise ??= import("@sentry/react");
  return sentryPromise;
};

const safelyLoadSentry = async () => {
  try {
    return await loadSentry();
  } catch {
    return null;
  }
};

const sampleRate = () => {
  const parsed = Number(config.sentryTracesSampleRate);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
};

export const initializeObservability = async () => {
  if (!config.sentryDsn) return;

  const Sentry = await safelyLoadSentry();
  if (!Sentry) return;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.environment,
    release: config.release,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: sampleRate(),
  });
};

export const captureFrontendError = async (error, context = {}) => {
  if (!config.sentryDsn) return;
  const Sentry = await safelyLoadSentry();
  if (!Sentry) return;
  Sentry.withScope((scope) => {
    scope.setContext("react", {
      componentStack: context.componentStack,
    });
    Sentry.captureException(error);
  });
};

export const captureApiFailure = async (error) => {
  const isNetworkFailure = Boolean(error.request) && !error.response;
  const isServerFailure = (error.response?.status ?? 0) >= 500;
  if (!config.sentryDsn || (!isNetworkFailure && !isServerFailure)) return;

  const Sentry = await safelyLoadSentry();
  if (!Sentry) return;
  const rawUrl = error.config?.url ?? "unknown";
  const path = rawUrl.split(/[?#]/, 1)[0];
  Sentry.withScope((scope) => {
    scope.setTag("api.status", String(error.response?.status ?? "network_error"));
    scope.setContext("api", {
      method: error.config?.method?.toUpperCase(),
      path,
      requestId: error.response?.headers?.["x-request-id"],
    });
    Sentry.captureException(error);
  });
};
