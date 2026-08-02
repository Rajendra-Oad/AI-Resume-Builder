# AI Resume Builder — Complete Project Documentation

> Verified against the source code on 30 July 2026. This is an implementation guide: it explains what the repository currently does, how its parts connect, and which parts are incomplete or optional.

## 1. Project abstract

AI Resume Builder is a full-stack web application that helps a user create, edit, version, preview, analyse, and export a resume. A user can register securely, maintain a profile, create multiple resumes, apply visual templates, compare a resume with a saved job description using an ATS-style scoring engine, generate text with Gemini or OpenAI, and download the finished resume as a PDF.

The application uses a React single-page frontend, a Spring Boot REST API, and a MySQL database. JSON travels between the browser and backend through `/api/v1/...` endpoints. JWT access tokens protect API calls; a rotated HttpOnly refresh cookie restores a session without placing the long-lived token in browser storage. Flyway creates and upgrades the database. Optional integrations include Redis, email (SMTP), AI providers, and several phone-OTP providers.

In one sentence:

> The project is a secure, AI-assisted resume workspace that combines document editing, job-specific ATS feedback, version history, and PDF delivery in one application.

## 2. Problem, solution, and users

### Problem

Job seekers often use disconnected tools for writing, formatting, keyword checking, tailoring, and exporting a resume. They may not understand ATS requirements, may overwrite an older resume, and may send sensitive career data to AI without clear controls.

### Solution

This application provides:

- one account and dashboard for multiple resumes;
- structured and text-based resume editing with autosave;
- templates and presentation controls;
- version snapshots, restore, duplication, soft deletion, and recovery;
- saved job descriptions and ATS comparison reports;
- AI-assisted summaries and cover-letter drafts;
- either a platform AI key or the user's own encrypted provider key (BYOK);
- server-generated PDF files and export history;
- profile, onboarding, notification, security, analytics, subscription, and admin foundations.

### Intended users

- Job seekers: build and tailor resumes.
- Administrators: manage users, roles, prompt lifecycle, audits, and analytics.
- Developers/operators: configure AI, email, OTP, database, Redis, and deployment.

## 3. System architecture

The repository is a modular monolith, not microservices. The backend is one Spring Boot application divided into feature packages. This is easier to develop and deploy while still keeping clear module boundaries.

```text
User's browser
     |
     | React pages, forms, route guards
     v
Vite development server / Nginx production server
     |
     | HTTPS + JSON under /api/v1
     v
Spring Security filters
  - correlation ID
  - auth rate limiting
  - JWT validation
     |
     v
REST Controller -> Service/business rules -> Repository/JPA/JdbcTemplate
                                              |
                                              v
                                            MySQL
     |
     +----> Gemini or OpenAI (optional AI calls)
     +----> Redis (optional distributed AI rate limits/cache support)
     +----> SMTP server (verification and password recovery email)
     +----> MSG91 / Android gateway / TextBee (optional phone OTP)
```

### Why this architecture was chosen

- React gives a responsive editor without full page reloads.
- A REST boundary keeps the frontend independent of Java implementation details.
- Spring Boot supplies security, validation, persistence, email, health checks, and dependency injection.
- MySQL is suitable for related data such as users, resumes, sections, versions, jobs, and reports.
- Flyway makes schema changes repeatable and auditable.
- The AI provider adapter pattern avoids coupling the application to only Gemini or only OpenAI.
- Docker and Nginx give a repeatable deployment boundary.

## 4. Main request and data flow

Example: opening and editing a resume.

```text
ResumeEditor component
  -> resumeApi.js
  -> shared Axios client
  -> request interceptor adds "Authorization: Bearer <access-token>"
  -> Spring Security validates JWT
  -> ResumeController
  -> ResumeServiceImpl checks ownership and business rules
  -> ResumeRepository / JPA
  -> MySQL
  <- ApiResponse<ResumeResponse>
  <- React Query updates its cache
  <- editor and preview re-render
```

If the access token has expired, the response interceptor uses `tokenRefresh.js` to call `/api/v1/auth/refresh`. The browser automatically sends the HttpOnly refresh cookie. Only one refresh request is allowed in flight; waiting requests retry with the new access token.

## 5. Repository map

```text
AI-Resume-Builder/
├── frontend/                  React/Vite browser application
│   ├── public/                Logo and favicon
│   ├── e2e/                   Playwright browser tests and mock API
│   ├── scripts/               Frontend quality checks
│   └── src/
│       ├── api/               Axios, interceptors, refresh, React Query client
│       ├── animations/        Shared GSAP motion functions
│       ├── components/        Reusable buttons, forms, dialogs, tables, states
│       ├── config/            Environment-variable access
│       ├── context/           In-memory authentication state
│       ├── features/          Feature UI, API modules, hooks, routes
│       ├── hooks/             Shared debounce, health, undo/redo hooks
│       ├── layouts/           Guest/auth and authenticated dashboard shells
│       ├── pages/             Route-level pages
│       ├── routes/            Router and access/onboarding/admin guards
│       ├── services/          Session helper
│       ├── styles/            Global/design-system/feature CSS
│       ├── validators/        Auth and resume validation
│       ├── App.jsx            Global provider composition
│       └── main.jsx           Browser entry point
├── backend/
│   ├── src/main/java/com/airesumebuilder/
│   │   ├── common/            API envelope, errors, validation, utilities
│   │   ├── config/            Security, CORS, cache, async, OpenAPI
│   │   ├── events/            Resume lifecycle events
│   │   ├── feature/           Domain modules
│   │   ├── integration/ai/    Provider adapters, gateway, cost/cache/limits
│   │   ├── security/          JWT, refresh, recovery, filters, current user
│   │   └── AiResumeBuilderApplication.java
│   ├── src/main/resources/
│   │   ├── db/migration/      Flyway migrations V1 through V16
│   │   └── application*.properties
│   ├── src/test/              Unit and integration tests
│   └── pom.xml                Maven dependencies and build
├── database/                 Database guidance (migrations live in backend)
├── docker/                   Dev/prod Compose, Nginx, Dockerfiles
├── docs/                     Architecture, security, API, audits, this guide
├── scripts/                  Setup, seed, and commit-message scripts
├── .github/                  CI/repository automation
├── ARCHITECTURE.md           Large architecture reference
└── CONTRIBUTING.md           Contribution rules
```

## 6. Technology stack: what, why, and where

| Technology | Purpose and reason | Main location |
|---|---|---|
| React 19 | Component-based interactive UI | `frontend/src/**/*.jsx` |
| React Router | URL routing, lazy loading, guest/protected/admin guards | `frontend/src/routes`, `features/*/routes.jsx` |
| Vite | Fast dev server, build, and `/api` proxy | `frontend/vite.config.js` |
| TanStack React Query | Server-state caching, loading/error states, mutations, invalidation | feature components/hooks |
| Axios | Central HTTP client and token interceptors | `frontend/src/api` |
| React Hook Form | Form state and validation integration | auth/settings components |
| CSS + design tokens | Custom responsive visual system | `frontend/src/styles` |
| Tailwind CSS Vite plugin | Build dependency is configured, but current UI is mainly custom CSS | `vite.config.js` |
| GSAP | notifications, landing animation, route motion | animations and UI components |
| Locomotive Scroll | enhanced scrolling/motion support | `MotionProvider.jsx`, global CSS import |
| Lucide React | interface icons | `AppIcon.jsx` and components |
| Vitest + Testing Library | frontend unit/component tests | `*.test.js`, `*.test.jsx` |
| Playwright | end-to-end browser workflows | `frontend/e2e` |
| Java 21 | backend language; records, modern syntax, strong typing | `backend/src/main/java` |
| Spring Boot 3.5 | application runtime and configuration | backend |
| Spring MVC | REST controllers and JSON HTTP API | `feature/*/controller` |
| Spring Security | stateless JWT authentication and RBAC | `config/SecurityConfig.java`, `security/` |
| Spring Data JPA/Hibernate | entity mapping and repositories | feature entities/repositories |
| JdbcTemplate | explicit SQL for several reporting/workflow modules | job, ATS, analytics, admin, subscription |
| Jakarta Validation | validates request DTOs before business logic | request DTOs/controllers |
| MySQL | persistent relational data | datasource config and migrations |
| Flyway | ordered schema migrations; Hibernate does not create schema | `resources/db/migration` |
| JJWT | creates and validates signed access JWTs | `JwtService.java` |
| OpenPDF | renders resume PDFs on the server | `feature/pdf` |
| Spring Mail | verification and password-reset messages | `SecurityEmailService.java` |
| Spring Data Redis | optional Redis connection | cache/rate-limit configuration |
| Springdoc OpenAPI | Swagger/OpenAPI development documentation | `OpenApiConfig.java` |
| Actuator | health endpoint for operations and Docker | `/actuator/health` |
| Maven | backend dependency/build/test tool | `pom.xml`, `mvnw*` |
| Docker Compose | repeatable containers | `docker/` |
| Nginx | TLS termination, frontend serving/proxy boundary | `docker/nginx.conf` |
| GitHub Actions | continuous quality checks | `.github/workflows` |

## 7. Frontend architecture

`main.jsx` loads global styles and renders `App`. `App.jsx` wraps the router with:

1. `ErrorBoundary` for unexpected UI failures.
2. `NotificationProvider` for global toast messages.
3. `QueryClientProvider` for React Query.
4. `AuthProvider` for the current login session.
5. `AppRoutes` for navigation.

### Route protection

- Public: `/`, `/login`, `/register`, password reset, and email verification.
- Authenticated: onboarding and all dashboard features.
- Onboarding gate: authenticated users must finish required profile preferences.
- Admin: `/admin`, guarded in both frontend and backend.
- Error routes: `/forbidden` and the catch-all not-found page.

Frontend guards improve user experience, but backend Spring Security is the real security boundary.

### Feature folder rule

Each `frontend/src/features/<feature>` owns its API wrapper, component, routes, and feature hooks. Shared controls stay in `src/components`; direct Axios calls should stay out of components. This reduces coupling.

### State types

- Local UI state: React `useState` (open dialogs, selected report).
- Form state: React Hook Form.
- Remote/server state: React Query.
- Authentication: context plus an in-memory access token.
- Refresh credential: HttpOnly cookie managed by the browser, not JavaScript.
- Editor history: custom undo/redo hook.
- Autosave: debounced request through resume APIs.

## 8. Backend architecture

The normal backend layers are:

```text
Controller -> Service -> Repository -> Entity/table
```

- Controller: HTTP paths, status codes, request validation, response envelope.
- Service: ownership checks, workflows, transactions, and business rules.
- Repository: JPA or SQL data access.
- Entity/DTO: database representation versus API request/response shape.

Cross-cutting code handles JWT authentication, rate limits, correlation IDs, exception conversion, CORS, JSON configuration, async jobs, cache, email, and scheduling.

All normal JSON responses use a common `ApiResponse` envelope. `GlobalExceptionHandler` converts expected failures into consistent API errors. PDF and photo endpoints intentionally return binary data instead.

## 9. Feature-by-feature status

| Feature | Status | What it currently does |
|---|---|---|
| Landing/authentication | Implemented | Register, login, refresh, logout, email verification, password reset/change |
| Profile/onboarding | Implemented | Read/update profile, preferences, photo upload/delete, onboarding completion |
| Phone OTP | Implemented but provider-dependent | Fake local provider plus MSG91, Android gateway, or TextBee |
| Resume CRUD | Implemented | Create, list, view, update/patch, publish, duplicate, soft-delete, restore |
| Resume editor | Implemented | Candidate/contact/content/presentation fields, structured sections, autosave |
| Versioning | Implemented | List snapshots, view, restore/rollback |
| Templates | Implemented | List active templates and apply to a resume |
| PDF | Implemented | Generate/download server-side PDF and record export history |
| Job workspace | Partially implemented | Saves, lists, views, and deletes target job descriptions |
| ATS checker | Implemented | Compares a selected resume and job, stores score, keywords, gaps, recommendations |
| AI text generation | Implemented, requires provider key | Synchronous generation and queued background jobs |
| AI provider settings/BYOK | Implemented | Gemini/OpenAI choice, encrypted per-user keys, fallback controls, usage display |
| Cover letter | Basic/partial | Generates an editable draft from user facts; no separate cover-letter database lifecycle |
| Notifications | Implemented | List, unread filtering, read/read-all, preferences |
| Admin | Implemented foundation | User status/role, actions/audit, prompt review/approval/publishing, provider health |
| Analytics | Backend implemented, UI incomplete | User/admin overview APIs exist; main dashboard does not use them |
| Subscription | Backend foundation only | Plans, current/free entitlement, history, payments, cancellation; no checkout/payment gateway UI |
| Job matching recommendations | Not complete | `job_matches` schema/entity exists, but no complete matching workflow/API/UI |

### Important demo values

The dashboard calculates resume count and profile progress from limited data, but “Average ATS score” and “AI credits” are currently display/demo values rather than a complete analytics integration. Do not present those cards as live production metrics yet.

## 10. Core workflows

### Registration and login

1. React validates the form.
2. `authApi.js` sends registration/login to `/api/v1/auth`.
3. Backend validates, hashes passwords, and queries MySQL.
4. Login returns a short-lived access token and sets a refresh token cookie.
5. `AuthContext` keeps the access token in memory.
6. Protected Axios requests attach the access token.
7. Logout revokes the refresh token and expires the cookie.

### Resume creation and autosave

1. User opens `/resumes/new`.
2. The editor creates or loads a resume.
3. Changes update local state immediately.
4. Validation checks required/allowed values.
5. Debounce waits to avoid a request on every keystroke.
6. API update saves MySQL data.
7. React Query invalidates/refetches affected resume data.
8. Preview uses the same document data and selected template configuration.

### ATS analysis

1. User saves a job listing in Job Matching.
2. User selects one resume and one job in ATS Checker.
3. Frontend posts IDs to `/api/v1/ats/analyze`.
4. Backend confirms both records belong to the user.
5. `AtsScoringEngine` extracts and compares textual signals.
6. Report, keyword matches, missing skills, and recommendations are stored.
7. Frontend displays the score and report history.

This is an application scoring heuristic, not a guarantee of how every employer's ATS behaves.

### AI generation

1. User selects/configures Gemini or OpenAI.
2. A workflow such as `resume-summary` or `cover-letter` and factual input are sent.
3. `AiServiceImpl` and `AiGateway` resolve prompt and provider settings.
4. Rate limit, monthly budget, cache, and provider health are considered.
5. `AiProviderFactory` selects the Gemini or OpenAI adapter.
6. Adapter calls the external provider.
7. Output is validated and usage/cost attempts are logged.
8. Generated text is returned; the user should review before saving.

BYOK keys are encrypted with `USER_API_KEY_ENCRYPTION_KEY` before database storage. Losing or changing that encryption key can make stored user keys unreadable.

### PDF export

1. Frontend requests a resume PDF.
2. Backend verifies ownership.
3. `PdfService` loads resume, sections, and template.
4. `PdfRenderer` uses OpenPDF to render bytes.
5. Export metadata is saved.
6. Browser receives `application/pdf` with a download filename.

## 11. Database design

Flyway migrations V1–V16 are the source of truth. `spring.jpa.hibernate.ddl-auto=none` means Hibernate must not silently create or change production tables.

Main table groups:

- Identity: `users`, `user_profiles`, `refresh_tokens`, password/email/phone token tables.
- Resume: `resumes`, `resume_sections`, typed section tables, templates, versions, snapshots, PDF exports.
- AI: providers, requests, attempts, generated content, usage ledger, prompt templates, jobs, user settings and encrypted credentials.
- Jobs/ATS: job descriptions, job matches, ATS reports, keyword matches, missing skills, recommendations.
- Product/operations: notifications/preferences, subscriptions, payments, usage metrics, audits, admin actions.

Key relationships:

```text
users 1---* resumes 1---* resume_sections
                    1---* resume_versions 1---1 resume_version_snapshots
                    *---1 templates
                    1---* pdf_exports
                    1---* ats_reports *---1 job_descriptions

users 1---* ai_requests 1---* ai_request_attempts
                   1---* ai_generated_contents
users 1---1 user_ai_settings
users 1---* user_ai_provider_credentials
```

Most user-owned data uses ownership-aware queries. Resumes and jobs use soft deletion so “recently deleted” and restore are possible.

## 12. API groups

Base path: `/api/v1`.

| Group | Important operations |
|---|---|
| `/auth` | register, login, refresh, logout, password and verification flows |
| `/users/me` | profile, onboarding, profile photo |
| `/users/me/phone` | send and verify OTP |
| `/resumes` | CRUD, publish, duplicate, delete, restore |
| `/resumes/{id}/sections` | typed section CRUD and ordering |
| `/resumes/{id}/versions` | list, detail, restore/rollback |
| `/resumes/{id}/pdf`, `/pdf` | export and history |
| `/templates` | list/get/apply |
| `/jobs` | saved job descriptions |
| `/ats` | analysis and stored reports |
| `/ai` | generation, queued jobs, usage |
| `/ai/settings` | provider/BYOK preferences and credentials |
| `/notifications` | list/read/preferences |
| `/analytics` | user metrics |
| `/subscriptions` | plans, current, entitlement, history, payments, cancellation |
| `/audit` | current user's audit trail |
| `/admin` | user/action/audit management |
| `/admin/ai/prompts` | AI prompt lifecycle and provider health |
| `/admin/analytics` | system analytics |

Swagger UI is exposed in development at `/swagger-ui/index.html`; OpenAPI JSON is under `/v3/api-docs`.

## 13. Security model

- Passwords are one-way hashed; they are never recoverable.
- Access JWTs are short-lived and sent as Bearer tokens.
- Refresh tokens are rotated, persisted/revocable, and delivered in HttpOnly cookies.
- Backend is stateless; it does not use a server HTTP session.
- Admin paths require the `ADMIN` role.
- Resource access checks the authenticated user's ownership.
- Authentication endpoints have a rate-limit filter.
- Recovery and verification tokens are stored as hashes and are one-time.
- User AI keys are encrypted at rest.
- Security headers deny framing and restrict content sources/referrers.
- CORS is explicitly configured.
- Production should use HTTPS and `APP_SECURE_COOKIES=true`.
- Correlation IDs help trace errors without exposing internal details.

Security warning: `backend/.env.example` currently contains values that look machine-specific, including a database password and a TextBee device identifier. Example files should contain placeholders only. Treat any real-looking value as exposed: rotate it if it was ever valid, then sanitize the example. Never commit `backend/.env`, provider keys, SMTP passwords, JWT secret, database password, or the BYOK encryption key.

## 14. Configuration

Required for a normal local backend:

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET` with at least 32 strong random characters
- `APP_FRONTEND_URL` and allowed CORS origins

Required only for the chosen feature:

- Gemini: `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, optional model.
- OpenAI: `AI_PROVIDER=openai`, `OPENAI_API_KEY`, optional model.
- BYOK: `USER_API_KEY_ENCRYPTION_KEY` (Base64-encoded 32-byte key).
- Email: Spring Mail host, port, username, password, and `MAIL_FROM`.
- Redis: enable flag, host, and port.
- Real phone OTP: provider name and its credentials/configuration.
- Production cookies: `APP_SECURE_COOKIES=true`.
- Development seed: dev profile, enable flag, and seed password.

Frontend normally leaves `VITE_API_BASE_URL` unset and uses same-origin `/api`. `VITE_DEV_PROXY_TARGET` tells Vite where the backend runs.

## 15. Local setup

Prerequisites: Java 21, Node.js 20+, MySQL 8+, and Git. Maven can be run through the included wrapper.

```powershell
# 1. Configure backend
Copy-Item backend/.env.example backend/.env
# Replace every sensitive/example value in backend/.env.

# 2. Create the MySQL database
# CREATE DATABASE ai_resume_builder;

# 3. Run backend
Set-Location backend
.\mvnw.cmd spring-boot:run

# 4. In another terminal, run frontend
Set-Location frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Backend runs on `http://localhost:8080`. On startup Flyway applies missing migrations.

Docker development is available through `docker/docker-compose.dev.yml`, but verify environment-file wiring for your machine before relying on it. Production Compose assumes host networking for an existing host MySQL service and TLS certificate paths supplied through Docker environment variables.

## 16. Testing and quality

Frontend:

```powershell
Set-Location frontend
npm run lint
npm run styles:check
npm run test
npm run build
npm run test:e2e
```

Backend:

```powershell
Set-Location backend
.\mvnw.cmd test
.\mvnw.cmd verify
.\mvnw.cmd -Pintegration-test verify
```

The project has unit/component tests, route/accessibility tests, backend service/controller/security tests, cross-module tests, Flyway integration tests, and Playwright flows. Current coverage thresholds are modest (frontend roughly 10–20% depending on metric and backend 24% lines), so passing coverage does not mean every workflow is thoroughly tested.

## 17. Used, optional, incomplete, and removable items

### Clearly used

React, Router, React Query, Axios, React Hook Form, GSAP, Locomotive Scroll, Lucide, Spring web/security/JPA/validation/mail, MySQL, Flyway, JJWT, OpenPDF, tests, Docker/Nginx, and the core feature modules are connected to runtime code.

### Optional by configuration

- Redis: disabled by default; useful for distributed AI rate limiting/caching.
- SMTP: required only for actual email delivery.
- Real OTP providers: fake provider is suitable only for local/test.
- Gemini/OpenAI: AI-independent resume CRUD can run without them, but generation cannot.
- Development seed data: off by default.
- Docker: convenient deployment path, not necessary for local IDE execution.

### Installed but apparently unused/redundant

- `@untitledui/icons`: no application import was found; Lucide is the active icon library.
- `motion`: no application import was found; GSAP is the active animation implementation.
- Tailwind utility usage is not evident even though its Vite plugin/config and packages exist; the interface is primarily custom CSS. Remove only after confirming no planned migration/build requirement.
- `autoprefixer` and `postcss` may be legacy/redundant with the current Vite/Tailwind path; verify the build before removing.
- Duplicate PDF routes expose similar generation behavior (`/resumes/{id}/pdf` and `/pdf/resumes/{id}`); keep one canonical API in a future cleanup.
- Several compact one-line Java classes are functional but difficult to maintain; formatting them is valuable, not a runtime requirement.

Do not delete a dependency merely because it is optional. First remove its configuration/imports, run frontend and backend tests, build production artifacts, and check deployment files.

### Present as foundations, not complete products

- `JobMatch` model/table does not equal a complete job recommendation engine.
- Subscription tables/APIs do not equal a real paid checkout; no payment-provider purchase workflow is present.
- Analytics APIs are not fully connected to dashboard cards.
- Cover-letter generation has no saved-document CRUD/version/export domain.
- AI job submission exists, but the frontend mainly uses direct generation/usage settings.
- Some architecture documents describe future targets and should not be treated as proof of implementation.

## 18. What is important for a demonstration

Recommended demonstration order:

1. Explain the problem and three-layer architecture.
2. Register/login and mention JWT plus HttpOnly refresh-cookie security.
3. Complete onboarding/profile.
4. Create a resume and show autosave/structured sections.
5. Apply a template and open preview.
6. Save a target job and run ATS analysis.
7. Generate AI content, explaining Gemini/OpenAI abstraction and BYOK.
8. Show version restore and recently deleted recovery.
9. Export PDF.
10. Finish with admin, notification, deployment, and future-scope notes.

Short explanation:

> “The React frontend never talks directly to MySQL. It calls secured Spring Boot REST endpoints. Controllers accept requests, services enforce ownership and business rules, and repositories persist through JPA or SQL. React Query keeps server data synchronized. AI calls pass through a provider-independent gateway, so Gemini and OpenAI can be selected without rewriting the resume feature. Flyway controls the database, and OpenPDF performs server-side exports.”

## 19. Limitations and recommended next work

Priority 0 — security and correctness:

- Replace sensitive-looking values in `.env.example` with placeholders and rotate any real credentials.
- Restore or replace the deleted root README because documentation currently links to it.
- Correct visible character-encoding artifacts such as `â€”`, `â†’`, and `couldnâ€™t`.
- Ensure production CORS, HTTPS, cookie, JWT, encryption, database, SMTP, and AI secrets are managed outside Git.

Priority 1 — product completeness:

- Connect dashboard metrics to analytics, ATS, and AI usage APIs.
- Implement actual job-match scoring/recommendation APIs or rename the feature “Saved Jobs”.
- Add saved cover letters, editing, versioning, and export if it is a core product.
- Add a real payment-provider checkout before marketing paid subscriptions.
- Decide one canonical PDF export route.
- Add AI job polling/status UI if background generation is intended for users.

Priority 2 — maintainability:

- Remove verified unused dependencies.
- Format compressed Java/JS files and add explanatory domain comments.
- Increase tests and coverage around refresh races, ownership, AI failure paths, PDF rendering, migrations, and browser workflows.
- Keep implementation audits synchronized with code.
- Generate a current endpoint catalogue from OpenAPI instead of manually duplicating every request schema.

## 20. Glossary

- API: rules/endpoints through which frontend and backend communicate.
- REST: HTTP resource style using GET, POST, PUT, PATCH, and DELETE.
- SPA: single-page application; React changes views without reloading the whole page.
- DTO: object designed for API input/output, separate from a database entity.
- JPA/Hibernate: maps Java objects to relational database rows.
- JdbcTemplate: Spring helper for executing explicit SQL.
- JWT: signed short-lived access token proving identity/claims.
- HttpOnly cookie: browser cookie JavaScript cannot read, reducing token theft through XSS.
- CORS: controls which browser origins may call the backend.
- ATS: applicant tracking system; here, a heuristic resume/job comparison.
- BYOK: bring your own key; user supplies an AI provider API key.
- Flyway migration: ordered SQL file that moves a database schema forward.
- Soft delete: marks a row deleted instead of physically erasing it immediately.
- Autosave: delayed automatic persistence after edits.
- Cache: reused result that avoids repeated work/cost for equivalent requests.
- Rate limit: maximum allowed requests in a time window.
- Modular monolith: one deployable backend divided into well-defined feature modules.

## 21. Source-of-truth guide

When documentation and code disagree, use this order:

1. Flyway migrations for the actual database schema.
2. Controllers and security configuration for exposed backend behavior.
3. Services/repositories for business behavior and persistence.
4. Frontend router and API modules for available user journeys.
5. `application*.properties` and deployment files for runtime configuration.
6. This document for the consolidated explanation.
7. Numbered architecture documents for intended design and future direction.

