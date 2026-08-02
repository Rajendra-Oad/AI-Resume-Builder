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
