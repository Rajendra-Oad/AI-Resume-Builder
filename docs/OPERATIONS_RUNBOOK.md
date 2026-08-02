# Operations Runbook

## Daily operations

- Review readiness/availability, 5xx rate, p95/p99 latency, frontend errors, provider failures, background jobs, and alert delivery.
- Review JVM heap/GC, CPU, threads, Hikari active/pending/max, PostgreSQL connections/storage, locks, backup/PITR status, and AI usage/cost.
- Investigate new errors using UTC time, release, route, status, and correlation ID. Do not inspect or copy user payloads unless an approved privacy/security process permits it.
- Confirm no expired certificate, domain, SMTP sender, provider quota, or secret-rotation task is approaching its deadline.

## Weekly operations

- Review alert noise/missed alerts, dependency/security findings, provider quotas/cost, slow endpoints, database growth, and failed/background work.
- Confirm CI/deployment credentials and least-privilege access remain owned; remove stale users and tokens.
- Verify backup completion/age/checksum/retention evidence and that the restore schedule has an owner.
- Review release history, unresolved incidents, error regressions, and capacity trends.

## Monthly and quarterly operations

- Patch dependencies through normal CI/security/release gates; never update production manually.
- Review PostgreSQL statistics, autovacuum/analyze health, bloat indicators, long transactions, index usage, and query plans under the maintenance audit. Do not add/drop indexes without evidence and review.
- Reconfirm RPO/RTO, storage/connection budgets, data retention, access, secret rotation, and provider recovery contacts.
- Perform and time a quarterly isolated database restore, Flyway validation, backend startup, and critical-workflow recovery test.
- Rehearse incident escalation and application rollback; record gaps and owners.

## Monitoring and log review

Follow `MONITORING.md`. Readiness includes database and disk space; liveness detects a process requiring restart. Prometheus access requires `X-Metrics-Token`. Keep metrics labels bounded and never include email, resume ID/content, token, prompt, or provider key. Verify frontend monitoring uses the correct environment and release.

Investigate sustained availability loss, elevated 5xx, ordinary API p95 above 1 second/p99 above 2 seconds, heavy-operation p95 above 15 seconds/p99 above 30 seconds, business errors at or above 1%, Hikari pending/timeouts, or provider/database saturation. These are release test objectives; production paging durations and capacity thresholds must be tuned to the selected plan and observed baseline.

## Backup verification

1. Confirm provider PITR window and last successful recovery point.
2. Confirm independent logical export schedule where policy requires it, encryption, restricted storage, checksum, size, lifecycle, and alert status.
3. Verify restore-test evidence rather than treating backup creation as recoverability.
4. Escalate missed/old/zero-size/checksum-failed backups immediately according to approved RPO.
5. Use `BACKUP_AND_RECOVERY.md` for restoration and cutover.

## Flyway and database maintenance

- On every deploy, confirm all `flyway_schema_history` rows are successful and checksums match committed files.
- Never modify an applied migration or use repair before identifying and approving the exact cause.
- Use provider/PostgreSQL maintenance mechanisms and a read-only operational account for diagnosis.
- Schedule disruptive maintenance within an approved window with backup, rollback, monitoring, and customer communication.

## Restart procedures

### Backend

1. Determine whether readiness, dependency failure, or a release/configuration problem is the cause; avoid restart loops during database outages.
2. Record metrics/log evidence and deploy ID.
3. Restart through Render controls, preserving the same immutable release/configuration.
4. Verify liveness/readiness, API proxy, authentication, database connections, and queued work.
5. Escalate recurrence instead of repeatedly restarting.

### Frontend

Static Vercel deployments are promoted or rolled back, not process-restarted. Verify DNS/CDN/provider status, redeploy the same artifact only when justified, then check headers, SPA routing, assets, and `/api` proxy.

### Database

Do not restart or fail over PostgreSQL casually. Use provider procedures with DBA/incident authorization, confirm backups/replication, freeze writes if required, and validate connectivity/Flyway/application state afterward.

## Access and handoff

Every operational action records operator, UTC time, reason, commands/provider actions, evidence, result, and follow-up. Handoffs include active alerts/incidents, release/configuration state, backup status, capacity risk, provider tickets, and the next decision time.

