# Guides 01–07 Implementation Gap Audit

Audit date: 2026-07-23

## Executive result

The repository has working vertical slices for authentication, typed resume editing and
versioning, frontend routing/design primitives, database migrations, product modules, and
a provider-abstracted AI gateway. It is **not complete against guides 01–07**.

The most important remaining work is:

1. Complete the remaining resume-domain gaps: typed languages, date-safe education and
   experience fields, template deletion/reference rules, retention behavior, and
   workflow-specific contracts. Typed section CRUD for education, experience, projects,
   skills, and certifications is complete; profiles, templates, versioning, ATS, jobs,
   notifications, PDF, audit, subscriptions, analytics, and administration have REST
   implementations.
2. Complete the remaining database-to-application behavior: JPA/domain mappings now cover the major migrated tables, while some still rely on JDBC repositories and need richer repository/service lifecycle rules.
3. Complete the remaining authentication lifecycle behavior: refresh-session design, security audit events, verification resend support, and account lifecycle endpoints.
4. Complete AI response schemas, workflow-specific validation, idempotency, retry/backoff, prompt testing, and observability.
5. Expand the existing automated test base—57 backend tests, 46 frontend tests, seven
   Playwright scenarios, and a real-MySQL Flyway test—into broader controller, repository,
   upgrade-path migration, transactional, security-filter, accessibility, and end-to-end
   coverage.

Future-only items explicitly identified by the guides—microservices, social login, MFA, SSO, multi-device management UI, sharding, offline support, collaboration, premium payments, and additional deployment scale—are not counted as current gaps.

### Prerequisite completed after this audit

Platform-managed AI versus encrypted per-user BYOK selection is now implemented for Gemini and OpenAI. See `AI_Provider_Choice_BYOK.md`. Provider credential validation/testing, master-key rotation tooling, and dedicated BYOK integration tests remain follow-up hardening work.

## 01 — Project Foundation Setup

### Implemented

- Monorepo folders, module READMEs, documentation folder, `.env.example` files, `.gitignore`, VS Code settings, Docker files, setup scripts, CI workflow, formatting, linting, and test/build scripts.
- React/Vite/Tailwind frontend and Spring Boot/Maven/MySQL/Flyway backend foundations.
- Simplified `main`/`develop` CI branch workflow is represented in GitHub Actions.

### Remaining

- [Completed] Add documented local prerequisites and troubleshooting for MySQL, Redis-optional mode, SMTP-optional mode, JWT secret generation, and provider keys to the root quick start.
- [Completed] Add reproducible development data/seed workflow beyond the template/provider seed rows.
- [Completed] Automated startup configuration validation reports all missing or malformed
  required and conditional environment variables together without exposing secret values.
- [Completed] CI now runs frontend and backend dependency audits, full-history secret
  scanning, pull-request dependency review, and CodeQL analysis on pushes, pull requests,
  a weekly schedule, and manual dispatch.
- [Partially completed] Conventional Commit and pull-request-title checks are implemented,
  and the required ruleset is documented. Live inspection on 2026-07-20 confirmed `main`
  is unprotected, no repository rulesets exist, and `develop` does not exist. Applying and
  confirming branch protection and review rules requires authenticated repository-admin
  access.
- [Completed] JaCoCo and Vitest coverage reports enforce initial backend and frontend minimum thresholds in CI.
- [Completed] A dedicated CI job executes and validates all Flyway migrations against a
  fresh MySQL 8.4 service and verifies representative schema and seed data.
- Confirm/enforce branch protection, PR review, and commit conventions in repository settings; these cannot be verified from source files alone.
- Behavioral coverage was expanded to 57 passing backend tests, 46 frontend unit/component
  tests, and seven Playwright scenarios. Enforced floors are 24% backend lines and
  12%/13%/10%/20% frontend lines/statements/functions/branches. Broader controller,
  persistence, page-workflow, accessibility, and end-to-end coverage remains outstanding.

## 02 — Backend Architecture

### Implemented

- Modular package structure, controller/service/repository layers for auth and resume, DTO envelopes, validation, centralized exceptions, constructor injection, Spring Security, correlation IDs, async configuration, cache configuration, and domain events for resume creation.
- Provider integrations are isolated under `integration/ai`.

### Remaining

- [Completed] Layered controller/service/repository implementations now exist for ATS, jobs, notifications, PDF, audit, admin, templates, profile, subscriptions, analytics, and resume versioning.
- [Completed] Direct `JdbcTemplate` business logic was removed from `AiPromptAdminController`, prompt resolution, AI usage/budget orchestration, async AI job orchestration, and user AI settings. Persistence is isolated in feature-owned repositories, prompt lifecycle operations and usage writes are atomic, and async job state transitions use independent transaction boundaries.
- Stop `feature/ai` from directly using `UserRepository`; depend on a public user/identity service interface to preserve feature independence.
- Add missing mapper layer usage. A generic mapper type exists, but most mappings are hand-written or absent.
- [Partially completed] Persistent audit logging is implemented for resume create, update,
  and delete events through transactional listeners, and successful administrator role/status
  changes are stored in admin action history. Structured JSON logging, request-latency
  metrics, and the broader security-event coverage listed in section 06 remain outstanding.
- Add dedicated domain events and listeners for AI completion/failure, password/security changes, notifications, ATS completion, exports, and admin actions.
- Add controller tests, repository tests, ownership/authorization tests, transactional integration tests, and architecture boundary tests.
- Add caching only where justified and prove invalidation behavior; configuration exists but most domain reads do not use it.
- Format several compressed one-line Java classes into maintainable production code and add documentation for non-obvious orchestration.

## 03 — Database Architecture

### Implemented

- Flyway migrations create the major conceptual tables, foreign keys, unique constraints, check constraints, indexes, soft-delete columns, resume versions/snapshots, AI ledger tables, ATS data, jobs, notifications, subscriptions, analytics, and audit/admin logs.
- Core JPA entities exist for users, profiles, auth tokens, resumes, resume section subtypes, templates, version snapshots, AI requests and jobs, job matching, ATS, notifications, billing, analytics, and audit domains.

### Remaining

- [Completed] JPA/domain implementations now cover `Template`, `ResumeVersion`, `ResumeVersionSnapshot`, `AiProvider`, AI request/content/attempt/usage entities, AI background jobs, job descriptions/matches, ATS reports and children, notifications, subscriptions, payments, usage metrics, audit logs, and admin action logs. Relationships, schema uniqueness, generated columns, JSON/text fields, timestamps, and lifecycle defaults are mapped.
- Resolve the guide/schema mismatch for resume sections. The guide calls for independent typed entities, while the implementation uses a shared `resume_sections` table with joined inheritance and child PK/FK rows.
- Use proper date types for education/experience. Current entities store dates as strings, preventing reliable date constraints and comparisons.
- Add languages and any other v1 resume section types specified by the API contract. The current typed editor supports education, experience, projects, skills, and certifications; its separate legacy text field for languages is not typed-section CRUD.
- [Completed] Resume creation/editing produces immutable structured snapshots; owner-scoped history, detail, concurrency-safe numbering, and rollback-as-a-new-version are implemented.
- Implement template deletion/reference rules and template repository/service APIs.
- Implement purge/retention jobs for expired refresh, reset, verification, AI, audit, and notification data.
- [Partially completed] `FlywayMigrationIT` runs in CI against a fresh MySQL 8.4 service,
  applies and validates every migration, and checks representative tables, columns, and
  seed rows. An upgrade-path fixture from a previously released schema and lifecycle/data
  migration assertions remain outstanding; the test uses a CI service container rather
  than Testcontainers managed from Java.
- Add explicit delete/cascade/restrict behavior to every FK where the blueprint specifies lifecycle semantics; many FKs rely on MySQL defaults without documented application handling.
- Verify sensitive-column encryption/retention requirements and database-user least privilege in deployment configuration.

## 04 — Frontend Architecture

### Implemented

- Feature modules and public exports, lazy route contributions, auth/guest/admin guards, TanStack Query, centralized Axios, in-memory access tokens, refresh-cookie restoration, error normalization, design primitives, Untitled UI icons, multi-step resume shell, validation, autosave, dirty-state blocking, focus management, and responsive navigation.

### Remaining

- [Completed] Availability/health placeholders were replaced with real feature interfaces for ATS analysis and stored reports, saved jobs, notifications, profile and photo editing, active template application, and admin user/action/audit management. AI provider health remains only as supporting information inside the prompt-management tab.
- [Completed] The resume builder supports typed education, experience, projects, skills, and certifications; section CRUD and ordering; edit/split/preview modes; full preview; version history/detail/rollback; resume-scoped ATS; publishing; and PDF export. Legacy text sections remain available during migration.
- [Completed] Documented nested resume routes are implemented for `edit`, `preview`, `ats-check`, version history, and `versions/:versionId`.
- [Completed] Password recovery and dashboard business logic now lives in feature-owned components/hooks, routes load those feature modules directly, and the obsolete `FeaturePlaceholderPage` and duplicate `AiPromptAdminPage` files have been removed.
- [Completed] The shared API layer is split into the documented `axiosInstance`, request interceptor, response interceptor, and single-flight `tokenRefresh` modules. Feature APIs continue to use one configured Axios client.
- [Completed] Authentication, password recovery, and password settings use React Hook Form with shared `FormField`/`Input` primitives and consistent client validation/submission state. Ordinary checkbox and file controls use shared primitives; only intentionally custom radio-card controls render their native input internally.
- [Completed] Route/feature-level error boundaries wrap authentication, dashboard, resume, templates, ATS, job matching, cover letters, notifications, profile, settings, AI assistant, admin, and onboarding routes. They reset on navigation and provide a focused retry/dashboard recovery UI.
- [Completed] The authenticated application shell has responsive navigation: desktop and
  laptop users can collapse the sidebar to an icon rail with persisted preference, while
  mobile users receive an off-canvas drawer with a sticky launcher, backdrop dismissal,
  close control, Escape handling, and automatic close after navigation.
- [Completed] The profile workspace has one canonical editable phone field, colocated
  verification controls, ordered editable/read-only sections, and single-column mobile
  behavior instead of repeating the phone value in the account summary.
- [Completed] Shared visual primitives are defined in the Tailwind `@theme` layer and
  exposed through semantic CSS variables for color roles, typography, focus treatments,
  radii, shadows, overlays, and application layout dimensions. The former 1,925-line
  global stylesheet is split by responsibility into primitives, marketing/auth,
  workspace, and workflow modules. Shared React primitives use semantic Tailwind
  utilities, while component-specific geometry remains in the scoped modules. Automated
  enforcement scans both component code and CSS, rejecting raw colors, arbitrary visual
  utilities, un-tokenized font families, border radii, and box shadows.
- [Completed] Automated import-order enforcement, accessibility tests, keyboard/focus tests,
  query/hook tests, and route-guard tests are implemented. Playwright browser coverage now
  verifies public keyboard navigation and not-found handling plus protected-route redirects,
  sign-in/dashboard loading, onboarding enforcement, authenticated resume navigation, and
  deleted-resume restoration using deterministic API fixtures.
- [Partially completed] Reusable card, list, and AI-job skeletons are implemented and used
  by resume lists, templates, notifications, job matching, ATS analysis, and cover-letter
  generation. Profile, settings, AI assistant, admin, version history/detail, typed
  sections, and full preview still use generic loaders or status text.
- Add virtualization only when real long job/admin lists exist; this remains correctly deferred for now.

## 05 — REST API Architecture

### Implemented

- `/api/v1` versioning, JSON envelopes, correlation metadata, normalized errors, pagination on resumes, bearer authentication, ownership checks for resume CRUD, and basic OpenAPI/Swagger setup.
- Auth endpoints and basic resume CRUD exist.
- Generic synchronous AI generation plus background AI job submit/status/stream endpoints exist.

### Remaining

- Generate and maintain a complete OpenAPI 3.1 contract. Current OpenAPI configuration only supplies title/version, and controllers lack full response examples, error codes, schemas, and security annotations.
- [Completed] `docs/API.md` inventories every implemented controller route and documents authentication, ownership, pagination, errors, AI execution, BYOK, subscriptions, analytics, admin, audit, PDF, SSE, and versioning contracts.
- [Completed] `GET/PATCH /users/me` use validated structured profile request/response contracts.
- [Completed] Profile `GET/PUT` and authenticated profile-photo upload/read/delete are implemented with JPEG/PNG/WebP validation, a 5 MB limit, safe response metadata, and Flyway-backed photo persistence.
- [Completed] Resume metadata patching, owner-scoped typed section CRUD/reordering, version list/detail, publish/rollback, and resume-scoped PDF export are implemented. Section and metadata mutations create immutable snapshots for later rollback.
- [Completed] Template list/detail/apply APIs are implemented with resume ownership checks.
- [Completed] Notification list/read/read-all and owner-scoped notification preference APIs are implemented. Preferences persist email, in-app, job-alert, and AI-update delivery choices and are editable in the notification workspace.
- [Completed] Admin user status/role operations, action history, audit, and aggregate
  analytics APIs are implemented. The `/api/v1/admin/**` contract is ADMIN-protected,
  validates allowed roles/statuses, prevents administrators from removing their own
  access, revokes active refresh tokens when an account is made inactive, and attributes
  successful changes to the acting administrator. Controller/service tests cover request
  delegation, validation, pagination, and self-protection; security-chain tests prove
  anonymous rejection, non-admin rejection, and admin access; and `AdminWorkflowIT`
  verifies repository persistence, action attribution, token revocation, self-protection,
  audit history, and aggregate analytics against migrated MySQL.
- Implement file upload/download validation, content-type/size enforcement, storage abstraction, signed/authorized downloads, and async PDF jobs.
- Implement workflow-specific AI endpoints, retry endpoint, and required `Idempotency-Key` handling. The current generic `/ai/generate` contract does not match the blueprint’s resource-oriented endpoints.
- ATS analysis and owner-scoped report endpoints are implemented; broader workflow-specific endpoints remain outstanding.
- Owner-scoped job-description CRUD is implemented; external search/match/skill-gap workflows remain outstanding.
- Add consistent filtering/sorting contracts and cursor pagination for high-volume resources.
- Add endpoint-level rate limiting beyond a few auth endpoints and AI budget/rate checks.

## 06 — Authentication & Security

### Implemented

- BCrypt strength 12, JWT signature/issuer/audience/expiry validation, database-resolved current role/status, stateless filter chain, owner-scoped resume access, role-protected admin paths, hashed refresh/reset/verification tokens, HttpOnly refresh cookie, in-memory frontend access token, refresh recovery, multi-tab logout, login throttling, account lockout, password reset/change, CORS, security headers, and generic non-enumerating forgot-password response.

### Remaining

- [Completed] Registration now creates a `PENDING_VERIFICATION` user without a session, persists a one-time email-verification token, and sends the verification email. Token consumption activates the account and sets `verifiedAt`.
- [Completed] The frontend email-verification and confirmation pages include a resend-verification form. The public resend endpoint uses a non-enumerating response and invalidates any previously unused verification links before issuing a new one.
- Reconcile refresh-token behavior with the guide. Tokens are currently reused until logout/expiry to avoid reload races, while the guide specifies rotation/reuse detection. Implement race-safe rotation with token families/grace handling, or explicitly amend the architecture decision.
- Add per-device/session metadata (`device`, IP, last used), session listing, individual revocation, and scheduled expired-token cleanup if these are considered v1 requirements.
- Add account deactivation/deletion endpoints and enforce lifecycle transitions.
- Persist security audit events for registration, verification, login success/failure, lockout, refresh anomalies, password changes/resets, role changes, and admin actions. Current coverage is mostly application logging.
- Add stronger distributed rate limiting for authentication in multi-instance deployments; the current auth limiter is in-memory and IP/path based.
- Add explicit refresh-cookie environment configuration for `SameSite`, domain, path, and TTL; cookie max age is hardcoded separately from the configured database TTL.
- Add origin/CSRF defense documentation/tests for cookie-bearing auth endpoints, even though bearer-protected APIs are stateless.
- Add security integration tests for invalid/expired JWTs, disabled/deleted users, role changes, ownership attacks, cookie flags, refresh/logout, lockout, recovery-token reuse, and CORS.
- Dependency, secret, and SAST scanning are implemented in CI. Production TLS/HSTS
  verification remains outstanding.

## 07 — AI Architecture

### Implemented

- `AiProvider` abstraction/factory, OpenAI and Gemini adapters, configurable primary provider, fallback, provider health tracking, externalized/versioned prompts, prompt lifecycle tables/admin transitions, rate limits, optional Redis limiter, budget checks, cost calculation, usage persistence, response caching, async jobs, SSE status, and basic output validation.

### Remaining

- Add the guide’s currently named Claude provider or explicitly narrow the supported-provider requirement; only OpenAI and Gemini are implemented.
- Replace the generic string validator with workflow-specific response processing: parsing, schema/type validation, sanitization, bounded score checks, factual/structural checks, and confidence handling.
- Implement prompt variable substitution and validate required/missing variables; current prompt resolution returns only a stored system instruction.
- Store and return the exact prompt template/version reference used. Usage logging currently records a hardcoded `workflow:v1` reference.
- Add prompt test cases/evaluation datasets and ownership/reviewer rules. Draft → Review → Approved → Published ordering and affected-state validation are now enforced transactionally.
- Add idempotency for chargeable generation/job submission and prevent duplicate jobs/costs.
- Add exponential backoff with jitter and retry classification. Current retry loops immediately and retries only `ExternalServiceException` without explicit transient/permanent classification.
- Add a real circuit breaker (half-open recovery, thresholds/windows) and metrics; current provider health tracking is not a complete circuit breaker.
- Persist failed attempts and failures. `AiUsageLogger` records only successful requests and hardcodes attempt number 1.
- [Completed] AI usage logging is transactional, uses a feature-owned repository and JDBC generated-key handling, and no longer depends on connection-scoped `LAST_INSERT_ID()`.
- Add content safety policies, PII minimization/redaction, retention controls, and audit-access controls for stored generated content.
- Add workflow-specific services for resume bullets/summary, cover letters, ATS scoring, keyword extraction, job matching, and skill gaps instead of exposing only a generic generation request.
- Add metrics/tracing dashboards for latency, failure/fallback rate, token usage, cache hit rate, cost, validation failures, and queue depth.
- Add provider contract tests, gateway fallback/retry tests, prompt lifecycle tests, budget/rate-limit tests, cache tests, async job tests, and failure-path integration tests.

## Recommended execution order

1. **Security correctness:** decide and implement race-safe refresh-token rotation (or
   document the reuse decision), persist security audit events, add account lifecycle
   endpoints, externalize cookie policy, and expand security integration tests.
2. **Contract correctness:** complete OpenAPI 3.1, workflow-specific AI contracts,
   idempotency, file/storage contracts, and high-volume filtering/pagination.
3. **Remaining resume/database correctness:** typed languages, date-safe section fields,
   template deletion/reference rules, explicit FK lifecycle behavior, retention jobs, and
   migration upgrade-path testing.
4. **AI reliability:** typed validation, prompt variables and exact version references,
   retry classification/backoff, circuit breaking, failed-attempt persistence, safety, and
   observability.
5. **Quality depth:** repository, security-filter, transactional, failure-path,
   accessibility, and broader browser workflow coverage.

## Verification note

The frontend test suite (18 files, 46 tests) and backend `mvn verify` (57 tests) passed on
2026-07-23. Backend verification includes cross-module resume/version/audit behavior and
JaCoCo threshold checks. CI executes Flyway against MySQL 8.4 and runs seven Playwright
scenarios across two specification files. Browser end-to-end depth and broader behavioral
coverage remain outstanding.

This reconciliation inspected the current controllers, services, repositories, entities,
migrations, security configuration, frontend feature routes/components, CI workflows, and
test inventories. A status is marked `[Completed]` only where the present repository
contains the implementation; mixed implementations are marked `[Partially completed]`
with their remaining work stated explicitly.
