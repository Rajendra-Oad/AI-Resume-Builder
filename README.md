# AI Resume Builder

Production-oriented AI resume platform with a React 19/Vite frontend, Java 21/Spring Boot API, and PostgreSQL schema managed by Flyway.

## Repository

- `frontend/` — React application and Vercel build
- `backend/` — Spring Boot API and Flyway migrations
- `docs/` — authoritative engineering and operations documentation
- `render.yaml` — Render backend and PostgreSQL Blueprint
- `vercel.json` — Vercel build, SPA routes, API proxy and security headers
- `docker/` — optional self-hosted Docker support

## Development

Use the secret-free examples in `backend/.env.example` and `frontend/.env.example`. Never commit populated environment files.

```bash
cd backend
./mvnw test

cd ../frontend
npm ci
npm test
npm run build
```

### Backend environment variables

Copy `backend/.env.example` to `backend/.env` (the backend loads it automatically on startup) and fill in the values below. The backend refuses to start while a required variable is missing or still contains a placeholder. Variable names are identical across local development, Docker, CI, and the Render deployment; only the database location differs (see below).

Required in every environment (development, tests, and production):

| Variable | Purpose |
| --- | --- |
| `DB_URL` (or `DB_HOST` + `DB_NAME` + `DB_USERNAME`) | PostgreSQL location. Local development and Docker use the single `DB_URL`; Render injects the decomposed host/port/name form and the production profile builds the URL from it. |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Random HMAC secret of at least 32 characters |

Required only in production (`SPRING_PROFILES_ACTIVE=prod`, e.g. Render):

| Variable | Purpose |
| --- | --- |
| `APP_FRONTEND_URL` | Public HTTPS frontend URL |
| `APP_CORS_ALLOWED_ORIGINS` | Comma-separated HTTPS frontend origins |
| `USER_API_KEY_ENCRYPTION_KEY` | Base64 encoding of exactly 32 random bytes (BYOK credential encryption) |
| `MANAGEMENT_METRICS_TOKEN` | Random token protecting the Prometheus metrics endpoint |
| `SPRING_MAIL_HOST` / `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | SMTP for verification and recovery email (all-or-nothing) |
| `GEMINI_API_KEY` or `OPENAI_API_KEY` | Credential for the configured `AI_PROVIDER` |
| `APP_SECURE_COOKIES=true` | Requires HTTPS cookies |

Optional variables validated only when set include `AI_PROVIDER`, `AI_RATE_LIMIT_PER_USER_PER_HOUR`, `AI_BUDGET_PER_USER_MONTHLY_USD`, `AI_CACHE_TTL_SECONDS`, `JWT_ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `REDIS_HOST`/`REDIS_PORT` (when `AI_REDIS_ENABLED=true`), and `DEV_SEED_PASSWORD` (when `DEV_SEED_ENABLED=true`). The full annotated list lives in `backend/.env.example`; the production runbook is `docs/Deployment.md`. The frontend needs only `VITE_DEV_PROXY_TARGET` locally and should leave `VITE_API_BASE_URL` unset (see `frontend/.env.example`).

## Production deployment

The supported production target is:

- frontend on Vercel;
- backend on Render using `backend/Dockerfile`;
- PostgreSQL on Render using `render.yaml`.

Follow the authoritative [production deployment guide](docs/Deployment.md). It covers environment variables, Flyway, custom domains, HTTPS, verification, rollback and common failures.

GitHub Actions builds, tests, scans, packages, deploys and verifies releases. See the [production CI/CD guide](docs/CI_CD.md) for required GitHub secrets, branch protection, semantic releases and rollback.

Before releasing, review [Production Readiness Review](docs/PRODUCTION_READINESS_REVIEW.md) and [PostgreSQL Maintenance & Statistics Audit](docs/POSTGRESQL_MAINTENANCE_STATISTICS_AUDIT.md).

For health checks, metrics, structured logs, frontend error monitoring, dashboards, alerts and incident handling, use the [Monitoring and Observability Runbook](docs/MONITORING.md).

For PostgreSQL backups, PITR, full restore, application/configuration recovery, recovery testing and incident checklists, use the [Backup and Disaster Recovery Runbook](docs/BACKUP_AND_RECOVERY.md).

For authenticated load profiles, safety controls, thresholds, reports and server/database performance correlation, use the [Load and Performance Testing Guide](docs/PERFORMANCE_TESTING.md).

For business-workflow acceptance, browser/device coverage, accessibility, regression evidence, defect reporting and release sign-off, use the [User Acceptance Testing Plan](docs/UAT.md).

## Launch and operations

- [Production Launch Checklist](docs/PRODUCTION_LAUNCH_CHECKLIST.md) — database, configuration, security, smoke-test, rollback, and approval gates.
- [Release Runbook](docs/RELEASE_RUNBOOK.md) — immutable deployment, verification, rollback, escalation, and communication.
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md) — routine monitoring, backup verification, PostgreSQL/Flyway maintenance, and restart procedures.
- [Incident Response](docs/INCIDENT_RESPONSE.md) — severity, roles, containment, recovery, communication, and post-incident review.
- [Production Readiness Report](docs/PRODUCTION_READINESS_REPORT.md) — evidence-based launch assessment, remaining external actions, and final recommendation.
- [Final Production Completion Report](docs/FINAL_PRODUCTION_COMPLETION_REPORT.md) — final classification of completed, external, and out-of-scope items.

Read-only production boundary checks can also be run with `scripts/operations/production-smoke.sh` or `scripts/operations/production-smoke.ps1`. They validate public health, protected metrics, frontend security headers, and the API proxy without creating user data.
