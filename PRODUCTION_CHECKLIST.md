# Production Checklist — AI Resume Builder

**Date:** 2026-08-04 · **Readiness Score: 80 / 100**
This checklist captures what is verified vs. what still requires a human with credentials, a live environment, or a product decision. Work through **Section A** in order; each completed item is a release blocker until done.

---

## A. Required before the next production deploy

- [ ] **A1 — Local boot + migrations.** `cd backend && ./mvnw spring-boot:run` against a local PostgreSQL (or `docker compose -f docker/docker-compose.yml up -d`). Confirm Flyway applies V1–V17 cleanly, `/actuator/health/readiness` returns `UP` with the `db` check, and `/actuator/health` shows no details.
- [ ] **A2 — Dev seed.** `bash scripts/seed-dev.sh '<password≥12 chars>'` (or `scripts/seed-dev.ps1`) and log in as `demo.user@local.test` / `demo.admin@local.test`.
- [ ] **A3 — CI green on the new commits.** Confirm `.github/workflows/ci.yml` passes on `perf/optimize-font-loading` (backend `mvn verify`, frontend lint + `test:coverage` + build, `database-integration` against PostgreSQL 17, Playwright e2e). The 66 backend + 79 frontend tests pass locally.
- [ ] **A4 — Deploy from a green CI run.** Merge via PR → CI → `deploy.yml` (quality + security gates) → Render + Vercel. Watch the final `verify` job run `scripts/operations/production-smoke.sh`.
- [ ] **A5 — Post-deploy checks.**
  - Fonts render as DM Sans/Inter (not system fallback) — verifies the CSP fix (`aa51c71`).
  - `/actuator/prometheus` requires `X-Metrics-Token`; `health` shows no details.
  - Sentry ingest visible; structured (logstash) logs in the Render dashboard.
  - `DB_SSL_MODE=require`; no pending Flyway migrations.
  - Browser cookie is HttpOnly + SameSite=Strict after `/auth/refresh`.

## B. Security hardening (manual)

- [ ] **B1 — Refresh rotation.** Wire the existing rotation code (`feature/auth`) or formally accept the 30-day non-rotation window (audit item S1).
- [ ] **B2 — Redis for rate limiting.** Provision Redis and set `AI_REDIS_ENABLED=true` before running a second backend instance; otherwise the per-IP auth limit is per-instance (S2).
- [ ] **B3 — Secret hygiene.** Restrict `backend/.env` file ACLs; ensure it stays git-ignored; rotate `JWT_SECRET`, `USER_API_KEY_ENCRYPTION_KEY`, `MANAGEMENT_METRICS_TOKEN`, and the SMTP password into the Render env with `sync:false` preserved.
- [ ] **B4 — Auth-flow verification.** Run the login / register / forgot-password / refresh e2e flows on the deployed app once.

## C. Performance measurement

- [ ] **C1 — Lighthouse/CrUX** pass on the deployed frontend (LCP, CLS, font-swap).
- [ ] **C2 — k6 smoke.** Run `performance.yml` (`workflow_dispatch`) against an approved **non-production** Render preview/staging URL; record `performance/reports/*`.
- [ ] **C3 — First metrics review** from `/actuator/prometheus` (latency SLO buckets 100 ms–5 s, Hikari pool, JDBC).
- [ ] **C4 — Raise coverage thresholds** from 12% (lines) as suites grow; consider moving e2e into PR CI if runtime permits.

## D. Architecture debt — product decisions

- [ ] **D1 — Resume content model.** Decide between mirroring typed sections into the denormalized columns on save vs. a single model. **Blocking for PDF/preview correctness** if users can create resumes with typed sections but empty content columns (audit item B7).
- [ ] **D2 — `job_matches`.** Implement the match read/write path or drop the table via migration (B6).
- [ ] **D3 — AI streaming.** Accept the polling-based SSE as-is or migrate to a provider token stream (B8).

## E. Tooling / hygiene

- [ ] **E1 — Verify `scripts/check-commit-messages.sh`** passes on the new commits (`feat`/`fix`/`docs` prefixes already used).
- [ ] **E2 — Dedupe the docs set.** `docs/` contains multiple overlapping `PRODUCTION_READINESS_*` / `FINAL_PRODUCTION_COMPLETION_REPORT` documents; consolidate to avoid contradictory guidance.
- [ ] **E3 — Rotate `NVD_API_KEY`, `RENDER_API_KEY`, Vercel tokens** per your org policy before the first post-audit deploy.

---

## F. Verified this pass (no action needed)

- Backend `mvn verify`: 66 tests, 0 failures; JaCoCo ≥ 24% met.
- Frontend: ESLint 0 errors · `vitest` 79/79 · `vite build` OK · coverage gates met (lines 36.98% ≥ 12%).
- `EnvironmentConfigurationValidator`: 7/7 tests incl. prod-vs-dev profile behavior.
- Schema type reconciliation (CHAR→VARCHAR) committed for `ai_jobs.id` and `payment_transactions.currency`.
- Vercel CSP now allows Google Fonts; vitest pinned to `NODE_ENV=test` (fixes the 36 `React.act` failures).
- Deploy pipeline gated by quality + security + smoke verification; concurrency prevents overlapping deploys.
- Readiness probe is DB-backed; metrics endpoint token-protected; structured logging enabled.

**To close the gap to 100:** complete A1–A5, B1–B2, C1–C3, and D1 — after which this checklist can be archived and replaced by `docs/OPERATIONS_RUNBOOK.md` as the standing document.
