# Production Deployment Guide

This is the authoritative production runbook for the AI Resume Builder.

- Frontend: Vercel
- Backend: Render Web Service (Docker)
- Database: Render PostgreSQL
- Schema management: Flyway during Spring Boot startup

The deployment does not require MySQL, a VM-hosted reverse proxy, or committed secrets.

## 1. Render Backend Deployment

The root [`render.yaml`](../render.yaml) defines the backend service and managed PostgreSQL database. Render builds [`backend/Dockerfile`](../backend/Dockerfile), which uses Java 21, a multi-stage build, a JRE-only runtime and a non-root user.

1. Push the intended release commit to the production branch.
2. In Render, create a Blueprint from the repository root.
3. Review the proposed `ai-resume-builder-api` service and `ai-resume-builder-db` database.
4. Supply every environment value marked `sync: false` before the first deploy.
5. Select service/database plans that meet the measured connection, memory, storage, backup and availability requirements.
6. Deploy the Blueprint.
7. Wait for `/actuator/health/readiness` to become healthy before testing application routes.

Render supplies `PORT`; Spring binds through `server.port=${PORT:8080}`. Do not hardcode or manually expose another backend port.

The production profile enables graceful shutdown, forwarded-header handling, compression, UTC JDBC handling, readiness/liveness probes, bounded Hikari settings, Flyway and Hibernate schema validation. SQL display and framework debug logging are disabled.

## 2. Render PostgreSQL Setup

The Blueprint attaches database host, port, database, user and password independently. Spring constructs a PostgreSQL JDBC URL and requires TLS through `sslmode=require` by default.

The generated application role owns the application database in a new Blueprint deployment. If connecting to an existing database instead:

- grant only the DDL permissions required by Flyway and the DML permissions required by the application;
- do not use a PostgreSQL superuser;
- confirm the database name and Flyway history before starting the service;
- require SSL and verify Render's current connection guidance;
- restrict external database access. The Blueprint declares an empty public IP allowlist.

PostgreSQL uses UTF-8 for Render databases. Application timestamps use PostgreSQL `TIMESTAMPTZ`, and Hibernate JDBC time handling is set to UTC.

## 3. Flyway Migration

Flyway runs automatically during backend startup before Hibernate validates the schema.

Before the first production start:

1. confirm the target is the intended Render PostgreSQL database;
2. confirm the database is empty for a new installation, or inspect `flyway_schema_history` for an existing installation;
3. create a recoverable database backup/snapshot;
4. run the same release against staging PostgreSQL first;
5. deploy one backend instance and watch startup logs;
6. verify every migration through V17.1 is successful;
7. verify Hibernate validation succeeds.

Do not edit a migration already applied to any shared environment. V17.2, V17.3 and V17.4 are audits with no required SQL migration.

## 4. Environment Variables

### Required backend values

| Variable                      | Purpose                                           |
| ----------------------------- | ------------------------------------------------- |
| `SPRING_PROFILES_ACTIVE=prod` | Enables production validation and settings        |
| `DB_HOST`                     | Render PostgreSQL internal host                   |
| `DB_PORT`                     | PostgreSQL port supplied by Render                |
| `DB_NAME`                     | Application database name                         |
| `DB_USERNAME`                 | Application database role                         |
| `DB_PASSWORD`                 | Database password                                 |
| `DB_SSL_MODE=require`         | Requires database TLS                             |
| `JWT_SECRET`                  | Random JWT HMAC secret of at least 32 characters  |
| `APP_FRONTEND_URL`            | Canonical Vercel HTTPS URL                        |
| `APP_CORS_ALLOWED_ORIGINS`    | Exact comma-separated HTTPS frontend origins      |
| `APP_SECURE_COOKIES=true`     | Requires HTTPS refresh cookies                    |
| `USER_API_KEY_ENCRYPTION_KEY` | Base64 encoding of exactly 32 random bytes        |
| `SPRING_MAIL_HOST`            | SMTP server for verification/recovery             |
| `SPRING_MAIL_PORT`            | SMTP port, normally `587` for STARTTLS            |
| `SPRING_MAIL_USERNAME`        | SMTP credential                                   |
| `SPRING_MAIL_PASSWORD`        | SMTP credential                                   |
| `MAIL_FROM`                   | Verified sender identity                          |
| `MANAGEMENT_METRICS_TOKEN`    | Random token supplied only to the metrics scraper |

Render injects `PORT`; do not define it unless Render support requires an override.

Generate secrets locally and store only their values in Render:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 32   # USER_API_KEY_ENCRYPTION_KEY
openssl rand -base64 48   # MANAGEMENT_METRICS_TOKEN
```

### AI configuration

| Variable                         | Requirement                                                    |
| -------------------------------- | -------------------------------------------------------------- |
| `AI_PROVIDER`                    | `gemini` or `openai`                                           |
| `GEMINI_API_KEY`                 | Required for platform Gemini generation                        |
| `OPENAI_API_KEY`                 | Required for platform OpenAI generation or configured fallback |
| `GEMINI_MODEL`, `OPENAI_MODEL`   | Optional model overrides                                       |
| AI rate/budget/pricing variables | Optional bounded operational overrides                         |

Optional Redis AI limits require `AI_REDIS_ENABLED=true`, `REDIS_HOST` and `REDIS_PORT`. Do not enable Redis without provisioning it.

No Stripe or Razorpay SDK/key usage exists in the current repository. Do not create unused payment secrets.

### Frontend values

Keep `VITE_API_BASE_URL` empty for the recommended deployment. Vercel rewrites `/api/*` to Render, preserving same-origin browser requests and the strict refresh cookie.

`VITE_PASSWORD_BREACH_CHECK` is optional and defaults to `false`. Never place backend, database, JWT, SMTP or AI secrets in a `VITE_*` variable because Vite embeds those values in public browser assets.

Optional frontend error monitoring uses `VITE_SENTRY_DSN`, `VITE_APP_ENV`, `VITE_APP_RELEASE`, and `VITE_SENTRY_TRACES_SAMPLE_RATE`. The browser DSN is public; a Sentry auth token is private and must never use a `VITE_*` name. See the [monitoring runbook](MONITORING.md).

## 5. React Deployment on Vercel

The root [`vercel.json`](../vercel.json):

- installs dependencies from `frontend/package-lock.json`;
- runs the Vite production build;
- publishes `frontend/dist`;
- proxies `/api/*` to `https://ai-resume-builder-api.onrender.com`;
- rewrites other routes to `index.html` for React Router deep links;
- adds browser security headers;
- caches hashed `/assets/*` files immutably.

Deployment steps:

1. Import the repository in Vercel.
2. Keep the project root at the repository root so `vercel.json` is detected.
3. Confirm install, build and output settings match the file.
4. Deploy a preview and test direct navigation to nested routes.
5. Promote the verified deployment to production.

If the Render service name or domain changes, update the `/api/:path*` rewrite destination before deploying Vercel.

## 6. Custom Domain

1. Add the frontend domain to the Vercel project and configure the DNS records Vercel supplies.
2. Wait for Vercel TLS issuance and verify automatic HTTP-to-HTTPS redirection.
3. Set `APP_FRONTEND_URL=https://<frontend-domain>` on Render.
4. Set `APP_CORS_ALLOWED_ORIGINS=https://<frontend-domain>`; include preview origins only if they are deliberately trusted.
5. Keep `APP_SECURE_COOKIES=true`.
6. Redeploy the backend, then the frontend.

The recommended Vercel `/api` proxy keeps the browser on the frontend origin. If the browser is changed to call Render directly, cross-origin cookie and CORS behavior must be redesigned and re-tested; do not merely change `VITE_API_BASE_URL` in production.

## 7. HTTPS and Security Verification

- Confirm Vercel and Render endpoints redirect or serve only HTTPS.
- Confirm the refresh cookie is `HttpOnly`, `Secure`, `SameSite=Strict` and scoped to `/api/v1/auth`.
- Confirm CORS allows only intended frontend origins.
- Confirm CSP, frame, content-type, referrer and permissions headers are present.
- Confirm no `.env`, token, key or database credential is present in Git or frontend assets.
- Confirm auth rate limiting distinguishes clients through Render's trusted forwarded-header processing.
- Decide whether public Swagger/OpenAPI exposure is acceptable for the production service.
- Run the repository security workflows on the release commit.

## 8. Production Verification Checklist

### Platform

- [ ] Render backend deploy is healthy at `/actuator/health/readiness`.
- [ ] Liveness is healthy at `/actuator/health/liveness`.
- [ ] Vercel frontend and nested-route refreshes load correctly.
- [ ] Browser `/api` requests are proxied to the intended Render service.
- [ ] No mixed-content or CORS errors appear.

### Database

- [ ] PostgreSQL connection uses SSL.
- [ ] Flyway history is complete and successful.
- [ ] Hibernate schema validation passes.
- [ ] Database health is included in readiness.
- [ ] Connection count remains below the selected plan limit.
- [ ] Backup/PITR and restore-test evidence is recorded.

### Application

- [ ] Register, receive verification email, verify, login, refresh and logout.
- [ ] Create, edit, version, restore and delete a resume.
- [ ] Generate AI content with the configured provider and verify failure handling.
- [ ] Run ATS analysis and inspect job-match/history output.
- [ ] Generate and download a PDF; inspect export history.
- [ ] Read notifications and update preferences.
- [ ] Review subscription/payment history behavior.
- [ ] Verify non-admin denial and admin pages with an authorized test account.

### Operations

- [ ] Verify INFO/WARN/ERROR logs without SQL, tokens, keys or resume content.
- [ ] Verify graceful shutdown during a Render redeploy.
- [ ] Configure availability, latency, 5xx, JVM, connection, PostgreSQL, disk/WAL and backup alerts.
- [ ] Verify `/actuator/prometheus` rejects missing/invalid metrics tokens and the collector can scrape with the configured token.
- [ ] Verify frontend monitoring reports a controlled error with no PII or payload data, if enabled.
- [ ] Record release commit, image/deploy identifiers, database recovery point and approver.

## 9. Rollback Procedure

Flyway migrations are forward-only. Never edit an applied migration or assume an application rollback can reverse database DDL.

For an application-only failure with a compatible schema:

1. stop promotion/automatic rollout;
2. select the previously verified Render deploy and Vercel deployment;
3. redeploy the previous immutable commits/artifacts;
4. run health and critical-flow checks;
5. monitor errors and database connections.

For a migration/data failure:

1. stop application writes;
2. preserve logs and the failed database state for investigation;
3. decide between a tested forward-fix migration and restoring the pre-deployment recovery point;
4. if restoring, follow Render PostgreSQL's documented recovery process and verify Flyway history;
5. redeploy the matching application release;
6. reconcile critical records and complete smoke tests before reopening traffic.

The rollback decision must respect the documented RPO/RTO and any writes accepted after deployment.

Database recovery, backup retention, configuration/secret recovery, validation and timed rehearsal are defined in the [Backup and Disaster Recovery Runbook](BACKUP_AND_RECOVERY.md). Production launch requires a paid Render PostgreSQL database with verified PITR capability and recorded restore-test evidence; the Blueprint does not prove the active database plan.

## 10. Common Deployment Errors

| Symptom                                     | Likely cause                                             | Resolution                                                                                                |
| ------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Startup says `DB_HOST`/`DB_NAME` missing    | Blueprint database fields are not attached               | Re-sync Blueprint and verify `fromDatabase` values                                                        |
| PostgreSQL connection rejects URL/SSL       | Incorrect host/port/database or SSL mode                 | Compare Render internal connection details and keep `DB_SSL_MODE=require`                                 |
| Flyway checksum error                       | An applied migration was edited                          | Restore the committed migration and follow the established Flyway repair process only after investigation |
| Hibernate validation failure                | Migration did not complete or wrong database selected    | Inspect Flyway history and target identity; do not use schema auto-update                                 |
| Render health check times out               | Wrong `PORT`, database unavailable, or slow startup      | Keep Render-provided `PORT`; inspect startup/Flyway logs and readiness details locally                    |
| Registration succeeds but login fails       | Verification email not delivered                         | Verify SMTP credentials, sender authorization and provider logs                                           |
| Refresh works locally but not in production | API bypasses Vercel proxy or cookie/CORS settings differ | Use same-origin `/api`, HTTPS, secure cookies and exact frontend URL                                      |
| Vercel nested route returns 404             | `vercel.json` not detected or project root is wrong      | Deploy from repository root and verify SPA rewrite                                                        |
| API returns CORS errors                     | Origin not listed exactly                                | Update `APP_CORS_ALLOWED_ORIGINS` with the HTTPS origin and redeploy                                      |
| AI generation fails                         | Provider key/model/provider selection invalid            | Verify Render secret and provider configuration without logging keys                                      |
| Database connections exhausted              | Pool total exceeds Render plan capacity                  | Compare Hikari settings across instances with PostgreSQL connection limits                                |

## Release Gate

Production is deployable only after all required Render secrets are supplied, staging migrations pass, SMTP verification succeeds, the database recovery procedure is tested, and the production verification checklist is signed off.
