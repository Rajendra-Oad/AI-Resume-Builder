# AI Resume Builder — Architecture as Implemented

This document describes the repository as it exists in code. It is not a target architecture. It was audited against `backend/pom.xml`, `frontend/package.json`/`package-lock.json`, Java source, React source, application configuration, and all Flyway migrations through `V16`.

## 1. Tech stack (actual versions)

### Backend

- Java 21.
- Maven project `com.airesumebuilder:ai-resume-builder-backend:0.1.0`.
- Spring Boot parent 3.5.14.
- Spring Framework overridden to 6.2.19; Spring Security overridden to 6.5.11; embedded Tomcat overridden to 10.1.57.
- Spring Boot starters: Web/MVC, Security, Data JPA, Bean Validation, Actuator, Mail, and Data Redis.
- Hibernate/JPA and Lombok are managed by the Spring Boot BOM.
- PostgreSQL JDBC driver (runtime, Boot-managed) and Flyway PostgreSQL (Boot-managed). Hibernate schema generation is disabled (`ddl-auto=none`); Flyway owns schema changes.
- JJWT 0.12.6 (`jjwt-api`, runtime `jjwt-impl`, runtime `jjwt-jackson`).
- springdoc OpenAPI WebMVC UI 2.8.16.
- OpenPDF 3.0.4.
- Jackson BOM overridden to 2.21.4; Log4j2 2.25.5 and Netty 4.1.136.Final are also explicitly overridden.
- Tests: Spring Boot Test, Spring Security Test, JaCoCo 0.8.13; configured minimum bundle line coverage is 24%.

### Frontend

- React 19.2.7 and React DOM 19.2.7 (lockfile-resolved; manifests declare `^19.1.0`).
- Vite 8.1.5 with `@vitejs/plugin-react` 6.0.3 and `@tailwindcss/vite` 4.1.x.
- React Router DOM 7.18.1 (manifest declares `^7.0.0`) using the data-router API.
- TanStack React Query 5.101.2.
- Axios 1.18.1 (manifest declares `^1.7.0`).
- React Hook Form 7.82.0.
- Styling/interaction libraries: Tailwind CSS 4.3.3, GSAP 3.15.0, Lenis 1.3.25, Lucide React 1.26.0, Untitled UI icons 0.0.22.
- Tests/tooling (lockfile-resolved): Vitest 4.1.10, V8 coverage 4.1.10, Testing Library React 16.3.2, user-event 14.6.1, jest-dom 6.9.1, jest-axe 10.0.0, jsdom 25.0.1, Playwright 1.61.1, ESLint 9.39.5, Prettier 3.9.5.
- No TypeScript build is present. Source is JavaScript/JSX; `src/types/contracts.js` is documentation/runtime constants rather than compiled types.

### Runtime/infrastructure

- PostgreSQL is the primary database.
- Redis is optional and disabled by default; it backs the AI rate limiter when enabled. A non-Redis implementation is also present.
- SMTP is used for verification and recovery email.
- AI calls use direct HTTP adapters for Gemini or OpenAI; the configured default is Gemini.
- Dockerfiles, Compose files, and nginx configuration exist under `docker/`; Vite dev server proxies `/api` to port 8080.

## 2. Folder / module structure

```text
backend/
├── pom.xml, mvnw, Dockerfile, .env.example
└── src/
    ├── main/
    │   ├── java/com/airesumebuilder/
    │   │   ├── AiResumeBuilderApplication.java
    │   │   ├── common/
    │   │   │   ├── dto/          shared API envelope/error/pagination records
    │   │   │   ├── exception/    domain exceptions and global advice
    │   │   │   ├── mapper/       a generic Mapper interface
    │   │   │   ├── util/         date/time helper
    │   │   │   ├── validation/   resume validation helper
    │   │   │   └── web/          correlation-ID context/filter
    │   │   ├── config/           Spring security, CORS, cache, async, seed, etc.
    │   │   ├── events/           resume created/updated/deleted events
    │   │   ├── integration/ai/   provider gateway/adapters, cache, rate/budget/cost
    │   │   ├── security/         JWT, refresh tokens, filters, current-user helper
    │   │   └── feature/
    │   │       ├── admin/
    │   │       ├── ai/
    │   │       ├── analytics/
    │   │       ├── ats/
    │   │       ├── audit/
    │   │       ├── auth/
    │   │       ├── job/
    │   │       ├── notification/
    │   │       ├── pdf/
    │   │       ├── resume/
    │   │       ├── subscription/
    │   │       ├── template/
    │   │       └── user/
    │   └── resources/
    │       ├── application*.properties
    │       ├── META-INF/spring.factories
    │       └── db/migration/V1..V15
    └── test/java/com/airesumebuilder/
        ├── config/, database/, integration/, security/
        └── feature/...
```

The backend is feature-first, not a single application-wide controller/service/repository layering. Most features contain their own `controller`, `service`, `repository`, `entity`, and sometimes `dto` packages. Notable exceptions:

- `integration/ai` contains the actual external-provider abstraction and adapters; `feature/ai` orchestrates/persists workflows.
- `auth/phone` colocates controller, entity, repository, service, and provider adapters in one package rather than sublayers.
- Several “repositories” (`JobRepository`, `NotificationRepository`, `PdfExportRepository`, `AnalyticsRepository`, parts of AI/admin/audit/version persistence) use `JdbcTemplate`/SQL and records instead of JPA repositories.
- `template/engine` holds immutable parsed template configuration, separate from the `Template` catalog entity.
- `events` and `audit/listener` implement resume audit logging through application events.

```text
frontend/
├── package.json, package-lock.json, vite.config.js
├── index.html, eslint.config.js, tailwind.config.js
├── public/                  logo and favicon SVG
├── scripts/                 style-token checker
├── e2e/                     Playwright specs and API mock support
└── src/
    ├── main.jsx, App.jsx
    ├── api/                 shared Axios client, refresh, query client, errors
    ├── animations/          motion constants/helpers
    ├── components/          reusable UI, boundaries, dialogs, notifications
    │   └── landing/         landing-page primitives
    ├── config/, constants/, context/, hooks/, layouts/, services/, types/
    ├── pages/               route-level resume/auth/landing pages
    ├── routes/              router and auth/onboarding/admin guards
    ├── styles/              global, theme, workflow, workspace CSS
    ├── validators/          auth/resume validation plus tests
    └── features/
        ├── admin/, ai/, aiAssistant/, ats/, auth/
        ├── coverLetter/, dashboard/, jobMatching/, notifications/
        ├── profile/, resume/, settings/, templates/
        └── each feature generally has routes, components, api, hooks
```

Frontend structure is also feature-first, but route-level components are split inconsistently: resume and basic auth pages live in `src/pages`, while most other feature screens live inside `features/*/components`. `features/ai` contains only shared/admin API functions and no routes. `coverLetter` has no API module and imports the generic AI-assistant API. CSS is global rather than CSS modules or component-scoped styling.

## 3. Database schema (as built)

All migrations target PostgreSQL. IDs are generally `BIGINT` identity columns; timestamps use `TIMESTAMPTZ`. The list below gives every JPA entity and mapped fields, followed by migration-only tables.

### Identity and authentication

- `users` (`User`): `id`, `first_name`, `last_name`, unique `email`, `phone`, `password_hash`, `role`, `status`, `persona`, `career_goal`, `onboarding_completed`, `failed_login_attempts`, `locked_until`, `verified_at`, `phone_verified_at`, `last_login_at`, `created_at`, `updated_at`, `deleted_at`. Other entities point to it; the entity itself does not declare inverse collections.
- `user_profiles` (`UserProfile`): `id`, unique `user_id`, `display_name`, `phone`, `location`, lazy `photo_data` BYTEA, `photo_content_type`, `photo_file_name`, `created_at`, `updated_at`. One-to-one, owning side, to `User`.
- `refresh_tokens` (`RefreshToken`): `id`, `user_id`, unique `token_hash`, `expires_at`, `created_at`, `revoked`. Many-to-one to `User`.
- `password_reset_tokens` (`PasswordResetToken`): `id`, `user_id`, unique `token_hash`, `expires_at`, `used_at`, `created_at`. Many-to-one to `User`.
- `email_verification_tokens` (`EmailVerificationToken`): same shape and relationship as password-reset tokens.
- `phone_otp_challenges` (`PhoneOtpChallenge`): `id`, `user_id`, `phone`, `code_hash`, `attempts`, `expires_at`, `verified_at`, `created_at`. Many-to-one to `User`.

### Resumes and templates

- `templates` (`Template`): `id`, unique `name`, `description`, `preview_url`, `is_system`, `is_active`, JSON `configuration`, `created_at`, `updated_at`.
- `resumes` (`Resume`): `id`, `user_id`, nullable `template_id`, `title`, `summary`, `target_job_title`, `status`, `contact_email`, `phone`, `location`, `github_url`, `linkedin_url`, text fields `skills_content`, `experience_content`, `projects_content`, `education_content`, `certifications_content`, `languages_content`, presentation fields `font_family`, `font_size`, `line_spacing`, `section_spacing`, `page_margin`, `created_at`, `updated_at`, `deleted_at`. Many-to-one to `User` and `Template`; one-to-many, cascading/orphan-removing, to `ResumeSection`.
- `resume_sections` (`ResumeSection`): joined-inheritance base with `id`, `resume_id`, `display_order`, `created_at`, `updated_at`. Many-to-one to `Resume`.
- `educations` (`Education`, joined child keyed by inherited `id`): `institution`, `degree`, `start_year`, `end_year`.
- `experiences` (`Experience`): `employer`, `role`, `start_date`, `end_date`. Dates are strings in the entity/schema, not date types.
- `projects` (`Project`): `name`, `description`.
- `skills` (`Skill`): `name`, `proficiency_level`.
- `certifications` (`Certification`): `name`, `issued_by`.
- `resume_versions` (`ResumeVersion`): `id`, `resume_id`, nullable `template_id`, `version_number`, `source_type`, `label`, `created_at`; unique (`resume_id`, `version_number`). Many-to-one to `Resume` and `Template`; one-to-one cascade/orphan-remove to snapshot.
- `resume_version_snapshots` (`ResumeVersionSnapshot`): `id`, unique `resume_version_id`, JSON `content`, `created_at`. Owning one-to-one to `ResumeVersion`.

There are two simultaneous resume-content models: typed joined tables and denormalized text columns on `resumes`. They are not a single materialized representation. PDF rendering reads the denormalized columns; typed-section CRUD reads/writes the joined tables.

### AI

- `ai_providers` (`feature.ai.entity.AiProvider`): `id`, unique `provider_key`, `display_name`, `is_active`, JSON `capabilities`, `created_at`.
- `ai_requests` (`AiRequest`): `id`, `user_id`, nullable `resume_id`, `provider_id`, migration-only `credential_source`, `request_type`, `status`, `prompt_reference`, `created_at`, `completed_at`. Many-to-one to `User`, `Resume`, and provider; one-to-one to generated content; one-to-many ordered attempts. **Mismatch:** `credential_source` exists in V7 but is not mapped by the entity.
- `ai_generated_contents` (`AiGeneratedContent`): `id`, unique `ai_request_id`, MEDIUMTEXT `content`, JSON `metadata`, `applied_to_resume`, `created_at`. One-to-one to request.
- `ai_request_attempts` (`AiRequestAttempt`): `id`, `ai_request_id`, `attempt_number`, `error_code`, `error_message`, `latency_ms`, `created_at`; unique request/attempt. Many-to-one to request.
- `ai_usage_ledger` (`AiUsageLedger`): `id`, `user_id`, `provider_id`, nullable `ai_request_id`, `input_tokens`, `output_tokens`, `cost_estimate`, `billing_period_reference`, `created_at`. Three many-to-one relationships.
- `ai_jobs` (`AiJob`): string UUID `id`, `user_id`, `workflow`, `status`, MEDIUMTEXT `result`, `error_message`, `created_at`, `completed_at`. Many-to-one to `User`.

### Jobs and ATS

- `job_descriptions` (`JobDescription`): `id`, nullable `user_id`, `title`, `company_name`, `source_url`, MEDIUMTEXT `content`, JSON `extracted_skills`, `seniority_level`, `is_external`, `deleted_at`, `created_at`, `updated_at`. Many-to-one to `User`.
- `job_matches` (`JobMatch`): `id`, `resume_id`, `job_description_id`, `match_score`, `computed_at`, `expires_at`; unique resume/job pair. Many-to-one to both.
- `ats_reports` (`AtsReport`): `id`, `resume_id`, `job_description_id`, `overall_score`, `created_at`. Many-to-one to resume/job; cascading one-to-many to each child collection.
- `ats_keyword_matches` (`AtsKeywordMatch`): `id`, `ats_report_id`, `keyword`, `found_in_resume`, `importance_weight`. Many-to-one to report.
- `ats_missing_skills` (`AtsMissingSkill`): `id`, `ats_report_id`, `skill_name`, `suggested_action`. Many-to-one to report.
- `ats_recommendations` (`AtsRecommendation`): `id`, `ats_report_id`, `category`, `recommendation_text`. Many-to-one to report.

### Notifications, commerce, analytics, and audit

- `notifications` (`Notification`): `id`, `user_id`, `type`, `title`, text `body`, `status`, `read_at`, `created_at`. Many-to-one to `User`.
- `subscriptions` (`Subscription`): `id`, `user_id`, `plan`, `status`, `starts_at`, `ends_at`, `is_current`, generated/helper `current_user_id`, `created_at`, `updated_at`. Many-to-one to `User`; cascading/orphan-removing one-to-many to payments.
- `payment_transactions` (`PaymentTransaction`): `id`, `subscription_id`, `provider`, `provider_reference`, `amount`, three-character `currency`, `status`, `occurred_at`; unique provider/reference. Many-to-one to subscription.
- `usage_metrics` (`UsageMetric`): `id`, `metric_date`, `metric_name`, `dimension_key`, `metric_value`, `created_at`; unique date/name/dimension.
- `audit_logs` (`AuditLog`): `id`, nullable `user_id`, `entity_type`, `entity_id`, `action`, JSON `before_state`, JSON `after_state`, `ip_address`, `created_at`. Many-to-one to `User`.
- `admin_action_logs` (`AdminActionLog`): `id`, `admin_user_id`, nullable `target_user_id`, `action`, JSON `details`, `created_at`. Two many-to-one associations to `User`.

### Migration-backed tables with no JPA entity

These are deliberate JDBC-backed tables, not necessarily dead schema:

- `ai_prompt_templates`: prompt lifecycle (`workflow`, version, locale, status, instruction, category, author/review/publish timestamps); accessed by prompt repository/manager SQL.
- `user_ai_settings`: per-user mode, preferred provider, and platform-fallback selection; accessed with JDBC.
- `user_ai_provider_credentials`: encrypted BYOK key bytes, IV, hint, timestamps; accessed with JDBC.
- `pdf_exports`: resume export filename, MIME type, byte size, SHA-256, timestamp; accessed with JDBC. PDF bytes are not stored.
- `user_notification_preferences`: per-user email/in-app/job-alert/AI-update flags; accessed with JDBC.

There is no JPA entity without a corresponding migration. Conversely, the five tables above and the `ai_requests.credential_source` column have migrations but no JPA mapping. V15 does not drop a table; it removes the seeded legacy “Classic” template row. The top-level `database/migrations/` directory contains only documentation; executable migrations are under backend resources.

## 4. REST API surface (as built)

Except for binary responses and 204s, controllers normally return `ApiResponse<T>`: `{success, data, message, error, meta}`. Paginated responses put `{page, size, totalElements, totalPages}` in `meta.pagination`. All routes are authenticated unless listed as public in the auth section.

### Authentication — `/api/v1/auth`

- `POST /register`: `{firstName,lastName,email,phone?,password}` → 201 `RegistrationResponse {userId,email,status}`; creates an unverified account and sends verification mail.
- `POST /login`: `{email,password}` (the identifier can be email or normalized phone) → `AuthResponse {accessToken,userId,email,role}` plus HttpOnly refresh cookie.
- `POST /refresh`: refresh cookie only → a new access-token response and reissues the same opaque refresh token. It validates rather than rotates.
- `POST /logout`: refresh cookie → 204, revokes token and expires cookie.
- `POST /change-password`: `{currentPassword,newPassword}` → empty success; protected despite residing below the otherwise public `/auth/**` matcher because service/current-user access fails without a principal, but the URL itself is `permitAll`.
- `POST /forgot-password`: `{email}` → enumeration-safe empty success.
- `POST /reset-password`: `{token,newPassword}` → empty success.
- `POST /verify-email?token=...` → empty success.
- `POST /resend-verification`: `{email}` → enumeration-safe empty success.

### Current user/profile — `/api/v1/users`

- `GET /me` → `{id,firstName,lastName,email,role,displayName,phone,location,persona,careerGoal,onboardingCompleted,phoneVerified,photoUrl}`.
- `PATCH /me` and `PUT /me`: `{firstName,lastName,displayName?,phone?,location?}` → profile.
- `PATCH /me/onboarding`: `{persona,careerGoal}` → profile with onboarding complete.
- `POST /me/photo` and `PUT /me/photo`: multipart part `photo` → profile.
- `GET /me/photo` → raw photo bytes with stored content type/name.
- `DELETE /me/photo` → 204.
- `POST /me/phone/send-otp`: `{phone}` → `{destination,expiresInSeconds,retryAfterSeconds,developmentCode}`. The dev code is populated by the fake provider.
- `POST /me/phone/verify-otp`: `{code}` → `{phone,verified}`.

### Resumes — `/api/v1/resumes`

- `GET /?page=0&size=20` → paginated `ResumeResponse[]`.
- `GET /deleted?page=0&size=20` → paginated `{id,title,deletedAt}[]`.
- `POST /`: `CreateResumeRequest {title,summary?,targetJobTitle?,templateId?}` → 201 resume.
- `GET /{id}` → resume.
- `PUT /{id}`: full `UpdateResumeRequest` containing title/summary/target/status/contact fields, all legacy content fields, and presentation settings → resume and version snapshot.
- `PATCH /{id}`: optional `{title,status}` → resume.
- `POST /{id}/publish` → resume with published status.
- `POST /{id}/duplicate` → 201 duplicated resume.
- `POST /{id}/restore` → restored soft-deleted resume.
- `DELETE /{id}` → 204 soft delete.

`ResumeResponse` exposes: `id,title,summary,targetJobTitle,status,templateId,templateName,contactEmail,phone,location,githubUrl,linkedinUrl,skillsContent,experienceContent,projectsContent,educationContent,certificationsContent,languagesContent,fontFamily,fontSize,lineSpacing,sectionSpacing,pageMargin,createdAt,updatedAt`.

### Typed resume sections — `/api/v1/resumes/{resumeId}/sections`

- `GET /` → section array.
- `POST /`: `{type,displayOrder,data}` → 201 section.
- `PUT /{sectionId}`: same shape → section.
- `DELETE /{sectionId}` → 204.
- `PATCH /order`: `{sectionIds:[...]}` → reordered section array.

Section responses are `{id,type,displayOrder,data,createdAt,updatedAt}`. Supported types map to education, experience, project, skill, and certification joined entities; `data` is type-specific.

### Resume versions — `/api/v1/resumes/{resumeId}/versions`

- `GET /?page=0&size=20` → paginated `{id,resumeId,versionNumber,source,label,createdAt}[]`.
- `GET /{versionId}` → `{version:<summary>,snapshot:<JSON>}`.
- `POST /{versionId}/restore` and alias `POST /{versionId}/rollback` → restored resume. Both perform the same operation.

### Templates — `/api/v1/templates`

- `GET /` → `{id,name,description,previewUrl,configuration}[]`.
- `GET /{id}` → one template.
- `POST /{templateId}/apply/{resumeId}` → empty success; updates the resume template and snapshots a version.

### PDF

- `POST /api/v1/resumes/{resumeId}/pdf` → raw `application/pdf` attachment.
- `GET /api/v1/pdf/resumes/{id}` → the same generated PDF through a second route.
- `GET /api/v1/pdf/resumes/{id}/history` → `{id,resumeId,fileName,byteSize,sha256,createdAt}[]`.

### AI — `/api/v1/ai`

- `POST /generate`: `{workflow,input,resumeId?,locale?}` → `{content,workflow,provider,model,inputTokens,outputTokens,latencyMs}`.
- `POST /jobs`: same request → 202 `{id,status,content,error}`; schedules async execution.
- `GET /jobs/{id}` → job state/result.
- `GET /jobs/{id}/stream` → SSE named `job`, implemented by a newly-created thread polling once per second for up to 60 seconds.
- `GET /usage` → `{monthlyCostUsd,monthlyBudgetUsd,remainingUsd}`.
- `GET /settings` → `{mode,preferredProvider,allowPlatformFallback,credentials:[{provider,configured,keyHint}]}`.
- `PUT /settings`: `{mode,preferredProvider,allowPlatformFallback}` → settings.
- `PUT /settings/credentials/{provider}`: `{apiKey}` → settings.
- `DELETE /settings/credentials/{provider}` → settings.

Supported workflow names are not modeled as an enum in the request. Published prompts determine valid production workflows. Seeded/configured usage includes `resume-summary`; the frontend invokes `cover-letter` and resume improvement workflows through the generic endpoint.

### Admin AI prompts — `/api/v1/admin/ai/prompts`

- `GET /providers/health` → `{provider,status}[]`.
- `POST /`: `{workflow,locale,category,systemInstruction}` → creates next draft version.
- `POST /{workflow}/{version}/review`, `/approve`, `/publish` → lifecycle transitions.
- All are method-secured with `hasRole('ADMIN')` in addition to URL security.

### Jobs — `/api/v1/jobs`

- `GET /health` → `"UP"`.
- `GET /` → saved jobs.
- `GET /{id}` → `{id,title,companyName,content,seniorityLevel,createdAt}`.
- `POST /`: `{title?,companyName?,content,seniorityLevel?}` → 201 job.
- `DELETE /{id}` → 204 soft delete.

There is **no REST endpoint that creates or returns `job_matches`**, despite the entity/table.

### ATS — `/api/v1/ats`

- `GET /health` → `"UP"`.
- `POST /analyze`: `{resumeId,jobDescriptionId}` → 201 report.
- `GET /reports/{id}` → full report.
- `GET /resumes/{resumeId}/reports` → report summaries.

Full reports contain `{summary:{id,resumeId,jobDescriptionId,overallScore,createdAt},keywords:[{keyword,found}],missingSkills:[string],recommendations:[{category,text}]}`. Scoring is local deterministic keyword comparison, not an external ATS or AI model.

### Notifications — `/api/v1/notifications`

- `GET /health` → `"UP"`.
- `GET /?unreadOnly=false` → notification items.
- `PATCH /{id}/read` → updated item.
- `PATCH /read-all` → `{updated:<count>}`.
- `GET /preferences` and `PUT /preferences`: `{emailEnabled,inAppEnabled,jobAlertsEnabled,aiUpdatesEnabled}`.

### Subscription — `/api/v1/subscriptions`

- `GET /plans` → static plan list.
- `GET /current` → current subscription or no data.
- `GET /entitlement` → `{plan,active,premium}`.
- `GET /history?page&size` → paginated subscription history.
- `GET /payments?page&size` → paginated payment history.
- `POST /cancel` → cancelled subscription.

Plan purchase, payment-provider checkout, and webhook endpoints do not exist. The listed paid plan is explicitly not self-service.

### Analytics and audit

- `GET /api/v1/analytics/overview?from&to` → current-user totals and daily activity.
- `GET /api/v1/admin/analytics/overview?from&to` → admin aggregate totals.
- `GET /api/v1/audit?page&size` → current-user audit entries.
- `GET /api/v1/admin/audit?page&size` → all audit entries.

### Admin — `/api/v1/admin`

- `GET /users?page&size` → paginated user views.
- `PATCH /users/{id}/status`: `{value}` → user.
- `PATCH /users/{id}/role`: `{value}` → user.
- `GET /actions?page&size` → paginated admin-action records.
- `GET /audit?page&size` → paginated audit records.

All `/api/v1/admin/**` endpoints require `ROLE_ADMIN`.

### Stubbed/incomplete API surface

No controller contains a literal `TODO` or throws `UnsupportedOperationException`. Functional gaps are structural:

- `job_matches` has an entity/table but no repository/service/controller operation.
- Subscription APIs are read/cancel only; there is no acquisition/payment integration.
- `/health` endpoints for jobs, ATS, and notifications return constant `"UP"` without dependency checks.
- The AI SSE endpoint is polling on an unmanaged raw thread, not provider-token streaming.
- Duplicate aliases exist for PDF generation and version restore.
- `POST /auth/change-password` is included in the public URL matcher even though its implementation assumes an authenticated current user.

## 5. Auth flow (as built)

1. Registration hashes passwords with Spring Security's configured password encoder, stores a user, creates an email-verification token hash, and sends a verification link by SMTP. Login is rejected until verification.
2. Login accepts email or phone. Phone login requires a previously verified phone. The service enforces account status, failed-attempt counting, and temporary lockout, then creates:
   - a signed HMAC JWT access token with issuer, audience, subject=user ID, JTI, `userId`, `email`, `role`, issued-at, and expiration; default TTL 15 minutes;
   - a 48-byte random opaque refresh token. Only its SHA-256 hash is stored.
3. The access token is returned in JSON. The refresh token is annotated `@JsonIgnore` and sent as `refresh_token`, HttpOnly, `SameSite=Strict`, path `/api/v1/auth`, 30-day max age, and conditionally `Secure`.
4. The frontend retains the access token in an in-memory `authSession` singleton, not local/session storage. On application startup it calls `/auth/refresh` using the cookie. A `BroadcastChannel` propagates logout between tabs.
5. Axios attaches `Authorization: Bearer ...`. On an eligible 401, a single shared refresh promise calls refresh with bare Axios, stores the returned access token, then retries the request once.
6. `JwtAuthenticationFilter` parses/verifies issuer, audience, signature, and expiry, extracts email, reloads the non-deleted user from the database, requires `status == ACTIVE`, and installs a username/password authentication containing one `ROLE_<database role>` authority. Invalid tokens are silently ignored; the entry point later produces the 401 envelope.
7. Security is stateless and CSRF is disabled. `AuthRateLimitFilter` runs before username/password auth, and the JWT filter is also inserted before it. CORS and security headers are configured.
8. Public URLs are `/api/v1/auth/**`, actuator health, OpenAPI JSON, and Swagger UI. `/api/v1/admin/**` requires admin; everything else requires authentication. Method security adds another admin check to prompt administration.
9. Refresh currently calls `RefreshTokenService.validate`, so it **does not rotate**. The service contains a rotation/reuse-detection method but the normal refresh flow does not invoke it. Each successful refresh re-sends the same token with a fresh cookie max age, while the database expiry remains the original fixed expiry.
10. Logout revokes the presented refresh record. Changing/resetting a password revokes active refresh tokens. Access JWTs are not centrally revoked and remain valid until expiry unless the user becomes deleted/inactive.

Deviations from a conventional setup include database lookup on every access-token request, opaque refresh cookies combined with JSON access tokens, non-rotating refresh despite rotation code being present, in-memory-only browser access tokens, broad `permitAll` for every `/auth/**` path, and disabled CSRF while cookie-authenticated refresh/logout endpoints exist. Strict SameSite and the cookie path reduce exposure but are the actual compensating behavior.

## 6. Frontend structure (as built)

### Provider/component tree

```text
React root
└── ErrorBoundary
    └── NotificationProvider
        └── QueryClientProvider
            └── AuthProvider
                └── RouterProvider
                    └── RouteRoot (Suspense + focus manager + motion)
                        ├── public landing / forbidden / not-found
                        ├── GuestRoute → AuthLayout → auth routes
                        └── ProtectedRoute
                            ├── onboarding
                            └── OnboardingGate → DashboardLayout
                                ├── dashboard and feature routes
                                └── AdminRoute → admin
```

Route and feature error boundaries are added around each feature group. Route screens are lazy-loaded.

### Routes

- Public: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/verify-email-sent`, `/forbidden`, wildcard 404.
- Authenticated but before onboarding gate: `/onboarding`.
- Authenticated and onboarding-complete: `/dashboard`, `/resumes`, `/resumes/deleted`, `/resumes/new`, `/resumes/:resumeId`, `/resumes/:resumeId/edit`, `/resumes/:resumeId/preview`, `/resumes/:resumeId/ats-check`, `/resumes/:resumeId/versions`, `/resumes/:resumeId/versions/:versionId`, `/templates`, `/ats`, `/job-matching`, `/cover-letter`, `/notifications`, `/profile`, `/settings`, `/ai-assistant`.
- Admin-only: `/admin`.

### State management

- Server state: TanStack React Query (`useQuery`, `useMutation`, invalidation, and direct cache updates).
- Authentication: React context plus an in-memory module singleton; no Redux/Zustand.
- Forms: a mixture of React Hook Form (mostly auth) and local `useState` (resume editor and workspaces).
- Resume editing: query cache, local form state, debounced autosave, a custom undo/redo hook, and a before-navigation unsaved-changes dialog.
- Notifications/toasts: a custom context/provider and imperative `notify` façade.
- No persisted general client-state store is present.

### API client

- One shared Axios instance uses configurable base URL/timeout and `withCredentials`.
- Request interceptor attaches the memory token.
- Response interceptor normalizes the backend envelope/errors, refreshes once on protected-request 401, emits auth lifecycle browser events, and creates UI notifications for 429/5xx.
- Each feature exports small endpoint functions that unwrap `response.data.data`; React Query hooks/components call those functions.
- Password breach checking is an exception: it calls the external Have I Been Pwned range API pattern from a dedicated auth API helper.
- There is no generated OpenAPI client and no schema runtime validation.

### Actual feature components

- Resume: list/cards, editor wizard, typed-section editor, live document preview, completion/quality engine, autosave, versions panel/detail, deleted items, ATS entry point.
- Templates: catalog/gallery and a client-side `templateEngine.js` parser used by preview styling; the backend also parses configuration for PDF rendering.
- ATS: analysis form/report display using saved jobs and resumes.
- Job workspace: create/list/delete job descriptions only.
- Cover letter: local fact input and editable/displayed result from generic `POST /ai/generate`.
- AI Center/settings: provider mode, encrypted BYOK credential management, fallback selection, and usage display.
- Admin: user/status/role management, audit/action views, analytics, and prompt lifecycle UI.
- Profile/onboarding/phone verification/photo upload, notifications/preferences, and subscription/entitlement UI are integrated.

## 7. What's implemented vs. stubbed vs. missing

- **Resume Template Engine — built.** Database-backed catalog, seeded template JSON, gallery, apply-to-resume, client preview parser, and backend PDF template parser/rendering are present. Templates are configuration variants handled by one renderer, not arbitrary HTML/CSS template uploads.
- **PDF Generation — built.** OpenPDF renders resume content/configuration, returns downloads, records hash/size history, and is wired to frontend export. It renders denormalized resume fields, not typed section entities.
- **AI Resume Generation — partially built.** Generic synchronous/asynchronous workflow execution, prompts, providers, budgets, rate limiting, usage, BYOK, and UI calls exist; there is no distinct operation that creates an entire persisted resume from AI output, and generated content is not automatically applied to a resume.
- **AI Resume Improvement — partially built.** Generic named AI workflows can produce improved text and the resume UI invokes AI assistance, but there is no structured diff/apply service that updates resume sections or sets `applied_to_resume`.
- **Cover Letter Generator — built.** A frontend workflow collects facts and calls the generic AI generation endpoint with `cover-letter`; output is displayed for editing/copying. There is no cover-letter entity, saved history, or dedicated endpoint.
- **ATS Checker — built.** Saved job descriptions, deterministic keyword scoring, reports, missing skills/recommendations, persistence, history, API, and frontend are present. It is an internal heuristic, not an external ATS integration.
- **Job Matching — partially built.** Job-description CRUD and `job_matches` schema/entity exist, but there is no code path/API/UI that computes or reads a `JobMatch`. The frontend directs users to ATS comparison instead.
- **Resume Import/Export — partially built.** PDF export and export history are built. No resume import, JSON/DOCX export, PDF/DOCX parsing, or portable resume-data export is present.
- **Version History — built.** JSON snapshots, automatic source-labelled versions, paginated list/detail, restore/rollback, API, tests, and frontend routes/components are present.

## 8. Deviations from a typical plan

- The codebase uses a feature-first modular package layout, not one global controller/service/repository tree.
- Persistence is hybrid JPA plus hand-written JDBC. Several real tables intentionally have no entities; repositories return Java records from SQL.
- Resume content has two live representations: normalized joined section entities and denormalized text columns. PDF export consumes the latter, so typed sections alone are not sufficient to populate the exported document.
- `Resume` does not declare inverse collections for versions, AI requests, ATS reports, matches, or exports; relationships are primarily unidirectional from child entities.
- Database migrations are the authority (`ddl-auto=none`). `database/migrations` at repository root is documentation, not an active Flyway location.
- `ai_requests.credential_source` is a real migrated column absent from the JPA entity.
- AI prompt templates, user AI settings/credentials, notification preferences, and PDF exports are SQL-backed without JPA entities.
- AI workflows are string-keyed and generic. Cover-letter and resume-assistance features are workflow names over the same endpoint, not separate bounded backend modules.
- AI “streaming” streams polled job states from a raw server thread; it does not stream model tokens.
- Provider selection supports platform keys, encrypted user-owned keys, and optional platform fallback. Redis is optional, so rate limiting is not necessarily distributed.
- Job matching is represented in schema only; ATS analysis is the actual user-accessible resume/job comparison.
- ATS scoring is deterministic token/keyword matching and persists its own reports. It is not AI-powered despite living beside AI features.
- Subscription/payment schema and read APIs exist, but no checkout/webhook/provider implementation exists; premium acquisition is not self-service.
- The same behavior is exposed twice for PDF generation and resume rollback.
- Several Java files are heavily minified onto one line. This is source formatting actually present, not generated output.
- There are both entity-backed repositories and repositories named as such that directly use `JdbcTemplate`; naming alone does not identify the persistence mechanism.
- Access tokens are held only in browser memory. A full reload always depends on the refresh cookie and backend availability to reconstruct session state.
- Refresh-token rotation/reuse detection exists in service code but the active refresh endpoint validates and reuses the token.
- All `/api/v1/auth/**` URLs are security-filter-public, including `change-password`; authentication for that operation is implicit in its `CurrentUser` use rather than an explicit matcher or method annotation.
- Development phone OTP can return the OTP in the API response. Production delivery supports MSG91, an Android SMS gateway, or TextBee depending on configuration.
- The frontend is JavaScript despite a `types` folder; there is no TypeScript compiler or compile-time contract enforcement.
- Styling is a large global CSS/design-token system supplemented by Tailwind's Vite plugin; components do not consistently use Tailwind utilities.
- Health endpoints inside feature controllers are constant responses. Only Actuator health represents Spring dependency health.
