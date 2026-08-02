const bool = (name, fallback = false) =>
  (__ENV[name] ?? String(fallback)).toLowerCase() === "true";
const number = (name, fallback) => {
  const parsed = Number(__ENV[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const settings = {
  baseUrl: (__ENV.BASE_URL ?? "http://localhost:8080").replace(/\/$/, ""),
  profile: __ENV.LOAD_PROFILE ?? "smoke",
  allowProduction: bool("ALLOW_PRODUCTION"),
  allowWrites: bool("ALLOW_WRITES"),
  allowAi: bool("ALLOW_AI"),
  allowAts: bool("ALLOW_ATS"),
  allowPdf: bool("ALLOW_PDF"),
  thinkTimeSeconds: number("THINK_TIME_SECONDS", 1),
  apiP95Ms: number("API_P95_MS", 1000),
  apiP99Ms: number("API_P99_MS", 2000),
  heavyP95Ms: number("HEAVY_P95_MS", 15000),
  heavyP99Ms: number("HEAVY_P99_MS", 30000),
  maxErrorRate: number("MAX_ERROR_RATE", 0.01),
  minCheckRate: number("MIN_CHECK_RATE", 0.99),
};

const profiles = {
  smoke: [
    { duration: "10s", target: 10 },
    { duration: "30s", target: 10 },
    { duration: "10s", target: 0 },
  ],
  normal: [
    { duration: "1m", target: 50 },
    { duration: "5m", target: 50 },
    { duration: "1m", target: 0 },
  ],
  medium: [
    { duration: "2m", target: 100 },
    { duration: "8m", target: 100 },
    { duration: "2m", target: 0 },
  ],
  high: [
    { duration: "3m", target: 250 },
    { duration: "10m", target: 250 },
    { duration: "3m", target: 0 },
  ],
  stress: [
    { duration: "2m", target: 100 },
    { duration: "3m", target: 250 },
    { duration: "3m", target: 500 },
    { duration: "5m", target: 500 },
    { duration: "3m", target: 50 },
    { duration: "5m", target: 50 },
    { duration: "2m", target: 0 },
  ],
  spike: [
    { duration: "10s", target: 10 },
    { duration: "30s", target: 500 },
    { duration: "2m", target: 500 },
    { duration: "30s", target: 50 },
    { duration: "3m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  recovery: [
    { duration: "1m", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "1m", target: 50 },
    { duration: "5m", target: 50 },
    { duration: "1m", target: 0 },
  ],
};

export function validateConfiguration() {
  if (!profiles[settings.profile])
    throw new Error(`Unknown LOAD_PROFILE '${settings.profile}'.`);
  if (!/^https?:\/\//i.test(settings.baseUrl))
    throw new Error("BASE_URL must use http:// or https://.");
  const host = settings.baseUrl
    .replace(/^https?:\/\//i, "")
    .split(/[/:]/, 1)[0]
    .toLowerCase();
  const local =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "host.docker.internal";
  if (!local && !settings.allowProduction) {
    throw new Error(
      "Remote targets require ALLOW_PRODUCTION=true after explicit authorization.",
    );
  }
  if (
    (settings.allowAi || settings.allowAts || settings.allowPdf) &&
    !settings.allowWrites
  ) {
    throw new Error(
      "AI, ATS and PDF scenarios require ALLOW_WRITES=true for isolated synthetic records.",
    );
  }
  if (
    [settings.maxErrorRate, settings.minCheckRate].some(
      (value) => value < 0 || value > 1,
    )
  ) {
    throw new Error("Rate thresholds must be between 0 and 1.");
  }
}

const thresholds = {
  api_duration: [`p(95)<${settings.apiP95Ms}`, `p(99)<${settings.apiP99Ms}`],
  business_errors: [`rate<${settings.maxErrorRate}`],
  http_req_failed: [`rate<${settings.maxErrorRate}`],
  checks: [`rate>${settings.minCheckRate}`],
  dropped_iterations: ["count==0"],
};
if (settings.allowAi || settings.allowAts || settings.allowPdf) {
  thresholds.heavy_operation_duration = [
    `p(95)<${settings.heavyP95Ms}`,
    `p(99)<${settings.heavyP99Ms}`,
  ];
}

export const options = {
  scenarios: {
    user_journey: {
      executor: "ramping-vus",
      gracefulRampDown: "30s",
      gracefulStop: "30s",
      stages: profiles[settings.profile] ?? profiles.smoke,
      exec: "userJourney",
    },
  },
  setupTimeout: "5m",
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  thresholds,
  userAgent: "ai-resume-builder-k6/phase-10",
};
