# Production Audit — AI Resume Builder

**Audit date:** 2026-08-04
**Branch audited:** `perf/optimize-font-loading`
**Scope:** full repository — frontend, backend, database, Docker, CI/CD, scripts, docs
**Method:** source inspection + local execution (`mvn verify`, `npm ci`, lint, `vitest`, `vite build`, `vitest --coverage`). Live Vercel/Render endpoints could not be exercised from this environment.

---

## 1. Executive summary

The repository is a genuinely production-oriented build: enforced CI gates, a gated deployment pipeline, dependency and secret scanning, structured logging, real DB-backed readiness probes, and a documented feature-first architecture. No critical, blocker-grade defects were found. Every issue identified falls into one of two buckets: **already fixed in this pass** (committed) or **manual-intervention item** (requires credentials, a live environment, or a product decision).

**Production Readiness Score: 80 / 100** — configuration-level readiness is high and now committed; the delta is live-environment verification and a few documented engineering debts. See `PRODUCTION_CHECKLIST.md`.

---

## 2. Findings fixed in this pass (committed)

| # | Finding | Root cause | Fix (commit) |
|---|---------|-----------|--------------|
| A1 | Frontend test suite: 36 of 79 tests crashed with `TypeError: React.act is not a function` | The shell exported `NODE_ENV=production`; vitest inherited it, so `require('react')` loaded the **production** build, which does not export `act`. `@testing-library/react` then fell back to the deprecated `react-dom/test-utils` shim, which itself calls `React.act(...)`. | `5131d0b` — `test.env.NODE_ENV='test'` pins the test runtime to the development react build regardless of shell/CI. Cleaned the ineffective polyfill out of `setup.js`. |
| A2 | `mvn spring-boot:run` and CI database-integration would fail prod Hibernate schema validation | PostgreSQL `CHAR(n)` is bpchar (blank-padded). `ai_jobs.id` (V5) and `payment_transactions.currency` (V2.4) were CHAR; the JPA entities map them as VARCHAR, so `ddl-auto=validate` rejects them in prod. | `9f006e4` — V17.4 / V17.5 migrations alter both columns to VARCHAR; `PaymentTransaction` drops its `CHAR(3)` `columnDefinition` so new schemas don't regress. |
| A3 | Production env-validation failures gave operators no actionable location for the fix | `format()` could not tell operators that production-only variables belong in the Render service env, not `backend/.env`. | `a8a686a` — validator now detects the prod profile and appends platform-specific guidance; two regression tests added (7/7 pass). |
| A4 | Google Fonts preloads blocked by the Vercel Content-Security-Policy | CSP `style-src`/`font-src` omitted `fonts.googleapis.com` / `fonts.gstatic.com`. | `aa51c71` — both domains allowlisted. |

The `.env.example` documentation rewrite (`9f56419`) and `CLAUDE.md` (`d54a844`) were committed alongside.

## 3. Findings that require manual intervention (no fix possible without credentials/environment)

| # | Finding | Risk | Action required |
|---|---------|------|----------------|
| B1 | Local Spring Boot startup not executed | A startup-only misconfiguration would surface only at boot. | Run `scripts/seed-dev.sh '<password≥12>'` against a local PostgreSQL, or the Docker Compose stack, and confirm `/actuator/health/readiness` returns `UP` with a real `db` check. |
| B2 | Live Vercel / Render / PostgreSQL connectivity not verified | Mis-set secrets, CORS, or DNS would only fail in production. | Run `scripts/operations/production-smoke.sh` (already wired as the final deploy job) after the next deploy; confirm Sentry ingests, `/actuator/prometheus` responds with the metrics token. |
| B3 | Playwright e2e and `-Pintegration-test` not executed locally | These require browser install and a dedicated test DB; only CI exercises them. | Confirm a green run on `.github/workflows/ci.yml` for the new commits. |
| B4 | Refresh token does not rotate | Stolen refresh cookie remains valid until TTL (30 d). | Decide whether to wire the existing (unused) rotation code; evaluate refresh-rotation on the roadmap. |
| B5 | Auth rate limiter is in-process only | With >1 backend instance the 10 attempts/min limit per IP+path is per-instance. | Provision Redis and enable `AI_REDIS_ENABLED=true` when scaling horizontally. |
| B6 | `job_matches` table/entity has no read/write code path; UI routes to ATS analysis instead | Dead schema debt. | Either implement the match workflow or drop the table via a future migration. |
| B7 | Two resume content models coexist | PDF/preview reads only the denormalized columns; a resume edited via typed sections but empty content columns exports blank. | Enforce mirroring on resume save or migrate to a single model (product decision). |
| B8 | AI "streaming" is SSE that polls job state, not token streaming | Not a real token stream. | Set expectations or migrate to a streaming provider API. |

## 4. Verified-healthy areas (evidence)

- **Backend build gate:** `mvn verify` → 66 tests, 0 failures/errors; JaCoCo line coverage ≥ 24% enforced and met.
- **Frontend gates:** ESLint 0 errors; `vitest run` → 79/79 across 36 files; `vite build` → success in ~6 s with route-level code splitting; `vitest --coverage` → lines 36.98% (threshold 12%), statements 35.87% (13%), functions 31.19% (10%), branches 31.49% (20%).
- **CI (`.github/workflows/ci.yml`):** backend `mvn verify`; frontend lint + `test:coverage` + build; `database-integration` (`-Pintegration-test` against PostgreSQL 17); Playwright e2e across chromium/firefox/webkit. Commit-conventions workflow validates messages and PR titles.
- **Deploy (`.github/workflows/deploy.yml`):** authorize → manual-quality-gate (re-verifies backend, migrations against PG 17, frontend on the exact SHA) → security-gate (Gitleaks, `npm audit --audit-level=high`, OWASP Dependency-Check CVSS≥7) → Render API deploy + Vercel CLI deploy → `production-smoke.sh` verification. Concurrency group prevents overlapping production deploys.
- **Security (`.github/workflows/security.yml`):** scheduled + per-PR Gitleaks, npm audit, OWASP DC, dependency-review on PRs, CodeQL with `security-extended`.
- **Security runtime:** stateless HMAC JWT (15-min TTL), HttpOnly SameSite=Strict refresh cookie, CSRF off (stateless; mitigated), security headers (CSP `frame-ancestors 'none'`, X-Frame-Options DENY, Referrer-Policy, nosniff), timing-safe metrics-token filter that denies all when unset, per-IP auth rate limiting, BYOK credential encryption (32-byte key validated).
- **Configuration validation:** `EnvironmentConfigurationValidator` fails fast on missing/placeholder/type-malformed env vars across every profile; prod adds hard requirements (DB_USERNAME, HTTPS frontend URL, CORS origins, encryption key, metrics token, all-or-nothing SMTP, `APP_SECURE_COOKIES=true`).
- **Health/monitoring:** readiness group includes `db` and `diskSpace` (real dependency check), liveness includes ping; Prometheus metrics endpoint token-protected; logstash structured logging; Sentry on the frontend.
- **Performance posture:** preloaded fonts with async swap, 1-year immutable cache for `/assets`, HikariCP pool tuning, HTTP compression, graceful shutdown, G1GC + string dedup JVM flags, k6 load harness (manual workflow), DB index/JSONB/query audits present.
- **Ops:** backup & recovery, incident response, operations runbook, release runbook, disaster-recovery validation script.

## 5. Scoring rubric

| Category | Weight | Score | Notes |
|---|---|---|---|
| Build, lint, tests, coverage gates | 15 | 15 | All green locally and enforced in CI |
| CI/CD & deployment pipelines | 15 | 13 | Complete gated pipeline; live smoke not yet executed post-change |
| Deployment correctness | 14 | 11 | Config sound (Vercel, Render, Docker, PG17, Flyway); live connectivity unverified |
| Security controls | 15 | 13 | Very strong; refresh non-rotation & single-instance auth limiter |
| Performance & caching | 10 | 8 | Strong baseline; Redis optional, no measured load results in-repo |
| Architecture quality | 10 | 9 | Clean feature-first; documented debt items B6–B8 |
| Monitoring & observability | 6 | 6 | Readiness probes, Prometheus, structured logs, Sentry |
| Operations & runbooks | 6 | 6 | Backup, incident response, runbooks present |
| Test depth | 5 | 3 | Good counts + e2e/integration, but enforced thresholds are low (12%) |
| Documentation | 4 | 4 | Canonical docs + this audit set |
| **Total** | **100** | **88** | Adjusted −8 for unverified live deployment & startup → **80** |
