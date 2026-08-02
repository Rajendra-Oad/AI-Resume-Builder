# Production Launch Checklist

Use this checklist for the public launch and every material production release. Record the release tag, commit SHA, owners, UTC timestamps, evidence links, and each exception in the release ticket. A checked box means evidence was reviewed, not merely assumed.

## Release record

- Release/tag: `________________`
- Commit SHA: `________________`
- Change window (UTC): `________________`
- Release manager: `________________`
- Backend/DB owner: `________________`
- Frontend owner: `________________`
- Incident commander/on-call: `________________`
- Rollback decision deadline: `________________`

## Approval gates

- [ ] Scope is frozen and the exact SHA is reviewed.
- [ ] CI, PostgreSQL integration, security scans, UAT, and required performance gates pass for that SHA.
- [ ] Known limitations and external-validation items are accepted by the product owner.
- [ ] No concurrent database recovery, load test, or conflicting deployment is running.
- [ ] On-call, incident channel, provider dashboards, and rollback operators are available.

## Database and Flyway

- [ ] Render PostgreSQL plan, region, storage, connection limit, SSL, HA/PITR capability, and maintenance window are recorded.
- [ ] Approved RPO, RTO, backup retention, and restore owner replace every `TBD` in the recovery policy.
- [ ] Latest automated backup/PITR status is healthy and an independent restore rehearsal has evidence.
- [ ] Current `flyway_schema_history` versions, success flags, descriptions, and checksums are captured read-only.
- [ ] The candidate migrations passed CI against PostgreSQL and no applied migration was edited.
- [ ] Hikari capacity across all backend instances stays within the database connection budget.
- [ ] A pre-release recovery point exists; destructive database rollback is not part of normal deployment rollback.

## Backend and configuration

- [ ] Render deploy targets the reviewed SHA and uses `SPRING_PROFILES_ACTIVE=prod`.
- [ ] Database values are provider-managed and `DB_SSL_MODE=require`.
- [ ] `APP_FRONTEND_URL` and `APP_CORS_ALLOWED_ORIGINS` contain only exact production HTTPS origins.
- [ ] Strong `JWT_SECRET`, BYOK encryption key, and metrics token are present in the secret store.
- [ ] Secure cookies, issuer/audience/token TTLs, SMTP, AI provider, and optional Redis settings are approved.
- [ ] No secret is committed, printed in logs, stored in Vercel, or exposed through a `VITE_*` variable.
- [ ] `/actuator/health/liveness` and `/actuator/health/readiness` return healthy, sanitized responses.
- [ ] `/actuator/prometheus` rejects missing/invalid `X-Metrics-Token` and accepts the collector token.

## Frontend, DNS, and HTTPS

- [ ] Vercel deploy targets the same reviewed SHA and production environment.
- [ ] `/api` proxies to the intended Render service; no browser secret is embedded in the bundle.
- [ ] Production domains, DNS records, certificate status, renewal, redirects, and canonical host are verified.
- [ ] HTTPS has no mixed content; secure refresh cookies and same-origin API behavior work.
- [ ] CSP, frame denial, content-type, referrer, and permissions headers are present.
- [ ] Static assets use immutable caching while `index.html` can receive new releases safely.
- [ ] Desktop, mobile, and WebKit automation evidence is attached; physical Safari status is explicit.

## Monitoring, alerts, and backups

- [ ] Availability, 5xx, latency, JVM, CPU, memory/GC, Hikari, database connections/storage, and backup dashboards show data.
- [ ] Alert routes are tested to warning and paging destinations; each alert has an owner and runbook link.
- [ ] Frontend error monitoring identifies environment/release without capturing resume or credential data.
- [ ] Backup-age, backup-failure, disk/WAL/storage, and recovery-capability alerts are active.
- [ ] Log access is least-privilege and correlation IDs connect frontend/API/provider investigations.

## Production smoke tests

Use synthetic accounts and data. Do not put real resumes or secrets in screenshots/tickets.

Run the read-only public boundary checks from CI or locally before the authenticated workflow checks:

```powershell
.\scripts\operations\production-smoke.ps1 `
  -FrontendUrl https://app.example.com `
  -BackendHealthUrl https://api.example.com/actuator/health/readiness
```

- [ ] Automated readiness/liveness, protected metrics, frontend security headers, availability, and API proxy boundary checks pass.
- [ ] Startup logs, database connectivity, and Flyway state are reviewed separately; public health output remains sanitized.
- [ ] Register, receive/verify email, login, refresh, logout, forgot/reset password, and invalid-login handling pass.
- [ ] Create, edit, retrieve, version, restore, and delete/restore a synthetic resume.
- [ ] Change template and download/open a PDF; confirm export history.
- [ ] Run AI generation with the approved provider and verify usage/background-job state and safe failure behavior.
- [ ] Run ATS analysis and job matching and verify the generated report/match.
- [ ] Dashboard metrics reflect synthetic activity.
- [ ] Notifications list and mark-read/read-all work; preferences persist.
- [ ] Subscription current plan, entitlement, history, payments, and paid-to-Free cancellation behave as released.
- [ ] Admin analytics, audit logs, prompt management, and authorization denial for a normal user pass.
- [ ] No unexpected 4xx/5xx, CORS, CSP, cookie, database, provider, or PII logging errors appear.

## Rollback readiness

- [ ] Previous known-good Render and Vercel deployment IDs and compatible SHA are recorded.
- [ ] Configuration inventory/version and secret owners are available.
- [ ] Application rollback compatibility with the current schema is confirmed.
- [ ] Rollback trigger, approver, operator, communication route, and smoke tests are agreed.
- [ ] Database recovery follows `BACKUP_AND_RECOVERY.md`; applied Flyway files will never be edited or deleted.

## Release approval

- Product owner: [ ] approve [ ] reject — name/time: `________________`
- Engineering: [ ] approve [ ] reject — name/time: `________________`
- SRE/operations: [ ] approve [ ] reject — name/time: `________________`
- Security: [ ] approve [ ] reject — name/time: `________________`
- Release manager decision: [ ] launch [ ] hold [ ] rollback
- Evidence and exceptions: `________________`
