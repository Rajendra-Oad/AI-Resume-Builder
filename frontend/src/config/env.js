export const config = {
  // Same-origin is the secure default. Vite and Nginx proxy /api to the backend,
  // allowing the HttpOnly refresh cookie to survive browser reloads reliably.
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  requestTimeout: 15_000,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? "",
  environment: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,
  release: import.meta.env.VITE_APP_RELEASE ?? "development",
  sentryTracesSampleRate: import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? "0",
};
