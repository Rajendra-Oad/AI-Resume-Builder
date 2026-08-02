# Load and Performance Testing

## Purpose and scope

The Phase 10 suite measures the existing API under controlled load without changing production code, APIs, repositories, business behavior, or schema. It uses k6 because its JavaScript scenarios, staged virtual-user executors, checks, thresholds, multiple output formats, and CI support fit the repository and its API-first architecture.

The suite measures client-observed latency, throughput, errors, checks and dropped work. Spring Boot Prometheus metrics and Render PostgreSQL signals must be collected over the same UTC window to explain CPU, memory, GC, thread, Hikari and database behavior. k6 cannot infer server/database latency from client timing alone.

## Safety rules

- Use an isolated performance environment and synthetic verified users. Never use customer accounts or data.
- Remote targets require `ALLOW_PRODUCTION=true` as an explicit technical acknowledgement. Despite that variable name, routine tests should target staging; production requires separate incident/change authorization.
- The GitHub workflow refuses the URL stored in `PRODUCTION_BACKEND_URL` and permits only smoke/normal profiles.
- Writes, AI, ATS and PDF are disabled by default. AI consumes provider quota/money; PDF consumes CPU and storage; ATS and all write paths create persistent audit/version/soft-deleted data.
- Do not run medium/high/stress/spike profiles until the environment owner verifies capacity, quotas, alerting, cleanup and a stop authority.
- Do not load-test registration, password reset, verification or email delivery. Login is rate-limited to ten attempts per client IP per minute.
- Use a pool of synthetic accounts to represent contention, but no more than ten accounts from one load-generator IP per run because login is intentionally rate-limited. The setup phase logs in each configured account once; tokens are reused and refreshed through the HttpOnly refresh-cookie value when a request returns `401`.
- Stop immediately for unexpected data access, sustained errors, database storage/connection danger, provider-cost anomaly, or impact outside the test environment.

## Project layout

| Path                                | Purpose                                                             |
| ----------------------------------- | ------------------------------------------------------------------- |
| `performance/k6/main.js`            | Authenticated journeys, assertions and HTML/JSON summary generation |
| `performance/k6/config.js`          | Profiles, safety gates and configurable thresholds                  |
| `performance/k6/helpers.js`         | Login, refresh, HTTP checks and custom metrics                      |
| `performance/scripts/run-k6.ps1`    | Windows runner with timestamped reports                             |
| `performance/scripts/run-k6.sh`     | Linux/macOS runner with timestamped reports                         |
| `performance/environment.example`   | Non-secret configuration reference                                  |
| `performance/reports/`              | Ignored generated JSON, CSV and HTML artifacts                      |
| `.github/workflows/performance.yml` | Manual, approval-environment CI execution                           |

## Covered workflows

Every iteration performs a realistic read journey:

1. dashboard analytics overview;
2. paginated resume list;
3. notification list;
4. current subscription and payment history;
5. when a resume exists, resume detail, section list and PDF export history.

With `ALLOW_WRITES=true`, every fifth iteration also creates a uniquely named synthetic resume, updates it, reads it and soft-deletes it. Optional controlled extensions are:

- `ALLOW_ATS=true`: create a synthetic job description, analyze the synthetic resume, then soft-delete the job;
- `ALLOW_AI=true`: run synchronous `resume-summary` generation using synthetic input;
- `ALLOW_PDF=true`: render the synthetic resume as a PDF and record export history.

These options intentionally require `ALLOW_WRITES=true`. Asynchronous AI job/SSE endurance should be tested in a separately approved provider-capacity exercise; the default suite uses synchronous generation so completion latency and errors are unambiguous.

## Load profiles

| Profile    | Peak users | Shape and purpose                                                          |
| ---------- | ---------: | -------------------------------------------------------------------------- |
| `smoke`    |         10 | Ramp 10 seconds, hold 30 seconds, ramp down; script/environment validation |
| `normal`   |         50 | Ramp 1 minute, hold 5 minutes, ramp down; expected operating baseline      |
| `medium`   |        100 | Ramp 2 minutes, hold 8 minutes, ramp down; capacity trend                  |
| `high`     |        250 | Ramp 3 minutes, hold 10 minutes, ramp down; upper planned load             |
| `stress`   |        500 | Step through 100/250/500, hold, return to 50 for recovery, then stop       |
| `spike`    |        500 | Rapid rise from 10 to 500, then return to 50 and observe recovery          |
| `recovery` |   100 → 50 | Hold elevated load, return to normal 50 users for five minutes             |

Virtual users include a one-second think time by default. Change `THINK_TIME_SECONDS` only as part of a recorded workload model. VUs are not requests per second; actual throughput depends on response time and journey length.

## Configuration

Set variables in the invoking shell or a protected CI environment. Do not commit credentials.

```powershell
$env:BASE_URL = "https://approved-performance-api.example.com"
$env:ALLOW_PRODUCTION = "true"
$env:PERF_USERS_JSON = '[{"email":"perf-001@example.test","password":"secret"},{"email":"perf-002@example.test","password":"secret"}]'
$env:ALLOW_WRITES = "false"
./performance/scripts/run-k6.ps1 -Profile smoke
Remove-Item Env:PERF_USERS_JSON
```

For localhost, `ALLOW_PRODUCTION` is unnecessary. A single account can be supplied with `PERF_USER_EMAIL` and `PERF_USER_PASSWORD`, but it is appropriate only for smoke validation. A single generator can initialize at most ten accounts inside the one-minute login window; higher account cardinality requires a separately designed setup/token-fixture process that does not weaken production rate limiting. When k6 runs inside Docker against a host backend, use `http://host.docker.internal:8080` on supported Docker platforms.

Linux/macOS:

```bash
export BASE_URL=https://approved-performance-api.example.com
export ALLOW_PRODUCTION=true
export PERF_USERS_JSON='[{"email":"perf-001@example.test","password":"secret"}]'
sh ./performance/scripts/run-k6.sh smoke
unset PERF_USERS_JSON
```

Install k6 through the official packages or run the pinned image used by CI:

```bash
mkdir -p performance/reports
docker run --rm --user "$(id -u):$(id -g)" \
  -e BASE_URL -e ALLOW_PRODUCTION -e PERF_USERS_JSON \
  -e LOAD_PROFILE=smoke -e SUMMARY_JSON=performance/reports/summary.json \
  -e SUMMARY_HTML=performance/reports/summary.html \
  -v "$PWD:/work" -w /work grafana/k6:2.0.0 run \
  --out json=performance/reports/raw.json \
  --out csv=performance/reports/metrics.csv \
  performance/k6/main.js
```

## Authentication behavior

`setup()` logs in each configured account using `{identifier,password}` and verifies HTTP `200`, the common `success` envelope and `data.accessToken`. VUs select accounts round-robin and keep their own token copy. Authenticated requests retry once after a `401` by posting the captured `refresh_token` cookie to `/api/v1/auth/refresh` and replacing both tokens.

This avoids measuring login rate limiting as application capacity. Authentication itself should be measured in a separate low-rate security test because the production limiter is intentionally ten attempts per IP per minute and is in-memory per backend instance.

## Metrics and thresholds

The initial configurable gates are deliberately provisional:

| Metric                         | Default gate | Meaning                                             |
| ------------------------------ | -----------: | --------------------------------------------------- |
| `api_duration p95`             |  `< 1000 ms` | Ordinary application/API operations                 |
| `api_duration p99`             |  `< 2000 ms` | Ordinary tail latency                               |
| `heavy_operation_duration p95` | `< 15000 ms` | Enabled AI/ATS/PDF operations                       |
| `heavy_operation_duration p99` | `< 30000 ms` | Heavy-operation tail latency                        |
| `business_errors`              |       `< 1%` | Unexpected HTTP status or unsuccessful API envelope |
| `checks`                       |      `> 99%` | Status and business assertions                      |
| `dropped_iterations`           |          `0` | k6 could schedule all configured work               |

Override with `API_P95_MS`, `API_P99_MS`, `HEAVY_P95_MS`, `HEAVY_P99_MS`, `MAX_ERROR_RATE`, and `MIN_CHECK_RATE`. Do not weaken a gate merely to make a run green. Establish the final service objectives using repeated normal-profile baselines, user requirements and the selected Render plan.

Review standard k6 metrics including `http_reqs` rate, `http_req_duration`, `http_req_failed`, timeouts, bytes, VUs and iteration duration. The suite also tags metrics by bounded `endpoint` and `operation`; it never uses resume/user IDs as metric labels.

## Server and database correlation

Record the exact UTC load window and release. From `/actuator/prometheus` and the monitoring system inspect:

- `http_server_requests_seconds_*` by bounded URI/status for server-side latency and errors;
- process/system CPU, JVM heap, GC pauses and threads;
- Hikari active, idle, pending, maximum, acquisition time and timeouts;
- JDBC metrics where emitted;
- Render PostgreSQL CPU, memory, connections, storage, locks and availability;
- PostgreSQL slow-query/statistics evidence under an approved read-only operational role.

Interpretation examples:

- high client latency with low server duration suggests network/proxy/load-generator constraints;
- rising server latency plus Hikari pending/timeouts suggests database/pool contention;
- high database CPU with stable Hikari usage suggests query workload/index/statistics investigation;
- long GC pauses or heap pressure with stable database signals suggests JVM allocation pressure;
- AI latency without local resource pressure commonly reflects provider latency/quota and must not be labeled database latency.

Do not tune pools, queries, autoscaling or indexes during the same run used to establish a baseline. Change one controlled variable, rerun the same profile/data, and compare confidence intervals across multiple runs.

## Reports

Each runner writes timestamped artifacts:

- `*-summary.html`: human-readable overview and complete escaped k6 summary;
- `*-summary.json`: threshold and aggregate summary;
- `*-metrics.csv`: time-series metrics for spreadsheets/statistical analysis;
- `*-raw.json`: detailed k6 event stream.

Reports are ignored by Git because they can be large and contain target metadata. GitHub Actions retains its artifact for 30 days. Store approved baseline reports in controlled artifact storage with release, environment, profile, flags, data-set size, k6 version, test owner and UTC window. Review reports before sharing to ensure no sensitive target metadata escaped.

## GitHub Actions

The `Performance test` workflow is manual only and uses the protected `performance-test` environment. Configure:

- `PERF_TEST_USERS_JSON`: environment secret containing synthetic credentials;
- `PRODUCTION_BACKEND_URL`: environment secret used solely to reject the production target;
- required reviewers on the `performance-test` environment.

The workflow offers only smoke and normal profiles, disables AI/ATS/PDF, and uploads reports even when thresholds fail. Run medium through spike from approved load-generator infrastructure near the target; shared GitHub runners are not a controlled generator for capacity conclusions.

## Execution process

1. Approve target, release, profile, duration, workload flags, account pool, provider budget and stop conditions.
2. Confirm target data is synthetic, monitoring is healthy, database backups exist, alerts are routed and no other test/deploy overlaps.
3. Warm the environment with smoke; fix functional/check failures before increasing load.
4. Run normal at least three times under comparable conditions and select a statistically defensible baseline.
5. Progress one profile at a time while watching application/database saturation.
6. For stress/spike, keep the recovery stage and do not stop collection immediately after peak load.
7. Save reports and monitoring snapshots with the run metadata.
8. Confirm the service returns to baseline, connection/queue counts drain and no background jobs remain stuck.
9. Remove synthetic active records according to the approved cleanup policy; remember resume/job deletion is soft deletion and audit/export/version records remain.
10. Record findings separately. Performance changes require their own reviewed phase and are not part of this suite.

## Acceptance checklist

- [ ] All status and business checks pass at smoke load.
- [ ] Normal profile meets approved p95/p99/error/throughput objectives in repeated runs.
- [ ] No dropped iterations or generator CPU/network saturation invalidates the run.
- [ ] Hikari remains within capacity with no acquisition timeouts.
- [ ] PostgreSQL remains healthy with acceptable latency/connections/storage behavior.
- [ ] JVM CPU, heap, GC and threads recover after load.
- [ ] Stress/spike failure point and recovery time are recorded, not hidden.
- [ ] AI/provider and PDF results are reported separately from ordinary API results.
- [ ] HTML, JSON, CSV and raw results are retained with test metadata.
- [ ] No customer data, secrets, unexpected email, or uncontrolled provider spending occurred.

## Known limits

- Repository implementation proves scenario correctness, not production capacity; capacity requires execution against the approved deployed environment.
- k6 protocol tests do not measure React rendering/Core Web Vitals. Use Vercel/browser RUM or a separate browser-performance suite for frontend rendering.
- The current suite does not generate distributed load. A single generator must be monitored for saturation; 500 VUs may require controlled distributed infrastructure depending on heavy payloads.
- Persistent synthetic soft-deleted/audit/version/export rows affect database size. Use a disposable restored/staging database for high-volume tests rather than deleting audit evidence through unsupported SQL.

Official reference: [Grafana k6 documentation](https://grafana.com/docs/k6/latest/).
