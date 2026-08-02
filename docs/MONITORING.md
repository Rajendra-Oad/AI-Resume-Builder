# Monitoring and Observability Runbook

This runbook covers the production React application on Vercel, Spring Boot API on Render, and Render PostgreSQL. Monitoring must not collect resume content, AI prompts or responses, passwords, access/refresh tokens, provider keys, email addresses, or request/response bodies.

## Health and availability

The backend exposes sanitized Actuator health endpoints:

| Endpoint                     | Access                     | Purpose                                                                       |
| ---------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `/actuator/health`           | Public                     | Aggregate process health without component details                            |
| `/actuator/health/liveness`  | Public                     | Detect a process that must be restarted                                       |
| `/actuator/health/readiness` | Public                     | Detect whether traffic can be served; includes database and disk-space checks |
| `/actuator/prometheus`       | `X-Metrics-Token` required | Prometheus-format operational metrics                                         |

Render uses readiness for the service health check. An external uptime monitor should check readiness over HTTPS. Do not use liveness for traffic routing: a database outage makes the service unready but should not create a restart loop.

## Metrics

Spring Boot Actuator and Micrometer publish HTTP request count, latency histograms, configured service-level buckets, JVM memory and GC, process CPU, system CPU/load, thread, disk health, JDBC, and Hikari connection-pool metrics. Production metrics carry `application=ai-resume-builder` and `environment=production` tags.

Configure a long random `MANAGEMENT_METRICS_TOKEN` in Render. Configure the Prometheus-compatible collector to send it only in the `X-Metrics-Token` header. Never put this token in Vercel, browser code, a URL, dashboard labels, or committed configuration. Rotate it by updating Render and the collector together.

Useful metric families include:

- `http_server_requests_seconds_*` for request rate, status and latency;
- `jvm_memory_*`, `jvm_gc_*`, and `jvm_threads_*` for JVM pressure;
- `process_cpu_usage` and `system_cpu_usage` for compute saturation;
- `hikaricp_connections_*` for pool capacity, acquisition and timeout behavior;
- `jdbc_connections_*` when supported by the active instrumentation.

Flyway runs before the application becomes ready. Migration failures are startup/deployment-log events rather than scrapeable runtime metrics. Treat a failed deploy or sustained readiness failure as the signal. Cache metrics are not claimed because the current cache implementation is not registered with Micrometer.

## Structured logs and correlation

Production writes Logstash-compatible JSON to standard output for Render log collection. Each request accepts a safe `X-Correlation-Id` or `X-Request-ID` containing at most 64 letters, numbers, dots, underscores, or hyphens; otherwise the backend creates a UUID. The value is returned as `X-Request-ID` and is available as the MDC `correlationId` field in logs.

Search a failure by the request ID shown in the frontend notification or API response. Logs may include workflow, provider, model, status, token counts and latency, but must not include user content or credentials. Access to logs and exports should be restricted and retained only as long as operational requirements demand.

## Frontend monitoring

Sentry browser monitoring is optional and disabled when `VITE_SENTRY_DSN` is empty. Configure these Vercel build variables when it is enabled:

| Variable                         | Meaning                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `VITE_SENTRY_DSN`                | Public browser DSN, not a Sentry auth token                                                  |
| `VITE_APP_ENV`                   | Deployment environment, normally `production`                                                |
| `VITE_APP_RELEASE`               | Immutable release/commit identifier                                                          |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Number from `0` to `1`; begin at `0` and increase only after measuring volume/privacy impact |

React render failures and network/5xx API failures are captured. API context contains only method, URL path without query/fragment, status and request ID. Default PII collection is disabled. Session replay is not enabled. Source-map upload is not configured because that requires a private Sentry auth token in CI; add it only through the deployment secret store if the team adopts that operational workflow.

## PostgreSQL monitoring

Use Render PostgreSQL dashboards/alerts for database CPU, memory, storage, connections, replication/availability, backups and recovery capability. Correlate these with Hikari active/pending/max connections. For investigations, use PostgreSQL statistics views under a read-only operational role; do not expose them through public application endpoints.

Verify backup status continuously and perform scheduled restore tests. Application readiness proves current connectivity only; it does not prove backup recoverability or sufficient remaining storage.

Backup age, PITR coverage and restore-test procedures are governed by the [Backup and Disaster Recovery Runbook](BACKUP_AND_RECOVERY.md). Alert ownership must match the recovery roles recorded there.

## Dashboards and alerts

Create one service dashboard with availability, request rate, errors, latency percentiles, JVM heap/GC, CPU, threads, Hikari active/pending/max, database connections and storage. Split by route/status only where labels remain bounded.

Alert thresholds must be derived from the selected Render plan, observed baseline and user-facing objectives. At minimum configure alerts for:

- sustained readiness failure or external availability failure;
- sustained 5xx-rate increase and latency objective breach;
- repeated deployment/startup or Flyway failure;
- JVM heap/GC or CPU saturation;
- Hikari pending connections, acquisition timeouts, or capacity exhaustion;
- PostgreSQL connection/storage saturation and backup failure;
- a material new frontend error regression by release.

Route warnings to the operational channel and urgent user-impacting pages to the on-call owner. Require a duration and recovery condition to avoid alert flapping. Every alert needs an owner, dashboard link, investigation steps and escalation path.

## Incident workflow

1. Confirm external availability and Render readiness.
2. Identify the affected release, route, status and time window.
3. Correlate frontend event request IDs with backend JSON logs.
4. Inspect HTTP, JVM, Hikari and Render PostgreSQL signals before restarting anything.
5. If a release caused the incident, follow the deployment rollback procedure; never edit an applied Flyway migration.
6. Record customer impact, timeline, evidence, mitigation and follow-up ownership without copying sensitive application data into the incident record.

## Production verification

- Confirm public health responses reveal only status.
- Confirm metrics return `401` without the token and Prometheus text with the correct token.
- Confirm JSON logs contain correlation IDs and no payload/credential/email data.
- Trigger a controlled frontend test error and verify its environment/release and sanitized context.
- Confirm dashboards receive HTTP, JVM and Hikari series.
- Test availability and database alert routing, then record evidence.
- Verify retention, access controls, backup alerts and restore-test ownership.
