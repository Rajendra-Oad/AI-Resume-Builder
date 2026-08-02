import { check } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

import { settings } from "./config.js";

export const apiDuration = new Trend("api_duration", true);
export const heavyOperationDuration = new Trend(
  "heavy_operation_duration",
  true,
);
export const businessErrors = new Rate("business_errors");

const parseJson = (response) => {
  try {
    return response.json();
  } catch {
    return null;
  }
};

export const parseRefreshToken = (response) =>
  response.cookies.refresh_token?.[0]?.value ?? null;

export function login(credential) {
  const response = http.post(
    `${settings.baseUrl}/api/v1/auth/login`,
    JSON.stringify({
      identifier: credential.email,
      password: credential.password,
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "auth.login", phase: "setup" },
    },
  );
  const payload = parseJson(response);
  if (
    response.status !== 200 ||
    payload?.success !== true ||
    !payload?.data?.accessToken
  ) {
    throw new Error(
      `Login failed for configured performance account (HTTP ${response.status}).`,
    );
  }
  return {
    accessToken: payload.data.accessToken,
    refreshToken: parseRefreshToken(response),
    email: credential.email,
  };
}

const refresh = (session) => {
  if (!session.refreshToken) return false;
  const response = http.post(`${settings.baseUrl}/api/v1/auth/refresh`, null, {
    headers: { Cookie: `refresh_token=${session.refreshToken}` },
    tags: { endpoint: "auth.refresh" },
  });
  const payload = parseJson(response);
  if (
    response.status !== 200 ||
    payload?.success !== true ||
    !payload?.data?.accessToken
  )
    return false;
  session.accessToken = payload.data.accessToken;
  session.refreshToken = parseRefreshToken(response) ?? session.refreshToken;
  return true;
};

export function apiRequest(
  session,
  method,
  path,
  body,
  endpoint,
  expectedStatuses,
  options = {},
) {
  const params = {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      "X-Correlation-Id": `k6-${__VU}-${__ITER}-${endpoint.replace(/[^a-z0-9]/gi, "-")}`,
    },
    responseType: options.responseType ?? "text",
    tags: { endpoint, operation: options.heavy ? "heavy" : "api" },
    timeout: options.timeout ?? (options.heavy ? "65s" : "15s"),
  };
  const encodedBody =
    body === null || body === undefined ? null : JSON.stringify(body);
  let response = http.request(
    method,
    `${settings.baseUrl}${path}`,
    encodedBody,
    params,
  );
  if (response.status === 401 && refresh(session)) {
    params.headers.Authorization = `Bearer ${session.accessToken}`;
    response = http.request(
      method,
      `${settings.baseUrl}${path}`,
      encodedBody,
      params,
    );
  }

  const payload = options.binary ? null : parseJson(response);
  const statusOk = expectedStatuses.includes(response.status);
  const businessOk =
    options.binary || response.status === 204 || payload?.success === true;
  const valid = statusOk && businessOk;
  check(response, {
    [`${endpoint}: expected status`]: () => statusOk,
    [`${endpoint}: business success`]: () => businessOk,
  });
  businessErrors.add(!valid, { endpoint });
  (options.heavy ? heavyOperationDuration : apiDuration).add(
    response.timings.duration,
    { endpoint },
  );
  return { response, payload, valid };
}

export function credentialsFromEnvironment() {
  if (__ENV.PERF_USERS_JSON) {
    const parsed = JSON.parse(__ENV.PERF_USERS_JSON);
    if (!Array.isArray(parsed) || parsed.length === 0)
      throw new Error("PERF_USERS_JSON must be a non-empty array.");
    return parsed;
  }
  if (__ENV.PERF_USER_EMAIL && __ENV.PERF_USER_PASSWORD) {
    return [
      { email: __ENV.PERF_USER_EMAIL, password: __ENV.PERF_USER_PASSWORD },
    ];
  }
  throw new Error(
    "Provide PERF_USERS_JSON or PERF_USER_EMAIL and PERF_USER_PASSWORD.",
  );
}

export const responseData = (result) =>
  result.valid ? result.payload?.data : null;
