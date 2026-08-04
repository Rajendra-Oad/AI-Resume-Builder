# Performance Report — AI Resume Builder

**Date:** 2026-08-04
**Status:** static optimization posture verified locally; no live load numbers recorded this session (k6 harness is wired but requires a non-production target).

---

## 1. Frontend (build output measured locally, Vite 8 / React 19)

- **Build:** `vite build` succeeds in ~6 s. Route-level code splitting is active — the landing, resume, admin, and template routes ship as separate chunks; `gsap`, `ScrollTrigger`, and `locomotive-scroll` are split into their own chunks so non-motion routes don't pay for them.
- **Largest bundles (gzip):** vendor `esm-*.js` 156 kB, `axiosInstance` 20 kB, landing page 52 kB, `gsap` 27 kB. All under `/assets/*` with a **1-year immutable cache** (`vercel.json`) because Vite hashes filenames.
- **Fonts:** DM Sans / DM Mono / Inter / Geist Mono / Playfair Display are preloaded from Google Fonts with `preload` + `onload` swap and a `noscript` fallback — no blocking `@font-face`, no render-blocking stylesheet. Preconnect hints to `fonts.googleapis.com` and `fonts.gstatic.com`. The Vercel CSP now permits these requests (fixed `aa51c71`).
- **Monitoring:** Sentry attached for JS error + performance monitoring (CSP `connect-src` allows `*.ingest.sentry.io`).
- **Not yet measured:** Lighthouse/CrUX scores, real font-swap metrics, e2e navigation timing. Recommend a Lighthouse pass post-deploy.

## 2. Backend (Spring Boot 3.5, Java 21)

- **Pool:** HikariCP — `maximum-pool-size=10`, `minimum-idle=2` (prod), 30 s connection timeout, 5 s validation timeout, idle 10 min, max lifetime 30 min. Sized for the 1 GiB Render/EC2 target.
- **HTTP:** compression enabled (prod profile); graceful shutdown enabled; `forward-headers-strategy=framework` so HTTPS/X-Forwarded-* from Render are honored.
- **JVM (Docker stack):** G1GC, `InitialRAMPercentage=20`, `MaxRAMPercentage=65`, `UseStringDeduplication`, `ExitOnOutOfMemoryError` with heap dumps to `/tmp`, `file:/dev/urandom`.
- **AI:** configurable rate limit (`AI_RATE_LIMIT_PER_USER_PER_HOUR`), per-user monthly budget (`AI_BUDGET_PER_USER_MONTHLY_USD`), and a response cache (`AI_CACHE_TTL_SECONDS`). Distributed rate limiting is **off by default** (`AI_REDIS_ENABLED=false`); enabling it before horizontal scale is recommended.
- **Metrics:** Prometheus exposed behind the metrics token; HTTP latency histograms with SLO buckets (100 ms–5 s), JDBC and HikariCP metrics enabled; logstash structured JSON logs.
- **DB:** readiness probe exercises a real `db` check; health shows no details externally.

## 3. Database (PostgreSQL 17)

- Flyway-owned schema with explicit migrations. Dedicated audits already exist in `docs/` for **indexes**, **JSONB usage**, **query performance**, **maintenance/statistics**, and an **optimization backlog** — the schema has been reviewed for indexing before this pass.

## 4. Load testing

- **Harness:** `performance/k6` with a **guard against production targets** (`PRODUCTION_BACKEND_URL` secret; workflow refuses to run against prod) and a `smoke`/`normal` profile selector, writes gated off by default.
- **Status:** not executed this session (no approved non-production target available). First run should target a Render preview/staging service and record the `performance/reports/*` artifacts.

## 5. Known performance/cost trade-offs

| Item | Impact | Recommendation |
|------|--------|----------------|
| Auth rate limiter is in-process | Per-instance limits when scaled | Enable Redis before horizontal scale |
| SSE "streaming" polls job state | Polling load + perceived latency, not a token stream | Manage expectations or migrate to provider streaming |
| Low frontend coverage thresholds (12%) | Regressions can ship | Raise thresholds as coverage improves |

## 6. Verdict

The static and configuration-level performance posture is solid for the target scale (1 GiB instances): code splitting, immutable caching, async fonts, a tuned pool, compression, and G1GC sizing are all in place. The outstanding work is **measurement**: a Lighthouse pass, a k6 smoke run against a staging URL, and first production metrics inspection via `/actuator/prometheus`.
