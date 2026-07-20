export const config = {
  // Same-origin is the secure default. Vite and Nginx proxy /api to the backend,
  // allowing the HttpOnly refresh cookie to survive browser reloads reliably.
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  requestTimeout: 15_000,
};
