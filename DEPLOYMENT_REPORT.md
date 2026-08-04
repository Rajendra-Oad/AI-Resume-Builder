# Deployment Report — AI Resume Builder

**Date:** 2026-08-04
**Status:** configuration validated locally; live deployment requires the manual verification pass below.

---

## 1. Topology

```
GitHub (main) ── CI ── deploy.yml (gated)
                         │
                         ├──▶ Vercel ──▶ https://<frontend>   React 19 / Vite 8 (static)
                         │                └── /api/* ──rewrite──▶ Render backend
                         └──▶ Render ──▶ /actuator/health/readiness   Spring Boot 3.5 (Docker)
                                         └──▶ PostgreSQL 17 (fromDatabase)
```

- Frontend: **Vercel** (`vercel.json`), framework `vite`, `npm ci`, `npm run build`, output `dist`.
- Backend: **Render** (`render.yaml` blueprint), Docker runtime, `fromDatabase` PostgreSQL.
- The SPA rewrites all non-API routes to `/index.html`; `/api/:path*` is proxied to `https://ai-resume-builder-api.onrender.com/api/:path*`.

## 2. Deploy pipeline (`.github/workflows/deploy.yml`)

1. **authorize** — resolves the exact commit SHA to deploy; requires the upstream CI run to have concluded successfully.
2. **manual-quality-gate** — re-checks the exact SHA: `mvn verify`, `-Pintegration-test verify` against a PostgreSQL 17 service, frontend `npm ci && lint && test && build`. Skipped for auto deploys from CI.
3. **security-gate** — Gitleaks over full history, `npm audit --audit-level=high`, OWASP Dependency-Check (fail on CVSS ≥ 7).
4. **deploy-backend** — triggers Render via API for the exact verified commit; polls until `live` (10 min budget, fails on `build_failed|update_failed|canceled|deactivated`).
5. **deploy-frontend** — `vercel pull --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod --archive=tgz`.
6. **verify** — runs `scripts/operations/production-smoke.sh` against the live boundaries (`FRONTEND_URL`, `BACKEND_HEALTH_URL` secrets).

`concurrency: production` + `cancel-in-progress: false` prevents interleaved deploys. `release.yml` gates the release beyond this.

## 3. Backend deployment (Render)

- **Image:** multi-stage `backend/Dockerfile` — `maven:3.9.11-eclipse-temurin-21` builder (`dependency:go-offline`, `-DskipTests package`), `eclipse-temurin:21-jre-jammy` runtime. Non-root user `10001:10001`, `ca-certificates` + `curl` for the healthcheck.
- **Health check:** `/actuator/health/readiness` — readiness group includes `readinessState, db, diskSpace`, so Render only marks the service live when the PostgreSQL connection is actually healthy (`management.endpoint.health.probes.enabled=true`).
- **Secrets:** `JWT_SECRET`, `USER_API_KEY_ENCRYPTION_KEY`, `MANAGEMENT_METRICS_TOKEN` are `sync:false` — they must exist in the Render service env; the app refuses to boot with placeholders or missing values.
- **DB:** `fromDatabase ai-resume-builder-db` injects `DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD`; `DB_SSL_MODE=require`; the prod profile composes `jdbc:postgresql://...` from the decomposed form and runs `ddl-auto=validate`.

## 4. Frontend deployment (Vercel)

- `vercel.json`: framework `vite`, `installCommand npm ci`, `buildCommand npm run build`, `outputDirectory dist`.
- Headers: security headers on all routes (CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`); **1-year immutable cache** for `/assets/*` (hashed filenames).
- CSP allowlists Google Fonts (`fonts.googleapis.com` in `style-src`, `fonts.gstatic.com` in `font-src`) — fixed this pass (`aa51c71`).
- Build verified locally: success in ~6 s; largest route chunk `esm-*.js` 475 kB (156 kB gzip) is the vendor bundle, split per route.

## 5. Docker stack (self-hosted, `docker/docker-compose.yml`)

- Backend container: host networking to reach an EC2-hosted PostgreSQL, `JAVA_TOOL_OPTIONS` sized for 1 GiB (G1GC, `InitialRAMPercentage=20`, `MaxRAMPercentage=65`, `ExitOnOutOfMemoryError`), `read_only` with tmpfs `/tmp`, `cap_drop: [ALL]`, `no-new-privileges`, curl healthcheck.
- nginx reverse proxy: `nginxinc/nginx-unprivileged:1.27-alpine` (non-root `101:101`), TLS via `NGINX_TLS_CERTIFICATE` / `NGINX_TLS_PRIVATE_KEY` mounts from `docker/.env`, HTTP→HTTPS redirect, publishes 80/443, depends on backend health.
- Both containers: json-file logging capped at 10 MB × 3.

## 6. Flyway / database

- `ddl-auto=none` in base config; Flyway owns schema (V1–V17, executable under `backend/src/main/resources/db/migration`).
- Prod uses `ddl-auto=validate`; the CHAR→VARCHAR reconciliations (V17.4, V17.5) are required for that to pass and are now committed (`9f006e4`).
- Root `database/migrations/` is documentation only — no second migration source.

## 7. Required production environment variables

Every prod-required variable is enforced by `EnvironmentConfigurationValidator`:

- `DB_HOST`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD` (+ `DB_PORT`, `DB_SSL_MODE`) or `DB_URL`
- `JWT_SECRET` (≥ 32 chars), `USER_API_KEY_ENCRYPTION_KEY` (Base64 of 32 bytes)
- `MANAGEMENT_METRICS_TOKEN`, `APP_FRONTEND_URL` (HTTPS), `APP_CORS_ALLOWED_ORIGINS` (HTTPS)
- `APP_SECURE_COOKIES=true`
- `SPRING_MAIL_HOST`/`USERNAME`/`PASSWORD` (all-or-nothing)
- `GEMINI_API_KEY` or `OPENAI_API_KEY` per `AI_PROVIDER`

## 8. Manual verification required before/after next deploy

1. `scripts/seed-dev.sh '<password≥12>'` (or the Docker stack) against local PostgreSQL — confirm boot + migrations + readiness.
2. Trigger a deploy from a clean green CI; watch `verify` job (production-smoke) pass.
3. Confirm `/actuator/prometheus` requires `X-Metrics-Token`, and the frontend loads with the DM Sans/Inter fonts (not system fallback).
4. Confirm Sentry ingest and structured logs in the Render dashboard.
5. Confirm the PostgreSQL connection is encrypted (`DB_SSL_MODE=require`) and Flyway reports no pending migrations.
