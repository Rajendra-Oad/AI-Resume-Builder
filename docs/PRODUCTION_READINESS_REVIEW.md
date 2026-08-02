# Production Readiness Review

## Executive Summary

**Overall production readiness score: 68/100**

**Release recommendation: NOT READY**

The application has a credible production foundation: modular Spring Boot features, React route boundaries and lazy loading, stateless JWT authorization, rotated database-backed refresh tokens, password hashing, ownership-aware queries, PostgreSQL constraints and Flyway integration tests, container hardening, HTTPS reverse proxying, CI, dependency scanning, CodeQL, frontend accessibility tests, and passing backend/frontend/build verification.

The release is blocked by operational and configuration defects visible in the repository—not by missing product features:

1. The production deployment runbook and Docker README still instruct operators to use MySQL, port `3306`, `jdbc:mysql`, and the MySQL CLI even though the runtime and migrations are PostgreSQL.
2. No committed PostgreSQL backup/PITR ownership, retention, alert, or restore-test procedure proves that production data can be recovered.
3. Production can start without SMTP even though registration creates `PENDING_VERIFICATION` users that cannot log in until an email link is delivered.
4. Authentication throttling keys on `request.getRemoteAddr()` behind Nginx. In the documented proxy topology this can combine clients under the proxy address, and its `ConcurrentHashMap` never removes old keys.
5. `spring.jpa.show-sql=true` in the shared configuration is inherited by the `prod` profile, creating unnecessary production SQL logging and possible data/operational exposure.
6. Only an HTTP health endpoint is operationalized; database metrics, alerting, error reporting, and recovery monitoring are not demonstrated.

No code was modified by this review. Scores and findings are based on committed files and observed test/build results, not assumed infrastructure.

## Architecture Review

### Strengths

- Backend code is organized by feature (`auth`, `resume`, `ai`, `ats`, `subscription`, `notification`, `analytics`, `audit`, `admin`) with controllers, services, repositories, entities, and shared security/error concerns.
- Spring transactions are generally placed at service boundaries, with read-only transactions for reads and an intentional row lock for resume-version sequencing.
- Frontend features have their own routes, API modules, hooks, components, and tests. Route-level lazy loading limits the initial bundle.
- The API is stateless for access authentication; persistent refresh-token state supports revocation and rotation.
- Database ownership checks are normally performed in SQL or repository methods, not trusted from client input.
- No evidence of a required microservice, queue, cache, or infrastructure rewrite was found.

### Risks

| Finding | Severity | Evidence |
|---|---|---|
| Several Java source files compress complete classes into single lines and package repositories with services, reducing reviewability and maintainability | Low | Job, ATS, PDF, audit and other feature sources |
| `AiController` creates a platform thread per SSE request and polls the database once per second for up to 60 seconds | Medium | `AiController.stream` |
| Source inspection does not prove absence of all package cycles; no architecture-rule test is present | Low | No ArchUnit or equivalent rule found |

### Recommendations

- Treat the SSE implementation as a bounded-capacity operational risk: load-test the expected concurrent stream count before launch and monitor threads and database calls.
- Do not restructure modules for this release; the current modular monolith is appropriate for the implemented workload.

## Security Review

### Findings

| Finding | Severity | Assessment and evidence |
|---|---|---|
| Proxy-incompatible auth rate limiting | **High / blocker** | `AuthRateLimitFilter` uses `request.getRemoteAddr()` while Nginx proxies requests. Multiple users can share the proxy address and exhaust one bucket. The map retains one key per observed address/path indefinitely because expired windows are replaced only when that same key returns. |
| Production SQL logging remains enabled | **High / blocker** | `application.properties` sets `spring.jpa.show-sql=true`; `application-prod.properties` does not override it. SQL text and operational details should not be emitted by default in production. |
| SMTP is optional despite mandatory verification | **High / blocker** | Registration sets `PENDING_VERIFICATION`; login requires `ACTIVE`. `SecurityEmailService` only warns and returns if mail is unavailable, while the production environment validator does not require SMTP. |
| Public API documentation in production | Medium | `/v3/api-docs/**` and `/swagger-ui/**` are unconditionally public. This is not an authorization bypass but expands production discovery surface unless intentionally required. |
| Rate limiting covers only register, login and forgot-password | Medium | Reset, resend-verification, refresh and other potentially abused flows are outside `AuthRateLimitFilter`. Account lockout mitigates repeated login attempts but not every endpoint. |
| No external error-reporting/sensitive-log policy demonstrated | Medium | Structured Nginx access logs exist, but no committed log redaction policy, centralized sink, or error-reporting integration exists. Security email failures log recipient email addresses. |
| CSRF disabled | Low / accepted for current design | Bearer tokens protect normal state changes. Refresh/logout use an HttpOnly, `SameSite=Strict`, path-scoped cookie, materially limiting cross-site cookie submission. Production validation requires secure cookies. |

Positive controls:

- JWT signature, expiration, issuer and audience are verified; the startup validator and `JwtService` require at least 32 secret characters.
- The JWT filter reloads the user, rejects deleted/inactive accounts, and derives authority from the database instead of trusting the token role claim.
- Admin routes require `ROLE_ADMIN` server-side; frontend admin guards are additional UX protection only.
- Passwords use Spring Security's `PasswordEncoder`; reset and refresh tokens are persisted as hashes.
- Refresh tokens are HttpOnly, `SameSite=Strict`, path-scoped, rotated on refresh, revocable, and required to be `Secure` in the production profile.
- BYOK credentials use a validated 32-byte encryption key when configured.
- CORS supports a production-provided allowlist and credentialed requests; the validator requires explicit production origins.
- JDBC calls use bind parameters. Dynamic SQL found in the reviewed repositories controls fixed fragments rather than accepting raw client SQL.
- React renders ordinary strings with escaping; no application use of `dangerouslySetInnerHTML` was identified in the reviewed surface.
- Nginx and Spring add frame, content-type, referrer and CSP protections; Nginx adds HSTS and a restrictive Permissions Policy.
- CI performs Gitleaks, npm audit, OWASP Dependency-Check, dependency review and CodeQL.

### Recommendations

Before release:

1. Make authentication throttling proxy-aware only for explicitly trusted proxies, bound/expire its state, and test independent client behavior through the deployed Nginx path.
2. Disable Hibernate SQL output in production and verify application logs contain no credentials, tokens, resume bodies or provider keys.
3. Require and smoke-test SMTP for a public registration deployment, or explicitly disable registration until mail delivery is operational.
4. Decide whether Swagger/OpenAPI must be public in production; restrict it if it is an internal operational tool.

## Backend Review

### Findings

- Controllers consistently return `ApiResponse`; paginated resources include standard pagination metadata.
- `GlobalExceptionHandler` prevents stack traces and exception internals from being returned to clients and maps common domain failures to appropriate status codes.
- Bean validation is used on request DTOs; services also enforce ownership and domain rules.
- Transaction boundaries are generally short. One concern is PDF generation: rendering occurs inside a service-level write transaction, extending connection/transaction duration during CPU work.
- AI generation has explicit connect/read timeouts, rate limits, budget control, retry limits and usage logging.
- Several histories now cap page sizes at 100. Template and section lists are naturally bounded by their parent/catalog.
- No explicit Hikari pool sizing, connection timeout, database statement timeout, or idle-transaction timeout is committed. Defaults may be adequate for a single small instance, but total connection capacity is unverified.
- `GlobalExceptionHandler` handles general exceptions safely for clients, but it does not log the unexpected exception. This avoids leakage but reduces diagnosis unless another layer captures it.

### Recommendations

- Verify pool size and PostgreSQL connection headroom against the actual instance before deployment.
- Load-test PDF generation and AI SSE behavior to confirm request, transaction, thread and proxy timeouts align.
- Confirm unexpected server exceptions are captured in a centralized, access-controlled log/error system without exposing sensitive payloads.
- No general repository/entity rewrite is justified.

## Frontend Review

### Findings

- Protected, guest, onboarding and admin route guards are implemented and tested. Server authorization remains authoritative.
- Feature routes are lazy-loaded. The observed production build generated route chunks; the largest entry bundle was approximately 350 kB uncompressed and 110 kB gzip, which is reasonable for the current application but should be trended.
- TanStack Query centralizes server state. Loading, retry, empty and error states are present across major product integrations.
- Global and feature error boundaries exist. Modal focus trapping, keyboard behavior, route focus, reduced-motion behavior and basic accessibility have tests.
- Axios uses a central client/session flow and supports same-origin deployment for the refresh cookie.
- The root route `Suspense` fallback is `null`; lazy navigation can temporarily display a blank surface instead of the available loading system.
- Client-side API base configuration is minimal and appropriate, but production Vercel environment values and rewrite behavior are external and unverified.

### Recommendations

- Verify the deployed Vercel routing/API origin, cookie behavior and CORS with a production smoke test.
- Treat the blank root suspense fallback as a low-severity UX issue, not a release blocker.
- Run the existing Playwright suite against a release-like backend/database path in addition to mocked browser workflows.

## Database Review

### Findings

- Twenty-one Flyway files cover V1 through V17.1, including decimal module versions. PostgreSQL integration CI starts PostgreSQL 17 and executes the integration-test profile.
- The schema contains 38 tables with primary keys, foreign keys, checks, unique constraints and query-aligned indexes. V17.1 addresses the statically justified index gaps.
- V17.2 and V17.3 correctly have reports but no empty migrations because no JSONB or additional query index was justified.
- Hibernate production mode uses `ddl-auto=validate`; Flyway owns schema evolution.
- `baseline-on-migrate=true` is inherited in production. On a wrongly targeted nonempty database without Flyway history this can baseline instead of failing, so first-deployment procedure and database identity checks matter.
- The maintenance audit found no justification for `VACUUM FULL`, `REINDEX`, custom statistics targets or speculative indexes.
- Actual autovacuum, bloat, statistics, connection, lock, disk, WAL and backup health cannot be proven from the repository because PostgreSQL is externally hosted.

### Recommendations

- Block deployment unless the target database identity, Flyway history, expected schema and backup point are verified before startup.
- Execute the full migration path and application smoke tests on the exact supported PostgreSQL major version used in production.
- Complete the runtime checks in `POSTGRESQL_MAINTENANCE_STATISTICS_AUDIT.md`.

## Performance Review

### Findings

- Core ownership, authentication, list, history and analytics queries were audited; V17.1 supplies justified indexes.
- No JSONB search is implemented, so avoiding GIN indexes prevents unjustified WAL/write overhead.
- Pagination and deterministic timestamp/id ordering are implemented for notifications, jobs, ATS reports and PDF exports; resumes, versions, billing, audit and admin lists are also paginated.
- Exact global admin counts, multi-branch dashboard analytics, ATS aggregation and deep offset pages remain scale-sensitive but have no measured production regression.
- No runtime cache is required for current correctness. AI response caching/rate limiting already has optional Redis support but single-instance defaults remain valid.
- The SSE per-thread polling design, PDF rendering within a transaction, and exact analytics scans are the clearest load-test targets.

### Recommendations

- Capture `pg_stat_statements` and representative `EXPLAIN (ANALYZE, BUFFERS)` evidence after realistic data loading.
- Run concurrent authentication, dashboard, PDF and AI job/stream tests before setting capacity claims.
- Do not add cache infrastructure, materialized summaries or additional indexes without measured need.

## Observability Review

### Findings

| Capability | Status |
|---|---|
| HTTP/container health | Implemented through Actuator and Docker/Nginx health checks |
| Structured edge access log | Implemented in Nginx JSON log format |
| Request correlation | Nginx forwards `X-Request-ID`; complete application propagation/log correlation was not demonstrated by the inspected configuration |
| Application metrics | Actuator dependency exists, but no exposed metrics endpoint/exporter/dashboards are committed |
| PostgreSQL monitoring | Not demonstrated |
| Distributed tracing | Not implemented; not required for a single-service release, but request diagnosis remains limited |
| Central error reporting | Not demonstrated |
| Alert definitions/on-call routing | Not demonstrated |
| Backup/restore alerts | Not demonstrated |

### Recommendations

- Before launch, establish minimum dashboards/alerts for availability, 5xx rate, latency, JVM/container resources, connections, PostgreSQL dead tuples/locks/disk/WAL, backup age and certificate expiry.
- Confirm health output does not expose sensitive component details publicly.
- Document log retention, access, redaction and correlation behavior.

## Deployment Review

### Findings

- Backend image uses Java 21 multi-stage builds, a non-root UID, a JRE runtime, and no copied environment file.
- Compose applies read-only filesystem, dropped capabilities, no-new-privileges, bounded JSON logs, memory-aware JVM settings and health-gated Nginx startup.
- Nginx enforces HTTPS, TLS 1.2/1.3, HSTS and security headers. Backend port `8080` is reached through host networking and must be protected by host firewall rules.
- TLS certificates are mounted read-only, but issuance/renewal/reload ownership is external.
- Backend Docker packaging skips tests; this is acceptable only because CI gates test/verify separately. Image provenance/tag immutability and CI image publishing are not shown.
- `docs/Deployment.md` and `docker/README.md` are materially stale and instruct PostgreSQL-incompatible operations.
- The production frontend is hosted on Vercel while `docker/frontend.Dockerfile` represents a separate Nginx-served frontend path. The authoritative production path must be unambiguous.

### Recommendations

- Replace every MySQL deployment command with the actual PostgreSQL service, port, JDBC URL, verification, backup and recovery procedure before an operator follows the runbook.
- Verify host firewall exposure, TLS renewal, container restart behavior, environment injection, database TLS requirements and immutable release artifact/version tracking.
- Perform a staged deployment rehearsal using the exact documented commands after the runbook is corrected.

## Testing Review

### Findings

- CI runs backend `mvn verify`, frontend lint, coverage tests, production build, PostgreSQL 17 migration integration tests, and Playwright E2E.
- Security CI includes secrets, dependency and static-code analysis.
- The repository currently contains 32 backend test source files, 35 frontend unit/component test files and 2 Playwright specifications.
- Observed verification during the current work included 56 passing backend tests before four focused pagination tests, four passing focused tests, 75 passing frontend tests, and a successful production frontend build.
- Backend line coverage gate is 24%; frontend thresholds are 12% lines, 10% functions, 20% branches and 13% statements. These prevent total regression but are low confidence thresholds for a final production gate.
- Migration integration coverage is strong; full live integration coverage of authentication email delivery, reverse-proxy behavior, external AI providers, production cookies/CORS and backup restore is not demonstrated.

### Recommendations

- Add release-environment smoke tests for registration/email verification, login/refresh/logout, admin denial, resume CRUD, AI failure handling, PDF export, proxy rate limiting, and database migration identity.
- Treat coverage percentages as one signal; prioritize critical-flow integration assertions rather than raising thresholds without tests of meaningful behavior.
- Record the exact CI commit SHA and all required green checks for the release candidate.

## Documentation Review

### Findings

- Extensive API, architecture, security, database, development and feature documentation exists.
- PostgreSQL index, JSONB, query performance and maintenance audits record current evidence and deferred operational work.
- The repository root has no authoritative `README.md`; documentation begins under `docs/` and separate frontend/docker READMEs.
- Multiple architecture/project documents still describe MySQL. Most importantly, the production deployment runbook is directly unsafe for the PostgreSQL runtime.
- No complete PostgreSQL operations runbook covers incident triage, backup/PITR, restore, certificate rotation, secret rotation, Flyway failure handling and rollback/forward-fix decisions.

### Recommendations

- Correct the deployment/runbook blockers before release and clearly label old planning documents as historical where appropriate.
- Add a root entry-point README identifying authoritative setup, deployment, security and operations documents.
- Document environment variables without values, including which are mandatory in production and who owns each secret.

## Remaining Risks

### Critical

None proven from source evidence.

### High

- PostgreSQL production deployment cannot safely follow the committed MySQL runbook.
- Recovery readiness is unproven: no committed backup/PITR/restore-test evidence.
- Registration can create unusable pending accounts when SMTP is absent.
- Proxy-host authentication throttling can combine unrelated users and retains unbounded key state.
- Production inherits Hibernate SQL logging.
- Database/application alerting and centralized error visibility are not demonstrated.

### Medium

- Public production Swagger/OpenAPI exposure is not explicitly justified.
- Auth throttling does not cover all abuse-sensitive auth endpoints.
- SSE uses a thread and repeated database polling per connection.
- Pool capacity, database/server timeouts and load limits are unverified.
- Flyway baseline behavior requires strict target-database verification.
- TLS renewal, immutable artifact rollout and frontend/backend production-origin smoke tests are external and undocumented.
- Coverage gates are low and several production integrations are not exercised end-to-end.

### Low

- Root suspense can render a blank fallback.
- Several compressed Java source files reduce maintainability.
- Root documentation entry point is absent and historical MySQL references remain outside the deployment runbook.

## Production Checklist

### Database

- [ ] Confirm production PostgreSQL major version and TLS configuration.
- [ ] Verify database/role identity and least-privilege grants.
- [ ] Verify Flyway history and run migrations in staging from a production-like baseline.
- [ ] Capture pre-deployment backup/recovery point.
- [ ] Confirm autovacuum, statistics, disk, WAL, locks and connection headroom.
- [ ] Complete and record an isolated restore test.

### Backend

- [ ] Disable SQL logging in production.
- [ ] Configure and smoke-test SMTP or disable public registration.
- [ ] Validate pool capacity and timeouts.
- [ ] Load-test PDF and SSE workflows.
- [ ] Confirm unexpected errors are captured securely.
- [ ] Verify health response exposure.

### Frontend

- [ ] Verify production API origin/rewrite and CORS.
- [ ] Verify refresh cookies across reload, expiration and logout.
- [ ] Run Playwright/smoke tests against the release backend.
- [ ] Confirm source maps and client error collection policy.
- [ ] Validate responsive/accessibility behavior on supported browsers.

### Infrastructure

- [ ] Correct the PostgreSQL deployment runbook.
- [ ] Verify only intended ports are externally reachable.
- [ ] Confirm TLS issuance, renewal and proxy reload procedure.
- [ ] Confirm container resource/disk/log limits and restart behavior.
- [ ] Record immutable backend/frontend artifact versions.

### Security

- [ ] Fix and test proxy-aware, bounded authentication throttling.
- [ ] Verify production secrets and rotation ownership.
- [ ] Decide production Swagger/OpenAPI exposure.
- [ ] Confirm no sensitive SQL, tokens, keys or resume content is logged.
- [ ] Require all security CI checks on the release commit.

### Monitoring

- [ ] Establish availability, latency and 5xx dashboards/alerts.
- [ ] Monitor JVM/container resources and connection pool.
- [ ] Monitor PostgreSQL queries, locks, dead tuples, disk and WAL.
- [ ] Alert on backup/PITR failures and stale recovery points.
- [ ] Define log retention, access and incident notification ownership.

### Deployment

- [ ] Rehearse corrected deployment and rollback/forward-fix steps in staging.
- [ ] Verify environment validation succeeds with production values.
- [ ] Confirm migration, backend health, Nginx health and frontend smoke checks.
- [ ] Record release approvals, commit SHA and recovery point.
- [ ] Monitor the rollout and define abort criteria.

## Final Verdict

**NOT READY**

The implemented product, schema and CI are close to production quality, but production deployment should not proceed until these blockers are closed:

1. replace the MySQL deployment/runbook instructions with verified PostgreSQL procedures;
2. demonstrate an owned, monitored backup/PITR strategy and successful restore test;
3. make registration email delivery operationally mandatory or disable registration;
4. correct and validate authentication throttling through the real reverse proxy;
5. disable production SQL logging and verify sensitive-log handling;
6. establish minimum application/database monitoring and release alerts.

Once these evidence-based blockers are resolved and the production checklist is rehearsed, the current architecture can be released without a redesign or new infrastructure platform.
