import { group, sleep } from "k6";

import {
  options as configuredOptions,
  settings,
  validateConfiguration,
} from "./config.js";
import {
  apiRequest,
  credentialsFromEnvironment,
  login,
  responseData,
} from "./helpers.js";

validateConfiguration();
export const options = configuredOptions;

const sessions = {};

export function setup() {
  const credentials = credentialsFromEnvironment();
  const authenticated = credentials.map(login);
  return { sessions: authenticated };
}

const sessionForVu = (data) => {
  if (!sessions[__VU]) {
    const source = data.sessions[(__VU - 1) % data.sessions.length];
    sessions[__VU] = { ...source };
  }
  return sessions[__VU];
};

const readJourney = (session) => {
  let resumeId = null;
  group("dashboard and account reads", () => {
    apiRequest(
      session,
      "GET",
      "/api/v1/analytics/overview",
      null,
      "analytics.overview",
      [200],
    );
    const resumes = apiRequest(
      session,
      "GET",
      "/api/v1/resumes?page=0&size=20",
      null,
      "resumes.list",
      [200],
    );
    resumeId = responseData(resumes)?.[0]?.id ?? null;
    apiRequest(
      session,
      "GET",
      "/api/v1/notifications?page=0&size=20",
      null,
      "notifications.list",
      [200],
    );
    apiRequest(
      session,
      "GET",
      "/api/v1/subscriptions/current",
      null,
      "subscriptions.current",
      [200],
    );
    apiRequest(
      session,
      "GET",
      "/api/v1/subscriptions/payments?page=0&size=20",
      null,
      "subscriptions.payments",
      [200],
    );
  });
  if (resumeId) {
    group("resume reads", () => {
      apiRequest(
        session,
        "GET",
        `/api/v1/resumes/${resumeId}`,
        null,
        "resumes.get",
        [200],
      );
      apiRequest(
        session,
        "GET",
        `/api/v1/resumes/${resumeId}/sections`,
        null,
        "resume-sections.list",
        [200],
      );
      apiRequest(
        session,
        "GET",
        `/api/v1/pdf/resumes/${resumeId}/history?page=0&size=20`,
        null,
        "pdf.history",
        [200],
      );
    });
  }
};

const syntheticResume = () => ({
  title: `k6 synthetic resume vu-${__VU}-${__ITER}`,
  summary:
    "Synthetic performance-test resume. Safe to delete after the approved test window.",
});

const writeJourney = (session) => {
  const created = apiRequest(
    session,
    "POST",
    "/api/v1/resumes",
    syntheticResume(),
    "resumes.create",
    [201],
  );
  const resumeId = responseData(created)?.id;
  if (!resumeId) return;

  const update = {
    ...syntheticResume(),
    fullName: "Performance Test User",
    targetJobTitle: "Software Engineer",
    skillsContent: "Java, PostgreSQL, React, performance testing",
    experienceContent:
      "Synthetic experience used only for controlled load testing.",
    fontFamily: "HELVETICA",
    fontSize: 10.5,
    lineSpacing: 1.25,
    sectionSpacing: 12,
    pageMargin: 42,
  };
  apiRequest(
    session,
    "PUT",
    `/api/v1/resumes/${resumeId}`,
    update,
    "resumes.update",
    [200],
  );
  apiRequest(
    session,
    "GET",
    `/api/v1/resumes/${resumeId}`,
    null,
    "resumes.get-after-update",
    [200],
  );

  let jobId = null;
  if (settings.allowAts) {
    const job = apiRequest(
      session,
      "POST",
      "/api/v1/jobs",
      {
        title: "Synthetic Software Engineer",
        companyName: "Performance Test",
        content:
          "Java PostgreSQL React API performance testing monitoring reliability",
        seniorityLevel: "MID",
      },
      "jobs.create",
      [201],
    );
    jobId = responseData(job)?.id;
    if (jobId) {
      apiRequest(
        session,
        "POST",
        "/api/v1/ats/analyze",
        { resumeId, jobDescriptionId: jobId },
        "ats.analyze",
        [201],
        { heavy: true },
      );
    }
  }

  if (settings.allowAi) {
    apiRequest(
      session,
      "POST",
      "/api/v1/ai/generate",
      {
        workflow: "resume-summary",
        input:
          "Synthetic Java and PostgreSQL engineer profile for controlled performance testing.",
        locale: "en-US",
      },
      "ai.generate",
      [200],
      { heavy: true, timeout: "65s" },
    );
  }

  if (settings.allowPdf) {
    apiRequest(
      session,
      "GET",
      `/api/v1/pdf/resumes/${resumeId}`,
      null,
      "pdf.generate",
      [200],
      {
        heavy: true,
        binary: true,
        responseType: "binary",
        timeout: "65s",
      },
    );
  }

  if (jobId)
    apiRequest(
      session,
      "DELETE",
      `/api/v1/jobs/${jobId}`,
      null,
      "jobs.delete",
      [204],
    );
  apiRequest(
    session,
    "DELETE",
    `/api/v1/resumes/${resumeId}`,
    null,
    "resumes.delete",
    [204],
  );
};

export function userJourney(data) {
  const session = sessionForVu(data);
  readJourney(session);
  if (settings.allowWrites && (__ITER + __VU) % 5 === 0)
    group("synthetic write journey", () => writeJourney(session));
  sleep(settings.thinkTimeSeconds);
}

const metricValue = (metric, key) => metric?.values?.[key] ?? "n/a";
const htmlEscape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export function handleSummary(data) {
  const summaryPath = __ENV.SUMMARY_JSON ?? "performance/reports/summary.json";
  const htmlPath = __ENV.SUMMARY_HTML ?? "performance/reports/summary.html";
  const rows = [
    ["API p95 (ms)", metricValue(data.metrics.api_duration, "p(95)")],
    ["API p99 (ms)", metricValue(data.metrics.api_duration, "p(99)")],
    [
      "Heavy-operation p95 (ms)",
      metricValue(data.metrics.heavy_operation_duration, "p(95)"),
    ],
    [
      "Heavy-operation p99 (ms)",
      metricValue(data.metrics.heavy_operation_duration, "p(99)"),
    ],
    ["HTTP requests", metricValue(data.metrics.http_reqs, "count")],
    ["HTTP request rate", metricValue(data.metrics.http_reqs, "rate")],
    ["Business error rate", metricValue(data.metrics.business_errors, "rate")],
    ["Check pass rate", metricValue(data.metrics.checks, "rate")],
  ];
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>AI Resume Builder performance report</title><style>body{font-family:system-ui;max-width:960px;margin:2rem auto;padding:0 1rem;color:#172b24}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd8d1;padding:.6rem;text-align:left}th{background:#edf4f0}pre{overflow:auto;background:#f5f7f6;padding:1rem}</style></head><body><h1>Performance test summary</h1><p>Profile: ${htmlEscape(settings.profile)}</p><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${rows.map(([name, value]) => `<tr><td>${htmlEscape(name)}</td><td>${htmlEscape(value)}</td></tr>`).join("")}</tbody></table><h2>Complete summary</h2><pre>${htmlEscape(JSON.stringify(data, null, 2))}</pre></body></html>`;
  return {
    stdout: JSON.stringify(
      { profile: settings.profile, metrics: Object.fromEntries(rows) },
      null,
      2,
    ),
    [summaryPath]: JSON.stringify(data, null, 2),
    [htmlPath]: html,
  };
}
