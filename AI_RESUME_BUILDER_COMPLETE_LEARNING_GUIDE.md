# AI Resume Builder: From Zero Knowledge to Professional Understanding

> **Evidence status:** Reverse-engineered from the repository as it existed on 30 July 2026. Where an older design note is included for teaching depth, it is explicitly subordinate to current source code, migrations, manifests, and tests.

> **How to read:** Read in order. A technical term is defined on first practical use. Current means implemented in this checkout. Foundation means code/schema exists but the user journey is incomplete. Optional means runtime configuration decides whether it participates.

This is a teaching book, not merely a list of files. It explains why the system exists, how a browser request becomes database work, how security boundaries operate, and how to reason about the code like a professional engineer.

# 1 Project Overview

## The shortest correct explanation

AI Resume Builder is a **full-stack web application** (simple meaning: one product containing both browser code and server code). It gives job seekers a secure workspace for accounts, profiles, resumes, templates, version history, ATS-style analysis, AI-assisted writing, and PDF export. Administrators get user, audit, prompt, and analytics foundations.

The business problem is fragmentation. A candidate otherwise writes in one tool, checks keywords in another, asks an AI in a third, and manually saves copies. This project joins those steps around one owned data model.

The architecture is a **modular monolith** (simple meaning: one deployable backend program divided into clean feature areas). That is appropriate here: a small team receives the simplicity of one deployment and one database while preserving module boundaries that could later be separated.

## Verified current-project briefing

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


# 2 Big Picture

## Story from click to pixels

The browser downloads index.html. Its oot element is initially empty. Vite's production bundle or development server loads main.jsx; React DOM creates a root; App.jsx installs error, notification, query-cache, authentication, and routing providers. React Router chooses a page from the URL. A protected page waits for AuthContext to restore the session through the refresh cookie.

`mermaid
flowchart TD
  U[User] --> B[Browser]
  B --> H[index.html]
  H --> M[main.jsx]
  M --> A[App providers]
  A --> R[React Router]
  R --> G{Route guard}
  G -->|public| P[Public page]
  G -->|signed in| D[Dashboard layout]
  D --> F[Feature component]
  F --> Q[React Query]
  Q --> X[Axios]
  X --> S[Spring Security filters]
  S --> C[Controller]
  C --> V[Service]
  V --> J[Repository]
  J --> DB[(MySQL)]
  V -. optional .-> AI[Gemini or OpenAI]
`

`mermaid
sequenceDiagram
  actor User
  participant UI as React UI
  participant AX as Axios
  participant SEC as Spring Security
  participant CT as Controller
  participant SV as Service
  participant RP as Repository
  participant DB as MySQL
  User->>UI: edits a resume
  UI->>UI: local state changes immediately
  UI->>AX: debounced PATCH/PUT
  AX->>SEC: Authorization Bearer JWT
  SEC->>CT: authenticated request
  CT->>SV: validated DTO + current user
  SV->>RP: ownership-aware update
  RP->>DB: SQL in transaction
  DB-->>RP: persisted row
  RP-->>SV: entity/result
  SV-->>CT: response DTO
  CT-->>AX: ApiResponse JSON
  AX-->>UI: update query cache
  UI-->>User: saved state and preview
`

**Deployment view:** Vercel serves the frontend. HTTPS API traffic reaches unprivileged Nginx on EC2, which proxies Spring Boot on port 8080. Spring Boot reaches host MySQL. Gemini/OpenAI, Redis, SMTP, and OTP services are outbound optional integrations.


# 3 Complete Technology Stack

## How to evaluate a technology

For each choice ask: what responsibility does it own, which code proves it is used, what trade-off does it create, and what breaks if it disappears?

| Technology | Simple meaning | Why here | Cost/trade-off | Alternative |
|---|---|---|---|---|
| Java 21 | Strongly typed backend language | Mature server ecosystem and modern language/runtime | More ceremony and memory than small scripting stacks | Kotlin, C#, Go, TypeScript |
| Spring Boot 3.5 | Framework that assembles and starts the Java web server | Security, validation, web, data, mail, health, configuration | Many conventions to learn | Quarkus, Micronaut, Jakarta EE |
| Spring MVC | HTTP controller framework | Maps /api/v1 requests to Java methods | Servlet/thread-per-request model | WebFlux, JAX-RS |
| Spring Security | Authentication/authorization framework | Central filter chain, JWT, roles, password encoder | Misconfiguration can be subtle | Custom middleware, Keycloak adapter |
| JPA/Hibernate | Object-to-relational mapper | Maps many Java entities to MySQL rows | Hidden SQL and lazy-loading risks | jOOQ, MyBatis, plain JDBC |
| JdbcTemplate | Thin SQL helper | Gives reporting/operational modules explicit SQL control | SQL is database-specific and manually mapped | JPA, jOOQ |
| MySQL 8 | Relational database | Durable related user/resume/AI data with constraints | Schema migrations and indexing require care | PostgreSQL, MariaDB |
| Flyway | Migration runner | V1-V16 are ordered, reviewable schema history | Applied files must remain immutable | Liquibase |
| JWT/JJWT | Signed access identity card | Stateless short-lived API authentication | Revocation is hard before expiry | Opaque server sessions |
| Redis | Fast network key/value store | Optional distributed AI rate limits | Extra service and failure mode | In-memory counters, database counters |
| OpenPDF | Java PDF library | Deterministic server-side resume PDF bytes | Layout code is lower-level than browser print | Playwright/Chromium PDF, PDFBox |
| React 19 | Component UI library | Interactive editor/dashboard without reloads | Client state and rendering complexity | Vue, Angular, Svelte |
| React Router 8 | URL-to-component router | Nested layouts and guest/protected/admin gates | Client routes must match server hosting fallback | TanStack Router |
| TanStack Query | Server-state cache | Loading, caching, mutation, invalidation | Cache keys and stale state need discipline | SWR, Redux Toolkit Query |
| Axios | HTTP client | Shared interceptors and blob handling | Another abstraction over etch | Browser etch |
| React Hook Form | Form state helper | Efficient forms and field errors | Separate mental model from React state | Formik, native state |
| Vite 8 | Frontend dev/build tool | Fast ESM dev server and production bundles | Version/plugin compatibility | Webpack, Parcel |
| CSS design tokens | Shared named visual values | Current UI is primarily custom CSS | Global cascade needs discipline | CSS Modules, Tailwind |
| Docker/Compose | Reproducible container packaging | Defines backend and Nginx runtime boundary | Images, networking, memory need operations knowledge | Systemd/native JAR |
| Nginx | Reverse proxy and TLS boundary | HTTPS and API forwarding | Certificate/proxy configuration | Caddy, cloud load balancer |
| GitHub Actions | Hosted CI runner | Tests, lint, commit/security checks | CI minutes and workflow maintenance | GitLab CI, Jenkins |

Learning difficulty is moderate-to-high because the project combines browser programming, Java server design, relational modeling, and operations. Learn the request path first; individual libraries become easier once their responsibility has a clear place.


# 4 Folder Structure

## Complete tracked working tree

Generated from the current checkout; build output, dependencies, coverage, and Git internals are intentionally excluded because they are reproducible rather than authored source.

```text
.github/ISSUE_TEMPLATE/feature_request.md
.github/modernize/java-upgrade/.gitignore
.github/modernize/java-upgrade/hooks/scripts/recordToolUse.ps1
.github/modernize/java-upgrade/hooks/scripts/recordToolUse.sh
.github/pull_request_template.md
.github/workflows/ci.yml
.github/workflows/commit-conventions.yml
.github/workflows/security.yml
.gitignore
.vscode/extensions.json
.vscode/launch.json
.vscode/settings.json
ARCHITECTURE.md
backend/.dependency-check-data/cache/CENTRAL.data
backend/.dependency-check-data/cache/CENTRAL.key
backend/.dependency-check-data/cache/NODEAUDIT.data
backend/.dependency-check-data/cache/NODEAUDIT.key
backend/.dependency-check-data/cache/POM.data
backend/.dependency-check-data/cache/POM.key
backend/.dependency-check-data/odc.mv.db
backend/.dependency-check-data/odc.update.lock
backend/.dockerignore
backend/.env
backend/.env.example
backend/.mvn/wrapper/maven-wrapper.properties
backend/Dockerfile
backend/mvnw
backend/mvnw.cmd
backend/pom.xml
backend/README.md
backend/src/main/java/com/airesumebuilder/AiResumeBuilderApplication.java
backend/src/main/java/com/airesumebuilder/common/dto/ApiError.java
backend/src/main/java/com/airesumebuilder/common/dto/ApiFieldError.java
backend/src/main/java/com/airesumebuilder/common/dto/ApiMeta.java
backend/src/main/java/com/airesumebuilder/common/dto/ApiResponse.java
backend/src/main/java/com/airesumebuilder/common/dto/Pagination.java
backend/src/main/java/com/airesumebuilder/common/exception/AuthenticationException.java
backend/src/main/java/com/airesumebuilder/common/exception/AuthorizationException.java
backend/src/main/java/com/airesumebuilder/common/exception/BaseException.java
backend/src/main/java/com/airesumebuilder/common/exception/ConflictException.java
backend/src/main/java/com/airesumebuilder/common/exception/ExternalServiceException.java
backend/src/main/java/com/airesumebuilder/common/exception/GlobalExceptionHandler.java
backend/src/main/java/com/airesumebuilder/common/exception/ResourceNotFoundException.java
backend/src/main/java/com/airesumebuilder/common/exception/ValidationException.java
backend/src/main/java/com/airesumebuilder/common/mapper/Mapper.java
backend/src/main/java/com/airesumebuilder/common/util/DateTimeUtil.java
backend/src/main/java/com/airesumebuilder/common/validation/ResumeValidation.java
backend/src/main/java/com/airesumebuilder/common/web/CorrelationIdContext.java
backend/src/main/java/com/airesumebuilder/common/web/CorrelationIdFilter.java
backend/src/main/java/com/airesumebuilder/config/AsyncConfig.java
backend/src/main/java/com/airesumebuilder/config/CacheConfig.java
backend/src/main/java/com/airesumebuilder/config/CorsConfig.java
backend/src/main/java/com/airesumebuilder/config/DevDataSeeder.java
backend/src/main/java/com/airesumebuilder/config/EnvironmentConfigurationValidator.java
backend/src/main/java/com/airesumebuilder/config/JacksonConfig.java
backend/src/main/java/com/airesumebuilder/config/OpenApiConfig.java
backend/src/main/java/com/airesumebuilder/config/PasswordConfig.java
backend/src/main/java/com/airesumebuilder/config/RestClientTimeoutConfiguration.java
backend/src/main/java/com/airesumebuilder/config/SchedulingConfig.java
backend/src/main/java/com/airesumebuilder/config/SecurityConfig.java
backend/src/main/java/com/airesumebuilder/events/ResumeCreatedEvent.java
backend/src/main/java/com/airesumebuilder/events/ResumeDeletedEvent.java
backend/src/main/java/com/airesumebuilder/events/ResumeUpdatedEvent.java
backend/src/main/java/com/airesumebuilder/feature/admin/controller/AdminController.java
backend/src/main/java/com/airesumebuilder/feature/admin/entity/AdminActionLog.java
backend/src/main/java/com/airesumebuilder/feature/admin/repository/AdminRepository.java
backend/src/main/java/com/airesumebuilder/feature/admin/service/AdminService.java
backend/src/main/java/com/airesumebuilder/feature/ai/controller/AiController.java
backend/src/main/java/com/airesumebuilder/feature/ai/controller/AiPromptAdminController.java
backend/src/main/java/com/airesumebuilder/feature/ai/controller/AiSettingsController.java
backend/src/main/java/com/airesumebuilder/feature/ai/dto/request/AiGenerationRequest.java
backend/src/main/java/com/airesumebuilder/feature/ai/dto/request/AiSettingsRequest.java
backend/src/main/java/com/airesumebuilder/feature/ai/dto/request/GenerateContentRequest.java
backend/src/main/java/com/airesumebuilder/feature/ai/dto/request/PromptTemplateRequest.java
backend/src/main/java/com/airesumebuilder/feature/ai/dto/request/ProviderCredentialRequest.java
backend/src/main/java/com/airesumebuilder/feature/ai/dto/response/AiGenerationResponse.java
backend/src/main/java/com/airesumebuilder/feature/ai/dto/response/AiJobResponse.java
backend/src/main/java/com/airesumebuilder/feature/ai/dto/response/AiProviderHealthResponse.java
backend/src/main/java/com/airesumebuilder/feature/ai/dto/response/AiSettingsResponse.java
backend/src/main/java/com/airesumebuilder/feature/ai/dto/response/AiUsageResponse.java
backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiGeneratedContent.java
backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiJob.java
backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiProvider.java
backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiRequest.java
backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiRequestAttempt.java
backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiUsageLedger.java
backend/src/main/java/com/airesumebuilder/feature/ai/repository/AiJobRepository.java
backend/src/main/java/com/airesumebuilder/feature/ai/repository/AiPromptRepository.java
backend/src/main/java/com/airesumebuilder/feature/ai/repository/AiUsageRepository.java
backend/src/main/java/com/airesumebuilder/feature/ai/repository/AiUserSettingsRepository.java
backend/src/main/java/com/airesumebuilder/feature/ai/service/AiJobLifecycleService.java
backend/src/main/java/com/airesumebuilder/feature/ai/service/AiJobRunner.java
backend/src/main/java/com/airesumebuilder/feature/ai/service/AiJobService.java
backend/src/main/java/com/airesumebuilder/feature/ai/service/AiPromptAdminService.java
backend/src/main/java/com/airesumebuilder/feature/ai/service/AiService.java
backend/src/main/java/com/airesumebuilder/feature/ai/service/AiUserSettingsService.java
backend/src/main/java/com/airesumebuilder/feature/ai/service/impl/AiJobRunnerImpl.java
backend/src/main/java/com/airesumebuilder/feature/ai/service/impl/AiJobServiceImpl.java
backend/src/main/java/com/airesumebuilder/feature/ai/service/impl/AiServiceImpl.java
backend/src/main/java/com/airesumebuilder/feature/analytics/controller/AdminAnalyticsController.java
backend/src/main/java/com/airesumebuilder/feature/analytics/controller/AnalyticsController.java
backend/src/main/java/com/airesumebuilder/feature/analytics/entity/UsageMetric.java
backend/src/main/java/com/airesumebuilder/feature/analytics/repository/AnalyticsRepository.java
backend/src/main/java/com/airesumebuilder/feature/analytics/service/AnalyticsService.java
backend/src/main/java/com/airesumebuilder/feature/ats/controller/AtsController.java
backend/src/main/java/com/airesumebuilder/feature/ats/entity/AtsKeywordMatch.java
backend/src/main/java/com/airesumebuilder/feature/ats/entity/AtsMissingSkill.java
backend/src/main/java/com/airesumebuilder/feature/ats/entity/AtsRecommendation.java
backend/src/main/java/com/airesumebuilder/feature/ats/entity/AtsReport.java
backend/src/main/java/com/airesumebuilder/feature/ats/repository/AtsRepository.java
backend/src/main/java/com/airesumebuilder/feature/ats/service/AtsScoringEngine.java
backend/src/main/java/com/airesumebuilder/feature/ats/service/AtsService.java
backend/src/main/java/com/airesumebuilder/feature/audit/controller/AuditController.java
backend/src/main/java/com/airesumebuilder/feature/audit/entity/AuditLog.java
backend/src/main/java/com/airesumebuilder/feature/audit/listener/ResumeAuditListener.java
backend/src/main/java/com/airesumebuilder/feature/audit/repository/AuditRepository.java
backend/src/main/java/com/airesumebuilder/feature/audit/service/AuditService.java
backend/src/main/java/com/airesumebuilder/feature/auth/controller/AuthController.java
backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/ChangePasswordRequest.java
backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/ForgotPasswordRequest.java
backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/LoginRequest.java
backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/RegisterRequest.java
backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/ResendVerificationRequest.java
backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/ResetPasswordRequest.java
backend/src/main/java/com/airesumebuilder/feature/auth/dto/response/AuthResponse.java
backend/src/main/java/com/airesumebuilder/feature/auth/dto/response/RegistrationResponse.java
backend/src/main/java/com/airesumebuilder/feature/auth/entity/EmailVerificationToken.java
backend/src/main/java/com/airesumebuilder/feature/auth/entity/PasswordResetToken.java
backend/src/main/java/com/airesumebuilder/feature/auth/entity/RefreshToken.java
backend/src/main/java/com/airesumebuilder/feature/auth/entity/User.java
backend/src/main/java/com/airesumebuilder/feature/auth/entity/UserProfile.java
backend/src/main/java/com/airesumebuilder/feature/auth/phone/AndroidGatewayOtpDeliveryProvider.java
backend/src/main/java/com/airesumebuilder/feature/auth/phone/FakeOtpDeliveryProvider.java
backend/src/main/java/com/airesumebuilder/feature/auth/phone/Msg91OtpDeliveryProvider.java
backend/src/main/java/com/airesumebuilder/feature/auth/phone/OtpDeliveryProvider.java
backend/src/main/java/com/airesumebuilder/feature/auth/phone/PhoneNumbers.java
backend/src/main/java/com/airesumebuilder/feature/auth/phone/PhoneOtpChallenge.java
backend/src/main/java/com/airesumebuilder/feature/auth/phone/PhoneOtpRepository.java
backend/src/main/java/com/airesumebuilder/feature/auth/phone/PhoneVerificationController.java
backend/src/main/java/com/airesumebuilder/feature/auth/phone/PhoneVerificationService.java
backend/src/main/java/com/airesumebuilder/feature/auth/phone/TextBeeOtpDeliveryProvider.java
backend/src/main/java/com/airesumebuilder/feature/auth/repository/EmailVerificationTokenRepository.java
backend/src/main/java/com/airesumebuilder/feature/auth/repository/PasswordResetTokenRepository.java
backend/src/main/java/com/airesumebuilder/feature/auth/repository/RefreshTokenRepository.java
backend/src/main/java/com/airesumebuilder/feature/auth/repository/UserRepository.java
backend/src/main/java/com/airesumebuilder/feature/auth/service/AuthService.java
backend/src/main/java/com/airesumebuilder/feature/auth/service/impl/AuthServiceImpl.java
backend/src/main/java/com/airesumebuilder/feature/auth/service/impl/UserAccountQueryServiceImpl.java
backend/src/main/java/com/airesumebuilder/feature/auth/service/UserAccountQueryService.java
backend/src/main/java/com/airesumebuilder/feature/job/controller/JobController.java
backend/src/main/java/com/airesumebuilder/feature/job/entity/JobDescription.java
backend/src/main/java/com/airesumebuilder/feature/job/entity/JobMatch.java
backend/src/main/java/com/airesumebuilder/feature/job/service/JobService.java
backend/src/main/java/com/airesumebuilder/feature/notification/controller/NotificationController.java
backend/src/main/java/com/airesumebuilder/feature/notification/entity/Notification.java
backend/src/main/java/com/airesumebuilder/feature/notification/service/NotificationService.java
backend/src/main/java/com/airesumebuilder/feature/pdf/controller/PdfController.java
backend/src/main/java/com/airesumebuilder/feature/pdf/controller/ResumePdfController.java
backend/src/main/java/com/airesumebuilder/feature/pdf/repository/PdfExportRepository.java
backend/src/main/java/com/airesumebuilder/feature/pdf/service/PdfRenderer.java
backend/src/main/java/com/airesumebuilder/feature/pdf/service/PdfService.java
backend/src/main/java/com/airesumebuilder/feature/resume/controller/ResumeController.java
backend/src/main/java/com/airesumebuilder/feature/resume/controller/ResumeSectionController.java
backend/src/main/java/com/airesumebuilder/feature/resume/dto/request/CreateResumeRequest.java
backend/src/main/java/com/airesumebuilder/feature/resume/dto/request/PatchResumeRequest.java
backend/src/main/java/com/airesumebuilder/feature/resume/dto/request/ReorderSectionsRequest.java
backend/src/main/java/com/airesumebuilder/feature/resume/dto/request/ResumeSectionRequest.java
backend/src/main/java/com/airesumebuilder/feature/resume/dto/request/UpdateResumeRequest.java
backend/src/main/java/com/airesumebuilder/feature/resume/dto/response/DeletedResumeResponse.java
backend/src/main/java/com/airesumebuilder/feature/resume/dto/response/ResumeResponse.java
backend/src/main/java/com/airesumebuilder/feature/resume/dto/response/ResumeSectionResponse.java
backend/src/main/java/com/airesumebuilder/feature/resume/entity/Certification.java
backend/src/main/java/com/airesumebuilder/feature/resume/entity/Education.java
backend/src/main/java/com/airesumebuilder/feature/resume/entity/Experience.java
backend/src/main/java/com/airesumebuilder/feature/resume/entity/Project.java
backend/src/main/java/com/airesumebuilder/feature/resume/entity/Resume.java
backend/src/main/java/com/airesumebuilder/feature/resume/entity/ResumeSection.java
backend/src/main/java/com/airesumebuilder/feature/resume/entity/Skill.java
backend/src/main/java/com/airesumebuilder/feature/resume/repository/ResumeRepository.java
backend/src/main/java/com/airesumebuilder/feature/resume/repository/ResumeSectionRepository.java
backend/src/main/java/com/airesumebuilder/feature/resume/service/impl/ResumeServiceImpl.java
backend/src/main/java/com/airesumebuilder/feature/resume/service/ResumeSectionService.java
backend/src/main/java/com/airesumebuilder/feature/resume/service/ResumeService.java
backend/src/main/java/com/airesumebuilder/feature/resume/version/controller/ResumeVersionController.java
backend/src/main/java/com/airesumebuilder/feature/resume/version/entity/ResumeVersion.java
backend/src/main/java/com/airesumebuilder/feature/resume/version/entity/ResumeVersionSnapshot.java
backend/src/main/java/com/airesumebuilder/feature/resume/version/repository/ResumeVersionRepository.java
backend/src/main/java/com/airesumebuilder/feature/resume/version/service/ResumeVersionService.java
backend/src/main/java/com/airesumebuilder/feature/subscription/controller/SubscriptionController.java
backend/src/main/java/com/airesumebuilder/feature/subscription/entity/PaymentTransaction.java
backend/src/main/java/com/airesumebuilder/feature/subscription/entity/Subscription.java
backend/src/main/java/com/airesumebuilder/feature/subscription/repository/SubscriptionRepository.java
backend/src/main/java/com/airesumebuilder/feature/subscription/service/SubscriptionService.java
backend/src/main/java/com/airesumebuilder/feature/template/controller/TemplateController.java
backend/src/main/java/com/airesumebuilder/feature/template/engine/TemplateDefinition.java
backend/src/main/java/com/airesumebuilder/feature/template/entity/Template.java
backend/src/main/java/com/airesumebuilder/feature/template/service/TemplateService.java
backend/src/main/java/com/airesumebuilder/feature/user/controller/UserController.java
backend/src/main/java/com/airesumebuilder/feature/user/repository/UserProfileRepository.java
backend/src/main/java/com/airesumebuilder/feature/user/service/UserProfileService.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiBudgetManager.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiCostCalculator.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiGateway.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiOutputValidator.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiProvider.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiProviderFactory.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiProviderHealth.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiProviderRequest.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiProviderResponse.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiRateLimitManager.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiResponseCache.java
backend/src/main/java/com/airesumebuilder/integration/ai/AiUsageLogger.java
backend/src/main/java/com/airesumebuilder/integration/ai/GeminiProviderAdapter.java
backend/src/main/java/com/airesumebuilder/integration/ai/OpenAiProviderAdapter.java
backend/src/main/java/com/airesumebuilder/integration/ai/PromptManager.java
backend/src/main/java/com/airesumebuilder/integration/ai/RedisAiRateLimitManager.java
backend/src/main/java/com/airesumebuilder/security/AccountRecoveryService.java
backend/src/main/java/com/airesumebuilder/security/AuthRateLimitFilter.java
backend/src/main/java/com/airesumebuilder/security/CurrentUser.java
backend/src/main/java/com/airesumebuilder/security/JwtAuthenticationFilter.java
backend/src/main/java/com/airesumebuilder/security/JwtService.java
backend/src/main/java/com/airesumebuilder/security/RefreshTokenService.java
backend/src/main/java/com/airesumebuilder/security/RestAccessDeniedHandler.java
backend/src/main/java/com/airesumebuilder/security/RestAuthenticationEntryPoint.java
backend/src/main/java/com/airesumebuilder/security/SecurityEmailService.java
backend/src/main/resources/application.properties
backend/src/main/resources/application-dev.properties
backend/src/main/resources/application-prod.properties
backend/src/main/resources/db/migration/V1__core_identity_and_resume_schema.sql
backend/src/main/resources/db/migration/V10__user_onboarding_preferences.sql
backend/src/main/resources/db/migration/V11__phone_verification.sql
backend/src/main/resources/db/migration/V12__profile_photos.sql
backend/src/main/resources/db/migration/V13__notification_preferences.sql
backend/src/main/resources/db/migration/V14__resume_template_engine_catalog.sql
backend/src/main/resources/db/migration/V15__remove_legacy_classic_template.sql
backend/src/main/resources/db/migration/V16__add_resume_candidate_name.sql
backend/src/main/resources/db/migration/V2__database_architecture_extensions.sql
backend/src/main/resources/db/migration/V3__authentication_security_tokens.sql
backend/src/main/resources/db/migration/V4__ai_prompt_management.sql
backend/src/main/resources/db/migration/V5__ai_background_jobs.sql
backend/src/main/resources/db/migration/V6__ai_prompt_lifecycle.sql
backend/src/main/resources/db/migration/V7__user_ai_provider_credentials.sql
backend/src/main/resources/db/migration/V8__pdf_export_history.sql
backend/src/main/resources/db/migration/V9__resume_content_and_presentation.sql
backend/src/main/resources/META-INF/spring.factories
backend/src/test/java/com/airesumebuilder/config/DevDataSeederTest.java
backend/src/test/java/com/airesumebuilder/config/EnvironmentConfigurationValidatorTest.java
backend/src/test/java/com/airesumebuilder/database/AdminWorkflowIT.java
backend/src/test/java/com/airesumebuilder/database/FlywayMigrationIT.java
backend/src/test/java/com/airesumebuilder/feature/admin/controller/AdminControllerTest.java
backend/src/test/java/com/airesumebuilder/feature/admin/controller/AdminSecurityTest.java
backend/src/test/java/com/airesumebuilder/feature/admin/service/AdminServiceTest.java
backend/src/test/java/com/airesumebuilder/feature/analytics/controller/AnalyticsControllerTest.java
backend/src/test/java/com/airesumebuilder/feature/analytics/service/AnalyticsServiceTest.java
backend/src/test/java/com/airesumebuilder/feature/ats/service/AtsScoringEngineTest.java
backend/src/test/java/com/airesumebuilder/feature/audit/controller/AuditControllerTest.java
backend/src/test/java/com/airesumebuilder/feature/audit/listener/ResumeAuditListenerTest.java
backend/src/test/java/com/airesumebuilder/feature/audit/service/AuditServiceTest.java
backend/src/test/java/com/airesumebuilder/feature/auth/phone/AndroidGatewayOtpDeliveryProviderTest.java
backend/src/test/java/com/airesumebuilder/feature/auth/phone/PhoneVerificationServiceTest.java
backend/src/test/java/com/airesumebuilder/feature/auth/phone/TextBeeOtpDeliveryProviderTest.java
backend/src/test/java/com/airesumebuilder/feature/auth/service/impl/AuthServiceImplTest.java
backend/src/test/java/com/airesumebuilder/feature/pdf/service/PdfRendererTest.java
backend/src/test/java/com/airesumebuilder/feature/resume/service/impl/ResumeServiceImplTest.java
backend/src/test/java/com/airesumebuilder/feature/resume/version/controller/ResumeVersionControllerTest.java
backend/src/test/java/com/airesumebuilder/feature/resume/version/service/ResumeVersionServiceTest.java
backend/src/test/java/com/airesumebuilder/feature/subscription/controller/SubscriptionControllerTest.java
backend/src/test/java/com/airesumebuilder/feature/subscription/service/SubscriptionServiceTest.java
backend/src/test/java/com/airesumebuilder/integration/ai/AiCoreBehaviorTest.java
backend/src/test/java/com/airesumebuilder/integration/CrossModuleWorkflowTest.java
backend/src/test/java/com/airesumebuilder/security/AccountRecoveryServiceTest.java
backend/src/test/java/com/airesumebuilder/security/JwtServiceTest.java
backend/src/test/java/com/airesumebuilder/security/SecurityEmailServiceTest.java
CONTRIBUTING.md
database/migrations/README.md
database/README.md
docker/.env.example
docker/docker-compose.dev.yml
docker/docker-compose.yml
docker/frontend.Dockerfile
docker/nginx.conf
docker/README.md
docs/01_Project_Foundation_Setup.md
docs/01-07_Implementation_Gap_Audit.md
docs/02_Backend_Architecture.md
docs/03_Database_Architecture.md
docs/04_Frontend_Architecture.md
docs/05_REST_API_Architecture.md
docs/06_Authentication_Security.md
docs/07_AI_Architecture.md
docs/08_Resume_Domain_Architecture.md
docs/09_UX-Design-System.md
docs/09_UX-Design-System_Implementation_Gap_Audit.md
docs/10_Resume_Builder_Module.md
docs/11_Motion_Experience_Architecture.md
docs/12_Global_Loading_Experience_Architecture.md
docs/13_Global_UI_Theme_Consistency.md
docs/AI_Provider_Choice_BYOK.md
docs/API.md
docs/Architecture.md
docs/CodingStandards.md
docs/Contributing.md
docs/Critical_Frontend_Audit.md
docs/Database.md
docs/Deployment.md
docs/DevelopmentGuide.md
docs/Frontend_Architecture_Implementation_Audit.md
docs/PHONE_OTP_SETUP.md
docs/PROJECT_DOCUMENTATION.md
docs/README.md
docs/Roadmap.md
docs/SecurityNotes.md
frontend/.env
frontend/.env.example
frontend/.prettierrc.json
frontend/e2e/authenticated-workflows.spec.js
frontend/e2e/public-navigation.spec.js
frontend/e2e/support/mockApi.js
frontend/eslint.config.js
frontend/index.html
frontend/package.json
frontend/package-lock.json
frontend/playwright.config.js
frontend/public/favicon.svg
frontend/public/logo.svg
frontend/README.md
frontend/scripts/check-style-tokens.mjs
frontend/src/animations/motion.js
frontend/src/animations/scrollManager.js
frontend/src/api/axiosInstance.js
frontend/src/api/errorHandler.js
frontend/src/api/errorHandler.test.js
frontend/src/api/interceptors/requestInterceptor.js
frontend/src/api/interceptors/responseInterceptor.js
frontend/src/api/queryClient.js
frontend/src/api/tokenRefresh.js
frontend/src/App.jsx
frontend/src/components/Accessibility.test.jsx
frontend/src/components/AppIcon.jsx
frontend/src/components/AsyncState.jsx
frontend/src/components/AsyncState.test.jsx
frontend/src/components/Button.jsx
frontend/src/components/Button.test.jsx
frontend/src/components/Card.jsx
frontend/src/components/Checkbox.jsx
frontend/src/components/CommandPalette.jsx
frontend/src/components/ConfirmationDialog.jsx
frontend/src/components/Dropdown.jsx
frontend/src/components/ErrorBoundary.jsx
frontend/src/components/FormField.jsx
frontend/src/components/Input.jsx
frontend/src/components/KeyboardFocus.test.jsx
frontend/src/components/landing/LandingPrimitives.jsx
frontend/src/components/landing/PremiumTiltCard.jsx
frontend/src/components/landing/TiltedCard.jsx
frontend/src/components/Modal.jsx
frontend/src/components/Modal.test.jsx
frontend/src/components/ModulePage.jsx
frontend/src/components/MotionProvider.jsx
frontend/src/components/MultiStepFormWizard.jsx
frontend/src/components/NotificationProvider.jsx
frontend/src/components/NotificationProvider.test.jsx
frontend/src/components/RadioGroup.jsx
frontend/src/components/RouteErrorBoundary.jsx
frontend/src/components/RouteErrorBoundary.test.jsx
frontend/src/components/RouteFocusManager.jsx
frontend/src/components/Select.jsx
frontend/src/components/Skeleton.jsx
frontend/src/components/Table.jsx
frontend/src/components/Table.test.jsx
frontend/src/components/Textarea.jsx
frontend/src/components/UnsavedChangesDialog.jsx
frontend/src/config/env.js
frontend/src/constants/resume.js
frontend/src/context/AuthContext.jsx
frontend/src/features/admin/api/adminApi.js
frontend/src/features/admin/components/AdminManagementPanel.jsx
frontend/src/features/admin/components/PromptAdminPanel.jsx
frontend/src/features/admin/index.js
frontend/src/features/admin/routes.jsx
frontend/src/features/ai/api/aiApi.js
frontend/src/features/ai/api/promptAdminApi.js
frontend/src/features/aiAssistant/api/aiAssistantApi.js
frontend/src/features/aiAssistant/components/AiAssistantPanel.jsx
frontend/src/features/aiAssistant/index.js
frontend/src/features/aiAssistant/routes.jsx
frontend/src/features/ats/api/atsApi.js
frontend/src/features/ats/components/AtsWorkspace.jsx
frontend/src/features/ats/index.js
frontend/src/features/ats/routes.jsx
frontend/src/features/auth/api/authApi.js
frontend/src/features/auth/api/passwordBreachApi.js
frontend/src/features/auth/components/AuthForm.jsx
frontend/src/features/auth/components/AuthInput.jsx
frontend/src/features/auth/components/ForgotPasswordForm.jsx
frontend/src/features/auth/components/PasswordCreationFields.jsx
frontend/src/features/auth/components/PasswordLoginField.jsx
frontend/src/features/auth/components/ResetPasswordForm.jsx
frontend/src/features/auth/components/VerifyEmailForm.jsx
frontend/src/features/auth/index.js
frontend/src/features/auth/routes.jsx
frontend/src/features/auth/utils/passwordSecurity.js
frontend/src/features/auth/utils/passwordSecurity.test.js
frontend/src/features/coverLetter/components/CoverLetterWorkspace.jsx
frontend/src/features/coverLetter/index.js
frontend/src/features/coverLetter/routes.jsx
frontend/src/features/dashboard/components/DashboardWorkspace.jsx
frontend/src/features/dashboard/hooks/useDashboardWorkspace.js
frontend/src/features/dashboard/routes.jsx
frontend/src/features/jobMatching/api/jobApi.js
frontend/src/features/jobMatching/components/JobMatchingWorkspace.jsx
frontend/src/features/jobMatching/index.js
frontend/src/features/jobMatching/routes.jsx
frontend/src/features/notifications/api/notificationApi.js
frontend/src/features/notifications/components/NotificationsPanel.jsx
frontend/src/features/notifications/components/NotificationsPanel.test.jsx
frontend/src/features/notifications/index.js
frontend/src/features/notifications/routes.jsx
frontend/src/features/profile/api/profileApi.js
frontend/src/features/profile/components/ProfilePanel.jsx
frontend/src/features/profile/components/ProfilePanel.test.jsx
frontend/src/features/profile/index.js
frontend/src/features/profile/routes.jsx
frontend/src/features/resume/api/resumeApi.js
frontend/src/features/resume/completion/completionConfig.js
frontend/src/features/resume/completion/qualityAnalyzer.js
frontend/src/features/resume/completion/ResumeCompletionEngine.js
frontend/src/features/resume/completion/ResumeCompletionEngine.test.js
frontend/src/features/resume/completion/rules/helpers.js
frontend/src/features/resume/completion/rules/links.js
frontend/src/features/resume/completion/rules/personal.js
frontend/src/features/resume/completion/rules/sections.js
frontend/src/features/resume/completion/rules/summary.js
frontend/src/features/resume/completion/useResumeCompletion.js
frontend/src/features/resume/components/ResumeCard.jsx
frontend/src/features/resume/components/ResumeCard.test.jsx
frontend/src/features/resume/components/ResumeCompletionCard.jsx
frontend/src/features/resume/components/ResumeDocumentPreview.jsx
frontend/src/features/resume/components/ResumeEditor.jsx
frontend/src/features/resume/components/ResumeVersionDetail.jsx
frontend/src/features/resume/components/ResumeVersionsPanel.jsx
frontend/src/features/resume/components/TypedSectionsEditor.jsx
frontend/src/features/resume/hooks/useResumeAutosave.js
frontend/src/features/resume/hooks/useResumes.js
frontend/src/features/resume/index.js
frontend/src/features/resume/routes.jsx
frontend/src/features/settings/api/aiSettingsApi.js
frontend/src/features/settings/components/AiProviderSettings.jsx
frontend/src/features/settings/components/SettingsForm.jsx
frontend/src/features/settings/index.js
frontend/src/features/settings/routes.jsx
frontend/src/features/templates/api/templateApi.js
frontend/src/features/templates/components/TemplateGallery.jsx
frontend/src/features/templates/index.js
frontend/src/features/templates/routes.jsx
frontend/src/features/templates/templateEngine.js
frontend/src/hooks/useDebounce.js
frontend/src/hooks/useDebounce.test.jsx
frontend/src/hooks/useModuleHealth.js
frontend/src/hooks/useModuleHealth.test.jsx
frontend/src/hooks/useUndoRedoState.js
frontend/src/hooks/useUndoRedoState.test.jsx
frontend/src/layouts/AuthLayout.jsx
frontend/src/layouts/DashboardLayout.jsx
frontend/src/main.jsx
frontend/src/pages/ForbiddenPage.jsx
frontend/src/pages/LandingPage.jsx
frontend/src/pages/LoginPage.jsx
frontend/src/pages/NotFoundPage.jsx
frontend/src/pages/OnboardingPage.jsx
frontend/src/pages/RecentlyDeletedPage.jsx
frontend/src/pages/RegisterPage.jsx
frontend/src/pages/ResumeAtsPage.jsx
frontend/src/pages/ResumeEditorPage.jsx
frontend/src/pages/ResumePreviewPage.jsx
frontend/src/pages/ResumesPage.jsx
frontend/src/pages/ResumeVersionDetailPage.jsx
frontend/src/pages/ResumeVersionsPage.jsx
frontend/src/pages/TemplatesPage.jsx
frontend/src/routes/AdminRoute.jsx
frontend/src/routes/GuestRoute.jsx
frontend/src/routes/index.jsx
frontend/src/routes/OnboardingGate.jsx
frontend/src/routes/ProtectedRoute.jsx
frontend/src/routes/RouteGuards.test.jsx
frontend/src/services/authSession.js
frontend/src/services/authSession.test.js
frontend/src/styles/dub-dashboard.css
frontend/src/styles/globals.css
frontend/src/styles/landing.css
frontend/src/styles/marketing-auth.css
frontend/src/styles/notifications.css
frontend/src/styles/premium.css
frontend/src/styles/primitives.css
frontend/src/styles/sidebar-theme.css
frontend/src/styles/theme.css
frontend/src/styles/workflows.css
frontend/src/styles/workspace.css
frontend/src/test/setup.js
frontend/src/types/contracts.js
frontend/src/validators/authValidator.js
frontend/src/validators/authValidator.test.js
frontend/src/validators/resumeValidator.js
frontend/src/validators/resumeValidator.test.js
frontend/tailwind.config.js
frontend/vite.config.js
scripts/check-commit-messages.sh
scripts/seed-dev.ps1
scripts/seed-dev.sh
scripts/setup.ps1
scripts/setup.sh
```

## Folder reasoning

rontend/src/features groups code by business capability. ackend/.../feature does the same. Shared code moves to components, common, config, or security only when multiple features truly need it. esources/db/migration executes at backend startup through Flyway. public is copied as static frontend content. e2e and src/test execute only in tests. docker executes during image/deployment operations. .github/workflows executes on GitHub-hosted runners.

Common mistake: treating folder names as decoration. A controller should not contain SQL; a component should not create ad-hoc Axios clients; an entity should not become the public API contract. Folder boundaries communicate those rules.

## Historical foundation explanation

# AI Resume Builder — Official Project Setup Guide

**Purpose:** This document is the pre-development foundation for the AI Resume Builder project. No application code, SQL, APIs, or components exist yet. This is what a Tech Lead prepares *before* the team writes a single feature.

---

## PART 1 — How a Professional Team Starts a New Project

### 1.1 Requirement Analysis
Before any repo exists, the team answers:
- **Who is the user?** (job seekers building resumes with AI assistance)
- **What are the core features?** (auth, resume CRUD, AI content generation, templates, export)
- **What are the non-functional requirements?** (response time for AI calls, data privacy for personal info, scalability, multi-provider AI support)
- **What's out of scope for v1?** (payments, admin dashboard, multi-language — these go into "Future Expansion")

Without this, developers build features nobody asked for, or miss critical ones (e.g., PDF export, which is core to a resume builder but easy to forget while focused on AI).

### 1.2 Architecture Planning
Decide the shape of the system before writing code:
- **Client-server split:** React SPA (Vercel) talking to a Spring Boot REST API (Render/AWS) over HTTPS with JWT bearer auth.
- **AI abstraction layer:** a provider-agnostic interface so OpenAI and Gemini are interchangeable — this is an architectural decision, not a coding afterthought, because retrofitting it later means touching every AI call site.
- **Data ownership:** MySQL owns structured data (users, resumes, sections); AI providers own nothing persistent.
- **Statelessness:** backend must be stateless (JWT, not server sessions) so it can scale horizontally later.

### 1.3 Repository Planning
Decide: monorepo vs. polyrepo. This project uses a **monorepo** (frontend + backend + docs + docker in one repo) because:
- A junior/small team benefits from one PR touching both frontend and backend for a single feature.
- Docker Compose can reference sibling folders easily.
- Documentation stays co-located with the code it describes.

The tradeoff (harder to scale CI independently per service) is acceptable at this project's size.

### 1.4 Branch Strategy
Decided upfront so nobody invents their own convention mid-project (see Part 5).

### 1.5 Environment Planning
Decide *how many* environments exist (local, dev, prod) and how secrets flow between them, before anyone hardcodes a database password into a properties file.

### 1.6 Documentation Planning
Decide which documents will exist and what goes in each, so knowledge doesn't live only in Slack messages or a lead developer's head.

### 1.7 Development Workflow
Decide how a feature moves from idea → branch → PR → review → merge → deploy, so the first feature isn't also the first time the team argues about process.

### Why This Happens Before Coding
- **Rework is expensive after code exists.** Restructuring folders after 20 files exist means broken imports everywhere. Restructuring an empty repo costs nothing.
- **Consistency requires a standard to exist first.** If naming conventions are decided after 3 developers have already written code 3 different ways, you get permanent inconsistency.
- **Onboarding.** A new developer joining week 3 should be productive in an hour by reading `docs/`, not by asking the original author "how does this work?"

**Beginner mistake:** Jumping straight into `npx create-react-app` and `spring init` without this planning. The result is usually a working demo that becomes unmaintainable by month 2 — no consistent DTO pattern, no environment separation, secrets committed to Git.

---

## PART 2 — Repository Structure

```
AI-Resume-Builder/
├── frontend/               # React 19 + Vite + Tailwind SPA
├── backend/                 # Spring Boot REST API
├── database/                 # Schema definitions, migrations, seed data references
├── docker/                   # Dockerfiles + docker-compose configs
├── docs/                      # All project documentation (Markdown)
├── scripts/                    # Automation scripts (setup, build, deploy helpers)
├── .github/                     # CI/CD workflows, PR/issue templates
├── .vscode/                      # Shared editor settings for the whole team
├── .gitignore
├── README.md
└── LICENSE
```

### Folder Purposes

| Folder | Purpose |
|---|---|
| `frontend/` | Isolates all client code. Has its own `package.json`, so it can be deployed to Vercel independently of the backend. |
| `backend/` | Isolates all server code. Has its own `pom.xml`, deployable independently to Render/AWS. |
| `database/` | Holds schema/migration files (e.g., Flyway/Liquibase scripts later) separate from backend code, so DB versioning is explicit and reviewable on its own. |
| `docker/` | Keeps containerization config out of application folders — Dockerfiles reference `frontend/` and `backend/` but aren't buried inside them. |
| `docs/` | Single source of truth for architecture, API contracts, and onboarding — prevents "tribal knowledge." |
| `scripts/` | Repeatable automation (e.g., a script to spin up local dev in one command) so setup isn't manual and error-prone. |
| `.github/` | CI pipelines (lint, test, build) and templates so every PR/issue follows the same format. |
| `.vscode/` | Shared workspace settings, extensions.json, launch configs — so every developer's editor behaves the same way without manual setup. |

**Beginner mistake:** Putting `.env` files, Dockerfiles, and docs scattered inside `frontend/src` or `backend/src` — this makes the repo root chaotic. Top-level separation keeps concerns isolated.

---

## PART 3 — Initial File Structure per Folder

### `frontend/`
```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── routes/
│   ├── services/           # Axios API client wrappers (empty placeholder files)
│   ├── context/             # Auth/global state providers (placeholder)
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```
- `.env.example`: documents required env vars without committing real secrets.
- `services/`: pre-planned folder for API calls so no one puts `axios.get()` directly inside components later.
- `README.md` (local to frontend): "how to run just the frontend" instructions.

### `backend/`
```
backend/
├── src/
│   └── main/
│       ├── java/com/airesumebuilder/
│       │   ├── config/         # Security, CORS, AI provider config beans
│       │   ├── controller/
│       │   ├── service/
│       │   ├── repository/
│       │   ├── dto/
│       │   ├── entity/
│       │   ├── exception/       # Global exception handling
│       │   └── AiResumeBuilderApplication.java
│       └── resources/
│           ├── application.properties
│           ├── application-dev.properties
│           └── application-prod.properties
├── src/test/java/...
├── .env.example
├── pom.xml
└── README.md
```
- Package-by-layer (`controller/service/repository`) is chosen over package-by-feature for this project size — simpler for a junior dev to navigate; can be refactored to package-by-feature later without breaking public contracts.
- `exception/` exists from day one so error handling has one home, not scattered try/catch blocks per controller.

### `database/`
```
database/
├── migrations/         # Empty, ready for Flyway/Liquibase scripts (V1__init.sql etc.)
├── seed/                 # Reference seed data descriptions (not real data yet)
└── README.md              # Explains migration naming convention
```

### `docker/`
```
docker/
├── frontend.Dockerfile
├── backend.Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md
```
- Separate `.dev.yml` allows local hot-reload configs to diverge from production build configs without duplicating the whole compose file.

### `docs/`
See Part 4 — full list of documents.

---

## PART 4 — Documentation Strategy

| Document | Contents |
|---|---|
| `Architecture.md` | System diagram, client-server flow, AI provider abstraction pattern, data flow for a "generate resume section" request, deployment topology. |
| `Roadmap.md` | Phased feature plan: v1 (auth + resume CRUD + one AI provider), v2 (templates, export), v3 (subscriptions, multi-language) — ties directly to Part 10. |
| `API.md` | Endpoint list (path, method, purpose, auth required) once endpoints are designed — kept as a living contract between frontend/backend. |
| `Database.md` | Entity list, relationships, and the reasoning behind schema decisions (not the SQL itself). |
| `DevelopmentGuide.md` | Step-by-step: clone repo → install deps → set up `.env` → run locally → run tests. |
| `Contributing.md` | Branch naming, PR process, commit message format, code review expectations. |
| `CodingStandards.md` | Naming conventions, DTO/Entity/Controller/Service rules (detailed in Part 9). |
| `Deployment.md` | How to deploy frontend to Vercel, backend to Render/AWS, environment variable setup per platform. |
| `SecurityNotes.md` | JWT handling, secret storage rules, what must never be committed. |

**Why separate documents instead of one giant README:** A README should get someone running the project in 5 minutes. Deep architectural reasoning belongs elsewhere so it doesn't bury the quick-start steps.

---

## PART 5 — Git Setup

- **Initialization:** `git init` at the repo root (monorepo — one Git history for the whole project).
- **Repository naming:** `ai-resume-builder` (lowercase, hyphenated — matches common GitHub convention and avoids case-sensitivity issues across OSes).
- **Default branch:** `main` — always deployable, protected (no direct pushes).

### Branch types
| Branch | Purpose | Example |
|---|---|---|
| `main` | Production-ready code only | — |
| `develop` | Integration branch where features merge before release | — |
| `feature/*` | New functionality | `feature/jwt-auth`, `feature/ai-provider-switch` |
| `release/*` | Stabilizing a version before merging to `main` | `release/v1.0.0` |
| `hotfix/*` | Urgent production fixes branched directly from `main` | `hotfix/fix-jwt-expiry` |

### Recommended workflow: **Git Flow (simplified)**
1. Feature branches cut from `develop`.
2. PR into `develop`, reviewed, merged.
3. When enough features accumulate, cut `release/x.y.z` from `develop` for final QA.
4. Merge `release/*` into both `main` and `develop`.
5. Hotfixes branch from `main`, merge back into both `main` and `develop`.

**Why not trunk-based (direct-to-main) for this project:** With a junior developer and AI-generated code in the mix, an integration branch (`develop`) gives a safety buffer before anything touches production.

**Beginner mistake:** Committing directly to `main`, or naming branches inconsistently (`fix1`, `newstuff`) — makes history unreadable and blocks automated changelog generation later.

---

## PART 6 — VS Code Setup

### Extensions
| Extension | Why |
|---|---|
| Extension Pack for Java | Debugging, IntelliSense, project management for Java 21. |
| Spring Boot Extension Pack | Bean navigation, application.properties autocomplete, Spring Boot dashboard. |
| ES7+ React/Redux/React-Native snippets | Faster component scaffolding, consistent with React patterns. |
| Tailwind CSS IntelliSense | Autocomplete + hover previews for utility classes — critical since Tailwind class names aren't memorable. |
| Docker | Manage images/containers, syntax highlighting for Dockerfiles/compose. |
| GitLens | Inline blame, history, easier code review context. |
| SQLTools (+ MySQL driver) | Query MySQL directly from the editor without switching to a separate DB client. |
| Markdown All in One | TOC generation, live preview, formatting shortcuts — since `docs/` is central to this project. |
| DotENV | Syntax highlighting for `.env` files so secrets/formatting mistakes are visible. |
| EditorConfig for VS Code | Enforces consistent indentation/line endings across the whole team regardless of individual editor defaults. |

### Workspace settings (`.vscode/settings.json`) — recommendations
- `"editor.formatOnSave": true`
- `"editor.defaultFormatter"` set per-language (Prettier for JS/JSX, Java formatter for backend)
- `"files.eol": "\n"` (avoid CRLF/LF conflicts between Windows devs and Linux CI)
- `"java.configuration.updateBuildConfiguration": "automatic"`

### Folder colorization
Use the **Peacock** extension conceptually (or workspace color customizations) to color-code the window when multiple VS Code windows are open (e.g., frontend window = blue, backend window = green) — prevents accidentally editing the wrong project when both are open side by side.

### Theme & Font
- Theme: a high-contrast, low-fatigue theme (e.g., One Dark Pro or GitHub Dark) — practical choice for long sessions, not a strict requirement.
- Font: a ligature-supporting monospace font (e.g., Fira Code or JetBrains Mono) — improves readability of `=>`, `!=`, `<=` in both Java and JS.

### Terminal settings
- Default to a single integrated terminal profile (PowerShell or Git Bash — pick one for consistency on Windows 11, since mixed terminal usage causes path-format bugs, e.g. `C:\` vs `/c/`).
- Split terminals: one for `frontend` (`npm run dev`), one for `backend` (`mvn spring-boot:run`).

### Debugging settings
- `.vscode/launch.json` with two configs: one Java (Spring Boot) debug attach/launch config, one for the frontend (Chrome debugger attached to the Vite dev server).
- Debug ports documented in `DevelopmentGuide.md` so they don't silently conflict with other local services.

**Beginner mistake:** Everyone using personal, unshared VS Code settings — leads to "works on my machine" formatting fights in every PR. Committing `.vscode/settings.json` and `extensions.json` fixes this.

---

## PART 7 — Environment Configuration

### Files and their roles
| File | Purpose |
|---|---|
| `backend/.env.example` | Documents variable *names* only (e.g., `DB_URL=`, `JWT_SECRET=`, `OPENAI_API_KEY=`) — never real values. |
| `application.properties` | Common, non-secret Spring config shared across environments (e.g., logging pattern). |
| `application-dev.properties` | Local development overrides (local MySQL URL, verbose logging) — activated via `spring.profiles.active=dev`. |
| `application-prod.properties` | Production overrides (connection pool sizing, minimal logging) — activated via `spring.profiles.active=prod`. |
| `frontend/.env.example` | Documents frontend variable names (e.g., `VITE_API_BASE_URL=`) — Vite requires the `VITE_` prefix to expose vars to client code. |

### Secret storage rules
- **Never** commit real `.env` files — only `.env.example` is tracked in Git; `.gitignore` excludes actual `.env`.
- Local secrets live only on each developer's machine.
- Production secrets live in the hosting platform's secret manager (Render environment variables, Vercel environment variables, or AWS Secrets Manager) — never in files at all in production.
- `JWT_SECRET` and AI provider API keys are the highest-sensitivity values — treated as "never logged, never printed, never included in error messages."

### Organization principle
One `.env.example` per module (frontend, backend), each listing only the variables that module needs — a frontend developer should never need to know backend secret names, and vice versa.

**Beginner mistake:** Committing a real `.env` "just once to test something" — it stays in Git history forever even after deletion, requiring a full history rewrite to remove. `.gitignore` must exclude `.env` from commit #1.

---

## PART 8 — Dependency Planning

### Frontend
| Dependency | Why |
|---|---|
| react, react-dom (v19) | Core UI library. |
| vite | Fast dev server + build tool, replaces CRA. |
| tailwindcss, postcss, autoprefixer | Utility-first styling, fast iteration without hand-written CSS files. |
| react-router-dom | Client-side routing (login, dashboard, resume editor pages). |
| axios | HTTP client with interceptors — needed for attaching JWT to every request centrally. |
| eslint, prettier | Code quality and consistent formatting across the team. |

### Backend
| Dependency | Why |
|---|---|
| spring-boot-starter-web | REST controller support. |
| spring-boot-starter-security | Authentication/authorization framework, JWT integration point. |
| spring-boot-starter-data-jpa | ORM via Hibernate, repository abstraction. |
| mysql-connector-j | MySQL JDBC driver. |
| io.jsonwebtoken (jjwt) | JWT creation/validation. |
| lombok | Reduces entity/DTO boilerplate (getters/setters/constructors). |
| spring-boot-starter-validation | Bean validation annotations (`@NotBlank`, `@Email`) on DTOs. |

### Testing
| Dependency | Why |
|---|---|
| junit 5 | Backend unit/integration testing standard. |
| mockito | Mocking dependencies (e.g., AI provider clients) in service-layer tests. |
| spring-boot-starter-test | Bundles JUnit, Mockito, Spring Test context support. |
| vitest / jest | Frontend unit tests for components and utils. |
| react-testing-library | Component-level testing focused on user behavior, not implementation details. |

### Docker
| Dependency | Why |
|---|---|
| eclipse-temurin (JDK 21 base image) | Backend container base. |
| node (LTS base image) | Frontend build container base. |
| nginx (or serve) | Serving the built frontend static assets in production containers. |

### Development
| Dependency | Why |
|---|---|
| husky + lint-staged (frontend) | Pre-commit hooks to block badly formatted/linted code from being committed. |
| spotless or checkstyle (backend) | Enforces consistent Java formatting automatically. |

---

## PART 9 — Development Rules

### Naming conventions
- Java: `PascalCase` classes, `camelCase` methods/variables, `UPPER_SNAKE_CASE` constants.
- React: `PascalCase` component files (`ResumeEditor.jsx`), `camelCase` functions/hooks.
- Branches: `feature/short-description`, `hotfix/short-description`.

### Folder conventions
- Backend stays package-by-layer as defined in Part 3, unless the team explicitly agrees to migrate to package-by-feature in `Architecture.md`.
- Frontend components grouped by domain under `pages/` (route-level) vs. `components/` (reusable, no route logic).

### DTO rules
- Every controller endpoint accepts/returns a DTO — **never** exposes JPA entities directly (prevents leaking internal fields, lazy-loading exceptions, and tightly coupling API shape to DB schema).
- One DTO per direction when they differ (`ResumeRequestDto`, `ResumeResponseDto`) rather than one bidirectional class.

### Entity rules
- Entities live only in `entity/`, never imported into controllers.
- Every entity has an explicit `id` strategy and auditing fields (`createdAt`, `updatedAt`) planned from day one, even if not implemented in v1.

### Controller rules
- Thin controllers: only request mapping, validation trigger, and delegation to a service. No business logic.

### Service rules
- All business logic and AI-provider orchestration lives in the service layer, callable independently of any HTTP context (important for future async/queue-based processing).

### Repository rules
- Spring Data JPA interfaces only; no raw JDBC unless a documented performance reason exists.

### Validation rules
- Bean Validation annotations on request DTOs; controller-level `@Valid`. Business-rule validation (not expressible via annotations) lives in the service layer.

### Exception handling
- One global `@ControllerAdvice` exception handler; no per-controller try/catch for expected error cases. Custom exceptions live in `exception/`.

### Logging
- SLF4J via Lombok's `@Slf4j`; no `System.out.println` in committed code. Never log secrets, tokens, or full request bodies containing personal data.

### Comments
- Comments explain *why*, not *what* — code should be self-explanatory for the "what."

### Formatting
- Enforced automatically via Prettier (frontend) and Spotless/Checkstyle (backend), not manual review debate.

### Code reviews
- Minimum one approval before merge to `develop`. Reviewer checks: does it follow DTO/entity separation, is there a test, does it match naming conventions.

### Pull requests
- One feature per PR. PR description links to the roadmap item it addresses.

### Commit messages
- Conventional Commits style: `feat: add JWT refresh endpoint`, `fix: correct resume date validation`, `docs: update API.md`.

### Testing policy
- New service-layer logic requires at least one unit test before merge. Controllers get integration tests as the API stabilizes.

---

## PART 10 — Future Expansion (No Restructuring Required)

The structure above already anticipates these without any folder reshuffling:

- **Multiple AI providers:** the `config/` + a provider interface in `service/` means adding a new provider is a new implementation class, not a rewrite. `Roadmap.md` and `Architecture.md` document this pattern from day one.
- **Multiple resume templates:** frontend `components/templates/` subfolder (created when needed) and a backend `template` field on the Resume entity — no schema restructuring, just an added column/enum later.
- **Multiple languages:** frontend i18n library slots into `src/` without touching backend; backend responses stay language-agnostic (data, not display text).
- **Premium subscriptions & payment gateway:** new `entity/Subscription`, new `service/PaymentService`, new `controller/PaymentController` — additive, not disruptive, because layering is already enforced.
- **Payment gateway swap-ability:** same abstraction pattern as the AI provider layer — interface first, implementation second.
- **Admin dashboard:** a new frontend route group (`pages/admin/`) and backend endpoints under `/api/admin/**` secured by a role check in the existing Spring Security config — no new repo structure needed.
- **Analytics:** an additive service + scheduled job, doesn't touch existing modules.
- **Notifications:** a new `service/NotificationService` behind an interface (email today, push/SMS later) — same pattern as AI providers.
- **Resume version history:** an additive `ResumeVersion` entity referencing `Resume` — doesn't change existing entities' shape, just adds a table and endpoints.

**The unifying principle:** every anticipated feature is designed to be **additive** (new files/classes/tables) rather than requiring existing structure to be torn up — this is why the layered, interface-driven architecture was chosen in Part 1.2 over a quicker, more tightly-coupled approach.

---

## Summary Checklist Before Writing the First Feature

- [ ] Repo created with structure from Part 2
- [ ] All initial files from Part 3 in place (even if empty/placeholder)
- [ ] `docs/` populated with at least `Architecture.md` and `DevelopmentGuide.md`
- [ ] `main` and `develop` branches exist, `main` protected
- [ ] `.vscode/settings.json` and `extensions.json` committed
- [ ] `.env.example` files committed, real `.env` gitignored
- [ ] Dependency list agreed upon (Part 8) — not yet installed until the first real feature needs them
- [ ] `CodingStandards.md` and `Contributing.md` written and read by every contributor

Only after this checklist is complete does feature 1 (likely: user registration + JWT login) begin.


# 5 Project Startup

## Local startup, internally

1. 
pm install reads package.json and the exact package-lock.json, downloads packages into 
ode_modules, and runs permitted package lifecycle steps. It does not start React.
2. 
pm run dev invokes Vite. Vite reads ite.config.js, activates React and Tailwind plugins, listens on  .0.0.0:5173, transforms imported modules on demand, and proxies /api to port 8080.
3. mvn clean install resolves the parent POM, direct and transitive dependencies, deletes 	arget, compiles main and test code, runs tests, packages the executable JAR, runs JaCoCo verification, and installs the artifact in the developer's local Maven repository.
4. mvn spring-boot:run compiles and launches AiResumeBuilderApplication.main. SpringApplication.run builds the environment, validates required production settings, scans components, creates dependency-injected objects, configures Tomcat, security, datasource, Hibernate, Redis-optional infrastructure, mail, scheduling and async executors.
5. Flyway obtains a database connection and checks lyway_schema_history. It applies missing migrations in order. Hibernate validates/uses the resulting schema; it is not allowed to invent it.
6. Embedded Tomcat begins listening on 8080. The frontend and backend do not start each other; they are separate processes. The frontend proxy simply waits until a request needs the backend.
7. The browser requests Vite, receives HTML and modules, evaluates main.jsx, and React paints the selected route.

> **Warning:** mvnw/mvnw.cmd exist in the checkout although ackend/README.md says the wrapper is absent. Trust the files and verify wrapper support before relying on that stale sentence.


# 6 Request Lifecycle

## Real lifecycle: authenticated resume update

ResumeEditor changes local values. useResumeAutosave waits through a debounce so every keystroke does not create network traffic. esumeApi.updateResume calls the shared Axios instance. The request interceptor reads the in-memory access token and adds Authorization: Bearer ....

CorrelationIdFilter establishes a request identifier. AuthRateLimitFilter protects authentication endpoints. JwtAuthenticationFilter validates signature, issuer, audience, expiry, and subject, then places authenticated identity into Spring Security's context. SecurityConfig decides whether the route and role are allowed.

Spring MVC parses JSON into a request DTO and Jakarta Validation rejects malformed fields. ResumeController delegates; ResumeServiceImpl resolves the user, checks resume ownership and lifecycle rules, opens transactional work, persists through repositories, creates versions/events as applicable, maps the entity to a response, and wraps it in ApiResponse.

If access has expired, Axios receives 401. The response interceptor coordinates one refresh call. The browser sends the HttpOnly refresh cookie; the backend rotates it and returns a new access JWT. Waiting calls retry once.

## Full API design teaching reference

# AI Resume Builder — API Design Blueprint

**Document Type:** Official API Contract & Architecture Reference
**Audience:** Backend, Frontend, Mobile, QA, DevOps
**Stack:** Spring Boot (Java 21) · React 19 · MySQL · JWT
**Status:** Architecture Contract — No Implementation Included

---

## Table of Contents

1. API Philosophy
2. Versioning Strategy
3. Module Catalog
4. Resource & Endpoint Design (per module)
5. Request Standards
6. Response Standards
7. Authentication Model
8. File APIs
9. AI APIs
10. ATS APIs
11. Job Matching APIs
12. Pagination Standards
13. Security Standards
14. Documentation Strategy
15. API Evolution Plan
16. Common API Design Mistakes (30+)

---

## 1. API Philosophy

### Core REST Principles Applied to This System

| Principle | What It Means Here |
|---|---|
| **Resource-oriented** | Every noun in the domain (resume, education, skill, cover letter) is a resource with a URI. Actions are modeled as HTTP verbs on resources, not as RPC-style verbs in the URL. |
| **Stateless communication** | Every request carries all context needed to process it (JWT in header, no server-side session). This lets the API scale horizontally behind a load balancer. |
| **Uniform interface** | Same conventions for every module — same pagination shape, same error shape, same auth header — so a frontend/mobile developer only learns the pattern once. |
| **Idempotency where applicable** | `PUT`, `DELETE`, and `GET` are idempotent by contract. `POST` for creation is not idempotent unless an `Idempotency-Key` is supplied (important for AI generation and payment-like operations). |
| **Layered system** | Clients never need to know whether a request is served directly by Spring Boot, a cache, or a downstream AI provider — the contract stays the same. |
| **HATEOAS** | Not mandatory for v1 given the complexity/benefit tradeoff for a resume-builder SaaS, but pagination and resource-creation responses include self-links to leave the door open. |

### Why API-First Development

- The contract is designed **before** implementation, so backend, frontend, and mobile teams can work in parallel against a shared OpenAPI spec instead of blocking on each other.
- Contract stability lets QA build test suites from the spec itself, independent of backend code changes.
- Because AI features (generation, ATS scoring) are inherently variable in latency and output shape, locking the *contract* early (while allowing the *implementation* — model, prompt, provider — to evolve) protects consumers from churn.

### Recommended API Style

**REST over HTTPS with JSON**, versioned, resource-oriented. GraphQL was considered but rejected for v1:

| Factor | REST | GraphQL |
|---|---|---|
| Team familiarity (Spring Boot) | High | Lower |
| Caching (CDN/HTTP) | Native | Requires extra tooling |
| File upload (resumes, images, PDFs) | Native multipart | Awkward |
| Mobile bandwidth optimization | Good with field filtering param | Excellent |
| Public API for future third-party integrations | Simple to document/version | Harder to rate-limit per field |

**Verdict:** REST is the right default. GraphQL (or a BFF layer) can be revisited in Part 15 if the mobile team later needs heavy query flexibility.

---

## 2. Versioning Strategy

### Base URL Structure

```
https://api.airesumebuilder.com/api/v1/{module}/{resource}
```

- **Versioning is in the URI path**, not headers, not query params. It is the most visible, cache-friendly, and least error-prone approach for a multi-client (web + mobile) ecosystem.
- `v1` is explicit from day one — never ship an unversioned root.

### Why Version From Day One

- Once mobile apps ship, you **cannot force an instant client update**. An unversioned API means any breaking change breaks every installed mobile app immediately.
- Versioning from day one costs nothing structurally but avoids an expensive "v1 migration" scramble later.
- It also signals to consumers (frontend, mobile, future third parties) that the API has a **support contract**, not an implementation detail they're reaching into.

### URI Conventions

| Rule | Example |
|---|---|
| Plural nouns for collections | `/resumes`, `/skills` |
| Nested resources for ownership | `/resumes/{resumeId}/experiences` |
| No verbs in URLs (except sub-actions that aren't CRUD) | ❌ `/getResume` → ✅ `GET /resumes/{id}` |
| Sub-actions as sub-resources, not query params | `/resumes/{id}/generate-pdf`, `/ats/analyze` |
| Lowercase, hyphen-separated | `/cover-letters`, not `/coverLetters` |
| IDs are path params, never query params | `/resumes/{resumeId}` not `/resumes?id=` |

### Example Base URL Map

```
/api/v1/auth/*
/api/v1/users/*
/api/v1/profile/*
/api/v1/resumes/*
/api/v1/resumes/{resumeId}/education
/api/v1/resumes/{resumeId}/experiences
/api/v1/resumes/{resumeId}/projects
/api/v1/resumes/{resumeId}/skills
/api/v1/resumes/{resumeId}/certifications
/api/v1/resumes/{resumeId}/languages
/api/v1/templates/*
/api/v1/ai/*
/api/v1/cover-letters/*
/api/v1/ats/*
/api/v1/jobs/*
/api/v1/files/*
/api/v1/notifications/*
/api/v1/admin/*
/api/v1/analytics/*
/api/v1/audit/*
```

---

## 3. Module Catalog

| Module | Purpose | Ownership | Future Expansion |
|---|---|---|---|
| **Authentication** | Login, registration, token lifecycle | Identity domain | OAuth2/social login, MFA, SSO for enterprise |
| **Users** | Core account record (email, role, status) | Identity domain | Account deletion workflows, multi-tenancy |
| **Profile** | Personal info reused across resumes (name, contact, photo) | User domain | Multiple profiles per user (e.g., separate "brands") |
| **Resume** | Root aggregate for a resume document | Resume domain | Resume versioning/history, duplication |
| **Education** | Sub-resource of Resume | Resume domain | Institution auto-complete integration |
| **Experience** | Sub-resource of Resume | Resume domain | Achievement bullet AI-rewrite |
| **Projects** | Sub-resource of Resume | Resume domain | GitHub import integration |
| **Skills** | Sub-resource of Resume | Resume domain | Skill taxonomy + proficiency scoring |
| **Certifications** | Sub-resource of Resume | Resume domain | Verification badge integration |
| **Languages** | Sub-resource of Resume | Resume domain | Proficiency standardization (CEFR) |
| **Templates** | Resume layout/theme catalog | Presentation domain | Marketplace, custom template upload |
| **AI** | Resume generation/improvement engine | AI domain | Multi-provider routing, streaming |
| **Cover Letter** | Cover letter generation & storage | AI/Resume domain | Multi-version tailoring per job |
| **ATS** | Resume-vs-job-description scoring | AI domain | Industry-specific ATS engines |
| **Job Matching** | Job ingestion + match scoring | AI domain | Live job board integrations |
| **PDF** | Rendering resumes/cover letters to file | File domain | Multi-format export (DOCX, plain text) |
| **Notifications** | In-app/email alerts | Platform domain | Push notifications, digest emails |
| **Admin Dashboard** | Internal management/moderation | Platform domain | Role-based admin tiers |
| **Analytics** | Usage & funnel metrics | Platform domain | Per-user resume performance insights |
| **Audit** | Immutable action log | Platform domain | Compliance export (SOC2/GDPR requests) |

Each module is treated as a **bounded context**: it owns its resources, its validation rules, and its database tables. Cross-module reads happen through the API layer or an internal service layer — never direct cross-schema joins — so modules can be split into separate services later without a rewrite.

---

## 4. Endpoint Design (Conceptual, No Implementation)

> Format per module: **Resources → Operations → Methods → Status Codes → Auth → Validation → Business Rules**

### 4.1 Authentication Module

| Operation | Method & Path | Success | Errors |
|---|---|---|---|
| Register | `POST /auth/register` | `201 Created` | `400` validation, `409` email exists |
| Login | `POST /auth/login` | `200 OK` (access + refresh token) | `401` bad credentials, `423` locked account |
| Refresh token | `POST /auth/refresh` | `200 OK` | `401` invalid/expired refresh token |
| Logout | `POST /auth/logout` | `204 No Content` | `401` |
| Verify email | `POST /auth/verify-email` | `200 OK` | `400` invalid token |
| Forgot password | `POST /auth/forgot-password` | `202 Accepted` | `429` too many requests |
| Reset password | `POST /auth/reset-password` | `200 OK` | `400` invalid/expired token |

- **Auth requirement:** All endpoints public except `logout`.
- **Validation:** Email format, password complexity (min length, char classes), rate limiting on login attempts.
- **Business rule:** Refresh tokens are single-use and rotated on every refresh (rotation + reuse detection).

### 4.2 Users Module

| Operation | Method & Path | Notes |
|---|---|---|
| Get current user | `GET /users/me` | Auth required |
| Update account settings | `PATCH /users/me` | Partial update; email change triggers re-verification |
| Delete account | `DELETE /users/me` | Soft delete + grace period, cascades to resumes |
| Change password | `POST /users/me/change-password` | Requires current password |

### 4.3 Profile Module

| Operation | Method & Path | Notes |
|---|---|---|
| Get profile | `GET /profile` | 1:1 with user |
| Update profile | `PUT /profile` | Full replace semantics |
| Upload profile photo | `POST /profile/photo` | multipart, see File APIs |

### 4.4 Resume Module (Root Aggregate)

| Operation | Method & Path | Status | Notes |
|---|---|---|---|
| List resumes | `GET /resumes` | `200` | Paginated, owned by current user |
| Create resume | `POST /resumes` | `201` | Starts blank or from template |
| Get resume | `GET /resumes/{id}` | `200` / `404` | Full nested payload |
| Update resume metadata | `PATCH /resumes/{id}` | `200` | Title, template, visibility |
| Delete resume | `DELETE /resumes/{id}` | `204` | Soft delete, cascades sub-resources |
| Duplicate resume | `POST /resumes/{id}/duplicate` | `201` | Future feature |
| Export as PDF | `POST /resumes/{id}/export-pdf` | `202` | Async job, see PDF APIs |

**Authorization rule:** A resume can only be read/modified by its owner, or an admin. Every sub-resource (education, skills, etc.) inherits this rule via the parent `resumeId`.

### 4.5 Sub-resources of Resume (Education, Experience, Projects, Skills, Certifications, Languages)

All six follow an **identical CRUD contract** for consistency:

| Operation | Method & Path Pattern | Status |
|---|---|---|
| List | `GET /resumes/{resumeId}/{sub-resource}` | `200` |
| Add entry | `POST /resumes/{resumeId}/{sub-resource}` | `201` |
| Update entry | `PUT /resumes/{resumeId}/{sub-resource}/{entryId}` | `200` |
| Delete entry | `DELETE /resumes/{resumeId}/{sub-resource}/{entryId}` | `204` |
| Reorder entries | `PATCH /resumes/{resumeId}/{sub-resource}/reorder` | `200` |

**Validation:** Date ranges must be logically consistent (start ≤ end), required fields vary per sub-resource type (documented per-resource in the OpenAPI schema, not duplicated here).

### 4.6 Templates Module

| Operation | Method & Path |
|---|---|
| List templates | `GET /templates` |
| Get template detail | `GET /templates/{id}` |
| Apply template to resume | `PATCH /resumes/{resumeId}` (body: `templateId`) |

Public read access (no auth) for browsing; applying a template requires auth + ownership.

### 4.7 Notifications Module

| Operation | Method & Path |
|---|---|
| List notifications | `GET /notifications` |
| Mark as read | `PATCH /notifications/{id}/read` |
| Mark all as read | `PATCH /notifications/read-all` |
| Update preferences | `PUT /notifications/preferences` |

### 4.8 Admin Dashboard Module

| Operation | Method & Path | Auth |
|---|---|---|
| List users | `GET /admin/users` | `ROLE_ADMIN` |
| Suspend user | `PATCH /admin/users/{id}/suspend` | `ROLE_ADMIN` |
| View system metrics | `GET /admin/metrics` | `ROLE_ADMIN` |
| Manage templates | `POST/PUT/DELETE /admin/templates` | `ROLE_ADMIN` |

### 4.9 Analytics & Audit Modules

| Operation | Method & Path | Notes |
|---|---|---|
| Get personal usage stats | `GET /analytics/me` | User-facing (resumes created, AI generations used) |
| Admin analytics | `GET /admin/analytics` | Aggregate platform metrics |
| Audit trail (admin) | `GET /audit/logs` | Immutable, filterable by user/action/date |

---

## 5. Request Standards

### Standard Headers

| Header | Purpose | Required |
|---|---|---|
| `Authorization: Bearer <JWT>` | Authentication | On all protected endpoints |
| `Content-Type: application/json` | Body format (or `multipart/form-data` for uploads) | On all bodies |
| `Accept-Language` | Localization (e.g., resume content language, error messages) | Optional, defaults to `en` |
| `X-Correlation-Id` | Client-generated trace ID, echoed back in response and logs for cross-system debugging | Recommended on every request |
| `Idempotency-Key` | Client-generated UUID for safe retry of non-idempotent `POST` (e.g., AI generation, payment) | Required on AI generation & PDF export endpoints |

### Pagination Parameters (query string)

```
GET /resumes?page=0&size=20&sort=updatedAt,desc
```

| Param | Meaning | Default |
|---|---|---|
| `page` | Zero-indexed page number | `0` |
| `size` | Items per page | `20`, max `100` |
| `sort` | `field,direction` — repeatable for multi-field sort | `createdAt,desc` |

### Filtering & Searching

```
GET /jobs?location=Bengaluru&minSalary=800000&keyword=backend
GET /resumes?search=frontend+developer
```

- Filters are explicit query params, not a generic `filter=` DSL, for v1 (simpler for frontend/mobile to construct and for QA to test).
- A generic RSQL/filter-expression DSL is a documented future option (Part 15) once filter complexity grows (e.g., Job Matching).

### Validation Expectations

- All request bodies validated server-side regardless of frontend validation (never trust the client).
- Validation errors return `400` with a field-level error array (see Response Standards).
- Idempotency-Key reuse with a different payload returns `422 Unprocessable Entity`.

---

## 6. Response Standards

### Universal Envelope

**Success (single resource):**
```json
{
  "success": true,
  "data": { "...resource fields..." },
  "meta": {
    "correlationId": "c7e1...",
    "timestamp": "2026-07-19T10:00:00Z"
  }
}
```

**Success (collection, paginated):**
```json
{
  "success": true,
  "data": [ { }, { } ],
  "pagination": {
    "page": 0,
    "size": 20,
    "totalElements": 143,
    "totalPages": 8
  },
  "meta": { "correlationId": "c7e1...", "timestamp": "..." }
}
```

**Error (all error types share one shape):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [
      { "field": "email", "issue": "must be a valid email address" }
    ]
  },
  "meta": { "correlationId": "c7e1...", "timestamp": "..." }
}
```

### Status Code Map

| Scenario | Code | `error.code` |
|---|---|---|
| Validation failure | `400` | `VALIDATION_ERROR` |
| Missing/invalid token | `401` | `UNAUTHENTICATED` |
| Valid token, insufficient permission | `403` | `FORBIDDEN` |
| Resource doesn't exist | `404` | `NOT_FOUND` |
| Conflict (duplicate email, stale update) | `409` | `CONFLICT` |
| Business rule violation | `422` | `BUSINESS_RULE_VIOLATION` |
| Rate limit exceeded | `429` | `RATE_LIMITED` |
| Unexpected server error | `500` | `INTERNAL_ERROR` |
| Downstream AI provider failure | `502` | `UPSTREAM_ERROR` |

### Why Consistency Matters

- Frontend can write **one** global error interceptor instead of per-endpoint parsing logic.
- QA can assert on `error.code` (stable) rather than `error.message` (human text, may change/localize).
- Mobile clients with stricter release cycles won't break when message wording changes, since they key off `code`.

---

## 7. Authentication Flow

### Token Model

- **Access token:** JWT, short-lived (15 min), sent as `Authorization: Bearer`.
- **Refresh token:** Opaque or JWT, long-lived (7–30 days), stored httpOnly cookie (web) or secure storage (mobile), rotated on every use.

### Flow Summary

```
Register → Verify Email → Login → {accessToken, refreshToken}
      ↓
Access token expires (15 min) → Client calls /auth/refresh with refreshToken
      ↓
New accessToken + rotated refreshToken issued
      ↓
Refresh token expired/revoked → 401 → client forces re-login
```

| Case | Endpoint Behavior |
|---|---|
| Expired access token | `401 UNAUTHENTICATED`, client silently calls `/auth/refresh` |
| Expired/revoked refresh token | `401`, client redirects to login |
| Unauthorized request (no token) | `401` on all protected routes |
| Insufficient role | `403 FORBIDDEN` |
| Logout | Refresh token revoked server-side (blacklist/rotation table) |

### Public vs Protected Endpoints

| Public (no token) | Protected (token required) |
|---|---|
| `/auth/*` | `/resumes/*`, `/profile/*`, `/users/me` |
| `/templates` (browse only) | `/ai/*`, `/ats/*`, `/jobs/*` (matching) |
| Health check | `/admin/*` (token + `ROLE_ADMIN`) |

### Role-Based Access Control

| Role | Scope |
|---|---|
| `ROLE_USER` | Own resumes, profile, AI features within quota |
| `ROLE_PREMIUM` | Extended AI quota, premium templates |
| `ROLE_ADMIN` | Full platform management |

---

## 8. File APIs

All file operations go through a **storage abstraction** — the API contract never exposes whether files live on local disk, S3, or another provider. Clients only ever see a `fileId` and a signed/expiring URL.

| Resource | Operation | Method & Path |
|---|---|---|
| Profile image | Upload | `POST /profile/photo` (multipart) |
| Profile image | Delete | `DELETE /profile/photo` |
| Resume photo | Upload | `POST /resumes/{id}/photo` |
| Attachments (e.g. portfolio files) | Upload | `POST /resumes/{id}/attachments` |
| Attachments | List/Delete | `GET` / `DELETE /resumes/{id}/attachments/{fileId}` |
| Generated PDF | Request generation | `POST /resumes/{id}/export-pdf` → `202 Accepted` + job id |
| Generated PDF | Poll/download | `GET /files/{fileId}` → signed URL, `410 Gone` once expired |
| Temporary files | Auto-expiry | All temp/generated files carry a TTL; not part of permanent storage quota |

**Rules:**
- Max upload size enforced (e.g., 5 MB images, 10 MB attachments) — `413 Payload Too Large` on violation.
- Allowed MIME types are allow-listed, not deny-listed.
- PDF generation is **asynchronous**: `202` returns a job reference; client polls or receives a notification/webhook when ready.

---

## 9. AI APIs

AI operations are modeled as **jobs**, not instant request/response, because generation latency and provider variability make synchronous contracts fragile.

| Operation | Method & Path | Pattern |
|---|---|---|
| Generate resume content | `POST /ai/resumes/{resumeId}/generate` | Async job, `Idempotency-Key` required |
| Improve existing section | `POST /ai/resumes/{resumeId}/improve` | Async job |
| Keyword suggestions | `POST /ai/resumes/{resumeId}/keywords` | Sync (fast, low-cost) |
| Generate cover letter | `POST /ai/cover-letters/generate` | Async job |
| Get job status/result | `GET /ai/jobs/{jobId}` | Poll |
| Retry failed job | `POST /ai/jobs/{jobId}/retry` | Reuses original input |
| AI generation history | `GET /ai/history` | Paginated, per user |
| Provider selection (internal) | N/A — abstracted | Multiple providers (e.g., different LLM vendors) sit behind one contract; provider choice is a server-side concern, never exposed to the client |

**Job Status Values:** `PENDING → PROCESSING → COMPLETED | FAILED`

**Streaming (future, Part 15):** documented as `GET /ai/jobs/{jobId}/stream` using Server-Sent Events, once a provider and frontend UX are chosen — explicitly out of scope for v1 to avoid over-designing an unused feature.

**Business rules:**
- Quota enforcement per role (`ROLE_USER` vs `ROLE_PREMIUM`) checked before job creation → `403` with `error.code: QUOTA_EXCEEDED`.
- Failed jobs are retryable up to N times before requiring a new request.

---

## 10. ATS APIs

| Operation | Method & Path |
|---|---|
| Analyze resume vs job description | `POST /ats/analyze` (body: `resumeId`, `jobDescriptionText` or `jobId`) |
| Upload job description (text/file) | `POST /ats/job-descriptions` |
| Get ATS score/report | `GET /ats/reports/{reportId}` |
| Keyword gap analysis | Included in report payload (`missingKeywords`, `matchedKeywords`) |
| Recommendations | Included in report payload (`suggestions[]`) |
| Analysis history | `GET /ats/reports?resumeId=` |
| Compare two reports | `GET /ats/reports/compare?a={id}&b={id}` |

**Pattern:** Analysis is async like AI generation (`202` + job/report id) since scoring involves an LLM or NLP pipeline call.

---

## 11. Job Matching APIs

| Operation | Method & Path |
|---|---|
| Upload/create job posting (admin/scraper) | `POST /jobs` |
| Search jobs | `GET /jobs?keyword=&location=&minSalary=` |
| Get job detail | `GET /jobs/{id}` |
| Match resume to job | `POST /jobs/{id}/match` (body: `resumeId`) → match score + rationale |
| Skill gap analysis | `GET /jobs/{id}/skill-gap?resumeId=` |
| Match/recommendation history | `GET /jobs/matches/history` |

**Future expansion:** live job-board integrations will populate `/jobs` via a background ingestion service — the public contract (`GET /jobs`) does not change, only the data source behind it.

---

## 12. Pagination Strategy

| Strategy | Pros | Cons | Use Here |
|---|---|---|---|
| **Offset (`page`/`size`)** | Simple, supports "jump to page N", easy frontend UI | Degrades on very large/frequently-changing datasets (skipped/duplicated rows) | ✅ Default for all user-scoped lists (resumes, notifications) — datasets are small per user |
| **Cursor-based (`nextCursor`)** | Stable under concurrent writes, efficient at scale | No "jump to page," slightly more complex client logic | ✅ Recommended for `/jobs` search and `/audit/logs` — large, high-write, admin-scale datasets |

**Recommendation:** Use **offset pagination as the default** across user-owned resources (small, per-user datasets where simplicity wins), and **cursor pagination for high-volume, system-wide collections** (jobs, audit logs) where correctness under concurrent writes matters more than "jump to page 5" UX.

Sorting and filtering (Part 5) apply identically under both strategies.

---

## 13. Security Standards

| Layer | Control |
|---|---|
| **AuthN** | JWT (RS256 signed), 15-min access token |
| **AuthZ** | Refresh token rotation + reuse detection, revocation list |
| **Rate limiting** | Per-IP and per-user token bucket; stricter limits on `/auth/*` and `/ai/*` |
| **CORS** | Explicit allow-list of frontend origins; no wildcard `*` in production |
| **Input validation** | Server-side schema validation on every request body, regardless of client-side checks |
| **Request size limits** | Enforced at gateway (e.g., 1 MB JSON body, 10 MB multipart) |
| **Sensitive data** | Passwords hashed (bcrypt/argon2), PII encrypted at rest, never logged |
| **Replay protection** | `Idempotency-Key` for mutating AI/PDF calls; short-lived JWTs limit replay window |
| **Audit logging** | Every write operation and admin action logged immutably with actor, timestamp, correlation ID |
| **Transport** | HTTPS-only (HSTS enforced), no plaintext endpoints |

---

## 14. Documentation Strategy

- **OpenAPI 3.1** is the single source of truth — this blueprint is the human-readable narrative version of what becomes a machine-readable `openapi.yaml`.
- **Swagger UI** hosted at `/api/v1/docs` for internal teams; a curated subset published to a **developer portal** if/when third-party integrations are supported.
- Every endpoint's OpenAPI definition includes: request/response examples, all documented error codes, and required scopes/roles.
- **Version history** maintained as a changelog per API version (`CHANGELOG.md`), separate from application release notes, so consumers can track contract changes independently of internal deploys.
- **Error documentation**: a dedicated reference page mapping every `error.code` to meaning, likely cause, and recommended client handling.

---

## 15. API Evolution Plan (5-Year View)

| Mechanism | How It's Used |
|---|---|
| **URI versioning** | `v2` introduced only for breaking changes; `v1` kept alive in parallel with a published sunset date (minimum 6–12 months notice). |
| **Additive-first changes** | New optional fields, new endpoints, new modules ship without a version bump — only removals/renames/semantic changes force `v2`. |
| **Deprecation headers** | `Deprecation: true` and `Sunset: <date>` HTTP headers added to responses of endpoints slated for removal, so clients can detect this programmatically ahead of the changelog. |
| **Feature flags** | New capabilities (e.g., streaming AI responses, GraphQL BFF, multi-profile support) roll out behind flags per user/role before becoming default, decoupling "deployed" from "enabled." |
| **Backward compatibility contract** | Within a major version, response fields are never removed or repurposed — only added. Enums are additive. Clients are expected to ignore unknown fields (documented explicitly). |
| **Module independence** | Because each module (Part 3) owns its own resources, entire modules (e.g., Job Matching) can be extracted into standalone services later without changing their public contract. |

---

## 16. Common API Design Mistakes (30+)

| # | Mistake | Why It Happens | Impact | Professional Solution |
|---|---|---|---|---|
| 1 | Verbs in URLs (`/getResume`) | RPC habits carried into REST | Inconsistent, unpredictable API | Use HTTP methods as verbs |
| 2 | No versioning from day one | "We'll add it later" thinking | Breaking changes hit all clients immediately | Version from the first commit |
| 3 | Inconsistent envelope shapes | Different devs build different endpoints independently | Frontend needs custom parsing per endpoint | Enforce one global response wrapper |
| 4 | Leaking stack traces in errors | Default framework error handler left on | Security risk, unprofessional | Global exception handler with sanitized output |
| 5 | Using `200` for everything (including errors) | Simplicity shortcut | Clients can't branch on status code | Use correct HTTP status per scenario |
| 6 | Overloading `PATCH` semantics inconsistently | Ambiguity between partial vs full update | Data loss on unintended field resets | Document field-level PATCH semantics explicitly |
| 7 | No pagination on collections | Works fine with 10 test records | Server/client crash at scale | Paginate every collection endpoint from day one |
| 8 | Exposing internal DB IDs sequentially | Auto-increment PKs used directly | Enumeration attacks, data leakage | Use UUIDs or opaque IDs |
| 9 | No rate limiting | Not needed until it's needed | Abuse, cost overrun (especially AI endpoints) | Rate limit from day one, tiered by role |
| 10 | Synchronous long-running operations | Simpler to build first | Timeouts, poor UX on AI/PDF generation | Async job pattern with polling/webhooks |
| 11 | Deeply nested URLs (`/a/b/c/d/e/f`) | Modeling every relationship in the path | Fragile, hard to version | Flatten after 2 levels; use query params for relations |
| 12 | Inconsistent naming (`camelCase` vs `snake_case` mixed) | Multiple devs, no style guide | Client-side bugs from typos | Enforce one case convention project-wide |
| 13 | No correlation IDs | Not needed in dev | Impossible to trace issues across services in prod | Require `X-Correlation-Id` from day one |
| 14 | Returning different error shapes per module | Modules built independently | Frontend error handling breaks per module | Shared error envelope, enforced in a base class |
| 15 | Not validating on the server (trusting frontend validation) | Frontend already validates | Corrupt/malicious data enters DB | Always validate server-side, regardless |
| 16 | Missing idempotency on retries | Not considered until double-charges/double-generates happen | Duplicate AI jobs, duplicate resources | `Idempotency-Key` on all non-idempotent mutating calls |
| 17 | Hardcoding pagination limits without a max | Assuming clients are well-behaved | `size=999999` DoS risk | Enforce max page size server-side |
| 18 | No soft deletes on critical resources | Simpler to hard-delete | Accidental permanent data loss | Soft delete + retention window for resumes/accounts |
| 19 | Auth logic duplicated per controller | No shared middleware | Inconsistent enforcement, security gaps | Centralize via filters/interceptors |
| 20 | Returning full user objects (including password hash) | Careless serialization | Sensitive data leakage | Explicit response DTOs, never entity passthrough |
| 21 | Ignoring CORS until frontend integration breaks | Backend/frontend built in isolation | Late-stage integration fire drills | Define CORS policy at API design time |
| 22 | No distinction between `401` and `403` | Treated as "same thing" | Clients can't tell "log in again" from "you don't have access" | Use `401` for auth failure, `403` for authorization failure |
| 23 | Breaking changes without deprecation notice | Deadline pressure | Client apps break in production | Deprecation headers + sunset window, always |
| 24 | Inconsistent date/time formats | Different devs, different defaults | Timezone bugs across clients | Always ISO 8601 UTC |
| 25 | No request size limits | Not considered until an abuse case | Memory exhaustion, DoS | Enforce size limits at gateway level |
| 26 | Business logic in controllers | Fastest path to "it works" | Untestable, unmaintainable | Service layer owns business rules, controller stays thin (contract-only concern here) |
| 27 | Synchronous cascading calls to AI providers with no timeout | Default HTTP client settings | One slow provider call hangs the whole request | Explicit timeouts + circuit breakers |
| 28 | No audit trail on admin actions | Not a priority until an incident | No accountability, compliance risk | Immutable audit log on all privileged writes |
| 29 | Query params doing double duty as filters and pagination inconsistently | Ad hoc endpoint design | Confusing, undocumented behavior | Standard param names, documented once, reused everywhere |
| 30 | Returning `200` on `DELETE` with a body | Copy-pasted from `GET` handler | Violates HTTP semantics, confuses clients | `204 No Content` with empty body on delete |
| 31 | No API documentation kept in sync with code | Docs treated as an afterthought | Frontend/mobile built against stale contract | OpenAPI spec as source of truth, generated/verified in CI |
| 32 | Mixing authentication schemes across endpoints | Legacy endpoints added ad hoc | Confusing integration, security gaps | One consistent JWT bearer scheme platform-wide |

---

## Closing Notes

This blueprint defines the **contract**, not the implementation. Every module in Part 3 should be translated into an OpenAPI 3.1 file before backend work begins, and the response/error envelopes in Parts 5–6 should be treated as **non-negotiable** across all future modules — including ones not yet imagined (e.g., Analytics deep-dives, Admin sub-tools) — so the API stays predictable as it grows over the next five years.


# 7 Backend Architecture

## Current package model

The entry package com.airesumebuilder allows component scanning below it. common owns cross-feature API/error/web helpers. config assembles infrastructure. security owns identity mechanisms. integration.ai isolates external-model details. events decouples resume mutations from audit logging. eature contains admin, AI, analytics, ATS, auth, audit, job, notification, PDF, resume/version, subscription, template, and user modules.

**Controller** (simple meaning: the HTTP doorway) validates transport input. **Service** (simple meaning: the business decision maker) owns rules and transactions. **Repository** (simple meaning: code that talks to persistent storage) owns queries. **Entity** (simple meaning: Java state mapped to a table) represents persistence. **DTO** (simple meaning: a deliberately shaped message) protects the API from entity changes.

## Deep architecture lesson

# AI Resume Builder — Backend Architecture Guide

**Status:** Pre-development blueprint. No code, entities, SQL, or APIs exist yet. This document governs how backend developers structure and write code once feature work begins.

---

## PART 1 — Backend Philosophy

### Layered Architecture
Organizes code horizontally by technical responsibility: `controller → service → repository`. Simple to understand, easy to onboard into, but at scale it can encourage "fat services" that do everything for every feature in one place.

### Clean Architecture
Organizes code by dependency direction: business logic (domain) at the center, knowing nothing about frameworks; infrastructure (DB, web) at the edges, depending inward. Maximizes testability and framework independence, but adds ceremony (more interfaces, more mapping) that's costly for a small team moving fast.

### Feature-based Architecture
Organizes code vertically by business capability (`feature/resume/`, `feature/ai/`) rather than technical layer. Each feature owns its controller, service, repository, DTOs. Easiest to reason about "what does this feature touch," easiest to eventually extract into a microservice.

### Recommended approach: **Modular Monolith, layered internally within feature modules**
This project combines the two: top-level packages are organized **by feature** (Part 2), and *within* each feature, code is organized **by layer** (controller/service/repository/dto). This gives:
- Clear feature boundaries (good for future extraction into services)
- Familiar internal layering (good for a team, including junior developers, ramping up on each module)

### Why Modular Monolith first
- **Single deployable unit** — one Docker container, one CI pipeline, no distributed-systems complexity (network failures, distributed transactions, service discovery) before the product even has users.
- **Cheaper to develop and debug** — a stack trace stays in one process; no correlating logs across services.
- **Refactoring is local** — moving a class between packages in a monolith is a safe IDE operation; moving functionality between microservices is a project.
- Module boundaries (Part 2/3) are designed so that if a feature (e.g., AI processing, PDF generation) later needs independent scaling, it can be **extracted** into its own service with minimal rework — the modular boundary already exists in code, it just becomes a network boundary instead of a package boundary.

### When Microservices become appropriate
- When a specific module (typically AI processing or PDF generation — both CPU/latency heavy) needs to scale independently of the rest of the app.
- When team size grows enough that independent deployability per team outweighs the operational cost of distributed systems.
- When one module's reliability requirements diverge sharply from others (e.g., AI calls timing out shouldn't take down resume CRUD).

**Recommendation for this project:** modular monolith through v1 and v2 (Part 10 of the setup guide). Revisit AI and PDF modules as extraction candidates only once real usage data justifies it.

---

## PART 2 — Complete Package Structure

```
com.airesumebuilder
├── config/                 # Cross-cutting framework configuration (Part 5)
├── security/                # JWT filters, auth providers, RBAC config
├── common/
│   ├── dto/                  # Generic API response, pagination wrappers
│   ├── exception/              # Base exception types, global handler
│   ├── mapper/                   # Shared mapping utilities/interfaces
│   ├── util/                      # Stateless helpers (date, string utils)
│   ├── constant/                    # Shared constants/enums
│   └── validation/                    # Custom cross-feature validators
├── feature/
│   ├── auth/                # Registration, login, token refresh
│   ├── user/                  # User profile management
│   ├── resume/                  # Core resume CRUD (sections, entries)
│   ├── ai/                        # AI provider abstraction (Part 3)
│   ├── pdf/                        # PDF export/rendering
│   ├── ats/                          # ATS scoring/checking
│   ├── job/                            # Job matching
│   ├── notification/                     # Email/push notification dispatch
│   ├── admin/                              # Admin-only operations
│   └── audit/                                # Change history / audit trail
├── integration/           # External API clients (OpenAI, Gemini, payment, email providers)
├── scheduler/               # Scheduled/cron jobs
├── cache/                     # Cache configuration and cache-key strategy
├── events/                      # Application event publishers/listeners
└── ResumeBuilderApplication.java
```

### Package Responsibilities

| Package | Responsibility |
|---|---|
| `config/` | Wires framework beans — security filter chain, CORS, Jackson, OpenAPI, async executor, cache manager. No business logic. |
| `security/` | JWT generation/validation, `UserDetailsService` implementation, method-level `@PreAuthorize` support, role definitions. |
| `common/` | Anything genuinely shared across 2+ features. If only one feature uses it, it belongs inside that feature, not here. |
| `feature/*` | Vertical slices — each is close to self-contained (Part 3). |
| `integration/` | Isolates all outbound calls to third-party systems behind interfaces, so `feature/ai` calls `AiProviderClient`, not `OpenAiSdk` directly. |
| `scheduler/` | Cron-driven jobs (e.g., cleanup of expired tokens, usage-report generation) — kept separate so scheduled logic isn't hidden inside a service class that's also called synchronously. |
| `cache/` | Central place for cache region naming/TTL policy, so cache invalidation logic isn't duplicated per feature. |
| `events/` | Domain events (e.g., `ResumeCreatedEvent`) allowing features to react to each other (e.g., `audit` listens to events from `resume`) without direct coupling. |

**Why `common` is intentionally small:** a bloated `common`/`util` package is a common failure mode — it becomes a dumping ground and creates hidden coupling between every feature. The rule: something only moves into `common` after it's needed by a second feature, not in anticipation of being needed.

---

## PART 3 — Feature Module Organization

Each feature module follows the same internal shape:

```
feature/resume/
├── controller/
├── service/
├── service/impl/
├── repository/
├── entity/
├── dto/
│   ├── request/
│   └── response/
├── mapper/
├── validation/
└── exception/          # Feature-specific exceptions extending common base types
```

| Layer | Responsibility |
|---|---|
| Controller | HTTP mapping only — routes, status codes, delegates to service. |
| Service (interface) | Defines the feature's business capability contract. |
| Service/impl | Business logic implementation; the only place transactions and orchestration across repositories happen. |
| Repository | Spring Data JPA interfaces; no business logic. |
| Entity | Persistence model; never returned from a controller. |
| DTO | Request/response contracts, versioned independently of entities. |
| Mapper | Entity ↔ DTO conversion (e.g., MapStruct), isolated so services don't hand-roll mapping inline. |
| Validation | Feature-specific custom validators (e.g., resume section length rules) beyond simple Bean Validation annotations. |
| Exception | Feature-specific exceptions (`ResumeNotFoundException`) extending shared base exceptions from `common/exception`. |

### Independence rules
- **A feature package may depend on `common`, `security`, `integration`, and `events` — but not directly on another feature's `service.impl`, `repository`, or `entity`.**
- Cross-feature interaction happens through: (a) the other feature's **public service interface** (not impl), or (b) **domain events** for fire-and-forget reactions (e.g., `ai` completing a generation publishes an event; `notification` listens and emails the user).
- This rule is what makes future microservice extraction realistic — if `ai` never reaches into `resume`'s repository directly, extracting `ai` later doesn't require untangling database-level coupling.

### AI module specifics (`feature/ai`)
- Defines an `AiProvider` interface (`generateContent(prompt, context)`) with `OpenAiProviderAdapter` and `GeminiProviderAdapter` implementations living in `integration/`.
- Feature code depends on the interface only; provider selection is a configuration concern (Part 5), not a code branch scattered through business logic.

---

## PART 4 — Request Lifecycle

```
Client (React/Axios)
    │  HTTPS request + JWT bearer token
    ▼
Controller
    │  Deserialize JSON → Request DTO
    │  Trigger Bean Validation (@Valid)
    ▼
Service
    │  Business rules, orchestration, transaction boundary
    │  Calls Repository / Integration clients as needed
    ▼
Repository
    │  Translates to SQL via Hibernate/JPA
    ▼
Database (MySQL)
    │  Returns Entity/rows
    ▼
Service
    │  Applies business logic to results
    ▼
Mapper
    │  Entity → Response DTO
    ▼
Controller
    │  Wraps in standardized API response envelope (Part 6)
    ▼
Client
```

### Layer responsibilities and boundaries

| Layer | Should | Should never |
|---|---|---|
| Controller | Map routes, validate input shape, delegate, set HTTP status | Contain business logic, query the database directly, catch business exceptions silently |
| Service | Enforce business rules, coordinate repositories/integrations, define transaction boundaries | Know about `HttpServletRequest`/HTTP status codes, format JSON |
| Repository | Data access only | Contain business logic or call other repositories' business rules |
| Mapper | Pure data transformation | Contain validation or business logic |

---

## PART 5 — Configuration Strategy

```
config/
├── SecurityConfig.java        # Filter chain, JWT filter registration, RBAC rules
├── CorsConfig.java              # Allowed origins (frontend URL) per environment
├── JacksonConfig.java             # Date/time serialization, null handling policy
├── OpenApiConfig.java               # Swagger/OpenAPI doc generation config
├── AsyncConfig.java                   # Thread pool for @Async AI calls
├── SchedulingConfig.java                # Enables and configures @Scheduled jobs
├── CacheConfig.java                       # Cache manager, region definitions
└── DatabaseConfig.java                      # (mostly Spring Boot auto-config; explicit only if custom pooling needed)
```

| Config | Why it exists |
|---|---|
| Security | Central definition of which endpoints require auth/roles — must not be scattered as ad hoc checks inside controllers. |
| CORS | Frontend (Vercel) and backend (Render/AWS) are different origins; without explicit config, all browser requests fail. |
| Jackson | Prevents inconsistent JSON shape (e.g., date formats) across different DTOs written by different developers. |
| OpenAPI/Swagger | Auto-generates API documentation from code, keeping `API.md` and reality from drifting apart. |
| Environment Profiles | `dev`/`prod` properties (already defined in the setup guide) activated via `spring.profiles.active`, so behavior differences are declarative, not `if (env.equals("prod"))` in code. |
| Logging | Central logging pattern/level config so every module logs consistently (Part 9). |
| Async | AI calls are slow (seconds) — must run on a dedicated thread pool, not the request-handling pool, or the app starves under load. |
| Scheduling | Central `@EnableScheduling` + pool sizing, so cron jobs don't silently compete with request threads. |
| Caching | Central cache manager (e.g., for ATS scoring rules or job-matching reference data) so TTL/eviction policy is consistent. |

---

## PART 6 — DTO Strategy

### Why entities must never be exposed directly
- **Leaks internal schema** — renaming a database column shouldn't break the frontend contract.
- **Lazy-loading exceptions** — serializing an unfetched JPA relationship directly throws `LazyInitializationException` or accidentally triggers N+1 queries during JSON serialization.
- **Over-exposure** — an entity may carry fields (password hash, internal flags) that must never leave the server.
- **Contract stability** — a DTO can stay stable across schema refactors; an entity cannot.

### DTO categories
| DTO type | Purpose |
|---|---|
| Request DTO | Shape of incoming data (`CreateResumeRequest`) — validated with Bean Validation. |
| Response DTO | Shape of outgoing data (`ResumeResponse`) — only fields the client needs. |
| Error DTO | Standardized shape for all error responses (Part 7). |
| Pagination DTO | Wraps list responses with `page`, `size`, `totalElements`, `totalPages`. |
| Generic API Response | Envelope wrapping every response: `{ success, data, error, timestamp }` — gives the frontend one consistent shape to parse regardless of endpoint. |

**Rule:** one request DTO and one response DTO per meaningful operation, even if they're currently identical in shape — they evolve independently over time, and starting separate avoids a breaking-change refactor later.

---

## PART 7 — Exception Handling

```
common/exception/
├── GlobalExceptionHandler.java     # @ControllerAdvice — single place all exceptions are translated to responses
├── BaseException.java                # Root of custom hierarchy, carries an error code
├── ResourceNotFoundException.java
├── ValidationException.java
├── AuthenticationException.java
├── AuthorizationException.java
├── ConflictException.java
└── ExternalServiceException.java    # For AI provider/integration failures
```

| Exception | Maps to HTTP | Example trigger |
|---|---|---|
| `ResourceNotFoundException` | 404 | Resume ID doesn't exist |
| `ValidationException` | 400 | Bean Validation failure aggregation |
| `AuthenticationException` | 401 | Invalid/expired JWT |
| `AuthorizationException` | 403 | Valid user, insufficient role |
| `ConflictException` | 409 | Duplicate email on registration |
| `ExternalServiceException` | 502/504 | AI provider timeout or error |
| Unhandled `Exception` | 500 | Caught as a last-resort fallback in the global handler; never leaks stack traces to the client |

### Standardized error response shape (conceptual)
```
{
  success: false,
  error: {
    code: "RESUME_NOT_FOUND",
    message: "human-readable message",
    details: [ ... field-level validation errors, if any ... ]
  },
  timestamp: "..."
}
```
All exceptions funnel through **one** `GlobalExceptionHandler` — no controller ever has its own local `try/catch` for expected business errors; it throws, and the handler translates.

---

## PART 8 — Validation Strategy

| Validation type | Where it belongs |
|---|---|
| Field-level shape (`@NotBlank`, `@Email`, `@Size`) | Bean Validation annotations directly on Request DTOs. |
| Cross-field rules within one DTO (e.g., "end date must be after start date") | Custom class-level validator annotation on the DTO. |
| Business rules requiring a database lookup (e.g., "email must be unique") | Service layer — Bean Validation cannot query the database, and shouldn't. |
| Cross-feature rules (e.g., "user must have an active subscription to use AI") | Service layer, via the relevant feature's service interface. |

**Rule of thumb:** if validating the field requires only the data already in the request, it's Bean Validation. If it requires state from the database or another feature, it's service-layer validation. Controllers never contain validation logic beyond triggering `@Valid`.

---

## PART 9 — Logging Strategy

### Log levels
| Level | Use |
|---|---|
| ERROR | Unhandled exceptions, failed external calls after retries exhausted |
| WARN | Recoverable issues (e.g., AI provider fallback triggered, retry succeeded) |
| INFO | Key business events (user registered, resume created, AI generation completed) |
| DEBUG | Detailed flow useful in dev only — disabled in prod by profile config |

### Structured logging
Logs emitted as structured JSON (not free-text) in production, so they're queryable by log aggregation tools (e.g., filter by `userId`, `feature`, `requestId`) rather than grep'd manually.

### Correlation IDs
Every incoming request is assigned a correlation/request ID (via a filter, stored in MDC) that's attached to every log line for that request — essential for tracing one user's request across controller → service → AI integration call in production logs.

### Audit logs
Separate, append-only log stream (`feature/audit`) recording *who did what to which resource and when* (resume edits, admin actions) — distinct from application debug logs, and typically retained longer for compliance/support purposes.

### Security logs
Authentication attempts (success/failure), token refresh events, authorization denials — logged separately so suspicious patterns (repeated failed logins) are easy to monitor without wading through general app logs.

### AI request logs
Log that a generation request occurred, which provider, latency, token usage, and success/failure — **never** the full prompt/response content by default, since resumes contain personal data (Part 9 "never log" rule below).

### What must never be logged
- Passwords (even hashed, in most cases)
- JWT tokens or refresh tokens
- Full resume content / personal data (names, addresses, phone numbers) in plain application logs
- API keys/secrets for AI providers
- Full request/response bodies of authentication endpoints

---

## PART 10 — Design Patterns

| Pattern | Where it fits |
|---|---|
| **Strategy** | `AiProvider` interface with `OpenAiProviderAdapter`/`GeminiProviderAdapter` — swap providers without changing calling code. |
| **Factory** | `AiProviderFactory` selects the correct provider implementation based on config/user preference at runtime. |
| **Builder** | Constructing complex DTOs/entities with many optional fields (e.g., a `Resume` with many optional sections) without telescoping constructors. |
| **Adapter** | `integration/` layer wraps third-party SDKs (OpenAI SDK, Gemini SDK, email provider SDK) behind our own interfaces, isolating the app from SDK-specific APIs. |
| **Template Method** | A base PDF export/rendering flow (fetch data → apply template → render) with template-specific steps overridden per resume template. |
| **Observer (via Spring Events)** | `events/` package — e.g., `ResumeCreatedEvent` triggers audit logging and welcome-flow notifications without `resume` service directly calling `audit`/`notification` services. |
| **Dependency Injection** | Used throughout via Spring's constructor injection — enables testability (mocking dependencies) and enforces the "depend on interfaces, not implementations" rule across all service boundaries. |

---

## PART 11 — Scalability

| Scale | Considerations |
|---|---|
| **~100 users** | Single instance, single MySQL instance, no caching needed. Focus is correctness, not performance. |
| **~10,000 users** | Introduce connection pooling tuning (HikariCP defaults reviewed), add caching (Part 5) for read-heavy, rarely-changing data (e.g., ATS scoring rules, resume templates). Move AI calls fully to `@Async` so slow provider responses don't block request threads. Add database indexes on frequently-queried columns (documented in `Database.md`, not implemented here). |
| **~1,000,000 users** | Horizontal scaling of the backend (multiple stateless instances behind a load balancer) — enabled by the JWT-stateless design chosen from day one. Read replicas for MySQL to offload read-heavy queries. Extract the highest-load modules (AI, PDF generation) into independently-scaled services, per Part 1. Introduce a message queue (e.g., for AI generation jobs) so spikes in demand queue rather than overwhelm the API layer. CDN for static frontend assets (already implied by Vercel deployment). |

**Principle:** design decisions made now (statelessness, async AI calls, modular boundaries, caching config already scaffolded) mean scaling later is a matter of *adding infrastructure*, not *rewriting code*.

---

## PART 12 — Security Considerations

| Concern | Architectural approach |
|---|---|
| JWT | Stateless bearer tokens signed with a strong secret/key, short expiry, validated on every request via a security filter in `security/`. |
| Refresh Tokens | Longer-lived, stored securely (httpOnly cookie or secure storage), used only to mint new access tokens via a dedicated endpoint — never used directly as an access token. |
| RBAC | Roles (`USER`, `ADMIN`) enforced via method-level `@PreAuthorize` and centrally defined in `SecurityConfig`, not scattered `if` checks in controllers. |
| Password Encryption | BCrypt (or equivalent) via Spring Security's `PasswordEncoder` — plaintext passwords never touch the database or logs. |
| Rate Limiting | Applied at the gateway/filter level (e.g., per-IP or per-user limits on auth and AI endpoints specifically, since AI calls are costly and abuse-prone). |
| Input Validation | Enforced at the DTO boundary (Part 8) before any data reaches business logic — prevents malformed/malicious input from propagating. |
| CORS | Explicit allow-list of the frontend's origin(s) per environment — never `*` in production. |
| CSRF | Not applicable in the traditional sense since this is a stateless JWT API (no cookie-based session), but any cookie-stored refresh token requires CSRF-safe handling (`SameSite` cookie attributes). |
| Secure API design | Every endpoint's auth/role requirement explicitly declared, never assumed; sensitive endpoints (AI usage, admin) get extra scrutiny in code review per `Contributing.md`. |

---

## PART 13 — Backend Development Rules

| Rule | Standard |
|---|---|
| Package naming | all lowercase, singular (`feature.resume`, not `feature.resumes`) |
| Class naming | `PascalCase`, suffix reflects role (`ResumeService`, `ResumeServiceImpl`, `ResumeController`, `ResumeRequest`, `ResumeResponse`, `ResumeMapper`) |
| Method naming | `camelCase`, verb-first (`createResume`, `findById`, `mapToResponse`) |
| Service responsibilities | Own business logic and transaction boundaries; depend on repository/integration interfaces, never on other features' impl classes |
| Controller responsibilities | Thin — mapping, validation trigger, delegation only |
| Repository responsibilities | Data access only, Spring Data JPA method-naming conventions or `@Query` when needed, no business logic |
| Dependency Injection | Constructor injection only (never field injection) — required for testability and immutability |
| Transaction management | `@Transactional` declared at the service layer, at the boundary of one business operation — never in controllers or repositories |
| Documentation | Public service interfaces documented with Javadoc explaining the contract, not the implementation |
| Testing expectations | Every service method has at least one unit test (mocked dependencies); critical flows (auth, payment) get integration tests against a test database |

---

## PART 14 — Common Architecture Mistakes

| # | Mistake | Why harmful | Impact | Correct approach |
|---|---|---|---|---|
| 1 | Exposing JPA entities directly in controllers | Leaks schema, causes lazy-loading exceptions | Broken API contracts, serialization crashes | Always map to DTOs (Part 6) |
| 2 | Fat controllers with business logic | Untestable without HTTP context | Bugs, duplicated logic across endpoints | Move logic to services |
| 3 | Field injection (`@Autowired` on fields) | Hides dependencies, hard to test | Fragile unit tests, hidden coupling | Constructor injection only |
| 4 | No global exception handler | Inconsistent error responses per controller | Frontend can't parse errors reliably | Centralized `@ControllerAdvice` |
| 5 | Business logic in repositories | Mixes data access and rules | Hard to reuse, hard to test | Keep repositories query-only |
| 6 | `@Transactional` misuse (missing, or too broad) | Data inconsistency, or long-held locks | Corrupted state or DB contention | Transaction boundary = one business operation, at service layer |
| 7 | Catching generic `Exception` and swallowing it | Hides real failures | Silent data corruption, invisible bugs | Catch specific exceptions, let others propagate to global handler |
| 8 | Hardcoded secrets in `application.properties` | Secrets committed to Git | Security breach | Externalize via environment variables (Setup Guide, Part 7) |
| 9 | No DTO versioning discipline (reusing entities as both request/response) | Breaking changes ripple unpredictably | Frontend/backend contract breaks silently | Explicit, separate Request/Response DTOs |
| 10 | God service classes handling multiple features | Violates single responsibility | Impossible to test or extract later | One service per feature/capability |
| 11 | N+1 query problems from lazy-loaded collections serialized directly | Severe performance degradation | Slow endpoints, DB overload at scale | DTO projection, explicit fetch joins where needed |
| 12 | No pagination on list endpoints | Unbounded result sets | OOM errors, slow responses at scale | Pagination DTO on every list endpoint |
| 13 | Synchronous AI calls blocking request threads | Thread pool exhaustion under load | App-wide slowdown from one slow AI provider | `@Async` execution (Part 5, Part 11) |
| 14 | No correlation/request IDs in logs | Impossible to trace one request's flow | Debugging production issues becomes guesswork | MDC-based correlation ID (Part 9) |
| 15 | Logging sensitive data (passwords, tokens, PII) | Security/compliance violation | Data breach liability | Explicit "never log" list enforced in code review |
| 16 | No environment separation (same properties for dev/prod) | Dev settings leak into prod or vice versa | Debug logging in prod, or prod DB used locally | `application-{profile}.properties` (Setup Guide, Part 7) |
| 17 | Circular dependencies between feature services | Tight coupling, startup failures | Impossible to extract into microservices later | Communicate via public interfaces or events only (Part 3) |
| 18 | No input validation beyond "it compiles" | Malformed/malicious data reaches business logic | Data corruption, security vulnerabilities | Bean Validation + custom validators (Part 8) |
| 19 | Manually writing entity-to-DTO mapping inline in services | Duplicated, error-prone, clutters business logic | Inconsistent mapping, hard-to-spot bugs | Dedicated mapper classes (Part 3) |
| 20 | No RBAC enforcement at the method level | Relying only on frontend to hide admin features | Privilege escalation vulnerability | `@PreAuthorize` enforced server-side always |
| 21 | Overusing `@Component`/service-locator patterns instead of DI | Hidden runtime dependencies | Hard to reason about object graph | Explicit constructor-injected dependencies |
| 22 | Ignoring idempotency on retried operations (e.g., duplicate resume creation on network retry) | Data duplication | Corrupted user data | Idempotency keys or unique constraints where relevant |
| 23 | Tight coupling to a single AI provider's SDK types throughout the codebase | Impossible to switch providers without a rewrite | Vendor lock-in, contradicts project requirement | Strategy/Adapter pattern (Part 10) |
| 24 | No rate limiting on expensive endpoints (AI, PDF export) | Abuse or accidental overload drains cost/resources | Runaway cloud/AI provider bills | Rate limiting at gateway/filter level (Part 12) |
| 25 | Skipping tests on "simple" CRUD services because they seem obvious | False confidence | Regressions slip through as the "simple" service grows complex | Testing policy applies uniformly (Part 13) |
| 26 | Mixing configuration values with code logic (e.g., `if (profile.equals("prod"))`) | Behavior branches hidden in business code | Hard to audit environment-specific behavior | Externalize via Spring profiles/config beans (Part 5) |
| 27 | No standardized API response envelope | Every endpoint shaped differently | Frontend needs custom parsing per endpoint | Generic API Response wrapper (Part 6) |

---

## Summary

This architecture is deliberately **feature-first, layer-internal, interface-driven, and stateless** — chosen so the project can grow from 100 to 1,000,000 users, and from one AI provider to several features (Part 10 of the setup guide) without requiring a rewrite, only additive changes within the boundaries already defined here.

Before any developer writes the first controller, they should be able to point to the exact package their code belongs in, and the exact layer responsible for each decision they're about to make.


# 8 Frontend Architecture

## Current execution composition

main.jsx -> App -> providers -> router -> guard -> layout -> page -> feature component -> hook/API.

Error boundaries contain rendering failures. Notification context owns toast-like feedback. Query Client owns remote cache. Auth Context owns only current-session state; it deliberately keeps access tokens out of persistent browser storage. Lazy imports reduce the initial bundle. Feature error boundaries prevent one module from crashing the entire dashboard.

The resume editor combines immediate local state, undo/redo, validation, debounced autosave, React Query mutations, typed section CRUD, completion scoring, template resolution, and document preview. This is the most state-dense frontend feature.

## Complete frontend architecture lesson

# AI Resume Builder — Frontend Architecture Guide

**Status:** Pre-development architecture blueprint. No JSX, components, or CSS exist yet. This governs how every frontend developer structures and writes code once feature work begins.

---

## PART 1 — Frontend Architecture Philosophy

### Why React
Component-based composition matches the product's nature — a resume builder is fundamentally a tree of reusable, nestable pieces (a section is made of fields, a resume is made of sections, a template renders sections differently). React's ecosystem also gives mature answers for routing, forms, and state management, which this project needs extensively (Parts 4–7).

### Feature-Based vs Layer-Based Architecture
- **Layer-based** organizes by technical type across the whole app (`all components/`, `all hooks/`, `all services/`) — simple at first, but every new feature touches many top-level folders, and it's hard to tell what belongs to what once the app has 10+ features (Resume Builder, ATS, Job Matching, Admin, etc.).
- **Feature-based** organizes by business capability (`features/resume/`, `features/ats/`), each feature owning its own components, hooks, and API calls — mirrors the backend's feature-module structure (Backend Architecture doc, Part 2), makes it obvious where new code belongs, and makes a feature easy to reason about or eventually remove.

**Recommendation: feature-based at the top level, with a shared layer-based `components/` for truly cross-feature primitives (Part 2).** This mirrors the backend's modular monolith decision and keeps frontend and backend mental models consistent for developers working across both.

### Atomic Design principles
Applied loosely, not dogmatically: shared UI primitives are organized by composability level —
- **Atoms:** Button, Input, Label, Icon
- **Molecules:** FormField (label + input + error), Card, SearchBar
- **Organisms:** Navbar, ResumeSectionList, ATSReportPanel
- **Templates/Pages:** full page layouts composed of organisms

This vocabulary (Part 3) gives the team a shared language for "how reusable is this component" without forcing a rigid folder-per-level structure, which tends to fight against feature-based organization.

### Component-Driven Development
Components are built and validated in isolation (conceptually — e.g., via a tool like Storybook, decided at implementation time) before being wired into pages. This keeps shared components (Part 8) honest — if a Button only works inside one specific page's context, it wasn't actually reusable.

### Separation of concerns
- **Presentation vs logic:** display components (Part 3) receive data and render; they don't fetch data or contain business rules.
- **Data fetching vs UI state:** server state (Part 5) is handled distinctly from local UI state (open/closed, hover, form input before submit).
- **Routing vs feature logic:** routes (Part 4) compose feature pages; they don't contain business logic themselves.

### Reusability strategy
A component is promoted from `features/*/components/` to the shared `components/` only after it's needed by a **second** feature — same rule as the backend's `common/` package (Backend Architecture doc, Part 2). Premature sharing creates hidden coupling between unrelated features.

### Scalability strategy
Each feature module is self-contained enough to be **code-split** (Part 9) and **independently developed** — a new team member can be handed the entire `features/ats/` folder and rarely need to touch anything outside it plus the shared layer.

---

## PART 2 — Complete Folder Structure

```
src/
├── assets/                 # Static images, fonts, icons (raw files, not components)
├── components/                # Shared, cross-feature UI primitives (Part 3 — atoms/molecules/organisms)
├── features/                     # Feature-based modules (Part 3)
│   ├── auth/
│   ├── dashboard/
│   ├── resume/
│   ├── templates/
│   ├── coverLetter/
│   ├── ats/
│   ├── jobMatching/
│   ├── aiAssistant/
│   ├── notifications/
│   ├── profile/
│   ├── settings/
│   └── admin/
├── pages/                           # Route-level composition (thin — assembles feature components + layout)
├── layouts/                           # Shell layouts (AuthLayout, DashboardLayout, AdminLayout)
├── hooks/                                # Shared, cross-feature custom hooks
├── services/                               # Cross-cutting business/service logic not tied to one feature (e.g., auth session logic)
├── api/                                       # Axios instance, interceptors, API module registry (Part 6)
├── routes/                                       # Route definitions, route guards (Part 4)
├── context/                                         # Global React Context providers (Part 5)
├── store/                                             # Global client state store, if/when needed (Part 5)
├── utils/                                               # Stateless pure helper functions
├── constants/                                             # App-wide constant values, enums mirrored from backend
├── config/                                                  # Environment-driven configuration (API base URL, feature flags)
├── styles/                                                    # Tailwind config extensions, global style tokens (Part 8)
├── types/                                                       # Shared TypeScript-ready type/interface definitions
├── validators/                                                    # Shared validation schemas (Part 7)
├── App.jsx
└── main.jsx
```

### Folder Responsibilities

| Folder | Responsibility |
|---|---|
| `assets/` | Raw static files only — never logic, never components. |
| `components/` | Reusable across 2+ features; no feature-specific business logic or API calls. |
| `features/*/` | Self-contained feature modules (Part 3 internal structure). |
| `pages/` | One file per route, composes layout + feature components; contains no business logic itself. |
| `layouts/` | Structural shells (nav, sidebar, footer) shared across multiple pages within a route group. |
| `hooks/` | Cross-feature hooks (e.g., `useDebounce`, `useMediaQuery`) — feature-specific hooks live inside their feature folder instead. |
| `services/` | Logic that isn't UI and isn't a single feature's concern (e.g., token storage service used by both `auth` and the `api` layer). |
| `api/` | The only place Axios is configured; all feature API modules import from here (Part 6). |
| `routes/` | Route tree definition and guard components (`ProtectedRoute`, `AdminRoute`, `GuestRoute`) — Part 4. |
| `context/` | Providers for truly global concerns (auth session, theme) — not a dumping ground for feature state (Part 5). |
| `store/` | Only introduced if/when Context proves insufficient (Part 5) — kept as a placeholder folder so the decision is deliberate, not default. |
| `utils/` | Pure functions with no side effects, no React dependency — testable in isolation. |
| `constants/` | Values like `RESUME_STATUS`, `SUBSCRIPTION_PLAN` mirrored from backend enums, so the frontend never hardcodes magic strings inline. |
| `config/` | Reads `import.meta.env` (Vite env vars) in one place, so no component reaches into `import.meta.env` directly. |
| `styles/` | Tailwind theme extension (colors, spacing tokens) — the single source of design tokens (Part 8). |
| `types/` | Shared shape definitions (e.g., `ResumeResponse` shape matching the backend DTO) — reduces frontend/backend contract drift. |
| `validators/` | Shared form validation schemas usable across features that share field types (e.g., email validation used in both `auth` and `profile`). |

### Internal structure of a feature module
```
features/resume/
├── components/          # Feature-specific components (not reusable elsewhere)
├── hooks/                  # Feature-specific hooks (e.g., useResumeAutosave)
├── api/                       # Resume-specific API calls, built on the shared axios instance
├── routes.jsx                    # This feature's route definitions, merged into the app route tree
├── types.js                        # Feature-specific shape definitions (or .ts if/when TypeScript is adopted)
└── index.js                          # Public exports — other features import only from here, never reaching into internal files
```

**Rule mirrored from the backend:** a feature may import another feature's `index.js` public exports, or shared `components/`/`hooks/`/`api/`, but never reach directly into another feature's internal `components/` or `hooks/` folders — this is what keeps features independently removable/refactorable.

---

## PART 3 — Component Architecture

| Category | Examples | Reusable? | Lives in |
|---|---|---|---|
| **Layout Components** | `AppShell`, `Sidebar`, `Navbar`, `Footer` | Shared across route groups | `layouts/` |
| **Shared/Design-System Components** | `Button`, `Input`, `Card`, `Modal`, `Dropdown`, `Table` | Fully reusable, no business logic | `components/` (Part 8) |
| **Feature Components** | `ResumeSectionEditor`, `AtsScoreGauge`, `JobMatchCard` | Feature-specific, not reused elsewhere | `features/*/components/` |
| **Form Components** | `FormField`, `MultiStepFormWizard` (shared shell) vs. `ExperienceFormStep` (feature-specific) | Shell is shared; step content is feature-specific | Shared shell in `components/`, steps in `features/resume/components/` |
| **Display Components** | `ResumePreview`, `AtsReportSummary` | Feature-specific (render feature data) | `features/*/components/` |
| **AI Components** | `AiSuggestionCard`, `AiGenerateButton`, `AiLoadingIndicator` | The loading/status pattern is shared; the content rendering is feature-specific | Shared status components in `components/`; content in `features/aiAssistant/components/` |
| **Resume Components** | `ResumeCard`, `TemplateThumbnail`, `SectionList` | Feature-specific | `features/resume/components/`, `features/templates/components/` |
| **Admin Components** | `UserTable`, `AdminStatsPanel` | Feature-specific, admin-only | `features/admin/components/` |

### Decision rule for reusability
A component qualifies for `components/` (shared) only if it:
1. Has no dependency on a specific feature's data shape.
2. Is used, or realistically will soon be used, by 2+ features.
3. Contains no feature-specific business logic (only presentation + generic interaction).

`AiLoadingIndicator` is shared because "show a spinner + status" is generic; `AiSuggestionCard` is feature-specific because rendering an AI-generated resume bullet vs. a cover letter paragraph differs enough that forcing one shared component creates awkward conditional branching.

---

## PART 4 — Routing Strategy

```
routes/
├── index.jsx              # Root route tree assembly
├── ProtectedRoute.jsx        # Requires valid auth session
├── GuestRoute.jsx               # Only accessible when NOT authenticated (login/register)
└── AdminRoute.jsx                  # Requires ProtectedRoute AND admin role
```

### Route categories
| Type | Examples | Guard |
|---|---|---|
| **Public** | Landing page, pricing, about | None |
| **Guest-only** | `/login`, `/register` | `GuestRoute` — redirects to dashboard if already authenticated |
| **Protected** | `/dashboard`, `/resumes/:id`, `/ats`, `/job-matching`, `/profile`, `/settings` | `ProtectedRoute` — redirects to `/login` if unauthenticated |
| **Admin** | `/admin/*` | `AdminRoute` — redirects non-admins to dashboard or a 403 page |
| **Dynamic** | `/resumes/:resumeId`, `/resumes/:resumeId/versions/:versionId` | Nested under Protected |
| **Nested** | `/resumes/:resumeId` with child routes for `/edit`, `/preview`, `/ats-check` | Shares a layout (e.g., resume editor shell) via a parent route with an `<Outlet />` |
| **Error** | 404 catch-all, 403 forbidden, 500 fallback boundary | Rendered outside auth guards, always reachable |

### Navigation flow (conceptual)
```
Unauthenticated user → GuestRoute-guarded pages only (login/register/landing)
      │ successful login
      ▼
Protected app shell (DashboardLayout)
      │
      ├── /dashboard → overview
      ├── /resumes → list → /resumes/:id → nested (edit | preview | ats-check | versions)
      ├── /templates
      ├── /job-matching
      ├── /notifications
      ├── /profile, /settings
      │
      └── (if role === ADMIN) /admin/* → AdminLayout shell
```

Each feature module contributes its own `routes.jsx` (Part 2), merged into the root tree in `routes/index.jsx` — adding a new feature never requires editing unrelated route files, only adding one import.

---

## PART 5 — State Management

| State type | Belongs where | Examples |
|---|---|---|
| **Local component state** | `useState`/`useReducer` inside the component | A dropdown's open/closed state, an input's uncommitted value |
| **Context** | `context/` (global) or a feature-scoped context provider | Auth session (user, role, token presence), theme, feature flags — data that's genuinely global and changes rarely |
| **Global store** | `store/` — introduced only if Context's re-render characteristics become a measured problem | Cross-feature client state with frequent updates read by many disconnected components (e.g., a real-time notification count) |
| **Server state** | A dedicated data-fetching pattern (e.g., a query-caching library, decided at implementation time) — never stored in Context or a global store | Resume data, ATS reports, job matches — anything that originates from and is validated against the backend |

### Trade-offs and recommendation
- **Context is the default** for genuinely global, infrequently-changing state (auth, theme) — simplest option, no extra dependency.
- **A dedicated global store (e.g., Zustand/Redux Toolkit) is deferred** until a concrete need appears (e.g., complex cross-feature client-only state like a multi-panel AI assistant session) — introducing it prematurely adds boilerplate and a second state paradigm for no immediate benefit.
- **Server state is never treated as client state.** Resume data fetched from the backend should live in a caching/fetching layer (e.g., a query library) with its own loading/error/staleness handling, not copied into Context or manually synced — this avoids the classic bug class of "the UI shows stale data because someone forgot to manually refetch."

**Rule of thumb:** if the data came from an API, it's server state. If it only exists in the browser and is genuinely shared across distant components, it's Context (or store, once justified). If it's local to one component's rendering, it's local state.

---

## PART 6 — API Layer

```
api/
├── axiosInstance.js        # Single configured Axios instance (baseURL from config/, timeout, headers)
├── interceptors/
│   ├── requestInterceptor.js     # Attaches JWT from the auth session to every outgoing request
│   └── responseInterceptor.js       # Global error normalization, triggers token refresh on 401
├── tokenRefresh.js           # Encapsulates the refresh-token flow, called by the response interceptor
└── errorHandler.js             # Maps backend error response shape (Backend Architecture doc, Part 7) to a frontend-friendly error object
```

Each feature then has its own `features/*/api/` module (e.g., `features/resume/api/resumeApi.js`) that imports the shared `axiosInstance` and defines only the endpoints that feature needs — never a second axios instance per feature.

### Request interceptors
Attach the JWT bearer token from the auth session automatically — individual API calls never manually add the `Authorization` header, eliminating an entire class of "forgot to attach the token" bugs.

### Response interceptors
- Normalize every error response into the frontend's standard error shape, regardless of which backend endpoint produced it — feature code never has to know the raw Axios error structure.
- On a `401` response, trigger the token refresh flow once, retry the original request, and only redirect to login if refresh itself fails — this logic lives centrally, not duplicated per API call.

### Retry strategy
Applied selectively — safe to auto-retry idempotent GET requests on transient network failures (with backoff), but AI generation calls (Part 7, Backend Architecture Part 11) are **not** blindly auto-retried by the interceptor layer, since a retried AI request may have cost/billing implications; retry decisions for those live explicitly in the feature's calling code.

### API Modules
One module per feature (`resumeApi.js`, `atsApi.js`, `aiApi.js`) exporting plain functions (`getResume(id)`, `createResume(data)`) — components and hooks call these functions, never `axios` directly.

### Independence from backend implementation details
- Feature code never constructs URLs inline — all endpoint paths live inside the feature's `api/` module.
- Response shapes are normalized (matched against `types/`, Part 2) at the API-module boundary, so if the backend's envelope shape (Backend Architecture doc, Part 6) evolves, only the API layer needs updating, not every component that consumes the data.

---

## PART 7 — Form Architecture

The Resume Builder is the largest form surface in the app — architecture here matters disproportionately.

| Concern | Approach |
|---|---|
| **Validation** | Shared validation schemas (`validators/`, Part 2) define rules once, reused both for inline field validation and full-section validation before save — mirrors backend Bean Validation rules (Backend Architecture doc, Part 8) so frontend and backend never silently disagree on what's valid. |
| **Error Display** | Field-level errors shown inline, next to the field; section-level/summary errors shown at the top of a form step — consistent pattern across every form in the app via the shared `FormField` component (Part 3). |
| **Autosave** | Resume editing autosaves on a debounced interval (and/or on field blur) rather than requiring an explicit "Save" click — implemented as a feature-specific hook (`useResumeAutosave` in `features/resume/hooks/`) that calls the resume API module, with a visible "saving/saved" status indicator. |
| **Dirty State** | Tracked per form/section so the UI can warn on navigation away with unsaved changes, and so autosave only fires when something actually changed. |
| **Multi-step Forms** | A shared `MultiStepFormWizard` shell (Part 3) manages step navigation, progress indication, and per-step validation gating; each step's actual fields are feature-specific content passed into the shell. |
| **Draft Saving** | Distinct from autosave-in-progress-editing: an explicit "save as draft" maps to the backend's Resume draft state (Database Design doc, Part 10), while autosave is the mechanism that keeps the draft continuously up to date. |

**Principle:** the resume editing form treats the backend as the source of truth for validation rules where they matter for data integrity (e.g., required fields for ATS scoring to work), while providing immediate client-side feedback for UX — client validation is a UX convenience, never the sole gatekeeper, since the backend re-validates independently (Backend Architecture doc, Part 8).

---

## PART 8 — Design System

| Category | Approach |
|---|---|
| **Buttons** | A small fixed set of variants (primary, secondary, destructive, ghost) and sizes — no ad hoc one-off button styles created per feature. |
| **Inputs** | Shared `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup` primitives — every form in the app (auth, resume, settings) composes from these, never raw `<input>` elements styled inline. |
| **Cards** | One `Card` primitive with slot-based composition (header/body/footer) reused for resume cards, template cards, job match cards — visual consistency without duplicated markup patterns. |
| **Tables** | One shared `Table` primitive (used by admin user lists, job match lists) supporting sorting/pagination props generically. |
| **Dialogs** | One shared `Modal`/`Dialog` primitive with consistent focus-trap and close behavior (Part 10) — no feature builds its own modal. |
| **Dropdowns** | One shared `Dropdown`/`Menu` primitive for both simple selects and action menus. |
| **Navigation** | `Navbar` and `Sidebar` are layout-level (Part 3), but their interactive sub-elements (nav item, active-state indicator) are shared primitives. |
| **Typography** | A fixed type scale (heading levels, body, caption) defined as Tailwind theme tokens (`styles/`) — components reference the scale, never arbitrary font sizes. |
| **Icons** | One icon library/source, wrapped in a consistent `Icon` usage pattern so swapping icon sets later touches one place. |
| **Colors** | A semantic token layer (`primary`, `danger`, `success`, `muted`) defined once in `styles/`/Tailwind config — components reference semantic names, never raw hex values, which is also what makes Dark Mode (Part 13) additive rather than a rewrite. |
| **Spacing** | A consistent spacing scale (Tailwind's default scale, used consistently) — no arbitrary pixel values scattered through the app. |
| **Responsive Breakpoints** | A small, fixed set of breakpoints (mobile/tablet/desktop) defined once in Tailwind config, used consistently rather than ad hoc `max-width` media queries per component. |

### Consistency rules
- No component reaches for a raw color/spacing/font-size value — everything routes through the shared tokens.
- A new visual pattern is proposed as an addition to the design system (Part 8) before being used feature-specifically — prevents every feature slowly inventing its own visual language.

---

## PART 9 — Performance

| Strategy | When to use |
|---|---|
| **Lazy Loading** | Route-level: each feature's page bundle is lazy-loaded (`React.lazy`) so users only download code for the features they visit — critical given the number of planned features (14+). |
| **Code Splitting** | Natural byproduct of feature-based folder structure (Part 2) combined with route-level lazy loading — the Admin module in particular should never be in the main bundle for regular users. |
| **Image Optimization** | Resume template thumbnails and any user-uploaded images (avatar) served in optimized formats/sizes; lazy-loaded below the fold (e.g., template gallery). |
| **Memoization** | Applied selectively to expensive derived computations (e.g., live resume preview re-render, ATS score visualization) — not applied reflexively to every component, which adds complexity without benefit for cheap renders. |
| **Virtualization** | Applied to long lists that could grow large (job match results, admin user tables) — not needed for inherently short lists (a resume's own sections). |
| **Bundle Optimization** | Vite's production build + route-level code splitting is the primary lever; periodically audit bundle size per route to catch an accidentally-bundled heavy dependency. |
| **Caching** | Server state caching (Part 5) avoids redundant API calls for data that hasn't changed (e.g., Template list, ATS reference data) — paired with backend caching (Backend Architecture doc, Part 5). |
| **Skeleton Loading** | Used for any data-dependent view with meaningful load time (resume list, ATS report generation, AI suggestion loading) — improves perceived performance versus a blank screen or spinner-only state, particularly important for AI calls which are inherently slow (Backend Architecture doc, Part 11). |

**Principle:** performance techniques are applied where the feature's actual usage pattern justifies them (long lists, slow AI calls, many routes) — not uniformly everywhere, which adds maintenance cost without measurable benefit.

---

## PART 10 — Accessibility

| Area | Standard |
|---|---|
| **Keyboard Navigation** | Every interactive element (buttons, form fields, modals, dropdowns) reachable and operable via keyboard alone — enforced as a requirement on every shared design-system component (Part 8), so it's inherited by every feature automatically. |
| **Screen Readers** | Meaningful accessible names on all interactive elements and images; dynamic content changes (AI suggestion appearing, autosave status) announced via appropriate live-region patterns. |
| **Focus Management** | Modals trap focus while open and return focus to the triggering element on close (built once into the shared `Modal` primitive, Part 8); route changes move focus to the new page's main heading. |
| **Color Contrast** | Design tokens (Part 8) are chosen/validated to meet WCAG AA contrast ratios by default, so individual features don't need to reason about contrast per use. |
| **ARIA Attributes** | Used to supplement semantic HTML where native elements aren't sufficient (custom dropdowns, tab panels) — never used to patch over non-semantic markup that could have been a native element instead. |
| **Semantic HTML** | Native elements (`<button>`, `<nav>`, `<table>`, `<label>`) preferred over generic `<div>`s with click handlers — the default assumption for every component, with ARIA as the exception, not the rule. |
| **Responsive Accessibility** | Touch targets sized appropriately on mobile breakpoints (Part 8); no functionality that's available on desktop hover-only interactions becomes inaccessible on touch devices. |

**Enforcement point:** because interaction patterns (focus trap, keyboard handling) are built once into shared design-system primitives (Part 8), individual feature developers inherit accessibility correctness by using the shared components — accessibility isn't something each feature has to re-implement or remember.

---

## PART 11 — Frontend Security

| Concern | Approach |
|---|---|
| **JWT Storage** | Access token held in memory (React state/Context), **not** `localStorage`, to reduce XSS exfiltration risk; refresh token handling follows the backend's chosen mechanism (Backend Architecture doc, Part 12 — e.g., httpOnly cookie) so the frontend never directly reads/stores the refresh token in JS-accessible storage. |
| **XSS Prevention** | Never render unsanitized user or AI-generated content via `dangerouslySetInnerHTML`; React's default JSX escaping is relied upon, and any case requiring raw HTML rendering (rare — e.g., a rich-text resume field) goes through an explicit sanitization step. |
| **CSRF Considerations** | Primarily a backend concern given the JWT-bearer design (Backend Architecture doc, Part 12), but if any cookie-based mechanism is used for the refresh token, the frontend respects `SameSite` cookie behavior and never needs to manually attach CSRF tokens to bearer-authenticated requests. |
| **Input Sanitization** | Client-side validation (Part 7) is a UX layer, not a security boundary — all real sanitization/validation is enforced server-side; the frontend's job is to not blindly trust or re-render unvalidated input. |
| **Route Protection** | `ProtectedRoute`/`AdminRoute` (Part 4) prevent rendering protected UI without a valid session, but this is a UX convenience, not the actual security boundary — the backend independently enforces authorization on every request regardless of what the frontend shows. |
| **Secure API Calls** | All API calls go over HTTPS; the shared Axios instance (Part 6) is the only path to the backend, so security headers/token attachment logic exists in exactly one place, not duplicated per feature. |

**Core principle:** the frontend's security measures are about **defense in depth and good UX**, never the actual trust boundary — every authorization and validation decision is re-enforced by the backend (Backend Architecture doc, Parts 8 & 12), because client-side code is inherently visible and modifiable by the end user.

---

## PART 12 — Frontend Development Standards

| Rule | Standard |
|---|---|
| **Folder naming** | `camelCase` for feature/utility folders (`jobMatching/`), lowercase for structural folders (`components/`, `hooks/`) |
| **File naming** | `PascalCase.jsx` for components (`ResumeCard.jsx`), `camelCase.js` for hooks/utils/services (`useResumeAutosave.js`, `resumeApi.js`) |
| **Component naming** | `PascalCase`, descriptive of what it renders, not how (`AtsScoreGauge`, not `Circle1`) |
| **Hook naming** | Always prefixed `use` (`useDebounce`, `useAuthSession`) per React convention, camelCase after the prefix |
| **Custom hook rules** | A custom hook exists to extract genuinely reusable stateful logic (data fetching pattern, subscription, debouncing) — not created reflexively for logic used only once in one component |
| **Service rules** | Files in `services/` contain no React (no hooks, no JSX) — pure logic callable from anywhere, testable without rendering |
| **Utility rules** | Files in `utils/` are pure functions — same input always produces same output, no side effects, no API calls |
| **Styling rules** | Tailwind utility classes are the default; no separate CSS files per component unless a genuinely complex animation/layout requires it — keeps styling co-located and consistent with the design system (Part 8) |
| **Import organization** | Grouped and ordered: external packages → shared (`components/`, `hooks/`, `utils/`) → feature-internal → relative — enforced by lint config, not manual discipline |
| **Code formatting** | Enforced automatically via Prettier + ESLint (Setup Guide, Part 6/8) — not a matter of individual preference or PR debate |
| **Documentation expectations** | Complex hooks and non-obvious business logic get a brief comment explaining *why*; component props are self-documenting via clear naming and, once TypeScript is adopted, explicit types rather than prop-type comments |

---

## PART 13 — Future Expansion (No Major Restructuring Required)

| Feature | How it attaches |
|---|---|
| **Dark Mode** | Additive — since colors are already semantic tokens (Part 8), dark mode is a second token set + a theme toggle stored in Context; no component needs to change. |
| **Internationalization (i18n)** | An i18n provider added at the app root (Context, Part 5) and a translation-key convention adopted; existing components swap hardcoded strings for translation keys incrementally, not all at once — the architecture doesn't block a gradual rollout. |
| **Multiple Themes** | Extension of the Dark Mode pattern — more token sets, same mechanism, no structural change. |
| **Premium Features** | Gated by reading subscription/entitlement state (mirrors backend Subscription entity, Database Design doc Part 2) from the auth/session Context — a `PremiumRoute` guard or conditional rendering pattern, following the same shape as `AdminRoute` (Part 4). |
| **Offline Support** | Service worker + a defined caching strategy for static assets and possibly last-known server state — layers on top of the existing API layer (Part 6) as an enhancement, doesn't require replacing it. |
| **Notifications** | Already scaffolded as its own feature module (Part 2); real-time delivery (below) attaches to the same feature. |
| **Collaboration** | New feature module (`features/collaboration/`) plus real-time updates (below) for a resume being edited by multiple users — additive feature, uses existing routing/auth patterns. |
| **Real-time Updates** | A WebSocket/SSE connection managed centrally (a new `services/realtime.js` or similar), with features subscribing to relevant event types — doesn't require restructuring the API layer, sits alongside it. |
| **Plugin System** | If ever needed (e.g., third-party resume template plugins), the existing feature-module boundary (Part 2) already demonstrates the isolation pattern a plugin architecture would need — feature modules are already loaded somewhat independently via lazy route-based code splitting (Part 9). |

**Unifying principle:** because styling is token-based, state is layered (local/Context/store/server) rather than monolithic, and features are isolated modules with a defined public-export boundary, every item above is satisfied by **adding a new feature module, a new token set, or a new Context provider** — never a rewrite of existing feature code.

---

## PART 14 — Common Frontend Architecture Mistakes

| # | Mistake | Why it happens | Why harmful | How professionals avoid it |
|---|---|---|---|---|
| 1 | Storing server data in `useState`/Context and manually keeping it in sync | Feels simpler than learning a data-fetching library | Stale data bugs, duplicated fetch logic, no automatic revalidation | Treat server state distinctly (Part 5) |
| 2 | Storing JWT in `localStorage` | Simplicity, common tutorials do it | Vulnerable to XSS-based token theft | In-memory storage + secure refresh mechanism (Part 11) |
| 3 | One massive global store for all state | Seems like a single source of truth | Every component re-renders on unrelated state changes, hard to reason about | Layered state strategy (Part 5) — local/Context/store/server only where each fits |
| 4 | Prop drilling many levels instead of using Context appropriately | Avoiding "premature" Context usage | Fragile, hard-to-refactor component trees | Introduce Context at the right global boundary, not too early or late |
| 5 | Introducing Context for everything, including frequently-changing data | Overcorrecting from prop drilling | Excessive re-renders across the whole subtree | Reserve Context for infrequently-changing global data (Part 5) |
| 6 | Feature folders reaching into each other's internal files | No enforced public-export boundary | Tight coupling, impossible to refactor one feature without breaking another | `index.js` public export boundary per feature (Part 2) |
| 7 | Building a new modal/dropdown/button per feature instead of reusing the design system | Faster in the moment | Visual inconsistency, duplicated accessibility bugs | Shared design-system primitives (Part 8) |
| 8 | No route-level code splitting | Not thought about until bundle size becomes a problem | Slow initial load as the app grows | Lazy-load every feature's routes from day one (Part 9) |
| 9 | Manually attaching the auth token to every API call | Not centralizing early | Easy to forget on a new call, inconsistent error handling | Centralized Axios interceptor (Part 6) |
| 10 | No centralized error handling for API failures | Each component handles errors its own way | Inconsistent UX, duplicated error-parsing logic | Response interceptor + shared error shape (Part 6) |
| 11 | Client-side validation treated as the only validation | Assuming the frontend is trustworthy | Security vulnerability if backend doesn't independently validate | Backend re-validates always (Part 7, Part 11) |
| 12 | Using `dangerouslySetInnerHTML` for AI-generated or user content without sanitization | Convenience for rendering formatted text | XSS vulnerability | Rely on JSX escaping; sanitize explicitly if raw HTML is unavoidable (Part 11) |
| 13 | Deeply nested prop-based conditional rendering for role-based UI | Ad hoc as admin features get added | Hard to audit who can see what | Centralized route guards + explicit role checks (Part 4) |
| 14 | No skeleton/loading states, blank screens during fetch | Overlooked during initial build | Feels broken/slow to users, especially for AI calls | Skeleton loading as a standard pattern (Part 9) |
| 15 | Over-memoizing everything with `useMemo`/`useCallback` reflexively | Cargo-culting performance advice | Added complexity, sometimes worse performance than no memoization | Memoize only measured, expensive computations (Part 9) |
| 16 | Not virtualizing long lists | Not anticipated until real data volume appears | Slow rendering, janky scrolling at scale | Virtualization for lists that can grow large (Part 9) |
| 17 | Inconsistent file/folder naming across the codebase | No enforced convention from day one | Harder navigation, inconsistent imports | Documented naming standards (Part 12), enforced via lint |
| 18 | Business logic embedded directly inside components | Fastest path to a working feature | Untestable without rendering, duplicated logic across components | Extract to hooks/services (Part 2, Part 12) |
| 19 | Hardcoded colors/spacing instead of design tokens | Faster than looking up the token | Inconsistent visuals, painful to theme later (Dark Mode) | Token-only styling rule (Part 8) |
| 20 | No accessibility consideration until an audit forces it | Reactive rather than built-in | Expensive retrofit, excludes real users in the meantime | Accessibility built into shared primitives from day one (Part 10) |
| 21 | Building custom form state management from scratch per form | Not evaluating existing patterns | Inconsistent validation/error UX, duplicated bugs | Shared form patterns and validation schemas (Part 7) |
| 22 | Ignoring autosave/dirty-state for a long editing flow like the Resume Builder | Not anticipated until users lose work | Data loss, poor UX for the app's core feature | Autosave + dirty-state tracking designed upfront (Part 7) |
| 23 | Fetching the same reference data (Templates, ATS rules) repeatedly across components | Each component fetches independently | Redundant network calls, inconsistent data if one fetch is stale | Server-state caching layer (Part 5, Part 9) |
| 24 | No environment-based configuration, hardcoded API URLs | Simplicity during local development | Breaks or requires manual editing when deploying to different environments | Centralized `config/` reading Vite env vars (Part 2) |
| 25 | Mixing feature-based and layer-based organization inconsistently | No architecture decision made upfront | Confusing structure, new features placed inconsistently | Explicit, documented folder structure decision (Part 1, Part 2) |
| 26 | Not lazy-loading the Admin module | Overlooked since admin isn't used by most users | Regular users download admin-only code unnecessarily | Route-level code splitting applied to every feature, especially low-traffic ones like Admin (Part 9) |
| 27 | Treating AI response latency the same as a normal API call in the UI | Not accounting for AI's inherent slowness | Confusing UX (no feedback during a multi-second wait) | Explicit loading/status components for AI interactions (Part 3, Part 9) |
| 28 | No plan for how new global client-only state (e.g., real-time notification count) fits into existing state layers | Added ad hoc as features arrive | Inconsistent state management patterns across the app | Evaluate every new piece of state against the layered strategy (Part 5) before implementing |
| 29 | Duplicating validation logic between a form's inline checks and its submit handler | Not sharing a single schema | Inconsistent validation behavior, bugs when one is updated and not the other | Single shared validation schema per form (Part 7, Part 2 `validators/`) |
| 30 | Assuming TypeScript (or type safety generally) can be "added later" without planning for it | Deferred as non-urgent | Retrofitting types onto an untyped, large codebase is expensive and error-prone | Establish a `types/` convention and TypeScript-ready patterns from day one, even before full adoption (Part 2) |
| 31 | No shared error boundary strategy — one component crash takes down the whole app | Not considered until it happens in production | Poor resilience, entire app blank on one feature's bug | Route-level (or feature-level) error boundaries isolating failures |

---

## Summary

This architecture is **feature-based at the top level, layer-based within each feature**, mirroring the backend's modular monolith structure so frontend and backend developers share a consistent mental model. State is deliberately layered (local → Context → store → server) rather than defaulting to one paradigm for everything, and every cross-cutting concern (API calls, design tokens, validation schemas, route guards) exists in exactly one place, so features remain additive — every item in Part 13 attaches without requiring existing feature code to change.


# 9 Authentication

## JWT in plain English

A JWT (simple meaning: a signed digital identity card) has header, claims, and signature. Claims name the subject and timing/issuer/audience facts. The signature detects tampering; it does not hide the claims. Therefore secrets never belong inside a JWT.

`	ext
login credentials
      |
      v
password hash comparison
      |
      +--> short access JWT --> JavaScript memory --> Authorization header
      |
      +--> random refresh token --> hashed DB row
                         \-----> HttpOnly + SameSite cookie
`

Logout revokes the refresh record and expires the cookie. Refresh rotates the token, so replaying an older refresh token should fail. There is no separate refresh JWT stored in local storage.

## Complete security teaching reference

# AI Resume Builder — Authentication & Security Architecture Blueprint

**Audience:** Backend, Frontend, QA, DevOps
**Status:** Architectural specification — no implementation code included
**Stack context:** Java 21 / Spring Boot / Spring Security / JWT / MySQL / React 19 / Docker

---

## 1. Authentication Philosophy

### 1.1 Authentication vs Authorization

| | Authentication (AuthN) | Authorization (AuthZ) |
|---|---|---|
| Question | "Who are you?" | "What are you allowed to do?" |
| Input | Credentials (password, OAuth token, biometric) | Identity + Roles/Permissions |
| Output | A verified identity (principal) | An access decision (allow/deny) |
| Failure mode | 401 Unauthorized | 403 Forbidden |
| Layer | Identity layer | Policy/decision layer |

These must be architecturally **decoupled**. Authentication produces a `SecurityContext` (a verified principal). Authorization is a separate decision engine that consumes that context plus resource metadata (ownership, role, plan tier) to decide access. Coupling them (e.g., baking role checks into the login flow) is a common design mistake that makes RBAC/ABAC expansion painful later.

### 1.2 Identity vs Permissions

- **Identity** = the durable "who" — user ID, email, account status. Rarely changes.
- **Permissions** = the "what can they do" — derived from roles, subscription tier, and resource ownership. Changes frequently (upgrades, downgrades, admin promotions).

Design implication: identity belongs in the token as a stable claim (`sub`); permissions should be **resolved at authorization time from the database/cache**, not frozen into a long-lived token, or they go stale (e.g., a demoted admin keeps admin access until token expiry).

### 1.3 Stateless vs Stateful Authentication

| | Stateless (JWT) | Stateful (Server Session) |
|---|---|---|
| Server storage | None (or minimal — revocation list) | Session store required (Redis/DB) |
| Horizontal scaling | Trivial | Needs sticky sessions or shared store |
| Revocation | Hard (needs denylist) | Instant |
| Mobile/SPA friendliness | High | Lower (cookie-centric) |
| Microservice friendliness | High (token passed downstream) | Low (needs session lookup per service) |

### 1.4 Why JWT Is Appropriate Here

- React SPA + future mobile clients + future API clients (job boards, ATS integrations) all favor a **bearer-token, stateless** model.
- Future roadmap includes API Clients and third-party integrations — JWTs are the natural fit for service-to-service and public API auth.
- Horizontal scaling on Render/AWS with multiple backend instances is simpler without sticky sessions.

### 1.5 Trade-offs of JWT

- Revocation is not instant unless you maintain a denylist/short expiry.
- Token size grows with claims — keep access tokens lean.
- If stored insecurely on the frontend, they're vulnerable to XSS-based theft.
- Requires careful signing-key management and rotation strategy.

### 1.6 When Sessions Would Be Preferable

- If the product were server-rendered (not the case here).
- If instant, centralized revocation was the top priority over scaling (e.g., banking).
- If there were no plans for mobile apps or third-party API consumers.

### 1.7 Recommendation

**Hybrid stateless-JWT model**:
- Short-lived **access token** (JWT, stateless, 10–15 min).
- Long-lived **refresh token** (opaque or JWT, stored server-side/hashed, rotated on use).
- This gives JWT's scaling benefits while retaining session-like revocation control through the refresh-token store.

---

## 2. User Identity Model

### 2.1 Conceptual Entities

```
User
 ├── Identity (id, email, status, createdAt)
 ├── Credentials (passwordHash, lastPasswordChange)
 ├── Roles[] (e.g., USER, ADMIN, RECRUITER)
 ├── Permissions[] (derived from Role + Plan + Ownership)
 ├── Claims (issued into JWT: sub, roles, plan, sessionId)
 ├── Ownership (resumes, cover letters, shared links)
 ├── AccountStatus (PENDING_VERIFICATION, ACTIVE, LOCKED, DEACTIVATED, DELETED)
 └── Lifecycle timestamps (createdAt, verifiedAt, lastLoginAt, deactivatedAt)
```

### 2.2 Roles vs Permissions vs Privileges vs Claims

- **Role** — a named bundle of permissions (`USER`, `ADMIN`, `RECRUITER`, `PREMIUM_USER`, `GUEST`, `API_CLIENT`). Coarse-grained.
- **Permission** — a specific allowed action (`resume:create`, `resume:delete:own`, `admin:users:manage`, `job:post`). Fine-grained, ideally modeled independently of role so roles are just permission sets.
- **Privilege** — often used interchangeably with permission; in this design, treat privilege as a *runtime-elevated capability* (e.g., "currently impersonating a user" for support), distinct from a standing permission.
- **Claim** — a piece of identity/authorization data embedded in the JWT (`sub`, `roles`, `plan`, `email_verified`). Claims are a **cache** of authorization-relevant facts at token-issuance time, not the source of truth.

### 2.3 Ownership Model

Every resource (resume, cover letter, shared link) has an `ownerId`. Authorization for resource-level actions is **ownership-first**: `isOwner(user, resource) OR hasRole(ADMIN)`. This is the foundation for ABAC expansion later (e.g., team/collaboration features).

### 2.4 Account Status Lifecycle

```
REGISTERED (unverified) → ACTIVE → [LOCKED ⇄ ACTIVE] → DEACTIVATED → DELETED
                                         ↑
                                  (failed logins / admin action)
```

### 2.5 Future Role Expansion

| Role | Notes |
|---|---|
| `GUEST` | Unauthenticated or anonymous session — limited to preview/demo features |
| `USER` | Standard authenticated user, base permission set |
| `PREMIUM_USER` | `USER` + feature-gated permissions (AI generation limits lifted, ATS checker, etc.) — modeled as an **entitlement**, not a hardcoded role check |
| `RECRUITER` | Distinct permission set: job posting, candidate search, resume visibility into shared/opted-in profiles |
| `ADMIN` | Full platform management, user lifecycle control, audit visibility |
| `API_CLIENT` | Machine identity, scoped permissions, no password — API-key/OAuth2 client-credentials issued |

Design principle: **roles are not hardcoded gates**. Store permissions in a `role_permission` mapping conceptually, so adding `RECRUITER` later doesn't require touching every authorization check — only the mapping.

---

## 3. Authentication Lifecycle

### 3.1 Registration → Verification

```
User submits email+password
        │
        ▼
Validate input (format, password policy, uniqueness)
        │
        ▼
Hash password (bcrypt/Argon2) → persist User (status = PENDING_VERIFICATION)
        │
        ▼
Generate verification token (short-lived, single-use) → email link
        │
        ▼
User clicks link → status = ACTIVE
```

### 3.2 Login → Token Issuance

```
User submits credentials
        │
        ▼
Verify status != LOCKED/DEACTIVATED/DELETED
        │
        ▼
Verify password hash match
        │
        ▼
Issue Access Token (JWT, short TTL) + Refresh Token (long TTL, stored hashed server-side)
        │
        ▼
Record login event (audit) → return tokens to client
```

### 3.3 Authenticated Requests

```
Client → Authorization: Bearer <access token>
        │
        ▼
Filter validates signature + expiry + claims
        │
        ▼
SecurityContext populated → Authorization layer checks permission
        │
        ▼
Request proceeds or 403
```

### 3.4 Token Expiration & Refresh

```
Access token expires (401 on next request)
        │
        ▼
Client silently calls /refresh with refresh token
        │
        ▼
Server validates refresh token (not revoked, not expired, matches stored hash)
        │
        ▼
Issue NEW access token + ROTATE refresh token (old one invalidated)
```

### 3.5 Logout

```
Client discards access token (client-side)
        │
        ▼
Server revokes/deletes the refresh token record
        │
        ▼
(Optional) Access token added to short-lived denylist if immediate revocation required
```

### 3.6 Password Change / Reset / Account Recovery

- **Password change** (logged in): re-verify current password → update hash → **invalidate all existing refresh tokens** (force re-login on other devices) → audit event.
- **Password reset** (forgot password): generate single-use, short-lived reset token → email → verify token → set new password → invalidate all sessions.
- **Account recovery**: fallback path (secondary email / support-assisted) for cases where email access is lost — always paired with manual identity verification and heavy audit logging.

### 3.7 Deactivation vs Deletion

- **Deactivation**: reversible, status flag flip, data retained, all tokens revoked, login blocked with a "reactivate" path.
- **Deletion**: user-initiated erasure request → soft-delete window (e.g., 30 days) for recovery → hard delete/anonymization for compliance (GDPR-style "right to be forgotten"), with owned resources cascade-handled (deleted or anonymized).

---

## 4. JWT Architecture

### 4.1 Token Types

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access Token | 10–15 min | Memory (frontend) — never localStorage | Authorizes API calls |
| Refresh Token | 7–30 days | HttpOnly, Secure, SameSite cookie *or* server-side record keyed to device | Mints new access tokens |

### 4.2 Claims Design (Access Token)

Minimal, non-sensitive, authorization-relevant only:
- `sub` (user ID)
- `roles` (coarse role list)
- `plan` (free/premium tier, for quick UI gating — **never trust this alone for server-side authorization**)
- `sessionId` / `jti` (unique token ID — enables targeted revocation)
- `iat`, `exp`, `iss`, `aud`

Never place: password hash, full PII, permanent permission lists (these should be resolved server-side per-request for anything sensitive).

### 4.3 Expiration Strategy

- Access: short (minimizes theft window).
- Refresh: longer, but **rotated on every use** (rotation-on-use = old refresh token immediately invalidated, detects token replay if an old one is reused → treated as a theft signal → revoke entire token family).

### 4.4 Signing

- Asymmetric signing (RS256/ES256) preferred over HMAC (HS256) once there are multiple services or the frontend/other services need to verify tokens without holding the signing secret — private key stays with the auth service, public key distributed for verification.
- Key rotation strategy: support multiple active `kid` (key ID) values so old tokens remain verifiable during rotation windows.

### 4.5 Validation

Every request: signature check → expiry check → issuer/audience check → (optional) denylist/revocation check → claims parsed into `SecurityContext`.

### 4.6 Rotation & Revocation

- Refresh tokens: rotated every use, stored hashed, one active family per device/session.
- Access tokens: not revocable individually without a denylist; mitigated by short TTL.
- **Denylist** (Redis, TTL = remaining token life): used only for high-severity events (logout-everywhere, compromised account, admin force-logout) — not for routine logout, to avoid unnecessary state.

### 4.7 Multi-Device Support (Future)

Model refresh tokens as **one row per device/session**, not one per user:

```
User ──< Sessions (deviceId, refreshTokenHash, createdAt, lastUsedAt, ip, userAgent)
```

This enables "manage active sessions," "log out this device," and "log out everywhere" as future features without redesign.

### 4.8 Trade-offs Summary

| Decision | Benefit | Cost |
|---|---|---|
| Short access TTL | Limits theft window | More refresh calls |
| Refresh rotation | Detects replay/theft | Slightly more DB writes |
| Asymmetric signing | Safe multi-service verification | Key management overhead |
| Per-device sessions | Rich device management UX | More storage/complexity |

---

## 5. Authorization Model

### 5.1 Layered Model: RBAC → ABAC-ready

- **Baseline**: Role-Based Access Control (`ADMIN`, `USER`, `RECRUITER`, `PREMIUM_USER`, `API_CLIENT`).
- **Resource layer**: Ownership check on top of role (`resume:edit` requires `isOwner OR ADMIN`).
- **Attribute layer (future)**: plan tier, feature flags, team membership — enables ABAC without replacing the RBAC core (e.g., "allow if role=USER AND plan=PREMIUM AND feature.atsChecker=enabled").

### 5.2 Permission Model (conceptual)

```
Permission = (action, resourceType, scope)
e.g. ("create", "resume", "own")
     ("delete", "resume", "any")     -- admin only
     ("post", "job", "own")          -- recruiter
     ("view", "analytics", "own")    -- premium
```

Roles map to permission *sets*; authorization checks against permissions, never against role names directly in business logic — this indirection is what makes adding `RECRUITER` or new premium tiers non-breaking.

### 5.3 Feature/Premium Gating

Treat premium features as **entitlements** resolved server-side per request (from subscription status in DB/cache), not from a JWT claim alone — subscriptions can lapse mid-token-life (e.g., payment failure) and access must reflect that promptly.

### 5.4 Admin Access

Admin actions (role changes, user lockout, content moderation) require:
- `ADMIN` role check, AND
- Step-up consideration for highly sensitive actions (see MFA in Part 11), AND
- Mandatory audit logging (Part 10).

### 5.5 Extensibility

New roles/permissions should be addable via configuration/data (role_permission mapping), not new code paths — critical given the long future-feature roadmap (Job Matching, Collaboration, Analytics all imply new permission types).

---

## 6. Frontend Security (React 19)

### 6.1 Route Guards

- **Protected routes**: require valid access token + role/permission check before rendering; unauthenticated → redirect to login, preserving intended destination.
- **Guest routes**: (login/register) redirect away if already authenticated.
- Route guards should check both authentication *and* authorization (e.g., `/admin` guarded by role, not just login status).

### 6.2 Token Storage

| Option | XSS Risk | CSRF Risk | Recommendation |
|---|---|---|---|
| `localStorage` | High (readable by any injected script) | None | Avoid for access tokens |
| In-memory (JS variable/React state) | Low (lost on refresh, by design) | None | **Access token: yes** |
| HttpOnly Secure cookie | Not directly readable by JS | Needs CSRF defenses | **Refresh token: yes** |

Recommended split: access token in memory only (re-fetched via silent refresh on page load); refresh token in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie.

### 6.3 Token Refresh Flow (Frontend)

- Axios interceptor: on `401`, attempt silent `/refresh` call once → retry original request → if refresh fails, force logout + redirect to login.
- Use a request queue/mutex during refresh to avoid a stampede of parallel refresh calls when several requests 401 simultaneously.

### 6.4 Session Expiration UX

- Proactive expiry warning before access-token expiry (optional).
- Graceful forced logout with a clear message when refresh fails, rather than a silent broken UI.

### 6.5 Multi-Tab Behavior

- Since access tokens live in memory (per tab), use `BroadcastChannel` or `storage` events to synchronize logout across tabs (e.g., logging out in one tab should log out all tabs).
- Refresh-token cookie is shared across tabs automatically (browser cookie jar), so a refresh in one tab should broadcast the new auth state to others.

### 6.6 Logout Flow

Frontend clears in-memory token + broadcasts logout event → calls backend logout (revokes refresh token/cookie) → redirects to login.

### 6.7 Frontend Security Considerations

- Sanitize any user-generated content rendered (resume content, cover letters) to prevent stored XSS.
- Never log tokens to console/analytics.
- CSP headers (Part 9) reduce blast radius of any injected script even with in-memory tokens.

---

## 7. Backend Security (Spring Boot / Spring Security — architecture only)

### 7.1 Filter Chain (Conceptual)

```
Request
  → HTTPS enforcement
  → CORS filter
  → Rate limiting filter
  → JWT extraction & validation filter
  → SecurityContext population
  → Authorization filter (role/permission check)
  → Input validation layer
  → Controller
  → Global exception handler
```

### 7.2 Authentication Flow (Backend)

Credential validation is isolated to a dedicated authentication service layer; controllers never touch password hashes directly. On success, a token-issuance service (separate from the authentication check) creates access/refresh tokens — keeping "verify identity" and "issue credentials" as distinct responsibilities.

### 7.3 Authorization Flow

Method- or endpoint-level authorization checks resolve permissions from the authenticated principal at request time (not solely from stale JWT claims) for sensitive operations — balancing performance (cheap claims-based checks for coarse routes) against correctness (DB-backed checks for sensitive/ownership-based actions).

### 7.4 Validation Layers

- **Transport**: HTTPS only.
- **Request shape**: schema/DTO validation (required fields, types, length limits) before business logic runs.
- **Business rules**: ownership, state transitions (e.g., can't reactivate a deleted account).
- **Output**: never leak internal fields (password hash, internal IDs where inappropriate) in responses.

### 7.5 Exception Handling

Centralized exception handler translates internal errors into **generic, non-leaking** responses (Part 9.11) while logging full detail server-side only. Distinguish authentication failures (401) from authorization failures (403) from validation failures (400) consistently across the API.

### 7.6 Security Context Propagation

For any async processing (e.g., AI resume generation jobs), the security context must be explicitly propagated to worker threads — a common gap where background jobs silently run without proper authorization checks.

---

## 8. Password Security

### 8.1 Hashing

- Adaptive hashing algorithm (bcrypt or Argon2id), never MD5/SHA-family alone, never reversible encryption.
- Per-password unique salt (handled automatically by bcrypt/Argon2).
- Configurable work factor, revisited periodically as hardware improves.

### 8.2 Password Policies

- Minimum length (favor length over complexity rules — e.g., 12+ characters) over forced special-character gymnastics that push users toward predictable patterns.
- Check against breached-password lists (e.g., Have I Been Pwned range API) at registration/change time.
- No mandatory periodic rotation without cause (modern guidance: rotate on evidence of compromise, not on a calendar).

### 8.3 Account Lockout / Brute Force Protection

- Progressive delay or temporary lockout after N failed attempts (e.g., exponential backoff), scoped per-account and per-IP to avoid trivial bypass.
- CAPTCHA or equivalent challenge after repeated failures.

### 8.4 Credential Stuffing Protection

- Rate-limit login endpoint aggressively.
- Detect anomalous login patterns (many accounts, same IP/device fingerprint) for monitoring/blocking.
- Encourage MFA adoption (Part 11) as the strongest mitigation.

---

## 9. API Security

| Concern | Architectural Control |
|---|---|
| HTTPS | Enforced everywhere; HSTS header; no plaintext fallback |
| CORS | Explicit allow-list of frontend origins; no wildcard `*` with credentials |
| CSRF | Primarily mitigated by bearer-token-in-header design (not cookie-auth for state-changing calls); if refresh cookie is used, `SameSite=Strict`/CSRF token for the refresh endpoint |
| XSS | Output encoding, CSP headers, sanitize user-generated resume/cover-letter content |
| Injection | Parameterized queries/ORM only, never string-concatenated SQL |
| Rate Limiting | Per-IP and per-account limits, stricter on auth endpoints |
| Input Validation | Schema validation at the edge, whitelist over blacklist |
| Request Size Limits | Cap payload size (especially file/resume uploads) |
| Secure Headers | `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` |
| Replay Attacks | Short-lived tokens, `jti` tracking for sensitive one-time actions (password reset, email verification) |

---

## 10. Audit & Monitoring

### 10.1 Events to Track

- Successful/failed logins (with IP, device, timestamp)
- Password changes/resets
- Role/permission changes
- Account status changes (lock, deactivate, delete)
- Admin actions (any action on another user's data)
- Token issuance/refresh/revocation
- Security-relevant errors (repeated 401/403, validation attacks)

### 10.2 Design Principles

- Audit logs are **append-only** and stored separately from operational data (tamper resistance).
- Never log sensitive values (passwords, full tokens) — log token IDs (`jti`), not the token itself.
- Retention: align with compliance needs (e.g., 90 days hot, longer cold storage for security events); define explicit retention policy per event category.
- Feed high-severity events (repeated failed logins, privilege escalation attempts) into alerting, not just passive storage.

---

## 11. Future Authentication Extensibility

The core model (identity + roles/permissions + JWT session layer) is designed so these integrate **without redesign**:

- **OAuth2/OIDC social login** (Google, GitHub, LinkedIn, Microsoft): treated as alternate credential-verification methods that resolve to the *same* internal `User` identity — a user can link multiple providers to one account.
- **MFA**: modeled as an additional verification step *after* primary credential check, before token issuance — fits into the existing lifecycle without changing token structure (add an `amr`/`mfa` claim).
- **Biometric / Passkeys (WebAuthn)**: another credential-verification method feeding the same "verified identity → issue tokens" pipeline.
- **SSO / Enterprise IdPs (SAML/OIDC)**: for future B2B/recruiter-org customers — federated identity resolves to internal user records via a trusted-issuer mapping, still producing the same internal JWT afterward.

This works because **credential verification is architecturally separate from token issuance** — any new verification method just needs to plug into the same "produce a verified principal" contract.

---

## 12. Threat Model

| Threat | Risk | Impact | Mitigation |
|---|---|---|---|
| Broken Authentication | High | Full account takeover | Strong hashing, MFA-ready design, lockout policy |
| Privilege Escalation | High | Unauthorized admin access | Server-side permission resolution, ownership checks, audit |
| Session Hijacking | Med | Account takeover | Short access TTL, HttpOnly refresh cookie, device binding |
| JWT Theft | Med-High | Impersonation until expiry | Short TTL, in-memory storage, CSP/XSS defenses |
| Replay Attacks | Med | Reuse of stolen tokens | `jti` tracking, refresh rotation with reuse detection |
| Token Leakage (logs/URLs) | Med | Credential exposure | Never put tokens in URLs/logs, header-only transmission |
| Brute Force | Med | Account compromise | Lockout, rate limiting, CAPTCHA |
| Enumeration (register/login/reset) | Low-Med | Reveals valid accounts | Generic error messages, consistent response timing |
| CSRF | Low (bearer-token design) | State-changing actions forged | SameSite cookies, CSRF token on cookie-auth endpoints |
| XSS | High | Token theft, account takeover | CSP, output encoding, sanitization, no localStorage tokens |
| SQL Injection | High | Data breach | ORM/parameterized queries only |
| Insider Threats | Med | Data misuse, unauthorized access | Least privilege, audit logging, admin action review |

---

## 13. Security Standards (Development Rules)

**Password Rules**
- Adaptive hashing only; minimum length policy; breached-password check at signup.

**Authentication Rules**
- All credential verification centralized in one service layer; no ad-hoc auth checks in controllers.

**Authorization Rules**
- All access decisions go through the permission layer; no role-name string comparisons scattered in business logic.

**Secure Coding Rules**
- Parameterized queries only; validate all input at the boundary; never trust client-supplied role/permission data.

**Logging Rules**
- No secrets, tokens, or passwords in logs; structured logs with correlation IDs; separate audit log stream.

**Error Message Rules**
- Generic external messages ("Invalid credentials"); detailed internal logs; no stack traces returned to clients.

**Secret Management**
- Signing keys, DB credentials, API keys in a secrets manager/env-injected, never committed to source control; rotate on schedule and on suspected compromise.

**Configuration Rules**
- Environment-specific configs (dev/staging/prod) strictly separated; production secrets never present in lower environments.

**Code Review Checklist (Security)**
- [ ] New endpoint has explicit authorization check
- [ ] No sensitive data in JWT claims
- [ ] No sensitive data logged
- [ ] Input validated/sanitized
- [ ] Ownership check present for resource access
- [ ] Errors don't leak internal detail
- [ ] Rate limiting considered for new public endpoints

---

## 14. Common Security Mistakes (Selected, High-Value Set)

| # | Mistake | Why It Happens | Why Dangerous | Professional Fix |
|---|---|---|---|---|
| 1 | Storing JWT in `localStorage` | Convenience, common tutorials | Readable by any XSS payload | In-memory access token + HttpOnly refresh cookie |
| 2 | Long-lived access tokens | Avoiding refresh-flow complexity | Large theft window | Short TTL + refresh rotation |
| 3 | Putting permissions/PII in JWT | Avoids DB lookups | Stale/leaked authorization data | Resolve sensitive permissions server-side |
| 4 | No refresh-token rotation | Simpler to implement | Stolen refresh token works indefinitely | Rotate + reuse-detection |
| 5 | Weak/no rate limiting on login | Overlooked until abused | Enables brute force/credential stuffing | Rate limit + lockout + CAPTCHA |
| 6 | Verbose error messages ("user not found" vs "wrong password") | Debugging convenience | Enables account enumeration | Generic unified error messages |
| 7 | Symmetric signing (HS256) shared across services | Simpler setup | Any service with the secret can forge tokens | Asymmetric (RS256/ES256) signing |
| 8 | No password breach checking | Not top-of-mind | Users reuse compromised passwords | Integrate breach-list check at signup/change |
| 9 | Role checks hardcoded as string comparisons in controllers | Fast to write | Unmaintainable, error-prone as roles grow | Centralized permission-resolution layer |
| 10 | No audit logging on admin actions | Deprioritized until incident | No accountability trail | Mandatory audit log on all sensitive/admin ops |
| 11 | CORS wildcard `*` with credentials | Copy-pasted config | Any origin can make authenticated requests | Explicit origin allow-list |
| 12 | Missing CSRF protection on cookie-based endpoints | Assumed JWT = immune | Cookie-based refresh flow still vulnerable | SameSite cookies + CSRF token |
| 13 | Trusting client-side role/permission checks alone | Faster UI development | Backend bypassed via direct API calls | Enforce all checks server-side; UI checks are UX only |
| 14 | No forced logout on password change | Overlooked edge case | Attacker with old session stays logged in | Invalidate all sessions on password change |
| 15 | Reversible password "encryption" instead of hashing | Misunderstanding of hashing vs encryption | Full password exposure on DB breach | Adaptive one-way hashing (bcrypt/Argon2) only |
| 16 | No account lockout | Fear of self-DoS | Unlimited brute-force attempts | Progressive lockout/backoff |
| 17 | Logging tokens or passwords | Debug logging left in place | Secrets exposed via log access | Redact secrets in all logging layers |
| 18 | No input validation on file/resume uploads | Feature shipped fast | Malicious file upload, oversized payloads, XSS via content | Strict size/type validation, content sanitization |
| 19 | Missing security headers (CSP, X-Frame-Options) | Not part of "functional" requirements | Clickjacking, XSS amplification | Standard secure-header baseline on all responses |
| 20 | Single shared signing key never rotated | "If it works, don't touch it" | Long-term compromise if leaked | Scheduled key rotation with `kid` support |
| 21 | Treating premium/plan claims in JWT as source of truth | Convenience for gating UI | Stale access after downgrade/chargeback | Resolve entitlements server-side per request |
| 22 | No device/session management | Not needed at MVP stage | Users can't revoke a lost device's access | Per-device refresh-token records from the start |
| 23 | Mixing authentication and authorization logic | Perceived as "simpler" | Impossible to extend (e.g., add RECRUITER role) | Strict separation of AuthN and AuthZ layers |
| 24 | No `SameSite`/`Secure` flags on cookies | Default browser behavior seems fine | CSRF and network interception risk | Explicit `Secure; HttpOnly; SameSite=Strict` |
| 25 | Skipping email verification | Reduces signup friction | Fake/throwaway accounts, spam vector | Verification required before full access |
| 26 | No rate limiting on password reset | Overlooked non-login endpoint | Abuse for enumeration/spam | Rate limit reset requests per account/IP |
| 27 | Overly permissive default role on new users | Simplicity | Unintended access to sensitive features | Least-privilege default role |
| 28 | No expiry on password-reset/verification tokens | Convenience | Old leaked links stay exploitable forever | Short single-use token expiry |
| 29 | Storing plaintext refresh tokens in DB | Simpler to compare on refresh | DB breach = all sessions compromised | Store hashed refresh tokens |
| 30 | No monitoring/alerting on auth anomalies | Built reactively, not proactively | Attacks go unnoticed until damage done | Alerting on spikes in failed logins/token errors |
| 31 | Trusting `X-Forwarded-For` blindly for rate limiting/IP logic | Quick implementation | Trivially spoofable, defeats protections | Validate via trusted proxy configuration only |
| 32 | No distinction between soft-delete and hard-delete | Deferred decision | Data compliance/legal exposure | Explicit deactivation vs deletion lifecycle |
| 33 | Returning different HTTP status/timing for valid vs invalid usernames | Natural code path difference | Enables enumeration via timing/response diffing | Constant-time, uniform responses |
| 34 | Hardcoded secrets in source/config committed to repo | Fast local dev | Secret leakage via version control history | Secrets manager / environment injection only |
| 35 | No CSP, relying only on framework defaults | Assumed "good enough" | XSS payloads execute freely | Explicit strict CSP policy |
| 36 | Excessive JWT expiry "for user convenience" | UX prioritized over security | Large attack window on theft | Balance via silent refresh instead of long TTL |
| 37 | No validation of `aud`/`iss` claims | Only checking signature | Tokens from another service/environment accepted | Full claim validation, not just signature |
| 38 | Authorization checks only at UI route level, not per-API-call | Assumed UI gating is sufficient | Direct API access bypasses all UI restrictions | Enforce authorization at every backend endpoint |
| 39 | No separation between internal admin API and public API | Faster initial build | Public exposure of sensitive admin operations | Separate network/route boundary for admin surface |
| 40 | Ignoring async/background-job security context | Not considered during initial design | Background jobs (AI generation) run unauthenticated/over-privileged | Explicit context propagation and scoped job permissions |
| 41 | Treating MFA as a "later" feature bolted onto login UI only | MFA deprioritized at MVP | Retrofitting later requires token/claim redesign | Reserve `amr`/mfa claim slots in JWT design from day one |
| 42 | No plan for multi-provider account linking (social login) | Single-provider assumption early on | Users end up with duplicate accounts per provider | Model identity as provider-agnostic from the start |

---

## Summary: Core Architectural Decisions

1. **Stateless access tokens (JWT) + server-tracked, rotated refresh tokens** — balances scale and revocability.
2. **Strict AuthN/AuthZ separation**, with authorization resolved via a role→permission mapping, not hardcoded checks.
3. **Ownership-first authorization** as the foundation for future ABAC/collaboration features.
4. **In-memory access tokens + HttpOnly refresh cookies** on the frontend to minimize XSS/CSRF blast radius.
5. **Per-device session records** from day one to support future multi-device management without redesign.
6. **Credential verification is pluggable** — social login, MFA, passkeys, and SSO all plug into the same "verify → issue token" pipeline.
7. **Audit-first mindset** on all sensitive and admin operations from the start, not retrofitted later.

This blueprint is intended as the shared reference for backend, frontend, QA, and DevOps teams as the AI Resume Builder scales from MVP toward enterprise-ready.


# 10 Database

## Source of truth

The actual schema is the result of Flyway migrations V1 through V16, not JPA annotations alone and not an architecture picture. A **primary key** uniquely identifies a row. A **foreign key** requires a referenced parent row. An **index** is an extra lookup structure trading disk/write cost for read speed. **Normalization** separates independently changing facts to reduce duplication.

`mermaid
erDiagram
  USERS ||--o{ RESUMES : owns
  USERS ||--|| USER_PROFILES : has
  RESUMES ||--o{ RESUME_SECTIONS : contains
  RESUMES ||--o{ RESUME_VERSIONS : snapshots
  RESUME_VERSIONS ||--|| RESUME_VERSION_SNAPSHOTS : stores
  USERS ||--o{ JOB_DESCRIPTIONS : saves
  RESUMES ||--o{ ATS_REPORTS : analyzed
  JOB_DESCRIPTIONS ||--o{ ATS_REPORTS : compared
  USERS ||--o{ AI_REQUESTS : makes
  AI_REQUESTS ||--o{ AI_REQUEST_ATTEMPTS : tries
  USERS ||--o{ NOTIFICATIONS : receives
`

## Full relational-design walkthrough

# AI Resume Builder — Database Design Blueprint

**Status:** Conceptual data architecture. No SQL, entities, or migrations exist yet. This document is what backend developers translate directly into JPA entities and MySQL schema.

---

## PART 1 — Business Domain Analysis

| Domain | Why it exists |
|---|---|
| **Identity & Access** | Owns who a user is, how they authenticate, and what role they hold. Everything else is owned *by* an identity. |
| **Resume Management** | The core domain — a resume and its structured sections (education, experience, projects, skills). |
| **Templates** | Governs visual presentation, decoupled from resume content so one resume can render in multiple templates. |
| **AI** | Owns all interaction with AI providers — generation, improvement, cover letters — as its own domain because it has unique lifecycle (async, cost-bearing, provider-agnostic). |
| **ATS (Applicant Tracking System checking)** | Owns scoring a resume against a job description — depends on Resume and optionally on AI, but is conceptually a separate analysis domain. |
| **Job Matching** | Owns job description data and matching logic — related to ATS but distinct (ATS scores *one* resume vs *one* job; Job Matching surfaces *many* jobs against *one* resume). |
| **Versioning/History** | Owns the temporal dimension of a resume — drafts, published versions, rollback — cross-cutting but modeled as its own domain to avoid bloating the core Resume entity. |
| **Notifications** | Owns communication to the user, triggered by events from other domains, but stores its own delivery state. |
| **Administration** | Owns platform-level oversight — user management, moderation — operates *across* domains but is modeled separately for access-control clarity. |
| **Subscriptions/Billing** | Owns entitlement and payment state — gates access to premium features in other domains without those domains needing billing logic themselves. |
| **Analytics** | Owns aggregated/derived data about usage — reads from other domains but should not be a dependency *of* them (write-only consumer pattern). |
| **Audit** | Owns the "who did what, when" record across domains — a cross-cutting concern with its own storage, not scattered per-table history columns. |

### Interaction overview
```
Identity ──owns──> Resume ──renders-with──> Template
   │                  │
   │                  ├──scored-by──> ATS ──uses──> AI (optional)
   │                  ├──versioned-by──> Versioning
   │                  └──matched-against──> Job Matching
   │
   ├──gates──> Subscription
   ├──triggers──> Notification (via events from any domain)
   └──tracked-by──> Audit (cross-cutting)

AI ──serves──> Resume, ATS, Job Matching (as a shared capability, not owned by any one)
Analytics ──reads from──> all domains (never writes into them)
Administration ──oversees──> Identity, Resume, Subscription (elevated access)
```

---

## PART 2 — Domain Model (Entity Catalog)

### Identity & Access

**User**
- *Purpose:* represents a registered person.
- *Lifecycle:* created at registration → active → optionally deactivated/soft-deleted; never hard-deleted while any owned data exists.
- *Ownership:* root owner of Resume, Subscription, AI usage records.
- *Relationships:* 1-to-many with Resume, Notification, AuditLog; 1-to-one with UserProfile.
- *Required (conceptual):* unique email, password hash, role, status, created timestamp.
- *Optional:* display name, avatar reference.
- *Business rules:* email uniqueness enforced at domain level; password never stored in plaintext; role determines RBAC scope.
- *Future expansion:* social login providers, multi-factor auth flags — additive fields/related entity, not a redesign.

**UserProfile**
- *Purpose:* separates rarely-changing account credentials (User) from frequently-updated personal info (name, contact, location) used to pre-fill resumes.
- *Ownership:* 1-to-1 with User.
- *Business rules:* not required to exist immediately at registration — created lazily on first resume.

**RefreshToken**
- *Purpose:* supports JWT refresh flow without re-authenticating.
- *Lifecycle:* created at login, invalidated at logout/expiry/rotation.
- *Relationships:* many-to-one with User (a user may hold multiple active sessions/devices).
- *Business rules:* one row per active session; expired rows are purged, not retained indefinitely.

### Resume Management

**Resume**
- *Purpose:* the top-level container a user builds.
- *Lifecycle:* draft → (optionally) published → archived; see Part 10 for versioning.
- *Ownership:* belongs to exactly one User.
- *Relationships:* 1-to-many with Education, Experience, Project, Skill, Certification (all "section" entities); 1-to-one (current) with Template selection; 1-to-many with ResumeVersion.
- *Required:* owner reference, title, status.
- *Optional:* target job title, summary text.
- *Business rules:* a resume without at least a title is invalid; deleting a resume is a soft delete (Part 6).
- *Future expansion:* sharing/collaboration (Part 13) attaches without touching this entity's core shape.

**ResumeSection entities** (Education, Experience, Project, Skill, Certification — modeled as **separate entities**, not one generic "Section" table)
- *Purpose:* each captures domain-specific fields (Experience needs employer/dates; Skill needs proficiency; Education needs institution/degree).
- *Why separate rather than one generic key-value "Section" table:* generic EAV-style modeling sacrifices type safety, indexability, and query clarity — acceptable tradeoff for a CMS, not for structured resume data that AI and ATS need to reason over precisely.
- *Ownership:* many-to-one with Resume; each row is *owned* (weak entity — has no meaning without its parent Resume).
- *Business rules:* ordering within a resume (display sequence) is an attribute on each row, not inferred from insertion order.

### Templates

**Template**
- *Purpose:* defines a visual layout/style a resume can render with.
- *Lifecycle:* system-defined (seeded) initially; future: user-created/custom templates.
- *Relationships:* many-to-many conceptually with Resume — a resume references its *current* template, but ResumeVersion (Part 10) may reference a *different* template per version, since a user might re-style an old version.
- *Business rules:* deleting a template in use must not orphan resumes — either restrict deletion or reassign to a default template.

### AI Domain

See Part 11 for full detail. Summary entities: **AiRequest**, **AiProvider** (reference/config, not per-request), **AiGeneratedContent**, **AiUsageLedger**.

### ATS Domain

See Part 12. Summary entities: **AtsReport**, **AtsKeywordMatch**, **JobDescription** (shared with Job Matching).

### Job Matching

**JobDescription**
- *Purpose:* stores a job posting's text/requirements, either pasted by the user or ingested from a source.
- *Relationships:* referenced by both ATS (scoring one resume against it) and Job Matching (surfacing many jobs).
- *Business rules:* large text content; not owned by a single user if sourced externally (shared/reference data) — but user-pasted ones are owned by the user.

**JobMatch**
- *Purpose:* a computed relationship between a Resume and a JobDescription with a match score.
- *Lifecycle:* recomputed periodically or on demand; not a permanent fact, more a cached derived result.

### Versioning/History

See Part 10. Entities: **ResumeVersion**, **ResumeVersionSnapshot**.

### Notifications

**Notification**
- *Purpose:* a message queued/delivered to a user.
- *Relationships:* many-to-one with User; conceptually references a "source event" (e.g., `AI_GENERATION_COMPLETE`) without hard-coupling to the domain that triggered it — decoupled via the Events pattern from the backend architecture doc.
- *Business rules:* has delivery status (pending/sent/failed/read) distinct from its content.

### Administration

**AdminActionLog** (distinct from general Audit — admin actions are higher-sensitivity)
- *Purpose:* records elevated-privilege actions (e.g., admin disabling a user account).

### Subscriptions

**Subscription**
- *Purpose:* tracks a user's plan/entitlement level.
- *Relationships:* 1-to-1 (current) with User, but 1-to-many historically (a user has a subscription history over time).
- *Business rules:* current plan determines feature gates (e.g., AI generation limits) checked by other domains via a shared entitlement lookup, not duplicated logic.

**PaymentTransaction**
- *Purpose:* records payment events tied to a Subscription — kept distinct from Subscription state itself so payment history is immutable/append-only while subscription state can change.

### Analytics

**UsageMetric** (aggregated, not per-click event storage in the transactional DB)
- *Purpose:* rollup counts (resumes created per day, AI calls per user) for dashboard/admin reporting — deliberately *not* raw event logs in MySQL; raw events belong in a separate analytics pipeline if volume grows (Part 8).

### Audit

**AuditLog**
- *Purpose:* generic "who changed what, when, from what to what" record, applicable across domains via a polymorphic-style reference (entity type + entity ID), not a per-table history table.

---

## PART 3 — Relationship Modeling

| Relationship | Type | Notes |
|---|---|---|
| User → Resume | One-to-Many | A user owns many resumes; a resume has exactly one owner. |
| User → UserProfile | One-to-One | Profile is optional/lazy but never shared. |
| Resume → Education/Experience/Project/Skill | One-to-Many, **Composition** | These are weak entities — deleting a Resume deletes its sections; they have no independent existence or identity outside their parent. |
| Resume → Template | Many-to-One | Many resumes can use the same template; a resume has one *current* template. |
| Resume → ResumeVersion | One-to-Many, **Composition** | Versions are owned snapshots; cannot exist without the parent resume. |
| ResumeVersion → Template | Many-to-One | A version pins the template used *at that point in time* — independent of the resume's current template. |
| User → AiRequest | One-to-Many | A user issues many AI requests over time. |
| AiRequest → AiGeneratedContent | One-to-One (or One-to-Many for retries) | See Part 11. |
| Resume → AtsReport | One-to-Many | A resume can be scored many times against different job descriptions. |
| JobDescription → AtsReport / JobMatch | One-to-Many | One job description can be scored against/matched with many resumes. |
| User → Subscription | One-to-Many (historical), effectively One-to-One (current) | Modeled as many rows with an `is_current`-style flag or date range, not a single mutable row, to preserve history. |
| Subscription → PaymentTransaction | One-to-Many | **Aggregation**, not composition — payment records should outlive even a cancelled subscription for financial record-keeping. |
| User → Notification | One-to-Many | — |
| \* → AuditLog | Polymorphic **aggregation** (entity_type + entity_id reference, not a strict FK to one table) | Deliberately loose coupling — audit log must not block deletion of the record it describes, and must not require a schema change every time a new auditable entity is added. |

### Weak entities
Education, Experience, Project, Skill, Certification, ResumeVersion, ResumeVersionSnapshot — all lack independent meaning without their parent Resume. Their identity is scoped to the parent (conceptually a composite of parent ID + local ordering, even if a surrogate key is used for practicality — see Part 5).

### Cascade & delete strategy
| Parent deleted | Effect on children |
|---|---|
| Resume (soft-deleted) | Sections and versions are *not* physically deleted — they follow the same soft-delete flag, remain queryable for recovery/undo. |
| User (soft-deleted/deactivated) | Resumes become inaccessible via the app but are retained for a defined retention period (Part 9) before any hard purge job runs. |
| Template (deletion attempted while in use) | **Restrict** — deletion blocked, or resumes/versions referencing it are reassigned to a default/fallback template first. |
| JobDescription referenced by AtsReport | **Restrict or soft-delete** — historical reports must remain interpretable even if the original posting is removed. |
| Subscription cancelled | PaymentTransaction rows are never deleted — cascade never reaches financial records. |

---

## PART 4 — Normalization Walkthrough

Using **Resume + Experience** as the running example.

### Unnormalized Form (UNF)
A single conceptual "resume record" with repeating groups:
```
Resume { userEmail, userName, title, experience: [ {employer, role, startDate, endDate}, {employer, role, startDate, endDate}, ... ] }
```
Problems: repeating groups of experience inside one record; user data duplicated per resume.

### 1NF — Eliminate repeating groups
Split experience entries into their own rows, each atomic:
```
Resume(id, userId, title)
Experience(id, resumeId, employer, role, startDate, endDate)
```
Now every column holds a single atomic value, and each Experience row is independently addressable.

### 2NF — Eliminate partial dependency on a composite key
Not directly at risk here since `Experience.id` is a surrogate key, not composite — but conceptually: if we had modeled the key as `(resumeId, sequenceNumber)`, any Experience attribute (e.g., `employer`) depends on the *whole* composite key already, so no partial dependency exists once we use `resumeId` as a plain foreign key and a surrogate `id` as primary key. This is exactly why surrogate keys are chosen for section entities (Part 5).

### 3NF — Eliminate transitive dependencies
`Resume` initially might have carried `userEmail`, `userName` directly (as in UNF) — these depend on `userId`, not on `Resume.id` directly. Removing them and referencing `User` via `userId` eliminates the transitive dependency:
```
Resume(id, userId, title)
User(id, email, name)
```

### BCNF
Every determinant in each table is a candidate key: in `Experience(id, resumeId, employer, role, startDate, endDate)`, the only functional dependency is `id → {resumeId, employer, role, startDate, endDate}`, and `id` is the key — no other attribute determines another. The model is in BCNF as designed.

### Higher normal forms (4NF/5NF)
Generally unnecessary here — 4NF/5NF address multi-valued and join dependencies that arise in complex many-to-many scenarios (e.g., if Skills had independent multi-valued facets like "proficiency contexts" that vary independently). The Skill entity is modeled simply enough (resumeId, skillName, proficiencyLevel) that 4NF concerns don't apply. If future features introduce genuinely independent multi-valued facts on the same entity, revisit at that time rather than over-normalizing preemptively.

### Where denormalization is deliberately introduced
- **ResumeVersionSnapshot** (Part 10) intentionally stores a denormalized, flattened copy of resume content at a point in time — normalization is *not* applied here because a version snapshot must remain stable and readable even if the live normalized schema evolves later.
- **UsageMetric** (analytics) stores pre-aggregated counts rather than requiring expensive joins/aggregation over transactional tables at read time.
- **JobMatch.score** is a computed/cached value, denormalized for read performance, recomputed on a schedule rather than derived live on every request.

---

## PART 5 — Key Strategy

| Entity | Primary Key | Candidate/Alternate Keys | Notes |
|---|---|---|---|
| User | Surrogate (UUID or auto-increment) | `email` (unique, alternate key) | Surrogate preferred — email can theoretically change, and using it as PK would cascade to every FK referencing the user. |
| Resume | Surrogate | — | No natural key exists for a resume; title isn't unique per user necessarily. |
| Experience/Education/Project/Skill | Surrogate | Composite candidate key conceptually `(resumeId, displayOrder)`, but not used as PK | Surrogate simplifies FK references from future entities (e.g., AI suggestions referencing a specific experience entry) without needing a composite FK. |
| Template | Surrogate | `name` (unique, alternate key) for system templates | — |
| AiRequest | Surrogate | — | High insert volume; surrogate avoids any natural-key contention. |
| Subscription | Surrogate | `(userId, startDate)` conceptually unique | Composite uniqueness constraint prevents overlapping active subscriptions, but PK stays surrogate. |
| RefreshToken | Surrogate | `tokenHash` (unique, alternate key) | Never index/store the raw token value as a key — store a hash. |
| JobDescription | Surrogate | — | Text content is never a natural key. |
| AuditLog | Surrogate | `(entityType, entityId, timestamp)` as a practical composite lookup index, not a uniqueness constraint | — |

**Principle applied throughout:** **surrogate keys everywhere**, natural/business values (email, token hash, template name) enforced as **unique constraints**, never as primary keys. This insulates every foreign-key relationship in the schema from real-world data changing (emails change, template names get renamed) — a foundational scalability and maintainability decision.

**No composite primary keys** are used anywhere in this design, even for weak entities — a surrogate PK on weak entities keeps every future FK reference (e.g., AI suggestion pointing at one specific Experience row) a single-column join instead of a multi-column one.

---

## PART 6 — Integrity

| Integrity type | Rule |
|---|---|
| **Entity integrity** | Every table has a non-null, unique surrogate primary key; no entity can exist without one. |
| **Referential integrity** | Every foreign key must reference an existing row; enforced at the database level (FK constraints), not only in application code — prevents orphaned rows even if a bug bypasses the service layer. |
| **Domain integrity** | Enumerated fields (Resume.status, Notification.status, Subscription.plan) are constrained to a defined set of values — enforced via DB-level enum/check constraint plus application-level enum types, so the two never drift apart. |
| **Business integrity** | Rules not expressible as simple constraints (e.g., "a user can have at most one *active* subscription at a time") enforced via a combination of a partial unique constraint (where supported) and service-layer validation (Backend Architecture doc, Part 8). |
| **Preventing duplicates** | Unique constraints on natural keys (User.email, RefreshToken.tokenHash, Template.name) — never relying solely on application-level "check then insert" logic, which is race-condition-prone. |
| **Orphan records** | Prevented by FK constraints; where "soft" ownership is intentional (AuditLog's polymorphic reference), orphaning is an accepted tradeoff documented explicitly, not accidental. |
| **Deletions** | Governed by the cascade table in Part 3; hard deletes are reserved for genuinely ephemeral data (expired RefreshTokens) — see below. |
| **Soft Delete vs Hard Delete** | **Soft delete** (a `deletedAt`/`isDeleted` flag) for anything a user might want recovered or that has downstream references (Resume, User, JobDescription). **Hard delete** only for data with no recovery value and no downstream integrity concern (expired RefreshTokens, stale cache-like JobMatch computations, old AiRequest retry attempts beyond a retention window). |
| **Audit requirements** | Every soft-deletable entity carries `createdAt`, `updatedAt`, `deletedAt` (nullable) fields; significant state transitions (Resume published, Subscription changed, Admin actions) are additionally recorded in AuditLog for a durable trail beyond simple timestamps. |

---

## PART 7 — Index Strategy

| Index type | Where |
|---|---|
| **Primary index** | Automatic on every surrogate PK. |
| **Unique index** | `User.email`, `RefreshToken.tokenHash`, `Template.name` — enforce uniqueness *and* speed up the lookups that already happen on login/token validation. |
| **Foreign key indexes** | Every FK column (`Resume.userId`, `Experience.resumeId`, `AiRequest.userId`, `AtsReport.resumeId`, etc.) — MySQL doesn't always auto-index FK columns depending on engine/setup, and these are the most frequent join/filter columns. |
| **Composite indexes** | `(userId, status)` on Resume — supports the extremely common "list this user's active resumes" query with sorting/filtering in one index. `(resumeId, displayOrder)` on section entities — supports fetching a resume's sections pre-sorted. `(entityType, entityId)` on AuditLog — supports the polymorphic lookup pattern. |
| **Search optimization** | If free-text search over JobDescription or Resume content becomes a feature, a full-text index (MySQL `FULLTEXT`) is the appropriate mechanism — not a `LIKE '%...%'` query pattern, which can't use a standard B-tree index effectively. |
| **Sorting** | Any column used in default list ordering (`createdAt` on Resume/Notification) benefits from being the trailing column in a composite index alongside the filter column (e.g., `(userId, createdAt)`). |
| **Join optimization** | Ensure every join path used in common queries (Resume↔User, AtsReport↔Resume↔JobDescription) has indexed FK columns on both sides — the PK side is automatic, the FK side must be explicit. |
| **Trade-offs** | Every index speeds reads but slows writes and consumes storage — AiRequest and AuditLog are high-insert-volume tables, so indexes there should be limited to what's actually queried (e.g., `userId`, `createdAt`), not indexed defensively on every column. |

---

## PART 8 — Scalability

| Scale | Strategy |
|---|---|
| **~100 users** | Default MySQL configuration, no partitioning, no read replicas. Indexes from Part 7 are sufficient. |
| **~10,000 users** | Introduce read replicas for read-heavy paths (resume listing, template browsing) once write load and read load start contending. Begin archiving strategy for old AiRequest/AuditLog rows (move beyond a retention window to a cheaper storage tier or archive table) rather than letting operational tables grow unbounded. Caching (application-level, per Backend Architecture doc) absorbs repeated reads of rarely-changing data (Templates, ATS scoring reference data). |
| **~1,000,000 users** | Consider **partitioning** high-volume tables (AiRequest, AuditLog, UsageMetric) by date range — queries naturally filter by recent time windows, and partitioning keeps those queries fast while old partitions can be archived/dropped independently. Evaluate moving raw analytics events out of MySQL entirely into a purpose-built analytics store, keeping MySQL focused on transactional (OLTP) workloads — MySQL degrades on mixed heavy-write-analytics + heavy-read-transactional workloads at this scale. Read/write splitting becomes a formal application-level concern (routing analytics/reporting reads to replicas). Sharding by `userId` becomes a *future migration path* to keep in mind (not implemented preemptively) if a single MySQL instance's write throughput becomes the bottleneck. |

### Read-heavy vs write-heavy considerations
- **Read-heavy:** Resume viewing/listing, Template browsing, JobMatch results — well served by indexing, caching, and read replicas.
- **Write-heavy:** AiRequest logging, AuditLog, UsageMetric — better served by partitioning, batched/async writes, and eventual archiving rather than indexing everything defensively.

---

## PART 9 — Security

| Concern | Approach |
|---|---|
| **Sensitive data** | Password hashes, refresh token hashes, payment identifiers (never raw card data — handled by a payment processor, only a reference token stored). |
| **Password storage** | One-way hash (bcrypt/argon2 at the application layer) — the database never sees or stores a reversible password. |
| **PII** | Name, email, phone, address (in UserProfile and resume section entities) — treated as sensitive; access scoped to the owning user and admins with justified access, never exposed in logs (per Backend Architecture doc, Part 9). |
| **Encryption** | Encryption at rest for the database volume (infrastructure-level, e.g., managed MySQL encryption); TLS in transit for all DB connections; consider field-level encryption for highly sensitive optional fields if the product later stores things like national ID numbers. |
| **Audit trails** | AuditLog (Part 2) covers state-changing actions; AdminActionLog specifically covers elevated-privilege actions for accountability. |
| **Access control** | Application-layer RBAC (Backend Architecture doc) is the primary gate; database-level access is restricted to the application's service account, with no direct end-user DB access ever. |
| **Data retention** | Soft-deleted data retained for a defined window (e.g., 30–90 days) before a scheduled hard-purge job runs, balancing user "undo" ability against indefinite storage of unwanted data. |
| **Backup strategy** | Regular automated backups (managed MySQL snapshot capability) with a tested restore procedure — a backup that's never been restored isn't a real backup. |
| **Disaster recovery** | Point-in-time recovery capability (binlog-based) so accidental mass-deletion or corruption can be rolled back to a specific moment, not just the last nightly snapshot. |

---

## PART 10 — Versioning Strategy

### Core principle: separate the *live editable* Resume from *immutable historical* ResumeVersions.

```
Resume (live, mutable)
  │
  ├── currently being edited as draft
  │
  └── ResumeVersion (1..N, immutable once created)
         │
         └── ResumeVersionSnapshot (denormalized flattened content at that point in time)
```

- **Drafts:** the live `Resume` and its section entities (Experience, Education, etc.) represent the current draft — always mutable.
- **Published versions:** when a user "publishes" or explicitly saves a version, a `ResumeVersion` row is created, pointing to a `ResumeVersionSnapshot` — a **denormalized**, flattened copy of all section data *at that moment* (deliberately breaking normalization here, per Part 4, because a historical version must never change even if the live schema or live data changes later).
- **History:** `ResumeVersion` rows accumulate over time, ordered by `versionNumber`/`createdAt`, giving a full history without ever mutating a past version.
- **Rollback:** implemented as copying a chosen `ResumeVersionSnapshot`'s content back into the live `Resume`/section entities — never by deleting forward versions, preserving full history even after a rollback.
- **Template changes:** each `ResumeVersion` records which `Template` was used at that point (Part 3), so viewing history shows the resume as it actually looked, even if the user has since switched templates.
- **Future AI-generated versions:** an AI-generated draft is modeled as just another `ResumeVersion` with a `sourceType` attribute (`USER_EDIT` vs `AI_GENERATED` vs `AI_IMPROVED`), avoiding a parallel/separate versioning system for AI content.

**Why snapshot instead of re-deriving history from a full audit log:** reconstructing a past version by replaying every field-level change is expensive and fragile at read time; storing a denormalized snapshot trades some storage duplication for fast, reliable historical reads — an intentional, documented denormalization (Part 4).

---

## PART 11 — AI Data Architecture

```
AiProvider (reference/config table: "openai", "gemini", capabilities, active flag)
    │
AiRequest (one row per generation attempt)
    ├── userId (FK)
    ├── resumeId (FK, nullable — some AI actions aren't tied to a resume, e.g. cover letter for a job posting)
    ├── providerId (FK to AiProvider)
    ├── requestType (enum: GENERATE_SECTION, IMPROVE_SECTION, COVER_LETTER, ATS_SUGGESTION...)
    ├── status (enum: PENDING, PROCESSING, SUCCEEDED, FAILED, RETRYING)
    ├── promptReference (see note below — not raw prompt text by default)
    ├── createdAt / completedAt
    │
    ├──1:1──> AiGeneratedContent (the actual output, only on success)
    │              ├── content (the generated text)
    │              └── appliedToResume (boolean — did the user accept/insert it)
    │
    └──1:N──> AiRequestAttempt (retry tracking, one row per attempt if retried)
                   ├── attemptNumber
                   ├── errorCode (nullable)
                   └── latencyMs

AiUsageLedger (append-only, one row per completed request)
    ├── userId (FK)
    ├── providerId (FK)
    ├── tokensUsed (input/output split)
    ├── costEstimate
    └── billingPeriodReference (for future subscription-limit enforcement)
```

| Concern | Design decision |
|---|---|
| **Prompt History** | Store a *reference/summary*, not necessarily the full raw prompt verbatim by default, given resumes contain PII — full prompt storage (if needed for debugging/quality) should be a separate, access-restricted, short-retention table, not the primary AiRequest row. |
| **Provider Information** | `AiProvider` is a reference table (id, name, isActive) — `AiRequest.providerId` is a plain FK, never a hardcoded string like `"openai"` scattered through the schema, so adding a third provider is one new row, not a schema change. |
| **Token Usage / Cost Tracking** | `AiUsageLedger` is append-only and separate from `AiRequest` — usage/billing data has different retention and query patterns (monthly rollups) than operational request tracking. |
| **Response Metadata** | Stored on `AiGeneratedContent` (model version used, generation timestamp) — kept separate from the request row so the "did it succeed and what came back" concern is distinct from "what was asked." |
| **Generation Status** | Explicit `status` enum on `AiRequest`, not inferred from presence/absence of a `AiGeneratedContent` row — makes "show me in-progress generations" a simple indexed query. |
| **Retry Information** | Modeled as child `AiRequestAttempt` rows rather than overwriting the parent request — preserves full retry history for debugging provider reliability. |
| **Decoupling from specific providers** | No provider-specific fields (e.g., "openaiModelName") on shared tables — provider-specific metadata, if needed, lives in a flexible/JSON metadata column on `AiGeneratedContent`, isolated from the core relational structure. |

---

## PART 12 — ATS Architecture

```
JobDescription (shared with Job Matching, Part 2)

AtsReport
    ├── resumeId (FK)
    ├── jobDescriptionId (FK)
    ├── overallScore
    ├── createdAt
    │
    ├──1:N──> AtsKeywordMatch
    │              ├── keyword
    │              ├── foundInResume (boolean)
    │              └── importanceWeight
    │
    ├──1:N──> AtsMissingSkill
    │              ├── skillName
    │              └── suggestedAction (text, possibly AI-generated)
    │
    └──1:N──> AtsRecommendation
                   ├── recommendationText
                   └── category (enum: FORMATTING, KEYWORDS, STRUCTURE, CONTENT)
```

| Element | Design rationale |
|---|---|
| **ATS Reports** | One row per scoring event — a resume can be scored multiple times (against different jobs, or the same job after edits), so this is never a 1:1 with Resume. |
| **Keyword Analysis** | Modeled as child rows (`AtsKeywordMatch`) rather than a single JSON blob, so individual keyword matches are queryable/aggregable (e.g., "most commonly missing keyword across all reports" for future analytics). |
| **Missing Skills** | Separate from keyword matches since a "skill" gap is a higher-level, potentially AI-synthesized recommendation, not a raw keyword miss. |
| **Recommendations** | Generic, categorized rows — allows the ATS engine (rule-based today, possibly AI-assisted later) to emit an arbitrary number of suggestions without schema changes. |
| **Job Description Analysis** | `JobDescription` itself may hold derived fields (extracted required skills, seniority level) computed once and reused across many `AtsReport`/`JobMatch` rows rather than recomputed per report. |
| **Resume Scores** | `AtsReport.overallScore` is the summary; component scores (if the algorithm evolves to weight keywords/structure/skills separately) can live as additional columns or a related breakdown table without disrupting the summary field. |
| **Historical Comparisons** | Because every scoring event is its own `AtsReport` row tied to a timestamp, "show score improvement over time for this resume" is a simple time-ordered query — no special history mechanism needed beyond normal row accumulation. |

---

## PART 13 — Future Features (No Core Redesign Required)

| Feature | How it attaches |
|---|---|
| **Resume Sharing** | New `ResumeShare` entity (resumeId, sharedWithEmail or public token, permissionLevel, expiresAt) — additive, references existing Resume PK. |
| **Resume Collaboration** | `ResumeCollaborator` entity (resumeId, userId, role: EDITOR/VIEWER) — additive many-to-many between Resume and User. |
| **Recruiter Access** | A new `role` value on User (`RECRUITER`) plus a `RecruiterAccessGrant` entity scoping which resumes/candidates they can view — reuses existing RBAC pattern, no redesign. |
| **Interview Scheduling** | New `InterviewSchedule` entity (jobMatchId or resumeId, recruiterUserId, scheduledAt, status) — a new domain that references existing entities by FK. |
| **Payments** | Already scaffolded via `Subscription`/`PaymentTransaction` (Part 2) — new payment methods/providers are additive rows/columns, not structural changes. |
| **Premium Features** | Gated via `Subscription.plan` checked at the service layer — new premium features just add a check against existing entitlement data. |
| **Notifications** | Already modeled (Part 2); new notification *types* are new enum values, not new tables. |
| **Analytics** | `UsageMetric` (Part 2) already anticipates rollup-style analytics; deeper analytics needs (Part 8) are an infrastructure addition, not a core schema change. |
| **Activity History** | `AuditLog`'s polymorphic design (Part 2/6) already supports logging any new entity type without a schema change — new entities just start writing to the existing AuditLog structure. |

**Unifying principle:** every future feature above is satisfied by **adding a new entity with FKs into the existing model**, or **adding an enum value / column** — never by restructuring User, Resume, or the section entities that already exist. This is the direct database-level counterpart to the "additive, not disruptive" principle from the Backend Architecture doc (Part 10 there).

---

## PART 14 — Common Database Design Mistakes

| # | Mistake | Why it happens | Why dangerous | How professionals avoid it |
|---|---|---|---|---|
| 1 | Using natural keys (email) as primary keys | Seems simpler at first | Cascading updates across every FK when the natural value changes | Surrogate keys everywhere (Part 5) |
| 2 | One giant generic "Section" or EAV table for resume content | Looks flexible/DRY | Sacrifices type safety, indexability, query clarity | Separate typed entities per section (Part 2) |
| 3 | Storing repeating groups in a single column (e.g., comma-separated skills) | Fast to prototype | Breaks 1NF, unqueryable, unindexable | Separate child table (Skill entity) |
| 4 | No FK constraints, relying only on application code | Feels faster to build | Orphaned records the moment any bug or script bypasses the app layer | Enforce FK constraints at the DB level |
| 5 | Hard deleting user data on account deletion | Simplicity | Loses recovery ability, violates likely data-retention/legal needs | Soft delete with retention window (Part 6/9) |
| 6 | Storing raw passwords or reversible-encrypted passwords | Misunderstanding of hashing | Catastrophic breach impact | One-way hashing only, at the application layer |
| 7 | Denormalizing everywhere "for performance" from day one | Premature optimization | Data inconsistency, update anomalies, harder maintenance | Normalize first (Part 4), denormalize only with a documented reason |
| 8 | Over-normalizing to 4NF/5NF where unnecessary | Textbook purism | Excessive joins, harder queries, no real benefit | Stop at 3NF/BCNF unless a specific multi-valued dependency exists |
| 9 | No indexes on foreign key columns | Assuming MySQL indexes them automatically in all cases | Slow joins at scale | Explicit FK-column indexing (Part 7) |
| 10 | Indexing every column defensively | "More indexes = faster" misconception | Slower writes, wasted storage, diminishing/negative returns | Index based on actual query patterns |
| 11 | Using `SELECT *`-style unbounded queries with no pagination in schema/query design | Convenience during development | OOM/slow responses in production at scale | Design list queries with pagination from the start (Backend Architecture doc) |
| 12 | Storing computed/derived values without a refresh strategy (e.g., JobMatch score never recalculated) | Convenient to compute once | Stale data presented as current | Explicit recompute schedule or cache-invalidation strategy |
| 13 | No `createdAt`/`updatedAt` timestamps on tables | Overlooked until needed | No way to audit or debug data history later | Standard timestamp columns on every table from day one |
| 14 | Mixing transactional and analytical workloads in the same tables without a plan | Simplicity early on | Analytical queries lock/slow down transactional operations at scale | Separate analytics store planned ahead (Part 8) |
| 15 | Not planning for soft-delete filtering consistently (some queries forget `WHERE deletedAt IS NULL`) | Manual query writing | Deleted data reappears in the UI | Centralize soft-delete filtering (e.g., JPA `@Where` or repository-level default filters) |
| 16 | Composite primary keys on weak entities | Seems "more correct" relationally | Complicates every future FK reference into that table | Surrogate PK even on weak/owned entities (Part 5) |
| 17 | No unique constraint on business-critical uniqueness (e.g., one active subscription per user) | Assuming application code will always enforce it | Race conditions create duplicate/conflicting rows | DB-level unique/partial-unique constraints |
| 18 | Storing money as floating point | Familiarity with float types | Rounding errors in financial data | Fixed-point/decimal types for any money-related column |
| 19 | No plan for archiving high-volume log-like tables (AiRequest, AuditLog) | Not thinking ahead to scale | Tables grow unbounded, slow queries, expensive backups | Partitioning/archiving strategy defined early (Part 8) |
| 20 | Tightly coupling schema to one AI provider (e.g., an `openaiResponseId` column on a shared table) | Building for what exists today only | Painful migration when adding a second provider | Provider-agnostic reference table + FK (Part 11) |
| 21 | Using JSON columns for data that's actually relational and queried often | Perceived flexibility | Loses indexing, type safety, and query performance for that data | Use JSON only for genuinely unstructured/rarely-queried metadata |
| 22 | Ignoring timezone handling on timestamp columns | Overlooked detail | Inconsistent times across users/servers | Store UTC consistently, convert at the presentation layer |
| 23 | No versioning strategy for user-editable content (resumes) | Not anticipated until users ask for it | Expensive retrofit, or worse — no ability to recover overwritten data | Design ResumeVersion/Snapshot pattern from the start (Part 10) |
| 24 | Circular foreign key dependencies between tables | Ad hoc modeling without an ER diagram pass | Insertion order problems, unclear ownership | Draw the ER model first, ensure a clear dependency direction |
| 25 | No distinction between "reference/lookup" data and "transactional" data (e.g., hardcoding provider names as strings everywhere) | Fastest path to a working feature | Painful find-and-replace refactors later | Reference tables (AiProvider, Template) referenced by FK, never magic strings |
| 26 | Allowing NULL in columns that are always logically required, "just in case" | Avoiding upfront modeling decisions | Application code littered with null checks, ambiguous data states | Enforce NOT NULL wherever a value is truly always required |
| 27 | Not modeling audit/history needs until compliance or a support incident forces it | Reactive rather than proactive design | Expensive retrofit; historical data before that point is unrecoverable | Design AuditLog/versioning as first-class citizens from the start |
| 28 | Treating every entity as user-owned when some data (JobDescription sourced externally, Template system defaults) is actually shared/reference data | Not distinguishing ownership models | Incorrect access control, duplicate reference data per user | Explicitly model shared/reference vs. user-owned entities differently |
| 29 | No plan for what happens to child rows when a shared/reference row (Template) is deleted | Overlooking reference-data lifecycle | Orphaned resumes pointing at a deleted template | Restrict deletion or reassign to a default (Part 3) |
| 30 | Designing the schema entity-by-entity without a domain analysis pass first | Jumping straight to "what tables do I need" | Missed relationships, inconsistent ownership models, rework later | Start with business domain analysis (Part 1) before entities |
| 31 | Assuming "we'll add indexes later when it's slow" | Deferring a design concern as an optimization afterthought | Production incidents caused by missing indexes discovered under real load | Design index strategy alongside the schema (Part 7), even if not all are implemented on day one |

---

## Summary

This blueprint is built around three consistent principles: **surrogate keys with enforced natural-key uniqueness**, **composition for owned/weak data with explicit soft-delete cascading**, and **additive extensibility** — every future feature in Part 13 attaches via a new entity and foreign key, never a redesign of User, Resume, or the section entities already defined. A backend developer should be able to derive JPA entities and MySQL DDL directly from Parts 2, 3, and 5 without further architectural decisions.


# 11 AI Module

## What current code does

The AI module separates business workflows from vendors. AiGateway orchestrates. PromptManager resolves published instructions. AiProviderFactory selects an adapter. GeminiProviderAdapter and OpenAiProviderAdapter translate a provider-neutral request into vendor HTTP and normalize the answer. AiOutputValidator treats generated text as untrusted. AiRateLimitManager, AiBudgetManager, AiResponseCache, AiCostCalculator, AiUsageLogger, and provider health protect cost and reliability. User settings support platform keys or encrypted bring-your-own keys.

The project estimates tokens/cost rather than using a provider-grade universal tokenizer. Temperature and model are provider/request configuration concerns. The API currently supports synchronous generation and queued background jobs; it does not expose token-by-token browser streaming.

`mermaid
flowchart LR
  W[Workflow request] --> PM[PromptManager]
  PM --> GW[AiGateway]
  GW --> RL[Rate limit]
  GW --> BG[Budget]
  GW --> CA[Cache]
  GW --> PF[ProviderFactory]
  PF --> GE[Gemini adapter]
  PF --> OA[OpenAI adapter]
  GE --> OV[Output validator]
  OA --> OV
  OV --> UL[Usage ledger]
  UL --> R[Normalized response]
`

## Full AI architecture lesson

# AI Architecture Blueprint
### Enterprise AI Resume Builder — Official AI Architecture Guide

**Audience:** Backend engineering team
**Scope:** AI layer design only (no business logic, no provider implementations, no prompts)
**Stack context:** Java 21 / Spring Boot backend, React 19 frontend, MySQL, JWT auth

---

## 1. AI Philosophy

### 1.1 Why AI must be isolated from business logic

A resume-builder's business logic (resume storage, versioning, user accounts, billing) has a different rate of change, different failure modes, and different testing needs than "call a language model and get text back." If `ResumeService` directly calls `OpenAiClient.chat(...)`, every business use case becomes coupled to:

- A specific vendor's SDK and request/response shape
- That vendor's outages, rate limits, and pricing
- That vendor's prompt format quirks

This means a Gemini price cut, an Anthropic model deprecation, or an OpenAI outage forces a change in code that has nothing to do with resumes. Isolation via a dedicated **AI Layer** means business services depend only on a stable internal contract (e.g., "generate resume summary from these facts"), never on any specific vendor.

### 1.2 Why the application should never depend directly on a provider SDK

Direct dependency on `openai-java`, `google-genai`, or `anthropic-sdk-java` inside business code creates:

- **Vendor lock-in** — switching providers means rewriting business services, not just a config change.
- **Untestable code** — business logic can't be unit tested without mocking a third-party SDK deeply embedded in it.
- **Blast radius** — an SDK breaking change (version bump) can break resume generation, cover letters, ATS scoring, etc. all at once.
- **Compliance risk** — provider-specific request/response objects leak vendor data shapes into domain models.

The correct dependency direction (Dependency Inversion Principle): business logic depends on an **internal AI Gateway interface**; provider SDKs are hidden behind adapters that implement that interface.

### 1.3 Why provider abstraction matters

The system must support OpenAI, Gemini, Claude today, and Azure OpenAI, Ollama, LM Studio tomorrow — **without modifying business services**. This is only possible if:

- All providers are accessed through one **Provider Interface** (Strategy Pattern)
- A **Provider Factory** selects the concrete implementation at runtime
- Business code calls the interface, never a concrete class

This also enables **model routing** (cheapest/fastest/best model per task), **A/B testing between providers**, and **graceful fallback** when a provider is down — all invisible to business logic.

### 1.4 Why prompts should not be hardcoded

Hardcoded prompts embedded in Java strings are:

- Impossible to version safely (a prompt fix requires a full deploy)
- Impossible for non-engineers (prompt/content specialists) to iterate on
- Impossible to A/B test or roll back independently of code
- A source of duplication across workflows (e.g., "resume tone" logic copy-pasted in 5 places)

Prompts are **content, not code**, and should be externalized to a **Prompt Repository**, managed like structured, versioned assets, with variables and localization layered in.

### 1.5 Why AI responses require validation

LLMs are **non-deterministic, unverified text generators**. Without validation, an AI Resume Builder risks:

- Injecting hallucinated job titles, dates, or skills into a user's legal document (their resume)
- Returning malformed JSON that crashes downstream parsing
- Leaking system prompts or internal instructions back to the user
- Producing biased, offensive, or ATS-breaking content

Every AI response must pass through a **Response Processing pipeline** (parsing → validation → sanitization → confidence check) before it is trusted by any business service — the same way you would never trust unvalidated user input.

### 1.6 Recommended architecture

**Layered / Ports-and-Adapters (Hexagonal) architecture**, combined with:

- **Strategy Pattern** for interchangeable AI providers
- **Factory Pattern** for provider instantiation/selection
- **Adapter Pattern** for translating each vendor's SDK into the internal contract
- **Gateway/Facade Pattern** as the single entry point business services use

```
┌───────────────────────────────────────────────────────────┐
│                     Business Services                      │
│   ResumeService · CoverLetterService · ATSService · etc.   │
└───────────────────────────┬─────────────────────────────────┘
                             │  (depends only on this)
                             ▼
┌───────────────────────────────────────────────────────────┐
│                        AI GATEWAY                           │
│         (single façade — the only entry point to AI)        │
└───────────────────────────┬─────────────────────────────────┘
                             ▼
        ┌────────────────────────────────────────┐
        │   Orchestration: Prompt Mgr · Retry ·   │
        │   RateLimit · Cost · Validator · Logger │
        └───────────────────┬──────────────────────┘
                             ▼
                    ┌──────────────────┐
                    │  Provider Factory │  (Strategy selection)
                    └────────┬──────────┘
              ┌──────────────┼───────────────┐
              ▼              ▼               ▼
        OpenAI Adapter  Gemini Adapter  Claude Adapter  (+ future adapters)
```

This is the industry-standard pattern for enterprise "AI Gateway" designs (similar in spirit to how payment gateways abstract Stripe/PayPal/Razorpay).

---

## 2. AI Module Architecture

### 2.1 Component responsibilities

| Component | Responsibility |
|---|---|
| **AI Gateway** | Single public entry point for all AI operations. Business services call only this. Orchestrates the full request lifecycle: prompt resolution → provider selection → invocation → validation → logging. |
| **AI Provider Interface** | The Strategy contract (e.g., `AiProvider`) every vendor adapter implements: `generate(request) -> response`. Defines the vendor-agnostic request/response shape. |
| **Provider Factory** | Resolves which concrete `AiProvider` implementation to use, based on config, task type, cost policy, or failover state. Hides `new OpenAiAdapter()` etc. from the rest of the system. |
| **Prompt Manager** | Resolves the correct prompt template for a given workflow + version + locale, injects variables, and hands a final prompt payload to the Gateway. |
| **Prompt Repository** | Persistence/storage layer for prompt templates, versions, metadata, and approval state (backed by MySQL, not hardcoded). |
| **Response Parser** | Converts raw provider output (text/JSON/tool-calls) into a structured internal DTO, independent of vendor response format. |
| **Output Validator** | Applies schema checks, business rules, and safety checks to parsed output; rejects or flags invalid responses. |
| **Retry Manager** | Handles transient failures (timeouts, 5xx, rate-limit errors) with backoff policies, independent of business logic. |
| **Rate Limit Manager** | Enforces per-user, per-tenant, and per-provider throughput limits to protect both cost and provider quotas. |
| **Cost Tracker** | Computes cost per request from token counts and provider pricing tables; aggregates spend by user/tenant/feature. |
| **Usage Logger** | Structured, queryable audit log of every AI interaction (who, what workflow, which provider, tokens, latency, outcome). |
| **Token Calculator** | Estimates/measures token counts pre- and post-call for cost prediction, context-window management, and truncation decisions. |
| **AI Configuration Manager** | Central source of truth for provider credentials references, model selection policy, feature flags, and environment-specific settings. |

### 2.2 Interaction flow (sequence)

```
Business Service
     │  1. requestGeneration(workflow, context)
     ▼
AI Gateway
     │  2. resolvePrompt() ──────────────► Prompt Manager ──► Prompt Repository
     │  3. estimateTokens() ─────────────► Token Calculator
     │  4. checkQuota() ──────────────────► Rate Limit Manager
     │  5. selectProvider() ──────────────► Provider Factory ──► AI Provider Interface
     │  6. invoke() (with Retry Manager wrapping the call)
     │  7. parse() ────────────────────────► Response Parser
     │  8. validate() ─────────────────────► Output Validator
     │  9. recordCost() ───────────────────► Cost Tracker
     │ 10. log() ───────────────────────────► Usage Logger
     ▼
Business Service ◄── validated, structured AiResult
```

Every step is a distinct, independently testable component — no single class does everything ("God Gateway" is an anti-pattern to avoid; the Gateway *orchestrates*, it does not *implement* each concern).

---

## 3. Provider Abstraction

### 3.1 Strategy + Factory design

- **AI Provider Interface (Strategy)**: one contract, e.g. conceptually `generate(AiRequest) -> AiResponse`, `supportsStreaming()`, `getCapabilities()`. Every provider — OpenAI, Gemini, Claude, Azure OpenAI, Ollama, LM Studio — implements this same contract via its own **Adapter**.
- **Adapters** translate the vendor's native SDK/API shape (different auth, different request bodies, different response formats — e.g., Claude's content blocks vs. OpenAI's choices array vs. Gemini's candidates array) into the single internal `AiRequest`/`AiResponse` model.
- **Provider Factory** decides, at request time, which adapter to instantiate/use, based on:
  - Static configuration (default provider per environment)
  - Task-based routing (e.g., "cover letters → Claude", "keyword extraction → cheaper model")
  - Runtime health (failover to a backup provider if the primary is unavailable)
  - Cost policy (route to cheapest capable provider under budget pressure)

### 3.2 Provider capability matrix

| Capability | OpenAI | Gemini | Claude | Azure OpenAI (future) | Ollama (future) | LM Studio (future) |
|---|---|---|---|---|---|---|
| Hosting | Cloud | Cloud | Cloud | Cloud (enterprise) | Local/self-hosted | Local/self-hosted |
| Streaming | Yes | Yes | Yes | Yes | Yes | Yes |
| Structured/JSON output | Yes | Yes | Yes | Yes | Model-dependent | Model-dependent |
| Cost model | Per-token | Per-token | Per-token | Per-token + Azure billing | Compute cost only | Compute cost only |
| Data residency control | Vendor-managed | Vendor-managed | Vendor-managed | Configurable (enterprise) | Full (on-prem) | Full (on-prem) |
| Auth mechanism | API key | API key | API key | Azure AD / key | None/local | None/local |

The **Provider Interface must be defined by the lowest common denominator of required capabilities**, with an optional `getCapabilities()` extension so the Gateway can gracefully degrade (e.g., skip streaming for a provider that doesn't support it) rather than failing.

### 3.3 Adding a new provider — conceptual steps (no code)

1. Implement the AI Provider Interface with a new Adapter class for the vendor.
2. Map vendor auth into AI Configuration Manager.
3. Register the adapter with the Provider Factory (config-driven, not a code branch in business logic).
4. Add vendor pricing to Cost Tracker's pricing table.
5. Add vendor-specific error mapping to Retry Manager (what counts as retryable).
6. No business service, controller, or workflow code changes.

This is the concrete test of good abstraction: **a new provider is a new adapter + config entry, never a change to `ResumeService` or any controller.**

---

## 4. Prompt Management

### 4.1 Core concepts

| Concept | Purpose |
|---|---|
| **Prompt Templates** | Structured, parameterized text blueprints per workflow (e.g., "resume-summary-generation"), stored separately from code. |
| **Prompt Versioning** | Every template change creates a new version; workflows reference a version, not "latest," so behavior is reproducible and rollback is trivial. |
| **Prompt Categories** | Organize templates by feature area (Resume, Cover Letter, ATS, Career Advice, Interview Prep) for discoverability and access control. |
| **Prompt Variables** | Typed placeholders (e.g., `{{candidateExperience}}`, `{{targetRole}}`) resolved by the Prompt Manager from business context — never string-concatenated ad hoc. |
| **Localization** | Templates can have locale variants (en-US, hi-IN, etc.) selected by user locale, without duplicating orchestration logic. |
| **Testing Prompts** | A sandbox/staging pipeline where new prompt versions run against golden test cases before promotion, with output diffed against expected quality bars. |
| **Prompt Approval Workflow** | Draft → Review → Approved → Published states; only "Published" versions are servable in production, enforcing a human checkpoint for content quality/safety. |
| **Prompt Rollback** | Because every version is immutable and stored, reverting a workflow to a previous version is a config/pointer change, not a redeploy. |
| **Prompt Reuse** | Common fragments (tone guidelines, formatting rules, safety constraints) are modular "partials" composed into multiple templates rather than duplicated. |
| **Prompt Organization** | Repository structured by category → workflow → version, with metadata (author, model targeted, last tested date, status). |

### 4.2 Prompt lifecycle (state machine)

```
   ┌────────┐   review    ┌──────────┐   approve   ┌───────────┐   publish   ┌───────────┐
   │  Draft │ ───────────►│  Review  │────────────►│ Approved  │────────────►│ Published │
   └────────┘             └──────────┘             └───────────┘             └─────┬─────┘
       ▲                                                                            │
       │                          rollback to prior published version               │
       └────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Why this matters for a resume builder specifically

Resume/cover-letter prompts directly shape a document that affects someone's livelihood. Versioning + approval + testing isn't bureaucracy here — it's the mechanism that lets you say "we know exactly which prompt version produced this resume, and we can prove it went through review."

---

## 5. AI Workflows (conceptual, request → validated response)

Each workflow below follows the same skeleton through the AI Gateway; only the prompt template, provider routing, and validation rules differ.

| Workflow | Key Input Context | Special Validation Focus |
|---|---|---|
| **Resume Generation** | User's raw work history, education, skills | No fabricated employers/dates; structured section output; length limits |
| **Resume Improvement** | Existing resume text + target role | Original facts preserved (no invented achievements); diff-based review |
| **Cover Letter Generation** | Resume + job description | Tone consistency; no fabricated company claims; length constraints |
| **ATS Optimization** | Resume + job description | Suggestions only — never silently rewrites; keyword relevance check |
| **Keyword Suggestions/Extraction** | Job description text | Structured list output (schema-validated), deduplicated |
| **Job Match Analysis** | Resume + job description | Score must be explainable (reasoning attached); bounded numeric range |
| **Career Advice** | User profile + goals | Non-prescriptive framing; disclaimers on subjective guidance |
| **Interview Preparation** | Resume + target role | Question relevance to actual resume content; no generic filler passed off as personalized |

### 5.1 Generic workflow sequence

```
1. Frontend request → Controller → Business Service
2. Business Service builds a context object (facts only, no prompt text)
3. Business Service calls AI Gateway.execute(workflowType, context)
4. Gateway: Prompt Manager resolves template + version + locale
5. Gateway: Rate Limit Manager checks user/tenant quota
6. Gateway: Provider Factory selects provider (policy/failover-aware)
7. Gateway: Retry Manager wraps the provider call
8. Provider Adapter invokes vendor API
9. Response Parser converts raw output → structured DTO
10. Output Validator applies schema + business rules + safety checks
    - PASS  → Cost Tracker records spend, Usage Logger records outcome, return to Business Service
    - FAIL  → Fallback Response strategy triggered (see Part 6), logged as a quality incident
11. Business Service persists/returns validated result to frontend
```

This same shape scales to all eight workflows — none require a different architecture, only different prompt templates and validators, which is the entire point of the abstraction.

---

## 6. Response Processing

| Stage | Purpose |
|---|---|
| **Validation** | Enforce expected schema (JSON shape, required fields, types) before anything touches business data. |
| **Filtering** | Remove/flag disallowed content categories (offensive language, unsafe claims) per workflow policy. |
| **Sanitization** | Strip formatting artifacts, stray markdown, control characters, or accidental system/prompt leakage from output. |
| **Structured Output** | Prefer schema-constrained generation (JSON mode/tool-calling where the provider supports it) over free-text parsing to minimize ambiguity. |
| **Error Detection** | Distinguish provider errors (timeout, 5xx) from content errors (malformed/empty output) and route each to the appropriate handler. |
| **Hallucination Handling** | Cross-check generated facts (names, dates, employers, numbers) against the original user-supplied context; reject or flag mismatches rather than trusting the model. |
| **Fallback Responses** | Pre-defined, safe default behavior when generation fails validation — e.g., return the original unmodified text for "Resume Improvement" rather than a broken AI rewrite. |
| **Confidence Assessment** | Where the provider exposes signals (finish_reason, log-probability-like signals, self-reported uncertainty), factor these into whether output is auto-accepted or flagged for review. |
| **Incomplete Responses** | Detect truncation (hit max tokens / stopped mid-structure) and either retry with adjusted limits or reject explicitly rather than silently truncating a resume. |
| **Malformed Responses** | JSON parse failures, invalid schema → structured error passed to Retry Manager (retry once with stricter instructions) before falling back. |

**Principle:** the Output Validator is the last gate before AI-generated content becomes part of a user's actual resume — treat it with the same rigor as validating untrusted user input, because functionally, that's what it is.

---

## 7. AI Security

| Threat | Architectural Mitigation |
|---|---|
| **Prompt Injection** (user content in resume tricking the model into ignoring instructions) | Strict separation of "system/instruction" content from "user data" content at the template level; treat all user-supplied text as data, never concatenated into instruction sections; output validated against expected schema regardless of what the model was told. |
| **Sensitive Data / PII in resumes** | Classify resume fields (name, address, phone, national ID equivalents) and apply data-handling policy before any field is sent to a provider — only send what the workflow actually needs. |
| **PII Protection** | Field-level minimization: e.g., ATS keyword extraction doesn't need full contact details; Cost Tracker/Usage Logger must never persist raw PII in logs, only references/hashes. |
| **Data Masking** | Mask/redact identifiers (emails, phone numbers) in logs and analytics pipelines; unmask only within the authenticated request path. |
| **Prompt Leakage** | System instructions never echoed back to the user; Output Validator screens for verbatim reproduction of internal prompt text. |
| **Provider Privacy** | Configuration Manager tracks each provider's data retention/training policy; route sensitive workflows only to providers whose terms meet the org's data policy (a Factory-level routing rule, not a business-logic concern). |
| **Content Filtering** | Pre- and post-generation filtering layer (input: block clearly abusive prompts; output: block disallowed content categories) independent of any one provider's built-in moderation. |
| **Output Validation** | As in Part 6 — schema and business-rule enforcement is itself a security control against malformed/adversarial output. |
| **Abuse Prevention** | Rate Limit Manager + per-user quotas + anomaly detection (e.g., a user generating hundreds of cover letters/minute) feeding into temporary throttling or account flags. |

**Core principle:** security is enforced at the Gateway boundary — every request and response passes through the same choke point regardless of which provider is chosen, so security controls are written once, not per-adapter.

---

## 8. Cost Management

| Strategy | Description |
|---|---|
| **Token Tracking** | Token Calculator measures input/output tokens per request; attached to every Usage Log entry. |
| **Request Logging** | Every AI call logged with workflow, provider, model, tokens, latency, outcome, and computed cost. |
| **Budget Limits** | Per-user, per-tenant, and global monthly budget thresholds enforced by Rate Limit Manager + Cost Tracker; soft warnings before hard cutoffs. |
| **Provider Selection (cost-aware routing)** | Provider Factory can route low-value/high-volume tasks (e.g., keyword extraction) to cheaper models and reserve premium models for high-value tasks (e.g., full resume generation). |
| **Caching** | Cache deterministic/near-deterministic outputs (e.g., ATS keyword lists for an unchanged job description) to avoid redundant paid calls. |
| **Prompt Optimization** | Prompt Manager tracks average token size per template version; flags bloated templates for trimming during prompt review. |
| **Cost Analytics** | Aggregated dashboards: cost per workflow, per provider, per tenant, trended over time. |
| **Usage Reports** | Exportable reports for finance/ops — cost attribution by feature, useful for pricing the product itself. |
| **Quota Management** | Hard per-plan-tier quotas (e.g., free vs. paid users) enforced before a request ever reaches a provider, avoiding wasted spend on requests that will be rejected anyway. |

---

## 9. Reliability

| Strategy | Description |
|---|---|
| **Retries** | Retry Manager applies exponential backoff with jitter, limited to transient/retryable error classes (timeouts, 5xx, rate-limit responses) — never blind retries on content errors. |
| **Timeouts** | Every provider call has an explicit timeout tuned per workflow (e.g., longer for full resume generation, shorter for keyword extraction). |
| **Circuit Breakers** | Trip after repeated provider failures to stop hammering a degraded provider, giving it recovery time and immediately failing fast for new requests. |
| **Fallback Providers** | Provider Factory supports a secondary provider per workflow; circuit-breaker trip triggers automatic failover, transparent to business logic. |
| **Graceful Degradation** | If all AI providers are unavailable, business services fall back to non-AI behavior where possible (e.g., return the user's original resume text unmodified, with a clear "AI suggestions unavailable" status) rather than hard failure. |
| **Rate Limiting** | Protects both the org's provider quotas and downstream system stability. |
| **Queueing** | Long-running/batch workflows (e.g., bulk résumé re-scoring) go through an async queue rather than blocking request threads. |
| **Asynchronous Processing** | Non-latency-critical workflows (career advice, batch ATS scans) processed via async jobs with callback/polling, freeing the Gateway for interactive requests. |
| **Monitoring** | Health checks per provider adapter feed the Circuit Breaker and Observability dashboards (Part 10). |

---

## 10. AI Observability

| Metric Category | What to Track |
|---|---|
| **Latency** | P50/P95/P99 per provider, per workflow. |
| **Token Usage** | Input/output tokens per request, trended by workflow and provider. |
| **Provider Availability** | Uptime/error rate per provider, circuit-breaker state history. |
| **Error Rates** | Broken down by error class: timeout, rate-limit, validation failure, malformed output. |
| **Cost Trends** | Daily/weekly/monthly spend by provider and workflow. |
| **Prompt Success Rates** | % of generations passing Output Validator on first attempt, per prompt version — the key signal for prompt quality regression. |
| **Response Quality Metrics** | Sampled human/automated review scores, hallucination-flag rate, fallback-trigger rate. |
| **Audit Logs** | Immutable record of who requested what, which prompt version and provider were used, and what was returned — required for both debugging and compliance. |

All of this flows from the Usage Logger and Cost Tracker into a central observability store, dashboarded independently of any single provider's own analytics (never rely solely on a vendor's dashboard — that breaks the abstraction and creates a blind spot on provider switch).

---

## 11. Future Expansion

The layered Gateway/Strategy/Factory design accommodates all of the following **without redesigning the AI layer**:

| Future Capability | How it fits without redesign |
|---|---|
| **Multi-Agent Systems** | Modeled as a new orchestration layer *above* the Gateway — agents call the same Gateway per step, just like any business service does today. |
| **Model Routing** | Already a Provider Factory responsibility; extending routing rules is config, not architecture change. |
| **Model Comparison** | Run the same request through multiple providers via the existing interface, compare via Response Processing + Observability metrics. |
| **A/B Testing** | Prompt versioning + provider routing already support splitting traffic by version/provider; add an experiment-assignment layer in the Gateway. |
| **Fine-Tuned Models** | Just another "model" value in provider configuration — the Adapter and Interface don't change. |
| **RAG (Retrieval-Augmented Generation)** | Introduced as a new pre-processing step feeding retrieved context into the Prompt Manager's variable resolution — Gateway contract unchanged. |
| **Knowledge Bases** | Backing store for RAG retrieval; sits alongside the Prompt Repository, not inside it. |
| **Voice AI** | New "modality" adapters implementing an extended Provider Interface variant; Gateway orchestration pattern unchanged. |
| **Image Generation** | Same as Voice AI — new provider category, same Factory/Strategy pattern, new response type in Response Processing. |

The architectural invariant: **new capability = new adapter/provider/prompt category, never a change to how business services talk to the Gateway.**

---

## 12. Development Standards

| Area | Rule |
|---|---|
| **Adding a new AI provider** | Must implement the AI Provider Interface fully; register via configuration, not code branching; must supply pricing data to Cost Tracker and error-classification data to Retry Manager before going live. |
| **Creating prompts** | Must go through Draft → Review → Approved → Published workflow; must include test cases; must be categorized and versioned; no prompt logic embedded in application code. |
| **Updating prompts** | Never edit a published version in place; always create a new version; old versions remain available for rollback. |
| **Logging** | Every AI call must be logged via Usage Logger with correlation IDs; no PII in log payloads beyond what's masked/permitted. |
| **Testing** | Prompt changes require regression testing against golden test cases; provider adapters require contract tests against the Provider Interface; Output Validator rules require unit tests with malformed-input fixtures. |
| **Configuration** | All provider credentials, model names, and routing policy live in AI Configuration Manager (externalized config), never hardcoded or embedded in prompts/code. |
| **Error Handling** | Distinguish and handle separately: transient provider errors, validation failures, and business-rule violations; never swallow AI errors silently. |
| **Documentation** | Every prompt template, provider adapter, and workflow must have an accompanying spec: purpose, inputs, expected output schema, validation rules, owning team. |
| **Code Reviews** | Any change touching the AI Gateway, Provider Interface, or Output Validator requires review from at least one engineer with AI-architecture context, given the blast radius of these shared components. |

---

## 13. Common AI Architecture Mistakes

| # | Mistake | Why It Happens | Why It's Dangerous | Professional Solution |
|---|---|---|---|---|
| 1 | Calling provider SDK directly from business services | Fastest path to a working demo | Total vendor lock-in, untestable code | Route everything through the AI Gateway |
| 2 | Hardcoding prompts as Java string literals | Feels simpler early on | No versioning, no rollback, redeploy for text changes | Externalize to Prompt Repository |
| 3 | No output validation | "The model is usually right" assumption | Hallucinated facts land in user resumes | Mandatory Output Validator stage |
| 4 | No retry/backoff strategy | Happy-path-only development | Transient errors become user-facing failures | Retry Manager with backoff + jitter |
| 5 | Retrying non-retryable errors | Treating all errors the same | Wastes cost, worsens outages, duplicate side effects | Classify errors as retryable vs. terminal |
| 6 | No timeout on provider calls | Default client settings assumed safe | One slow provider call can exhaust thread pools | Explicit per-workflow timeouts |
| 7 | No circuit breaker | Not anticipated until an outage happens | Cascading failures during provider downtime | Circuit breaker per provider adapter |
| 8 | Single-provider hard dependency | Only one provider integrated initially | No fallback during outages/price hikes | Multi-provider Strategy + Factory from day one |
| 9 | No cost tracking | Cost concerns deferred to "later" | Runaway spend discovered only on the invoice | Token Calculator + Cost Tracker from day one |
| 10 | No per-user rate limiting | Assumes users won't abuse the feature | Cost/DoS exposure from a single bad actor | Rate Limit Manager with per-user quotas |
| 11 | Logging full prompts/responses with PII | Convenient for debugging | Compliance violation, data breach surface | Field-level masking before logging |
| 12 | Treating AI output as trusted input | Anthropomorphizing model reliability | Malformed/injected content flows into business data | Treat AI output like untrusted user input |
| 13 | No schema-constrained output | Free-text parsing seems "good enough" | Fragile regex/string parsing breaks silently | Use structured/JSON output modes |
| 14 | Ignoring truncated responses | Truncation isn't obvious without checking finish reason | Silently incomplete resumes/cover letters shipped | Explicit truncation detection + retry/reject |
| 15 | No fallback response strategy | Assumes generation always succeeds | Hard failure shown to end users | Defined safe-fallback per workflow |
| 16 | Mixing system instructions with user data in one string | Simplicity of a single prompt string | Prompt injection via user-controlled fields | Strict instruction/data separation |
| 17 | No prompt injection defenses | Not considered a "real" threat initially | Model manipulated into ignoring safety rules | Validate output regardless of injected instructions |
| 18 | Trusting provider-side moderation alone | Assumes vendor moderation is sufficient | Vendor moderation policies change without notice | Independent content filtering layer |
| 19 | No versioning on prompts | Prompts treated as static config | Can't reproduce or roll back a bad prompt change | Immutable versioned prompt storage |
| 20 | No prompt approval workflow | Move-fast culture | Unreviewed prompts reach production, quality/safety risk | Draft → Review → Approved → Published |
| 21 | Testing prompts only manually in a playground | Fastest iteration loop | Regressions ship silently | Automated golden-test suite per prompt version |
| 22 | No localization strategy for prompts | English-only assumption | Poor quality output for non-English users | Locale-aware Prompt Manager |
| 23 | Duplicating prompt fragments across templates | Copy-paste under deadline pressure | Inconsistent tone/rules, painful maintenance | Reusable prompt partials |
| 24 | No token-budget awareness | Context window ignored until it breaks | Silent truncation or request failures on large resumes | Token Calculator pre-checks before sending |
| 25 | Synchronous calls for long-running workflows | Simpler request/response model | Blocked threads, poor UX for batch operations | Async/queue-based processing |
| 26 | No observability beyond basic logs | Observability deprioritized vs. features | Blind to quality regressions and cost spikes | Dedicated AI observability dashboards |
| 27 | No audit trail of which prompt/provider produced an output | Not considered until a dispute/incident | Can't debug or prove what generated a bad result | Immutable audit log per request |
| 28 | Assuming provider API is 100% deterministic | Misunderstanding of LLM behavior | Flaky "passing" tests, unreliable pipelines | Design tests/validators for variability |
| 29 | Skipping confidence/quality assessment | No signal-based gating in place | Low-quality output shipped as-is | Confidence heuristics + sampling review |
| 30 | Ignoring provider-specific rate limits | Config copied from one provider to another | Unexpected 429s in production | Per-provider rate-limit configuration |
| 31 | No graceful degradation path | AI treated as always-available | Full feature outage when AI is down | Non-AI fallback behavior defined per feature |
| 32 | Embedding API keys in code/config repo | Convenience during early development | Credential leakage | Secrets manager, never in source control |
| 33 | One-size-fits-all model selection | Simplicity of a single default model | Overpaying for simple tasks, underpowered for complex ones | Task-based model routing |
| 34 | No caching of repeat/deterministic requests | Cache invalidation feels complex | Redundant spend on identical requests | Cache layer keyed on normalized input |
| 35 | Not classifying PII fields before sending to providers | PII handling treated as an afterthought | Unnecessary sensitive-data exposure to third parties | Field-level data minimization policy |
| 36 | No plan for provider deprecation/model sunset | Assumes current model lives forever | Sudden breakage when a model is retired | Config-driven model versions, deprecation monitoring |
| 37 | Coupling response parsing to one provider's JSON shape | Fastest way to get output flowing | Breaks the abstraction, blocks multi-provider support | Provider-agnostic internal response DTO |
| 38 | No load testing of the AI layer | AI paths excluded from perf testing | Rate-limit/timeout cascades discovered in production | Include AI Gateway in load/perf test suites |
| 39 | Allowing unlimited free-form user input into prompts | Convenience, minimal input handling | Injection risk, unpredictable token costs | Input length/shape constraints before prompt assembly |
| 40 | No cost attribution by feature/tenant | Cost tracked only in aggregate | Can't identify which feature is driving spend | Cost Tracker dimensioned by workflow + tenant |
| 41 | Treating "AI Gateway" as a place to put all AI code | Convenient dumping ground | Gateway becomes an unmaintainable God Object | Gateway orchestrates; delegates to focused components |
| 42 | No rollback mechanism for bad prompt deploys | Rollback not planned for content changes | Bad prompt stays live until manually diagnosed | Version pointer rollback, no redeploy needed |

---

## Summary

This blueprint establishes an AI layer where:

- **Business services never know which AI provider is in use.**
- **Prompts are managed content, not code.**
- **Every AI response is validated before it can affect a user's resume.**
- **Cost, reliability, and security controls are enforced once, at the Gateway boundary — not duplicated per provider or per feature.**
- **New providers, workflows, and even entirely new AI modalities (voice, image, RAG, agents) can be added as new adapters/components without touching existing business logic.**

This is the architecture the engineering team should implement against, provider by provider, workflow by workflow.


# 12 Configuration

pplication.properties provides defaults and environment placeholders. Dev/prod property files override profile-specific behavior. .env.example lists required values without secrets; ignored .env files hold local secrets. ite.config.js controls plugins, tests, coverage, port, host, and proxy. package.json and pom.xml are build manifests. Dockerfiles define immutable images; Compose defines processes/networking/mounts/health; Nginx defines TLS and proxy rules; GitHub workflow YAML defines CI.

Configuration precedence matters: command-line and environment values can override files. Production validation deliberately fails fast when secrets, provider settings, CORS, secure cookies, or OTP choices are unsafe. Never commit .env, provider keys, database passwords, JWT secrets, SMTP credentials, or TLS private keys.

The spring.config.import=optional:file:./.env[.properties] path is relative to the backend process working directory. Starting from the wrong directory can make a valid .env appear missing.


# 13 Build System

Maven resolves Java artifacts from coordinates (groupId, rtifactId, ersion). The Spring Boot parent manages compatible versions; explicit properties pin security/platform upgrades. Dependencies can be transitive (simple meaning: pulled in by another dependency). Maven phases progress through validate, compile, test, package, verify, install, and deploy. Surefire runs unit tests; Failsafe runs integration tests under the profile; JaCoCo instruments code and enforces 24% line coverage; the Boot plugin repackages a runnable JAR.

npm reads semantic versions in package.json, while package-lock.json records an exact dependency graph for reproducibility. Vite develops/bundles, ESLint checks code, Prettier checks formatting, Vitest executes unit/component tests in jsdom, V8 measures coverage, and Playwright drives a real browser. 
pm ci is generally preferable in CI because it refuses manifest/lock disagreement and recreates dependencies exactly.


# 14 Every Dependency

The table below is generated directly from the two current manifests. Installed but not used requires import/config evidence, not guessing from a package name.

## Backend dependencies

| Maven coordinate | Scope | Current reason | Removal effect |
|---|---|---|---|
| **org.springframework.boot:spring-boot-starter-web** | compile | REST controllers, JSON, embedded Tomcat, servlet filters. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **org.springframework.boot:spring-boot-starter-security** | compile | JWT filter chain, password hashing, authorization. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **org.springframework.boot:spring-boot-starter-data-jpa** | compile | Hibernate entity mapping and Spring Data repositories. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **org.springframework.boot:spring-boot-starter-validation** | compile | Jakarta request constraints such as @NotBlank. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **org.springframework.boot:spring-boot-starter-actuator** | compile | Operational health endpoint used by Docker. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **org.springframework.boot:spring-boot-starter-mail** | compile | Verification and password-reset email delivery. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **org.springframework.boot:spring-boot-starter-data-redis** | compile | Optional Redis-backed AI rate limiting. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **org.flywaydb:flyway-mysql** | compile | Versioned MySQL schema migrations. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **org.springdoc:springdoc-openapi-starter-webmvc-ui** | compile | Generated OpenAPI description and Swagger UI. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **com.github.librepdf:openpdf** | compile | Server-side PDF rendering. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **com.mysql:mysql-connector-j** | runtime | JDBC driver connecting Java to MySQL. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **io.jsonwebtoken:jjwt-api** | compile | JWT programming API. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **io.jsonwebtoken:jjwt-impl** | runtime | Runtime JWT implementation. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **io.jsonwebtoken:jjwt-jackson** | runtime | JWT JSON serialization support. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **org.projectlombok:lombok** | compile, optional | Generates repetitive getters, setters, and constructors at compile time. | Affected production code stops compiling or the corresponding runtime feature fails. |
| **org.springframework.boot:spring-boot-starter-test** | test | JUnit, Mockito, and Spring testing tools. | Production still starts, but affected tests stop compiling/running. |
| **org.springframework.security:spring-security-test** | test | Security test helpers. | Production still starts, but affected tests stop compiling/running. |

## Frontend dependencies

| Package | Version | Classification |
|---|---:|---|
| **@tanstack/react-query** | **5.101.2** | Used for server-state fetching, caching, mutations, and invalidation. |
| **@untitledui/icons** | **0.0.22** | Installed icon family; current central icon wrapper primarily uses Lucide, so audit before keeping. |
| **axios** | **^1.7.0** | Used central HTTP client with authentication interceptors. |
| **gsap** | **3.15.0** | Used animation engine. |
| **locomotive-scroll** | **5.0.1** | Used enhanced scrolling integration and stylesheet. |
| **lucide-react** | **1.26.0** | Used icon set. |
| **motion** | **12.43.0** | Used motion/animation utilities. |
| **react** | **^19.2.7** | Core component and state library. |
| **react-dom** | **^19.2.7** | Mounts React into the browser DOM. |
| **react-hook-form** | **7.82.0** | Used form state and validation orchestration. |
| **react-router-dom** | **npm:react-router@8.3.0** | Alias to React Router; used for browser routing and guards. |

## Frontend devDependencies

| Package | Version | Classification |
|---|---:|---|
| **@playwright/test** | **1.61.1** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **@tailwindcss/vite** | **^4.1.0** | Connects Tailwind to Vite; only useful while Tailwind remains configured. |
| **@testing-library/jest-dom** | **^6.6.3** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **@testing-library/react** | **^16.1.0** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **@testing-library/user-event** | **14.6.1** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **@vitejs/plugin-react** | **^6.0.3** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **@vitest/coverage-v8** | **4.1.10** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **autoprefixer** | **^10.4.20** | Installed CSS compatibility tool; no explicit PostCSS config was found, so likely redundant. |
| **eslint** | **^9.39.5** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **eslint-plugin-react** | **^7.35.0** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **eslint-plugin-react-hooks** | **^5.2.0** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **eslint-plugin-simple-import-sort** | **14.0.0** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **jest-axe** | **10.0.0** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **jsdom** | **^25.0.1** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **postcss** | **^8.4.49** | Installed CSS processing foundation; likely transitive/tooling support rather than direct configuration. |
| **prettier** | **^3.4.2** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **tailwindcss** | **^4.1.0** | Configured, but the current UI mainly uses authored CSS; candidate for removal after a class-usage audit. |
| **vite** | **^8.1.5** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |
| **vitest** | **^4.1.10** | Development-only build, lint, format, unit-test, accessibility-test, DOM, coverage, or browser-test tooling. |

## Installed but Not Used

@untitledui/icons appears installed while the centralized icon path mainly uses lucide-react; verify all imports before removal. Tailwind and its Vite plugin are configured, but most authored UI uses custom CSS; removal would require confirming that no Tailwind utility classes or generated directives remain and then removing both packages and the plugin together. utoprefixer and postcss have no obvious explicit config and may be redundant under the current Vite pipeline. Removing unused packages shrinks install surface and security alerts; keeping them avoids churn if an imminent feature truly needs them. The correct professional action is an import/build audit followed by one removal per tested change.


# 15 Every Class

This catalog covers every production Java type and every non-test frontend source module. For a controller, read methods as HTTP operations; for a service, read public methods as use cases; for a repository, read methods as database queries; for a DTO/record, read fields as the contract; for an entity, combine fields with the matching Flyway table.

## Backend production type catalog

| Source file | Kind and responsibility inferred from current code |
|---|---|
| **backend/src/main/java/com/airesumebuilder/AiResumeBuilderApplication.java** | class **AiResumeBuilderApplication** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/common/dto/ApiError.java** | record **ApiError** - Shared API contract used across feature modules. |
| **backend/src/main/java/com/airesumebuilder/common/dto/ApiFieldError.java** | record **ApiFieldError** - Shared API contract used across feature modules. |
| **backend/src/main/java/com/airesumebuilder/common/dto/ApiMeta.java** | record **ApiMeta** - Shared API contract used across feature modules. |
| **backend/src/main/java/com/airesumebuilder/common/dto/ApiResponse.java** | record **ApiResponse** - Shared API contract used across feature modules. |
| **backend/src/main/java/com/airesumebuilder/common/dto/Pagination.java** | record **Pagination** - Shared API contract used across feature modules. |
| **backend/src/main/java/com/airesumebuilder/common/exception/AuthenticationException.java** | class **AuthenticationException** - Exception boundary: represents or translates a controlled failure. |
| **backend/src/main/java/com/airesumebuilder/common/exception/AuthorizationException.java** | class **AuthorizationException** - Exception boundary: represents or translates a controlled failure. |
| **backend/src/main/java/com/airesumebuilder/common/exception/BaseException.java** | class **BaseException** - Exception boundary: represents or translates a controlled failure. |
| **backend/src/main/java/com/airesumebuilder/common/exception/ConflictException.java** | class **ConflictException** - Exception boundary: represents or translates a controlled failure. |
| **backend/src/main/java/com/airesumebuilder/common/exception/ExternalServiceException.java** | class **ExternalServiceException** - Exception boundary: represents or translates a controlled failure. |
| **backend/src/main/java/com/airesumebuilder/common/exception/GlobalExceptionHandler.java** | class **GlobalExceptionHandler** - Exception boundary: represents or translates a controlled failure. |
| **backend/src/main/java/com/airesumebuilder/common/exception/ResourceNotFoundException.java** | class **ResourceNotFoundException** - Exception boundary: represents or translates a controlled failure. |
| **backend/src/main/java/com/airesumebuilder/common/exception/ValidationException.java** | class **ValidationException** - Exception boundary: represents or translates a controlled failure. |
| **backend/src/main/java/com/airesumebuilder/common/mapper/Mapper.java** | interface **Mapper** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/common/util/DateTimeUtil.java** | class **DateTimeUtil** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/common/validation/ResumeValidation.java** | class **ResumeValidation** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/common/web/CorrelationIdContext.java** | class **CorrelationIdContext** - Cross-cutting web infrastructure. |
| **backend/src/main/java/com/airesumebuilder/common/web/CorrelationIdFilter.java** | class **CorrelationIdFilter** - Cross-cutting web infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/AsyncConfig.java** | class **AsyncConfig** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/CacheConfig.java** | class **CacheConfig** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/CorsConfig.java** | class **CorsConfig** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/DevDataSeeder.java** | class **DevDataSeeder** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/EnvironmentConfigurationValidator.java** | class **EnvironmentConfigurationValidator** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/JacksonConfig.java** | class **JacksonConfig** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/OpenApiConfig.java** | class **OpenApiConfig** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/PasswordConfig.java** | class **PasswordConfig** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/RestClientTimeoutConfiguration.java** | class **RestClientTimeoutConfiguration** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/SchedulingConfig.java** | class **SchedulingConfig** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/config/SecurityConfig.java** | class **SecurityConfig** - Configuration: creates or customizes Spring-managed infrastructure. |
| **backend/src/main/java/com/airesumebuilder/events/ResumeCreatedEvent.java** | record **ResumeCreatedEvent** - Domain event carrying resume lifecycle facts. |
| **backend/src/main/java/com/airesumebuilder/events/ResumeDeletedEvent.java** | record **ResumeDeletedEvent** - Domain event carrying resume lifecycle facts. |
| **backend/src/main/java/com/airesumebuilder/events/ResumeUpdatedEvent.java** | record **ResumeUpdatedEvent** - Domain event carrying resume lifecycle facts. |
| **backend/src/main/java/com/airesumebuilder/feature/admin/controller/AdminController.java** | class **AdminController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/admin/entity/AdminActionLog.java** | class **AdminActionLog** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/admin/repository/AdminRepository.java** | class **AdminRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/admin/service/AdminService.java** | class **AdminService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/controller/AiController.java** | class **AiController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/controller/AiPromptAdminController.java** | class **AiPromptAdminController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/controller/AiSettingsController.java** | class **AiSettingsController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/dto/request/AiGenerationRequest.java** | record **AiGenerationRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/dto/request/AiSettingsRequest.java** | record **AiSettingsRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/dto/request/GenerateContentRequest.java** | record **GenerateContentRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/dto/request/PromptTemplateRequest.java** | record **PromptTemplateRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/dto/request/ProviderCredentialRequest.java** | record **ProviderCredentialRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/dto/response/AiGenerationResponse.java** | record **AiGenerationResponse** - Response DTO: stable output returned to clients. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/dto/response/AiJobResponse.java** | record **AiJobResponse** - Response DTO: stable output returned to clients. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/dto/response/AiProviderHealthResponse.java** | record **AiProviderHealthResponse** - Response DTO: stable output returned to clients. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/dto/response/AiSettingsResponse.java** | record **AiSettingsResponse** - Response DTO: stable output returned to clients. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/dto/response/AiUsageResponse.java** | record **AiUsageResponse** - Response DTO: stable output returned to clients. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiGeneratedContent.java** | class **AiGeneratedContent** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiJob.java** | class **AiJob** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiProvider.java** | class **AiProvider** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiRequest.java** | class **AiRequest** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiRequestAttempt.java** | class **AiRequestAttempt** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/entity/AiUsageLedger.java** | class **AiUsageLedger** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/repository/AiJobRepository.java** | class **AiJobRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/repository/AiPromptRepository.java** | class **AiPromptRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/repository/AiUsageRepository.java** | class **AiUsageRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/repository/AiUserSettingsRepository.java** | class **AiUserSettingsRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/service/AiJobLifecycleService.java** | class **AiJobLifecycleService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/service/AiJobRunner.java** | interface **AiJobRunner** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/service/AiJobService.java** | interface **AiJobService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/service/AiPromptAdminService.java** | class **AiPromptAdminService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/service/AiService.java** | interface **AiService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/service/AiUserSettingsService.java** | class **AiUserSettingsService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/service/impl/AiJobRunnerImpl.java** | class **AiJobRunnerImpl** - Service implementation: executes a business workflow. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/service/impl/AiJobServiceImpl.java** | class **AiJobServiceImpl** - Service implementation: executes a business workflow. |
| **backend/src/main/java/com/airesumebuilder/feature/ai/service/impl/AiServiceImpl.java** | class **AiServiceImpl** - Service implementation: executes a business workflow. |
| **backend/src/main/java/com/airesumebuilder/feature/analytics/controller/AdminAnalyticsController.java** | class **AdminAnalyticsController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/analytics/controller/AnalyticsController.java** | class **AnalyticsController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/analytics/entity/UsageMetric.java** | class **UsageMetric** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/analytics/repository/AnalyticsRepository.java** | class **AnalyticsRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/analytics/service/AnalyticsService.java** | class **AnalyticsService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/ats/controller/AtsController.java** | Java type - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/ats/entity/AtsKeywordMatch.java** | class **AtsKeywordMatch** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/ats/entity/AtsMissingSkill.java** | class **AtsMissingSkill** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/ats/entity/AtsRecommendation.java** | class **AtsRecommendation** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/ats/entity/AtsReport.java** | class **AtsReport** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/ats/repository/AtsRepository.java** | class **AtsRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/ats/service/AtsScoringEngine.java** | class **AtsScoringEngine** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/ats/service/AtsService.java** | class **AtsService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/audit/controller/AuditController.java** | Java type - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/audit/entity/AuditLog.java** | class **AuditLog** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/audit/listener/ResumeAuditListener.java** | Java type - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/audit/repository/AuditRepository.java** | Java type - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/audit/service/AuditService.java** | Java type - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/controller/AuthController.java** | class **AuthController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/ChangePasswordRequest.java** | record **ChangePasswordRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/ForgotPasswordRequest.java** | record **ForgotPasswordRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/LoginRequest.java** | record **LoginRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/RegisterRequest.java** | record **RegisterRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/ResendVerificationRequest.java** | record **ResendVerificationRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/dto/request/ResetPasswordRequest.java** | record **ResetPasswordRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/dto/response/AuthResponse.java** | record **AuthResponse** - Response DTO: stable output returned to clients. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/dto/response/RegistrationResponse.java** | record **RegistrationResponse** - Response DTO: stable output returned to clients. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/entity/EmailVerificationToken.java** | class **EmailVerificationToken** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/entity/PasswordResetToken.java** | class **PasswordResetToken** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/entity/RefreshToken.java** | class **RefreshToken** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/entity/User.java** | class **User** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/entity/UserProfile.java** | class **UserProfile** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/phone/AndroidGatewayOtpDeliveryProvider.java** | class **AndroidGatewayOtpDeliveryProvider** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/phone/FakeOtpDeliveryProvider.java** | class **FakeOtpDeliveryProvider** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/phone/Msg91OtpDeliveryProvider.java** | class **Msg91OtpDeliveryProvider** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/phone/OtpDeliveryProvider.java** | interface **OtpDeliveryProvider** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/phone/PhoneNumbers.java** | class **PhoneNumbers** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/phone/PhoneOtpChallenge.java** | class **PhoneOtpChallenge** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/phone/PhoneOtpRepository.java** | interface **PhoneOtpRepository** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/phone/PhoneVerificationController.java** | class **PhoneVerificationController** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/phone/PhoneVerificationService.java** | class **PhoneVerificationService** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/phone/TextBeeOtpDeliveryProvider.java** | class **TextBeeOtpDeliveryProvider** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/repository/EmailVerificationTokenRepository.java** | interface **EmailVerificationTokenRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/repository/PasswordResetTokenRepository.java** | interface **PasswordResetTokenRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/repository/RefreshTokenRepository.java** | interface **RefreshTokenRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/repository/UserRepository.java** | interface **UserRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/service/AuthService.java** | interface **AuthService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/service/impl/AuthServiceImpl.java** | class **AuthServiceImpl** - Service implementation: executes a business workflow. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/service/impl/UserAccountQueryServiceImpl.java** | class **UserAccountQueryServiceImpl** - Service implementation: executes a business workflow. |
| **backend/src/main/java/com/airesumebuilder/feature/auth/service/UserAccountQueryService.java** | interface **UserAccountQueryService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/job/controller/JobController.java** | Java type - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/job/entity/JobDescription.java** | class **JobDescription** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/job/entity/JobMatch.java** | class **JobMatch** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/job/service/JobService.java** | Java type - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/notification/controller/NotificationController.java** | Java type - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/notification/entity/Notification.java** | class **Notification** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/notification/service/NotificationService.java** | Java type - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/pdf/controller/PdfController.java** | Java type - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/pdf/controller/ResumePdfController.java** | Java type - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/pdf/repository/PdfExportRepository.java** | class **PdfExportRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/pdf/service/PdfRenderer.java** | class **PdfRenderer** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/pdf/service/PdfService.java** | Java type - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/controller/ResumeController.java** | class **ResumeController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/controller/ResumeSectionController.java** | class **ResumeSectionController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/dto/request/CreateResumeRequest.java** | record **CreateResumeRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/dto/request/PatchResumeRequest.java** | record **PatchResumeRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/dto/request/ReorderSectionsRequest.java** | record **ReorderSectionsRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/dto/request/ResumeSectionRequest.java** | record **ResumeSectionRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/dto/request/UpdateResumeRequest.java** | record **UpdateResumeRequest** - Request DTO: validated input crossing the HTTP boundary. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/dto/response/DeletedResumeResponse.java** | record **DeletedResumeResponse** - Response DTO: stable output returned to clients. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/dto/response/ResumeResponse.java** | record **ResumeResponse** - Response DTO: stable output returned to clients. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/dto/response/ResumeSectionResponse.java** | record **ResumeSectionResponse** - Response DTO: stable output returned to clients. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/entity/Certification.java** | class **Certification** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/entity/Education.java** | class **Education** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/entity/Experience.java** | class **Experience** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/entity/Project.java** | class **Project** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/entity/Resume.java** | class **Resume** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/entity/ResumeSection.java** | Java type - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/entity/Skill.java** | class **Skill** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/repository/ResumeRepository.java** | interface **ResumeRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/repository/ResumeSectionRepository.java** | interface **ResumeSectionRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/service/impl/ResumeServiceImpl.java** | class **ResumeServiceImpl** - Service implementation: executes a business workflow. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/service/ResumeSectionService.java** | class **ResumeSectionService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/service/ResumeService.java** | interface **ResumeService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/version/controller/ResumeVersionController.java** | class **ResumeVersionController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/version/entity/ResumeVersion.java** | class **ResumeVersion** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/version/entity/ResumeVersionSnapshot.java** | class **ResumeVersionSnapshot** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/version/repository/ResumeVersionRepository.java** | class **ResumeVersionRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/resume/version/service/ResumeVersionService.java** | class **ResumeVersionService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/subscription/controller/SubscriptionController.java** | class **SubscriptionController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/subscription/entity/PaymentTransaction.java** | class **PaymentTransaction** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/subscription/entity/Subscription.java** | class **Subscription** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/subscription/repository/SubscriptionRepository.java** | class **SubscriptionRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/subscription/service/SubscriptionService.java** | class **SubscriptionService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/template/controller/TemplateController.java** | Java type - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/template/engine/TemplateDefinition.java** | record **TemplateDefinition** - Application support or entry-point type. |
| **backend/src/main/java/com/airesumebuilder/feature/template/entity/Template.java** | class **Template** - Persistence entity: maps application state to a database table. |
| **backend/src/main/java/com/airesumebuilder/feature/template/service/TemplateService.java** | record **TemplateResponse** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/feature/user/controller/UserController.java** | class **UserController** - HTTP controller: maps requests to application operations. |
| **backend/src/main/java/com/airesumebuilder/feature/user/repository/UserProfileRepository.java** | interface **UserProfileRepository** - Repository: reads or writes persistent data through JPA or SQL. |
| **backend/src/main/java/com/airesumebuilder/feature/user/service/UserProfileService.java** | class **UserProfileService** - Service contract or service: defines/executes business behavior. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiBudgetManager.java** | class **AiBudgetManager** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiCostCalculator.java** | Java type - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiGateway.java** | class **AiGateway** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiOutputValidator.java** | class **AiOutputValidator** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiProvider.java** | interface **AiProvider** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiProviderFactory.java** | class **AiProviderFactory** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiProviderHealth.java** | Java type - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiProviderRequest.java** | record **AiProviderRequest** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiProviderResponse.java** | record **AiProviderResponse** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiRateLimitManager.java** | class **AiRateLimitManager** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiResponseCache.java** | class **AiResponseCache** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/AiUsageLogger.java** | class **AiUsageLogger** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/GeminiProviderAdapter.java** | class **GeminiProviderAdapter** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/OpenAiProviderAdapter.java** | class **OpenAiProviderAdapter** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/PromptManager.java** | class **PromptManager** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/integration/ai/RedisAiRateLimitManager.java** | class **RedisAiRateLimitManager** - AI integration component: provider-neutral orchestration or provider adapter. |
| **backend/src/main/java/com/airesumebuilder/security/AccountRecoveryService.java** | class **AccountRecoveryService** - Security component: authentication, authorization, tokens, recovery, or filters. |
| **backend/src/main/java/com/airesumebuilder/security/AuthRateLimitFilter.java** | class **AuthRateLimitFilter** - Security component: authentication, authorization, tokens, recovery, or filters. |
| **backend/src/main/java/com/airesumebuilder/security/CurrentUser.java** | class **CurrentUser** - Security component: authentication, authorization, tokens, recovery, or filters. |
| **backend/src/main/java/com/airesumebuilder/security/JwtAuthenticationFilter.java** | class **JwtAuthenticationFilter** - Security component: authentication, authorization, tokens, recovery, or filters. |
| **backend/src/main/java/com/airesumebuilder/security/JwtService.java** | class **JwtService** - Security component: authentication, authorization, tokens, recovery, or filters. |
| **backend/src/main/java/com/airesumebuilder/security/RefreshTokenService.java** | class **RefreshTokenService** - Security component: authentication, authorization, tokens, recovery, or filters. |
| **backend/src/main/java/com/airesumebuilder/security/RestAccessDeniedHandler.java** | class **RestAccessDeniedHandler** - Security component: authentication, authorization, tokens, recovery, or filters. |
| **backend/src/main/java/com/airesumebuilder/security/RestAuthenticationEntryPoint.java** | class **RestAuthenticationEntryPoint** - Security component: authentication, authorization, tokens, recovery, or filters. |
| **backend/src/main/java/com/airesumebuilder/security/SecurityEmailService.java** | class **SecurityEmailService** - Security component: authentication, authorization, tokens, recovery, or filters. |

## Frontend production module catalog

| Source file | Responsibility |
|---|---|
| **frontend/src/animations/motion.js** | Motion and scrolling behavior. |
| **frontend/src/animations/scrollManager.js** | Motion and scrolling behavior. |
| **frontend/src/api/axiosInstance.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/api/errorHandler.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/api/interceptors/requestInterceptor.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/api/interceptors/responseInterceptor.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/api/queryClient.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/api/tokenRefresh.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/App.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/components/AppIcon.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/AsyncState.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/Button.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/Card.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/Checkbox.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/CommandPalette.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/ConfirmationDialog.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/Dropdown.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/ErrorBoundary.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/FormField.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/Input.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/landing/LandingPrimitives.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/landing/PremiumTiltCard.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/landing/TiltedCard.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/Modal.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/ModulePage.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/MotionProvider.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/MultiStepFormWizard.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/NotificationProvider.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/RadioGroup.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/RouteErrorBoundary.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/RouteFocusManager.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/Select.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/Skeleton.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/Table.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/Textarea.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/components/UnsavedChangesDialog.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/config/env.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/constants/resume.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/context/AuthContext.jsx** | React context/provider for shared authentication state. |
| **frontend/src/features/admin/api/adminApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/admin/components/AdminManagementPanel.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/admin/components/PromptAdminPanel.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/admin/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/admin/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/ai/api/aiApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/ai/api/promptAdminApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/aiAssistant/api/aiAssistantApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/aiAssistant/components/AiAssistantPanel.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/aiAssistant/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/aiAssistant/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/ats/api/atsApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/ats/components/AtsWorkspace.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/ats/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/ats/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/auth/api/authApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/auth/api/passwordBreachApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/auth/components/AuthForm.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/auth/components/AuthInput.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/auth/components/ForgotPasswordForm.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/auth/components/PasswordCreationFields.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/auth/components/PasswordLoginField.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/auth/components/ResetPasswordForm.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/auth/components/VerifyEmailForm.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/auth/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/auth/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/auth/utils/passwordSecurity.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/coverLetter/components/CoverLetterWorkspace.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/coverLetter/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/coverLetter/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/dashboard/components/DashboardWorkspace.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/dashboard/hooks/useDashboardWorkspace.js** | Custom React hook that packages reusable stateful behavior. |
| **frontend/src/features/dashboard/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/jobMatching/api/jobApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/jobMatching/components/JobMatchingWorkspace.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/jobMatching/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/jobMatching/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/notifications/api/notificationApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/notifications/components/NotificationsPanel.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/notifications/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/notifications/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/profile/api/profileApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/profile/components/ProfilePanel.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/profile/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/profile/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/resume/api/resumeApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/resume/completion/completionConfig.js** | Resume completeness and quality rules. |
| **frontend/src/features/resume/completion/qualityAnalyzer.js** | Resume completeness and quality rules. |
| **frontend/src/features/resume/completion/ResumeCompletionEngine.js** | Resume completeness and quality rules. |
| **frontend/src/features/resume/completion/rules/helpers.js** | Resume completeness and quality rules. |
| **frontend/src/features/resume/completion/rules/links.js** | Resume completeness and quality rules. |
| **frontend/src/features/resume/completion/rules/personal.js** | Resume completeness and quality rules. |
| **frontend/src/features/resume/completion/rules/sections.js** | Resume completeness and quality rules. |
| **frontend/src/features/resume/completion/rules/summary.js** | Resume completeness and quality rules. |
| **frontend/src/features/resume/completion/useResumeCompletion.js** | Resume completeness and quality rules. |
| **frontend/src/features/resume/components/ResumeCard.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/resume/components/ResumeCompletionCard.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/resume/components/ResumeDocumentPreview.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/resume/components/ResumeEditor.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/resume/components/ResumeVersionDetail.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/resume/components/ResumeVersionsPanel.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/resume/components/TypedSectionsEditor.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/resume/hooks/useResumeAutosave.js** | Custom React hook that packages reusable stateful behavior. |
| **frontend/src/features/resume/hooks/useResumes.js** | Custom React hook that packages reusable stateful behavior. |
| **frontend/src/features/resume/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/resume/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/settings/api/aiSettingsApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/settings/components/AiProviderSettings.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/settings/components/SettingsForm.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/settings/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/settings/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/templates/api/templateApi.js** | HTTP client, endpoint wrapper, interceptor, error normalization, or query cache setup. |
| **frontend/src/features/templates/components/TemplateGallery.jsx** | React component: renders a feature or reusable user-interface element. |
| **frontend/src/features/templates/index.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/templates/routes.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/features/templates/templateEngine.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/hooks/useDebounce.js** | Custom React hook that packages reusable stateful behavior. |
| **frontend/src/hooks/useModuleHealth.js** | Custom React hook that packages reusable stateful behavior. |
| **frontend/src/hooks/useUndoRedoState.js** | Custom React hook that packages reusable stateful behavior. |
| **frontend/src/layouts/AuthLayout.jsx** | Shared page shell around guest or signed-in routes. |
| **frontend/src/layouts/DashboardLayout.jsx** | Shared page shell around guest or signed-in routes. |
| **frontend/src/main.jsx** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/pages/ForbiddenPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/LandingPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/LoginPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/NotFoundPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/OnboardingPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/RecentlyDeletedPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/RegisterPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/ResumeAtsPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/ResumeEditorPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/ResumePreviewPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/ResumesPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/ResumeVersionDetailPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/ResumeVersionsPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/pages/TemplatesPage.jsx** | Route-level page that composes feature components. |
| **frontend/src/routes/AdminRoute.jsx** | Route table or route guard controlling navigation. |
| **frontend/src/routes/GuestRoute.jsx** | Route table or route guard controlling navigation. |
| **frontend/src/routes/index.jsx** | Route table or route guard controlling navigation. |
| **frontend/src/routes/OnboardingGate.jsx** | Route table or route guard controlling navigation. |
| **frontend/src/routes/ProtectedRoute.jsx** | Route table or route guard controlling navigation. |
| **frontend/src/services/authSession.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/test/setup.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/types/contracts.js** | Frontend entry point, configuration, constants, service, or feature export. |
| **frontend/src/validators/authValidator.js** | Pure client-side validation rules. |
| **frontend/src/validators/resumeValidator.js** | Pure client-side validation rules. |

### How to do a line-by-line class reading

Start with imports: they reveal collaborators. Read annotations next: Spring/JPA annotations change lifecycle behavior. Read constructor parameters: they expose dependencies. Read public methods: they define usable behavior. Then read private helpers and failure branches. Finally trace each repository call to migration-defined tables and each returned DTO to the frontend API wrapper. This method scales better than memorizing syntax.


# 16 Design Patterns

| Pattern | Simple meaning | Current example | Why |
|---|---|---|---|
| MVC/layered | Separate HTTP, decisions, and data access | Controllers to services to repositories | Testable boundaries |
| Dependency Injection | Spring constructs objects and supplies collaborators | Constructor injection throughout backend | Central lifecycle/configuration |
| Repository | Hide persistence operations behind named methods | ResumeRepository, JDBC repositories | Business code does not own SQL mechanics |
| Strategy | Interchangeable behavior under one contract | AiProvider adapters; OTP providers | Provider selection without business rewrites |
| Factory | Chooses/constructs one strategy | AiProviderFactory | Central vendor routing |
| Adapter | Converts an external interface to internal shape | Gemini/OpenAI adapters | Contains vendor differences |
| Facade/Gateway | One simpler doorway to a subsystem | AiGateway | Central limits/cache/validation/logging |
| Observer | React/event listeners respond to change | ResumeAuditListener, React state rendering | Decouples producer and response |
| Decorator/filter chain | Wrap request processing with cross-cutting behavior | servlet security/correlation filters | One policy applies across endpoints |
| Provider | Shares state/services down a UI tree | Auth, Query, Notification providers | Avoid prop drilling |
| Builder (library use) | Incrementally assembles a complex object | security HTTP configuration, OpenAPI/Jackson builders | Readable configuration |
| Singleton scope | One shared application instance by default | Spring beans, query client | Reuse stateless infrastructure |

Not every class needs a named pattern. Forcing patterns creates indirection. Patterns are vocabulary for recurring trade-offs, not badges.


# 17 Data Flow

`mermaid
flowchart TD
  U[User facts and intent] --> FORM[React form/editor]
  FORM --> VAL[Client validation]
  VAL --> API[Axios API module]
  API --> AUTH[JWT security boundary]
  AUTH --> CTRL[Controller validation]
  CTRL --> SVC[Business service]
  SVC --> OWN[Ownership and lifecycle checks]
  OWN --> REPO[Repository]
  REPO --> DB[(MySQL)]
  SVC -. generation workflow .-> AIGW[AI Gateway]
  AIGW --> EXT[Gemini/OpenAI]
  EXT --> AIGW
  AIGW --> DB
  DB --> REPO --> SVC --> DTO[Response DTO]
  DTO --> JSON[ApiResponse JSON]
  JSON --> CACHE[React Query cache]
  CACHE --> VIEW[Rendered UI/preview]
`

Data ownership is the central invariant: the authenticated subject selects a user; services/repositories must ensure resume, job, version, report, notification, and settings rows belong to that user. The frontend may send IDs but never decides ownership.

## Resume-domain depth

y# Resume Domain Architecture Blueprint
### AI Resume Builder — Official Domain Guide
**Audience:** Backend, Frontend, Database, AI, QA, Product
**Scope:** Business domain only — no code, SQL, APIs, or UI implementation

---

## Table of Contents
1. Business Domain Analysis
2. Resume Lifecycle
3. Resume Structure
4. Business Rules
5. Module Interactions
6. Versioning Strategy
7. Validation Strategy
8. Template Architecture
9. Import/Export Architecture
10. Analytics
11. Future Expansion
12. Development Standards
13. Common Business Logic Mistakes

---

## 1. Business Domain Analysis

Each capability below is a **business capability**, not a technical feature — it exists to serve a specific user or organizational need.

| Capability | Why It Exists |
|---|---|
| **Resume Creation** | Entry point to the domain. Users need a starting artifact before anything else can happen. |
| **Resume Editing** | Resumes are living documents; careers evolve, so content must be mutable. |
| **Resume Saving** | Users must not lose work; trust in the product depends on durable persistence. |
| **Resume Publishing** | Marks a resume as "ready for use" (export/share), distinct from a work-in-progress draft. |
| **Resume Versioning** | Enables experimentation (e.g., different resumes per job) without destroying prior work. |
| **Resume Preview** | Users need to see the *rendered* output before committing to export/share — WYSIWYG trust. |
| **Resume Sharing** | Enables external validation (recruiters, mentors, peers) without requiring an export. |
| **Resume Duplication** | Supports tailoring the same base resume for multiple roles/companies. |
| **Resume Import** | Reduces creation friction for users who already have a resume elsewhere. |
| **Resume Export** | The resume must leave the system in a portable, universally accepted format (PDF, DOCX). |
| **Resume Archiving** | Supports "soft retirement" of resumes without permanent loss — declutters active view. |
| **Resume Deletion** | Gives users control over their data (also a compliance/privacy requirement). |
| **Resume Recovery** | Protects against accidental loss; a safety net after deletion/archiving. |
| **Resume Analytics** | Gives users/product insight into resume quality, usage, and effectiveness. |
| **Resume Collaboration** (future) | Careers are often shaped with help from mentors, career coaches, or recruiters. |

**Key principle:** every capability maps to a *user intent* or *organizational need* — none exist purely for technical convenience.

---

## 2. Resume Lifecycle

### 2.1 Conceptual Stages

```
[Creation] → [Draft] → [Editing] ⇄ [Validation]
                                       │
                                       ▼
                                  [Preview]
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼              ▼
                 [AI Enhancement] [Template Assign] [Manual Edit]
                         └─────────────┼─────────────┘
                                       ▼
                                [PDF Generation]
                                       │
                                       ▼
                                  [Publishing]
                                       │
                                       ▼
                              [Version Creation]
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼              ▼
                   [Sharing]     [Archiving]     [Deletion]
                                                       │
                                                       ▼
                                                  [Recovery]
                                                  (time-boxed)
```

### 2.2 Stage Definitions

- **Creation** — a resume shell is instantiated; owned by exactly one user; empty or template-seeded.
- **Draft** — default state; not considered "final"; freely mutable; not guaranteed export-ready.
- **Editing** — active mutation of any section; can happen many times across the lifecycle, not just pre-publish.
- **Validation** — a continuous, non-blocking gate that classifies the resume as *incomplete*, *valid-but-improvable*, or *export-ready*.
- **Preview** — read-only rendering of current state using a selected template; does not alter domain data.
- **AI Enhancement** — optional, invoked, produces *suggestions* that a human must accept — AI never silently mutates the resume of record.
- **Template Assignment** — binds structural content to a presentational template; reversible, non-destructive.
- **PDF Generation** — a derived artifact; not the source of truth (the structured resume data is).
- **Publishing** — declares a version "intended for external use"; freezes that version's content.
- **Version Creation** — a snapshot event; can be automatic (autosave) or manual (explicit "save version").
- **Sharing** — exposes a specific version via a controlled channel (link, recruiter access).
- **Archiving** — soft-hides a resume from active workspaces; fully reversible.
- **Deletion** — soft-delete by default; enters a recovery window before permanent purge.
- **Recovery** — restores a deleted/archived resume to its prior active state within a policy window.

### 2.3 State Transition Diagram

```
DRAFT ──edit──> DRAFT
DRAFT ──validate(pass)──> READY
READY ──publish──> PUBLISHED
PUBLISHED ──edit──> DRAFT (new working copy; published version stays frozen)
ANY(non-deleted) ──archive──> ARCHIVED
ARCHIVED ──restore──> DRAFT/READY (previous state)
ANY ──delete──> SOFT_DELETED
SOFT_DELETED ──recover(within window)──> previous state
SOFT_DELETED ──purge(after window)──> PERMANENTLY_DELETED
```

---

## 3. Resume Structure

| Section | Purpose | Ownership | Required? | Business Rules | Dependencies | Future Expansion |
|---|---|---|---|---|---|---|
| **Personal Info** | Identity & contact | User | Required | Must have at least name + one contact method | None | Multiple profiles per identity (e.g., alt emails) |
| **Professional Summary** | Elevator pitch | User (AI-assisted) | Optional but strongly recommended | Length-bounded (business rule, not hard validation) | Benefits from Experience/Skills being filled first | AI tone variants (formal/casual) |
| **Education** | Academic credibility | User | Required unless Experience present | At least one entry if no work experience exists | None | Institution verification integration |
| **Experience** | Core value proof | User | Required unless Education-only path (students) | Reverse-chronological expected; overlapping dates allowed (concurrent roles) | None | Recruiter-verified experience |
| **Projects** | Practical proof of skill | User | Optional | Useful substitute for thin Experience (students, career changers) | Often linked to Skills | GitHub/Portfolio auto-sync |
| **Skills** | Searchable, matchable competencies | User (AI-assisted) | Required for Job Matching/ATS to function well | Should map to a normalized skill taxonomy | Referenced by Job Matching, ATS Checker | Skill proficiency levels, endorsements |
| **Certifications** | Verified credentials | User | Optional | Should include issuing body + date | None | Verification via issuer API |
| **Languages** | Communication reach | User | Optional | Proficiency scale should be standardized | None | Localization tie-in |
| **Achievements** | Differentiation | User | Optional | Should be quantifiable where possible | None | AI impact-scoring |
| **Interests** | Cultural fit signal | User | Optional | Low business weight; never blocks completeness | None | — |
| **References** | Trust signal | User | Optional | Should never be auto-shared without consent (PII) | None | Reference-request workflow |
| **Custom Sections** | Flexibility for edge cases (publications, patents, volunteering) | User | Optional | Must not break template mapping | None | Section marketplace/templates |

**General rule:** "Required" is *contextual*, not absolute — see Business Rules §4.4.

---

## 4. Business Rules

### 4.1 Editing & Ownership
- Only the owning user may edit a resume, unless Collaboration (future) grants explicit, scoped edit rights.
- System/AI processes may propose changes but never commit them without user confirmation.

### 4.2 Completeness
- A resume is "complete" when all *contextually required* sections are populated and pass validation — not when every possible section is filled.
- Completeness is a **spectrum** (percentage), not a boolean gate, except at the moment of Publish/Export, where a minimum threshold applies.

### 4.3 Resume Quantity
- Users have a tiered limit on number of active resumes (e.g., free vs. premium), enforced at creation, not silently at random points.
- Archived/deleted resumes should not count against active limits.

### 4.4 Contextual Requirement Logic
| Condition | Rule |
|---|---|
| No Experience entries | Education becomes required |
| No Education entries | Experience becomes required |
| Neither present | Resume is flagged incomplete; export is blocked or warned |

### 4.5 Section Reordering
- All sections are reorderable by the user except Personal Information (always first) — this is a presentation-layer concern but governed by a business rule to preserve ATS parsing conventions.

### 4.6 Templates
- Multiple templates may render the same underlying resume data (data/presentation separation).
- Switching templates must never mutate or lose structured data, only re-map presentation.

### 4.7 Deletion Behavior
- Deletion is soft by default; a recovery window (policy-defined, e.g., 30 days) precedes permanent purge.
- Deleting a resume does not delete its published, shared snapshots already distributed externally (those are frozen artifacts).

### 4.8 Duplication Behavior
- Duplication creates a fully independent copy (no shared version history with the original).
- Duplicated resumes reset analytics counters; they are treated as new entities.

### 4.9 Drafts
- Autosave applies only to Draft state.
- A Draft can be abandoned (never published) indefinitely without penalty.

### 4.10 Version History
- Every Publish action creates an immutable version snapshot.
- Autosave creates *recoverable checkpoints*, not full "versions" in the user-facing sense, unless promoted manually.

---

## 5. Module Interactions

| Module | Responsibility Boundary with Resume Domain |
|---|---|
| **Authentication** | Supplies identity/ownership context; Resume domain trusts but never manages credentials. |
| **AI Module** | Consumes resume data (read), returns *suggestions*; never writes directly to the resume of record. |
| **PDF Module** | Consumes a finalized/preview resume snapshot; produces a derived, disposable artifact. |
| **ATS Module** | Reads resume + job context (optional); returns a compatibility score/report; read-only relationship. |
| **Job Matching** | Reads Skills/Experience taxonomy; resume domain does not know matching algorithm internals. |
| **Notifications** | Subscribes to domain events (resume created, published, AI suggestion ready); Resume domain only emits events. |
| **Analytics** | Subscribes to lifecycle/usage events; Resume domain is a data source, not a consumer of analytics. |
| **Admin** | Read/audit access for support and compliance; write access only for moderation actions (e.g., policy violations), always logged. |
| **Collaboration (future)** | Will require a permissions layer sitting *above* the Resume domain — Resume domain itself stays single-owner at its core. |

**Design principle:** the Resume domain is the *source of truth*; every other module is either a consumer, an event subscriber, or a bounded contributor via suggestions — never a silent mutator.

---

## 6. Resume Versioning

### 6.1 Concepts
- **Draft (working copy):** current mutable state.
- **Published Version:** immutable snapshot at time of publish; carries its own template + content freeze.
- **Autosave:** frequent, low-ceremony checkpoint of the Draft; not shown as a formal "version" by default.
- **Manual Save (Version Checkpoint):** user-triggered, named snapshot — distinct from Publish (doesn't imply "ready for external use").

### 6.2 Version Diagram

```
Draft --autosave--> Checkpoint(t1)
Draft --autosave--> Checkpoint(t2)
Draft --manual save--> Named Version(v1)
Draft --publish--> Published(v1-final) [immutable]
Draft --edit continues--> Draft(v2-in-progress)
Draft --publish--> Published(v2-final) [immutable]
```

### 6.3 Restore & Compare
- **Restore Version:** creates a *new* Draft seeded from a past version's content — never rewrites history in place.
- **Compare Versions:** a read-only diff across sections (conceptually similar to document diffing); no mutation.

### 6.4 Template Changes & AI-Generated Versions
- Changing a template on a published version does not alter that version; it creates a new derivative version.
- AI-generated rewrites are proposed as a *candidate version* the user can accept (creating a new checkpoint) or discard.

### 6.5 Rollback & Conflict Resolution
- Rollback = Restore + Publish in sequence; never destructive to intervening versions.
- Conflict Resolution (e.g., concurrent edits from two devices): last-write-wins at the checkpoint level is acceptable for single-owner resumes; Collaboration (future) will require operational-transform-style resolution.

---

## 7. Validation Architecture

### 7.1 Validation Layers

| Layer | Concern | Example |
|---|---|---|
| **Formatting Validation** | Structural correctness | Dates are valid ranges, emails are well-formed |
| **Business Validation** | Domain rules | Contextual requirement (§4.4), section limits |
| **Consistency Validation** | Cross-section coherence | Skills referenced in Experience exist in Skills section |
| **Export Validation** | Fitness for output | Minimum completeness threshold before PDF/DOCX export |
| **AI Validation** | Quality of AI-assisted content | AI suggestions must not introduce factual claims not present in original input |

### 7.2 Where Validation Belongs
- **Structural/formatting** validation lives close to data entry (immediate feedback).
- **Business/consistency** validation is a domain-service concern, run on save and before publish/export.
- **Export validation** is a *gate*, evaluated only at the export/publish boundary — it should never block ordinary editing.
- Validation results are always advisory during Draft state and only become blocking at Publish/Export.

### 7.3 Required vs Optional Decision Table

| Section | Default | Becomes Required When |
|---|---|---|
| Personal Info | Required | Always |
| Experience | Optional | No Education present |
| Education | Optional | No Experience present |
| Skills | Recommended | Job Matching/ATS features are used |
| All others | Optional | Never mandatory |

---

## 8. Resume Templates

### 8.1 Core Principles
- **Data/Presentation Separation:** the resume's structured content never depends on a specific template.
- **Template Assignment** is a pointer/reference, not a copy of content into a template-specific format.

### 8.2 Compatibility & Section Mapping
- Every template declares which sections it supports and in what order/layout — the Resume domain does not adapt to templates; templates adapt to resume structure.
- Custom Sections must degrade gracefully in templates that don't explicitly support them (e.g., generic "additional section" rendering).

### 8.3 Theme, Customization, Localization, Accessibility
- **Theme support:** color/typography variations are presentation-only, never alter data.
- **Customization:** user-level tweaks (spacing, accent color) stored as template preferences tied to a resume-template pairing.
- **Premium Templates (future):** gated by entitlement, not by domain logic — Resume domain only checks "is this template available to this user."
- **Localization:** section labels and date formats must be externalized from day one, even before multi-language is built.
- **Accessibility:** templates must guarantee a logical reading order independent of visual layout (critical for ATS parsing and screen readers alike).

---

## 9. Import & Export Architecture

### 9.1 Import Workflow (Conceptual)

```
[Source File] → [Parsing] → [Field Extraction] → [Validation] → [Draft Resume]
                                                        │
                                                 (on failure)
                                                        ▼
                                          [Partial Import + User Review]
```

- **Parsing** must be tolerant — partial success is preferred over all-or-nothing failure.
- **Error Handling:** unparseable fields are flagged for manual entry, not silently dropped.
- Imported resumes always land in Draft state — never auto-published.

### 9.2 Export Workflow (Conceptual)

```
[Resume Data (Draft or Published)] → [Export Validation] → [Render] → [Artifact: PDF/DOCX/JSON]
```

- **PDF:** primary, human-facing export; must pass Export Validation.
- **DOCX (future):** same pipeline, different renderer; structural fidelity must match PDF output.
- **JSON Backup:** full-fidelity structured dump — used for portability and disaster recovery, not for human reading.
- **Cloud Backup (future):** an automated, periodic JSON export to external storage; conceptually a subscriber to save events, not a special-cased code path.

---

## 10. Analytics

| Metric | Business Value |
|---|---|
| **Completion Percentage** | Nudges users toward export-ready resumes |
| **Missing Sections** | Directs user attention; feeds AI suggestions |
| **Skill Distribution** | Powers Job Matching quality and product-level talent trend insight |
| **Update Frequency** | Signals active vs. dormant users; informs re-engagement |
| **AI Usage** | Measures feature adoption; informs AI cost/product decisions |
| **Export History** | Indicates real-world usage intent (job-seeking activity) |
| **Template Popularity** | Informs template roadmap and premium template investment |

**Principle:** Analytics is always a *read-only subscriber* to Resume domain events — it never feeds back into resume content directly.

---

## 11. Future Expansion

The domain model already supports these without redesign, because of the separations established above (data/presentation, source-of-truth vs. derived artifacts, event-driven module boundaries):

- **Team Collaboration** — adds a permissions layer above existing single-owner model.
- **Recruiter Comments / Resume Reviews** — modeled as annotations referencing a specific version, not mutations of it.
- **Portfolio Links / GitHub Integration / LinkedIn Import** — extensions of the Import workflow (§9.1) and Custom Sections (§3).
- **Multiple Languages** — extension of the localization groundwork in Templates (§8.3).
- **Premium Features / Resume Marketplace** — entitlement checks layered on existing Template Assignment concept.
- **Interview Tracking** — a new bounded context that references Resume versions but doesn't alter this domain.

---

## 12. Development Standards

- **Resume Services:** one cohesive domain service per lifecycle concern (Creation, Versioning, Validation, Export) — avoid a single monolithic "ResumeService" god-object.
- **Validation:** centralized rule definitions, layered per §7, reusable across create/edit/publish/export flows.
- **DTOs:** never expose internal domain models directly to AI, PDF, or Export modules — always a purpose-built contract per consumer.
- **Mappers:** one mapper per (domain model ↔ external representation) pair; mappers are one-directional in intent even if bidirectional in code.
- **Versioning:** every mutation-worthy event is snapshot-capable; version identity must be immutable once published.
- **Logging:** every lifecycle transition (create, publish, delete, restore) must be logged with actor, timestamp, and resume/version ID.
- **Testing:** every business rule in §4 and every validation rule in §7 must have a corresponding test case — rules are the real "spec."
- **Documentation:** this blueprint is the canonical source; module-specific docs must reference, not restate, these rules.
- **Future Feature Development:** any new feature must map to an existing lifecycle stage or module boundary before implementation begins — if it doesn't fit, the blueprint gets updated first.

---

## 13. Common Business Logic Mistakes

| # | Mistake | Why It Happens | Why It's Harmful | Professional Solution |
|---|---|---|---|---|
| 1 | Treating "Draft" and "Published" as the same entity | Simpler initial data model | Editing a published resume silently breaks shared/exported copies | Model Published as an immutable snapshot |
| 2 | Hard-deleting on user "delete" | Seems simpler than soft-delete | No recovery path; one accidental click = data loss | Always soft-delete with a recovery window |
| 3 | Making all sections mandatory | Easier validation logic | Blocks legitimate use cases (students, career changers) | Contextual requirement rules (§4.4) |
| 4 | Letting AI write directly to resume data | Feels "seamless" | Removes user consent/control, causes trust issues | AI proposes; user commits |
| 5 | Coupling template to resume data structure | Fast to build v1 | Any new template requires a data migration | Strict data/presentation separation |
| 6 | Using booleans for "complete" | Simple UI badge | Loses nuance; frustrates users at the margin | Percentage-based completeness |
| 7 | No distinction between autosave and versions | Fewer concepts to build | Version history becomes noisy and meaningless | Separate checkpoint vs. named version |
| 8 | Validating everything synchronously and blocking saves | Simplifies flow control | Frustrates users; punishes normal incremental editing | Validation is advisory until export/publish |
| 9 | Sharing links pointing to live (mutable) data | Convenient, no snapshotting needed | Recruiter sees content change/disappear unexpectedly | Share always points to a frozen version |
| 10 | No limit on resume count | Avoids building quota logic | Abuse, storage bloat, unclear pricing tiers | Explicit, enforced tiered limits |
| 11 | Duplication copying version history | Feels "complete" | Confuses lineage; bloats storage | Duplicate = new entity, fresh history |
| 12 | Treating Skills as free text | Fastest to implement | Breaks Job Matching/ATS accuracy | Normalize against a skill taxonomy |
| 13 | No import error handling (all-or-nothing) | Simpler pipeline | Users abandon import after one bad field | Partial import + manual review |
| 14 | Export bypassing validation | Faster path to "done" | Broken/incomplete PDFs damage user's job search | Mandatory export validation gate |
| 15 | Analytics module writing back to resume data | Tempting for "smart" features | Breaks single-source-of-truth, creates hidden coupling | Analytics is read-only, event-driven |
| 16 | No event model between modules | Direct calls are "simpler" at first | Tight coupling; any module change ripples everywhere | Domain events + subscribers |
| 17 | Assuming one owner forever | No time spent on future-proofing | Collaboration becomes a full rewrite later | Design ownership as a relationship, not a hardcoded field |
| 18 | Storing rendered PDF as source of truth | Avoids "extra" structured storage | Impossible to re-template or re-edit reliably | Structured data is always the source of truth |
| 19 | No section ordering flexibility | Simpler fixed layout | Users can't emphasize what matters to them | User-controlled ordering with sane defaults |
| 20 | Ignoring ATS parsing conventions in template design | Design-led thinking only | Beautiful resumes that fail ATS scans | Bake ATS-parseable structure into every template |
| 21 | Treating References as always public | Overlooked as "just another section" | Privacy violation, PII exposure | Explicit consent-gated visibility |
| 22 | No conflict resolution strategy for concurrent edits | Rare edge case, deprioritized | Silent data loss across devices/tabs | Explicit last-write-wins or merge strategy |
| 23 | Coupling AI suggestions tightly to one model/vendor | Fastest integration path | Painful vendor lock-in, hard to improve later | Abstract AI suggestions behind a domain-level contract |
| 24 | No distinction between "empty" and "not applicable" sections | Binary thinking | Analytics/completeness scoring becomes misleading | Support explicit "N/A" state per section |
| 25 | Version history growing unbounded with no policy | No one thinks about it early | Storage costs balloon, performance degrades | Retention policy + archival strategy |
| 26 | Localizing text only in the UI layer | Feels like a frontend-only concern | Backend validation messages, exports stay English-only | Localize at the domain/message layer too |
| 27 | Hardcoding template layouts into business logic | Fast initial delivery | Every new template requires backend changes | Templates as configuration/data, not code |
| 28 | Treating "archived" and "deleted" as the same state | Reduces state count | Users lose the ability to simply "hide" without risking loss | Separate, distinct states with different semantics |
| 29 | No audit trail for admin actions on user resumes | Deprioritized until an incident | No accountability, compliance risk | Mandatory logging of all privileged actions |
| 30 | Letting Job Matching dictate Resume domain structure | Reactive, feature-driven design | Resume domain becomes fragmented by consumer needs | Resume domain stays consumer-agnostic; consumers adapt |
| 31 | No clear "minimum viable resume" definition | Ambiguity deferred to later | Inconsistent export/publish gating across the team | Explicitly documented minimum thresholds (this blueprint) |
| 32 | Overloading one "status" field for lifecycle + validation + visibility | Seems efficient | Impossible to reason about state transitions | Separate orthogonal state dimensions |
| 33 | No plan for permanent purge after soft-delete window | Deferred as "not urgent" | Compliance/privacy exposure (data retention laws) | Scheduled purge policy from day one |
| 34 | Assuming resume content is always well-formed input | Optimistic design | Downstream AI/export/ATS modules crash on edge cases | Defensive validation at domain boundaries |
| 35 | Designing Collaboration as an afterthought bolt-on | Not in initial scope | Requires a full data-model rewrite later | Reserve ownership/permission seams now (§11) |

---

## Appendix: Cross-Cutting Design Principles Recap

1. **Single Source of Truth:** structured resume data — never a rendered artifact.
2. **Immutability of Published Versions:** publishing freezes; editing continues on a working draft.
3. **AI Proposes, User Disposes:** no silent AI mutation.
4. **Soft-Delete Everywhere:** deletion and archiving are reversible by default.
5. **Event-Driven Module Boundaries:** other modules subscribe/consume; they don't reach in and mutate.
6. **Contextual, Not Absolute, Requirements:** "required" depends on what else is present.
7. **Data/Presentation Separation:** templates render; they never define content structure.

---

*This document is the canonical Resume Domain reference. Any implementation detail that contradicts this blueprint should trigger a review of either the code or the blueprint — not silent divergence.*


# 18 Security

Security is layered. Passwords are one-way hashed by a PasswordEncoder. JWT signatures prevent claim tampering. Refresh tokens are random, rotated, stored hashed server-side, and carried in HttpOnly cookies. CORS allows selected browser origins; it is not authentication. CSRF risk is reduced because main API authorization uses a bearer header and the refresh cookie is SameSite, but cookie endpoints still deserve deliberate origin/method controls.

Jakarta validation restricts shape and length. Parameterized JPA/JdbcTemplate queries reduce SQL injection; string-built SQL identifiers must remain allow-listed. React escapes normal interpolated text, reducing XSS; never render AI/user HTML without sanitization. Multipart limits and photo validation reduce upload abuse. Correlation IDs and audit rows improve incident tracing. HTTPS is mandatory in production because JWTs and private resume data otherwise travel visibly.

Secrets belong in environment/secret storage. BYOK credentials are encrypted at rest; the encryption key must be stable, private, backed up, and rotated with a migration plan. Logs must not contain passwords, raw refresh/recovery/OTP tokens, provider keys, full prompts with unnecessary PII, or authorization headers.

Major remaining risks to review professionally: production CORS exactness, endpoint-by-endpoint authorization tests, rate limiting beyond auth/AI, account lockout/abuse monitoring, content-security policy at Nginx/Vercel, dependency alerts, backup encryption, data retention, and secret-manager adoption.


# 19 Deployment

## Production shape

The current runbook uses Vercel for the React frontend and an AWS EC2 host for Nginx, Spring Boot, and host MySQL. Compose does not create MySQL. Nginx terminates TLS and forwards /api; Spring Boot exposes health; Docker uses read-only filesystems, dropped capabilities, bounded logs, health checks, and conservative memory settings.

`mermaid
flowchart LR
  B[Browser] -->|HTTPS| V[Vercel frontend]
  B -->|HTTPS /api| N[Nginx on EC2]
  N --> SB[Spring Boot container :8080]
  SB --> MY[(Host MySQL :3306)]
  SB -.-> P[AI/SMTP/OTP providers]
`

## Current deployment runbook

# Production deployment on the existing AWS EC2 host

This runbook deploys the Spring Boot backend and an HTTPS Nginx reverse proxy
with Docker Compose. The React frontend remains on Vercel and MySQL 8 remains a
host service on EC2. Compose does not create, replace, or modify MySQL.

## Confirmed AWS target

This runbook is currently tailored to the following provisioned instance:

| Setting | Confirmed value |
| --- | --- |
| Name | `ai-resume-builder-server` |
| Instance ID | `i-095f7e9eeb4d575f4` |
| Region / Availability Zone | `ap-south-2` / `ap-south-2a` |
| Instance type | `t3.micro` (2 vCPU, approximately 1 GiB RAM) |
| Operating system | Ubuntu Server 24.04 LTS |
| Public IPv4 | `98.130.46.72` (auto-assigned, not an Elastic IP) |
| Public DNS | `ec2-98-130-46-72.ap-south-2.compute.amazonaws.com` |
| Private IPv4 | `172.31.4.33` |
| Security group | `launch-wizard-1` |
| Root volume | `vol-05ad1ef8fb3d35e1a`, 8 GiB, unencrypted |
| Key pair | `ai-resume-builder-key` |
| IMDS | IMDSv2 required |

The current public IPv4 address is not stable across an EC2 stop/start. Pointing
production DNS and issuing TLS certificates should wait until a stable address
strategy has been selected. Do not use the EC2 public DNS name as the
application's permanent API URL.

## Current topology

```text
Vercel frontend
    |
    | HTTPS /api requests
    v
EC2 :443 -> unprivileged Nginx container
                    |
                    v
             Spring Boot :8080
                    |
                    v
       host MySQL localhost:3306
```

The backend uses host networking deliberately. This makes the existing
`jdbc:mysql://localhost:3306/ai_resume_builder` URL refer to EC2's host MySQL
rather than to the container itself. Nginx reaches port 8080 through
`host.docker.internal`, which Compose maps to Docker's host gateway.

## Preconditions

- SSH access already works with the existing key; do not alter it:

  ```bash
  ssh -i ai-resume-builder-key.pem ubuntu@98.130.46.72
  ```

- Java 21, Maven, Git, Docker, Docker Compose, Nginx, and MySQL are already
  installed. Do not reinstall them.
- Database `ai_resume_builder` and user `resume_user` already exist.
- `backend/.env` exists and is readable only by the deployment user.
- A DNS hostname for the backend points to the EC2 public IP.
- A valid TLS certificate and key for that hostname exist on EC2.

The containerized Nginx needs host ports 80 and 443. The host Nginx service must
be stopped during the cutover because two processes cannot bind the same ports.
Do not stop it until the certificate exists and the Compose configuration has
passed validation.

## 1. Verify capacity and network exposure

The 8 GiB root disk and 1 GiB RAM are the main deployment constraints. Check
them before building:

```bash
df -h /
free -h
docker system df
sudo systemctl is-active mysql
sudo systemctl is-active nginx
```

Keep at least 2 GiB free before starting the Docker build. Do not run
`docker system prune` automatically: inspect its output first because it can
remove reusable images and build cache.

In the AWS console, verify that `launch-wizard-1` has only the required inbound
rules:

| Port | Source | Purpose |
| --- | --- | --- |
| 22 | Developer's current public IP `/32` | Existing SSH access |
| 80 | `0.0.0.0/0` | HTTP redirect and certificate renewal |
| 443 | `0.0.0.0/0` | Public HTTPS API |

Do not add public inbound rules for MySQL `3306` or Spring Boot `8080`.
The instance uses unlimited T3 CPU credits, so monitor `CPUCreditBalance` and
`CPUSurplusCreditsCharged` during image builds and sustained traffic.

## 2. Update and verify the checkout

From the repository root on EC2:

```bash
git pull --ff-only
git status --short
docker compose version
```

Do not proceed with an unexpected dirty working tree.

## 3. Protect and verify environment configuration

The application consumes secrets only from `backend/.env`; Docker does not copy
that file into the image:

```bash
chmod 600 backend/.env
grep -E '^(DB_URL|DB_USERNAME|APP_FRONTEND_URL|APP_CORS_ALLOWED_ORIGINS|APP_SECURE_COOKIES)=' backend/.env
```

The expected non-secret values are:

```dotenv
DB_URL=jdbc:mysql://localhost:3306/ai_resume_builder
DB_USERNAME=resume_user
APP_FRONTEND_URL=https://ai-resume-builder-india.vercel.app
APP_CORS_ALLOWED_ORIGINS=https://ai-resume-builder-india.vercel.app
APP_SECURE_COOKIES=true
```

Do not print `DB_PASSWORD`, `JWT_SECRET`, provider keys, SMTP credentials, or
OTP credentials to the terminal. The `prod` profile also requires valid MSG91
configuration in the current application.

Test the same database credentials before building:

```bash
mysql -u resume_user -p -h 127.0.0.1 ai_resume_builder \
  -e "SELECT DATABASE(), CURRENT_USER();"
```

An empty application schema is expected before the first successful backend
startup. Do not create tables manually; Flyway owns schema creation.

## 4. Configure Compose-only TLS paths

Stage the existing certificate for the unprivileged Nginx UID/GID. This example
does not alter or delete the source certificate:

```bash
sudo install -d -o root -g 101 -m 750 /opt/ai-resume-builder/tls
sudo install -o root -g 101 -m 640 \
  /etc/letsencrypt/live/YOUR_BACKEND_DOMAIN/fullchain.pem \
  /opt/ai-resume-builder/tls/fullchain.pem
sudo install -o root -g 101 -m 640 \
  /etc/letsencrypt/live/YOUR_BACKEND_DOMAIN/privkey.pem \
  /opt/ai-resume-builder/tls/privkey.pem
```

Repeat the two `install` commands after certificate renewal, then run
`docker compose -f docker/docker-compose.yml restart nginx`.

Copy the non-secret template:

```bash
cp docker/.env.example docker/.env
chmod 600 docker/.env
```

Edit only the two certificate paths in `docker/.env`. For example:

```dotenv
NGINX_TLS_CERTIFICATE=/opt/ai-resume-builder/tls/fullchain.pem
NGINX_TLS_PRIVATE_KEY=/opt/ai-resume-builder/tls/privkey.pem
```

The Docker daemon must be able to read both files. Never copy a private key into
the repository or Docker build context.

## 5. Validate before cutover

```bash
docker compose -f docker/docker-compose.yml config --quiet
docker compose -f docker/docker-compose.yml build backend
```

The build uses Maven in a multi-stage Docker build; it does not require the host
Maven installation. A `t3.micro` has limited memory, so build when other
memory-heavy processes are idle. If the build cannot fit, build the same image
on CI or another machine and pull it on EC2—do not weaken runtime isolation.

## 6. Start the backend and run Flyway

Start only the backend first:

```bash
docker compose -f docker/docker-compose.yml up -d backend
docker compose -f docker/docker-compose.yml logs -f backend
```

On first startup, Flyway applies the versioned migrations to
`ai_resume_builder`. Wait for the application-started log and then check:

```bash
curl --fail http://127.0.0.1:8080/actuator/health
docker compose -f docker/docker-compose.yml ps
mysql -u resume_user -p -h 127.0.0.1 ai_resume_builder \
  -e "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;"
```

If migration fails, inspect the first error and fix configuration or grants. Do
not delete tables, edit an applied migration, or run Flyway repair casually.

## 7. Cut over HTTPS

After the backend is healthy and TLS paths are valid:

```bash
sudo nginx -t
sudo systemctl stop nginx
docker compose -f docker/docker-compose.yml up -d nginx
docker compose -f docker/docker-compose.yml ps
```

If the Nginx container fails, restore the previous proxy immediately:

```bash
docker compose -f docker/docker-compose.yml stop nginx
sudo systemctl start nginx
```

Validate through the public backend hostname:

```bash
curl --fail https://YOUR_BACKEND_DOMAIN/actuator/health
curl --head https://YOUR_BACKEND_DOMAIN/
```

The root URL redirects to the existing Vercel frontend. API requests under
`/api/` proxy to Spring Boot. Configure the Vercel production environment to
use `https://YOUR_BACKEND_DOMAIN` as its API origin, then redeploy the Vercel
frontend if that value changed.

## 8. Operations and rollback

View status and bounded Docker logs:

```bash
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml logs --tail=200 backend
docker compose -f docker/docker-compose.yml logs --tail=200 nginx
```

Deploy a new revision:

```bash
git pull --ff-only
docker compose -f docker/docker-compose.yml build backend
docker compose -f docker/docker-compose.yml up -d --no-deps backend
docker compose -f docker/docker-compose.yml ps
```

Stop the containers without touching MySQL:

```bash
docker compose -f docker/docker-compose.yml down
```

Compose uses `json-file` logging with three 10 MiB files per service. Both
containers drop Linux capabilities, prevent privilege escalation, and use
read-only root filesystems with bounded temporary filesystems. The backend runs
as UID/GID 10001 and the proxy uses the upstream unprivileged Nginx image.

## Security-group exposure

- Keep SSH port 22 restricted to the developer's IP.
- Allow public inbound 80 and 443 for HTTPS and certificate renewal.
- Do not expose 3306 publicly.
- Do not expose 8080 publicly. Host networking makes Spring listen on the EC2
  interface, so enforce this with the EC2 security group and host firewall.
- Keep production CORS restricted to
  `https://ai-resume-builder-india.vercel.app`.


# 20 Optional Features

Optional by configuration: Redis AI limiting, Gemini versus OpenAI, platform versus encrypted user AI keys, provider fallback, SMTP email, and fake/MSG91/Android/TextBee OTP delivery. Dev seeding is disabled unless enabled.

Partially implemented/foundation features: subscription data and APIs exist without a real checkout/payment gateway; job descriptions exist but full recommendation-based job matching is incomplete; cover letters are generated/edited without a complete separate persistence lifecycle; analytics backend exists while dashboard integration is incomplete; job_matches is future-ready; AI background jobs exist but client-side polling/operational job processing deserves production hardening.

Experimental/future-ready structure is valuable when it protects schema compatibility, but it increases maintenance and can falsely imply a finished feature. Label it in product UI, test disabled paths, and avoid charging users for foundations.


# 21 Features NOT Used

The strongest evidence-backed candidates are the icon overlap, mostly dormant Tailwind stack, and possibly redundant PostCSS/Autoprefixer tooling described in section 14. Several index.js feature barrels may be unused when routes import files directly. Some entities exist chiefly to document/map tables while active operations use JdbcTemplate. That is not automatically dead code, but it should be checked with compile/import/reference searches.

Blueprint documents under docs are not runtime code. .github/modernize hooks are repository automation support, not application execution. Database and Docker README files guide humans. Test-only libraries and test files are intentionally absent from production bundles.

Removal method: search imports/references, remove one candidate and its configuration, run frontend lint/unit/build/E2E or backend compile/test/integration tests, inspect bundle/JAR/runtime startup, and keep the change reversible. Benefits are smaller attack/install surface and less cognitive load. Risks are dynamic imports, CSS build behavior, reflective Spring usage, or deployment scripts not detected by simple search.


# 22 Code Walkthrough

1. JVM enters AiResumeBuilderApplication.main.
2. Spring reads configuration, validates environment, scans packages, and constructs beans.
3. Datasource connects; Flyway migrates; repositories/services/controllers become ready; Tomcat listens.
4. Browser enters rontend/index.html; module script reaches main.jsx.
5. React mounts App; global providers establish boundaries; router matches URL.
6. AuthProvider restores the session through the refresh endpoint/cookie.
7. Guards select public, onboarding, dashboard, admin, forbidden, or not-found branches.
8. A page composes a feature component. Query hooks call an API wrapper.
9. Axios attaches an access token. Vite (dev) or Nginx/backend origin (prod) routes the request.
10. Filters add correlation and authentication context. Security rules authorize.
11. Controller validates the DTO. Service enforces ownership/business rules. Repository executes JPA/SQL. Transaction commits.
12. Global exception handling creates a consistent error envelope on controlled failure.
13. Axios normalizes errors or unwraps data. React Query updates cache. React rerenders.
14. Resume changes can create versions/audit events. AI flows cross the gateway. PDF flows return bytes rather than JSON.

## Resume builder execution deep dive

# AI Resume Builder — Resume Builder Module Blueprint

**Audience:** Backend, Frontend, UX, QA, AI Engineering, Product Management
**Status:** Module architecture specification — no code, SQL, or API definitions included

---

## 1. Module Overview

### 1.1 Purpose

The Resume Builder is the core authoring engine of the product: it owns the structured data model of a resume, the editing experience over that data, and the handoff points to every feature that acts on a resume (AI, ATS, PDF export, templates, job matching, future collaboration). Every other module treats a resume as a well-defined, versioned document produced and owned by this module.

### 1.2 Goals

- Provide a structured, section-based data model flexible enough for any resume shape (from a student's first resume to a senior professional's dense history).
- Guarantee users never lose work (autosave + recovery + versioning).
- Present a single, consistent document representation that AI, ATS, Preview, and Export modules all consume identically.
- Remain extensible toward collaboration, portfolios, and plugins without a data-model rewrite.

### 1.3 Responsibilities

- Own the resume document model (sections, ordering, content, metadata).
- Own the editing lifecycle (create, edit, reorder, validate, save, version).
- Own draft/completeness state.
- Provide the canonical document representation consumed by Preview, AI, ATS, and Export.
- Emit lifecycle events (created, updated, section-completed, exported) for Analytics/Notifications to consume.

### 1.4 Out of Scope (owned by other modules, consumed here)

- AI text generation logic (AI module) — Builder only orchestrates *when* AI is invoked and merges results.
- PDF rendering engine (PDF module) — Builder provides the document + template reference; PDF module renders.
- ATS scoring logic (ATS module) — Builder supplies the document; ATS module returns findings.
- Authentication/authorization (Auth module) — Builder enforces ownership checks using identity supplied by Auth.

### 1.5 Dependencies

```
Resume Builder
   ├── depends on → Auth Module (identity, ownership)
   ├── depends on → Template Module (layout definitions)
   ├── provides document to → AI Module
   ├── provides document to → ATS Module
   ├── provides document to → PDF/Export Module
   ├── provides document to → Job Matching Module
   ├── emits events to → Analytics Module
   └── emits events to → Notifications Module
```

### 1.6 Interaction with Other Modules

The Builder is the **document of record**. Other modules never mutate resume content directly — they either read the document (Preview, PDF, ATS, Job Matching) or propose changes that flow back through the Builder's own edit/versioning pipeline (AI suggestions are *applied* through the same section-update mechanism a manual edit would use, not through a side channel).

---

## 2. End-to-End Builder Workflow

```
Create Resume
     │
     ▼
Enter Personal Information ──► (minimum viable identity for the document)
     │
     ▼
Add Sections ──► (choose from standard set + custom sections)
     │
     ▼
Edit Sections ──► (iterative, non-linear, autosaved continuously)
     │
     ▼
Validate ──► (inline as you go; blocking only at export/finalize)
     │
     ▼
Preview ──► (continuously available, not a separate "step")
     │
     ▼
Template Assignment ──► (can happen at any point, re-flows Preview)
     │
     ▼
AI Improvements ──► (optional, per-section or whole-document, always previewed before applying)
     │
     ▼
ATS Analysis ──► (optional, on-demand, produces actionable findings routed back to relevant sections)
     │
     ▼
Export ──► (final validation gate; produces immutable snapshot)
     │
     ▼
Version History ──► (every meaningful state change retained)
     │
     ▼
Share (future) ──► (publishes a controlled-access reference to a specific version)
```

### 2.1 Stage Detail

**Create Resume** — instantiate an empty document shell (owner, timestamps, default status = `DRAFT`), optionally seeded from a template's default section set or a duplicated resume.

**Enter Personal Information** — the only section treated as required at document creation (name + contact minimum); everything else is optional at this stage to avoid front-loading friction.

**Add Sections** — user selects from the standard section catalog (Part 3) and/or adds custom sections; sections are independent, addable/removable at any time.

**Edit Sections** — the primary work loop; non-linear, autosaved, individually validated (Part 5).

**Validate** — continuous, non-blocking inline feedback; a distinct "completeness check" runs before Export/Share to catch anything the user hasn't visited.

**Preview** — a read-only, continuously synchronized projection of the document through the currently assigned template (Part 7); not a discrete workflow step, but an ever-present view.

**Template Assignment** — selecting/changing a template re-renders Preview against the same underlying document; content is never mutated by a template change, only its presentation.

**AI Improvements** — optional enrichment step invocable at any point in editing, not a gate before export; results are proposed, never auto-committed (Part 9.2).

**ATS Analysis** — on-demand evaluation of the current document state; findings reference specific sections so users can jump directly to fix them.

**Export** — the finalize step; runs full completeness/export validation, then hands the document + template to the PDF module and records an immutable **published version snapshot**.

**Version History** — every export, and periodic/major-edit snapshots, are retained and browsable/restorable (Part 6).

**Share (future)** — publishes a stable reference to a chosen version for external viewing/collaboration, decoupled from the live editable draft.

---

## 3. Section Architecture

### 3.1 General Section Model

Every section — standard or custom — shares a common conceptual shape:

```
Section
 ├── type (PERSONAL_INFO, EXPERIENCE, EDUCATION, ... or CUSTOM)
 ├── order (position within document)
 ├── visibility (shown/hidden in export, independent of completeness)
 ├── entries[] (one or more items, where applicable — e.g., multiple jobs)
 ├── completeness state (empty / partial / complete)
 └── metadata (lastEditedAt, source: manual | ai-generated | ai-assisted)
```

This uniform shape is what lets AI, Validation, Preview, and future Collaboration all operate generically across sections rather than needing section-specific logic everywhere.

### 3.2 Section-by-Section Design

**Personal Information**
- *Purpose:* Establishes identity/contact — the only mandatory section.
- *Business rules:* Single entry (not a list); name + one contact method required to leave `DRAFT`-incomplete state.
- *Dependencies:* None; every other section depends on this existing.
- *Validation:* Format checks (email, phone, links) on top of required-field checks.
- *Ordering:* Always first; not user-reorderable.
- *Visibility:* Always visible in export.
- *Future expansion:* Portfolio/profile links, photo (region-dependent — flagged as optional given resume norms vary by country).

**Professional Summary**
- *Purpose:* Short narrative hook, prime candidate for AI generation.
- *Business rules:* Single entry, character-length guidance rather than hard limit (template-dependent fit).
- *Dependencies:* Benefits from Experience/Skills being filled first (better AI context) but not required.
- *Validation:* Length guidance (soft warning, not blocking).
- *Ordering:* Second by default, user-repositionable.
- *Visibility:* Optional — can be hidden.
- *Future expansion:* Multiple tailored variants per job application (linked to Job Matching).

**Education**
- *Purpose:* Academic background.
- *Business rules:* Multi-entry list; each entry = institution, degree, dates, optional details.
- *Dependencies:* None.
- *Validation:* Date-range sanity (end not before start); at least one entry recommended for students/freshers (soft nudge, not blocking).
- *Ordering:* User-reorderable list; entries typically reverse-chronological (system can suggest, not enforce).
- *Visibility:* Optional to hide (e.g., senior professionals may minimize this).
- *Future expansion:* Coursework/thesis sub-details, verified-credential linking.

**Experience**
- *Purpose:* Core credibility section for most users.
- *Business rules:* Multi-entry list; each entry = role, company, dates (or "present"), bullet achievements.
- *Dependencies:* Primary input source for AI Improve/Summary generation.
- *Validation:* Date logic (no overlapping "present" markers beyond one active role unless explicitly allowed); at least one bullet recommended per entry.
- *Ordering:* Reverse-chronological by convention, user-adjustable.
- *Visibility:* Always relevant; hide only in unusual cases (e.g., students with none — section simply empty/omitted).
- *Future expansion:* Achievement quantification prompts, linked recommendation/endorsement data.

**Projects**
- *Purpose:* Substitute/supplement for Experience, critical for students/freshers.
- *Business rules:* Multi-entry; title, description, tech/tools, optional link.
- *Dependencies:* None; often cross-referenced by Skills.
- *Validation:* Link format validation if provided.
- *Ordering:* User-reorderable.
- *Visibility:* Optional.
- *Future expansion:* Media embeds (screenshots, demo links) — see Part 10.

**Skills**
- *Purpose:* Scannable keyword surface, heavily weighted by ATS systems.
- *Business rules:* Tag/list structure rather than free paragraph; optional grouping (technical/soft/tools).
- *Dependencies:* Cross-checked by ATS module against job description keywords.
- *Validation:* Duplicate detection; minimum count soft-suggested for ATS quality.
- *Ordering:* Grouping order user-adjustable; individual skill order lower priority.
- *Visibility:* Always relevant.
- *Future expansion:* Proficiency levels, endorsements, auto-suggested skills from Experience text (AI-assisted).

**Certifications**
- *Purpose:* Credential validation.
- *Business rules:* Multi-entry; name, issuer, date, optional expiry/credential ID.
- *Dependencies:* None.
- *Validation:* Date sanity; expiry-awareness (soft flag for expired certs).
- *Ordering:* Reverse-chronological convention.
- *Visibility:* Optional.
- *Future expansion:* Verified-issuer integrations (future credentialing APIs).

**Languages**
- *Purpose:* Language proficiency listing.
- *Business rules:* Multi-entry; language + proficiency level (structured, not free text).
- *Dependencies:* None.
- *Validation:* Proficiency from a controlled vocabulary (structured, not implemented here as UI — conceptually enumerated).
- *Ordering:* User-reorderable.
- *Visibility:* Optional.
- *Future expansion:* Multi-language resume generation ties into this section directly.

**Achievements / Awards**
- *Purpose:* Differentiating accomplishments outside standard experience.
- *Business rules:* Multi-entry; title, context, date.
- *Dependencies:* None.
- *Validation:* Minimal — mostly free text with date sanity.
- *Ordering:* User-reorderable.
- *Visibility:* Optional.
- *Future expansion:* Linking to Experience/Project entries as supporting evidence.

**Interests**
- *Purpose:* Optional personality/culture-fit signal.
- *Business rules:* Simple tag list.
- *Dependencies:* None.
- *Validation:* None beyond basic length limits.
- *Ordering:* Low priority, typically last.
- *Visibility:* Optional, off by default for space-constrained templates.
- *Future expansion:* None significant.

**References**
- *Purpose:* Contact/referee information, or a placeholder statement.
- *Business rules:* Multi-entry or a single "available upon request" toggle.
- *Dependencies:* Privacy-sensitive — visibility defaults conservative.
- *Validation:* Contact-format validation if full details provided.
- *Ordering:* Typically last.
- *Visibility:* Optional, hidden by default given privacy norms.
- *Future expansion:* Consent-tracking if referee contact details are stored (privacy compliance).

**Custom Sections**
- *Purpose:* Escape hatch for anything not covered (publications, volunteer work, patents).
- *Business rules:* User-defined title + free-form entries following the generic section shape.
- *Dependencies:* None structurally, but AI/ATS treat custom sections generically (title + content heuristics) rather than with section-specific logic.
- *Validation:* Basic structural checks only (non-empty title if section is shown).
- *Ordering:* Fully user-controlled, insertable anywhere.
- *Visibility:* Optional.
- *Future expansion:* Templated custom-section presets (e.g., "Publications" as a semi-standard option) promoted from common custom-section patterns.

---

## 4. Editing Experience

### 4.1 Inline vs. Section Editing

Inline editing (edit-in-place within the section card) is the default interaction for most fields; a dedicated section editing surface is used for entries with many sub-fields (e.g., a full Experience entry) to avoid overcrowding the section card.

### 4.2 Drag-and-Drop Reordering

Both section-level (reordering entire sections) and entry-level (reordering entries within a section, e.g., job order) reordering are supported, with keyboard-accessible alternatives (move up/down actions) for parity (Part 9 of the UX blueprint applies here).

### 4.3 Undo / Redo

A single undo/redo stack spans the entire editing session (not per-section), since actions like AI-apply, reorder, and field edits are often corrected in sequence and users expect one consistent history.

### 4.4 Autosave & Manual Save

Continuous autosave is the primary save mechanism (Part 8); manual save exists as a user-facing confidence action but triggers the same underlying persistence path — there is no separate "unsaved draft vs. saved draft" data model, only one draft continuously synchronized.

### 4.5 Draft Recovery

On reopening a resume (new session, crash recovery, or after connectivity loss), the Builder reconciles against the last persisted autosave state and restores the user to it, with a brief non-intrusive confirmation of what was restored.

### 4.6 Conflict Detection

Even before real-time collaboration exists, conflicts can occur (same user editing from two tabs/devices). The Builder detects a stale write (based on a document version/revision marker) and resolves by presenting the newer state rather than silently overwriting — this same mechanism is the foundation for future multi-user conflict resolution (Part 10).

### 4.7 Keyboard Navigation

Full keyboard operability across section navigation, field editing, reordering (move up/down as an alternative to drag), and core actions (save, undo, AI-improve) — a functional requirement, not a nice-to-have, given accessibility standards set in the UX blueprint.

### 4.8 Large Resume Performance

For resumes with many entries, the Builder loads/renders sections progressively (only the active/visible sections fully hydrated) and defers heavy operations (AI calls, ATS analysis) to explicit user action rather than running continuously in the background.

---

## 5. Validation Strategy

| Validation Type | Where It Belongs | Behavior |
|---|---|---|
| Field Validation | Within each field, real-time | Format checks (email, dates, URLs); immediate, non-blocking |
| Business Validation | Section level | Rules like date-range sanity, single-active-role logic; on-blur or on-save |
| Cross-Section Validation | Document level | Rules spanning sections (e.g., flagging if Skills is empty but Experience references tools) — advisory, not blocking |
| Completeness Checks | Document level, triggered pre-export/share | Confirms required minimums (Personal Info) and flags empty-but-expected sections |
| Export Validation | Gate before handoff to PDF module | Blocking only on genuinely required data (Personal Info); everything else is a warning the user can override |
| AI Validation | Within the AI module boundary, but surfaced in Builder | Checks AI output isn't empty/malformed before offering it for user acceptance |
| ATS Validation | Within the ATS module boundary, surfaced via findings routed to sections | Not a gate — informational, drives user-initiated fixes |

**Principle:** validation gets stricter and more consequential as the user moves toward Export/Share; it stays advisory and non-blocking throughout ordinary editing.

---

## 6. Versioning

### 6.1 Version Types

```
Live Draft (continuously autosaved, always mutable)
     │
     ├── Periodic Snapshot (e.g., daily or after significant edit volume)
     ├── AI-Generated-Change Snapshot (before/after any AI apply)
     ├── Template-Change Snapshot (before switching templates, if content overflow risk detected)
     └── Published Version (created on every Export/Share — immutable)
```

### 6.2 Restore & Rollback

Any snapshot or published version can be restored, which creates a **new live draft state seeded from that version** (never destructively rewinds history) — restoring is itself a recorded action, preserving a full audit trail rather than deleting intermediate history.

### 6.3 Compare Versions

Version comparison is section-aware (diff by section/entry) rather than raw-text diffing, since resume content is structured — this makes "what changed" meaningful to a user reviewing an AI edit or a prior export.

### 6.4 Relationship to Export

Every completed Export creates a Published Version snapshot automatically; this is how "Version History" (Part 2) stays populated even for users who never manually trigger a snapshot.

---

## 7. Resume Preview

### 7.1 Synchronization

Preview is a **read-only projection** of the same document state the editor holds — not a separately fetched/rendered copy — updated reactively as the user edits, so there is never a "stale preview" state to reconcile.

### 7.2 Refresh Strategy

Debounced re-render on edit (avoiding a full re-render per keystroke) balances responsiveness with performance, especially for template layouts with complex pagination logic.

### 7.3 Template Rendering

Preview renders the document through the currently assigned template's layout rules; switching templates re-runs rendering against the *same* document data — template and content are strictly decoupled (Part 2.6).

### 7.4 Zoom & Print Preview

Preview supports zoom for detail review and a distinct "print preview" mode that shows exact page boundaries/pagination as the export will produce, avoiding surprises between what's edited and what's exported.

### 7.5 Page Breaks

Page-break calculation must be template-aware and content-aware (e.g., don't split a single Experience entry mid-entry across pages where avoidable) — this logic is owned by the Template/PDF rendering layer but must be reflected identically in Preview to keep the two consistent.

### 7.6 Performance

For large resumes, Preview should avoid full re-layout on every keystroke by scoping re-render to the affected section where possible, falling back to full re-render only when pagination-affecting changes occur.

---

## 8. Autosave Architecture

### 8.1 Frequency

Debounced save triggered after a pause in active editing (not on every keystroke), supplemented by save-on-blur (leaving a field) and save-before-navigation as safety nets.

### 8.2 Conflict Handling

Each save carries a document revision marker; if the server detects the client's base revision is stale (edited elsewhere since last sync), the save is rejected with the newer state returned for reconciliation rather than silently overwritten (ties directly to Part 4.6).

### 8.3 Offline Changes

Edits made while offline are queued locally and flushed once connectivity returns, using the same revision-conflict mechanism to reconcile if the server state changed in the meantime — surfaced to the user via a clear "offline — changes will sync" indicator rather than failing silently.

### 8.4 Recovery

If a save fails (network/server error), the Builder retries with backoff and keeps the unsaved state resident in the client until confirmed persisted — never discarding local edits on a failed save.

### 8.5 Status Indicators

A consistent, always-visible save-state indicator (Saved / Saving… / Offline / Save failed — retrying) gives the user constant confidence about the safety of their work, per the UX blueprint's autosave principles.

### 8.6 Failure Handling

Persistent failures (repeated retries exhausted) escalate to a visible, actionable error state — never a silent stop — with an option to manually retry or export/download a local backup of current content as a last resort.

---

## 9. Integration with Other Modules

| Module | Integration Pattern |
|---|---|
| **Authentication** | Every Builder operation resolves ownership from the authenticated identity; no resume operation proceeds without an ownership/permission check |
| **AI Module** | Builder sends section content + context (job description, if provided) as input; receives proposed content back; nothing is applied to the document until the user accepts, at which point it flows through the normal section-update path (indistinguishable from a manual edit once accepted, except for retained `source: ai-generated` metadata) |
| **PDF Module** | Builder hands off the finalized document + assigned template reference at Export time; PDF module owns rendering-to-file, Builder owns triggering it and recording the resulting Published Version |
| **ATS Module** | Builder supplies the current document (optionally with a job description) on request; ATS module returns structured findings (section-referenced) that the Builder surfaces as actionable, dismissible items linked back to the relevant section |
| **Job Matching** | Builder's document (especially Skills/Experience) is the input signal; Job Matching is a consumer, not a mutator, of Builder data |
| **Analytics** | Builder emits lifecycle events (resume created, section completed, exported, AI-used) that Analytics aggregates; Builder itself holds no analytics logic |
| **Notifications** | Builder emits state-change events (e.g., "resume incomplete for 7 days," "ATS check available") that Notifications module decides whether/how to surface |
| **Templates** | Builder references a template by ID/version; template rendering rules live in the Template module, keeping content and presentation independently versionable |
| **Future Collaboration** | Builder's section-level structure and revision-marker mechanism (Part 4.6, 8.2) are the foundation collaboration will extend with presence/locking rather than requiring new document-model concepts |

---

## 10. Scalability Plan

The module is designed so the following are additive, not restructuring:

- **Collaborative Editing:** the existing document revision-marker and section-level granularity (Parts 4.6, 8.2) become the basis for operational-transform/CRDT-style merge logic at the section level.
- **Real-Time Presence:** presence indicators attach to the existing section-boundary concept (who's viewing/editing which section) without new document structure.
- **Comments & Suggestions:** modeled as an overlay entity referencing a section/entry ID, not embedded in the content itself — keeps the core document model clean and comments independently addable later.
- **Portfolio Sections:** fits the existing generic Section model (Part 3.1) as a new section type with media-capable entries.
- **Embedded Media:** extends the entry model with a media-reference field, following the same entry shape already used for Projects/Certifications.
- **Custom Widgets:** the Custom Section mechanism (Part 3.2) is the extensibility point — a widget is a specialized rendering of a custom-section entry.
- **Plugin System:** plugins register new section types or AI actions against the same generic Section/entry contracts, rather than requiring core model changes.
- **Multiple Languages:** since section content is stored as structured data rather than pre-rendered text, localized rendering (labels, dates, template chrome) is a presentation-layer concern; content translation is modeled as an alternate-language variant of the same document (linked, versioned) rather than a new resume.

---

## 11. Quality Standards

| Area | Standard |
|---|---|
| Validation | Layered per Part 5; never block ordinary editing, always block malformed export |
| Performance | Section-scoped rendering/persistence; no operation should require full-document reprocessing for a single-field edit |
| Accessibility | Full keyboard operability and screen-reader semantics for every editing interaction (aligned with the UX blueprint's Part 9) |
| Maintainability | All sections conform to the generic Section/entry model (Part 3.1) — section-specific logic is the exception, not the rule |
| Extensibility | New section types, AI actions, and export targets must be addable via configuration/registration, not core rewrites |
| Testing | Every section type covered by validation/completeness test cases; autosave/conflict paths explicitly tested for race conditions |
| Logging | Lifecycle events (create, edit, AI-apply, export, restore) logged with enough context for support/debugging, without logging full resume content in plaintext logs |
| Documentation | Section catalog, validation rules, and event contracts documented centrally as the source of truth for cross-team implementation |

---

## 12. Common Design Mistakes (Selected, High-Value Set)

| # | Mistake | Why It Happens | Why It Causes Problems | Professional Solution |
|---|---|---|---|---|
| 1 | Treating each resume section as a bespoke data structure | Built incrementally, feature-by-feature | Explodes maintenance cost; every new feature must special-case every section | Generic Section/entry model (Part 3.1) applied uniformly |
| 2 | Coupling content data to template/presentation | Fastest way to get a first render working | Any template addition requires touching content logic | Strict content/template separation (Part 7.3) |
| 3 | Saving only on explicit "Save" click | Simpler initial implementation | Users lose work on crash/navigation | Continuous debounced autosave from the start |
| 4 | No document revision/versioning marker | Not needed until multi-tab/multi-device use appears | Silent overwrite conflicts, undetectable data loss | Revision marker + conflict detection from day one |
| 5 | AI output directly overwriting document state | Simplifies the AI integration | Destroys trust, unrecoverable bad edits | AI proposes; user-accept flows through normal edit path |
| 6 | Full-document re-render on every keystroke | Simplicity of a naive reactive binding | Severe performance degradation on large resumes | Section-scoped reactivity/rendering |
| 7 | Blocking validation during normal editing | Easiest validation to implement | Interrupts flow, punishes exploration | Non-blocking inline validation; blocking only at export |
| 8 | No distinction between draft and published state | Deferred as unnecessary complexity | Users unintentionally share/export incomplete work | Explicit draft vs. published-version model (Part 6) |
| 9 | Undo/redo scoped per-field instead of per-session | Easier to implement locally | Confusing, inconsistent undo behavior across actions | Single session-wide undo/redo stack |
| 10 | No conflict handling for concurrent edits (even single-user, multi-tab) | Assumed single-session usage | Silent data loss when two tabs save | Revision-based conflict detection and reconciliation |
| 11 | Hardcoding section order | Simplifies initial data model | Blocks user customization and future section types | User-controlled `order` field per section |
| 12 | Treating custom sections as second-class/hacked-in | Added late as an afterthought | Inconsistent behavior vs. standard sections | Custom sections conform to the same generic model |
| 13 | No completeness/export validation gate | Deferred, seems unnecessary early on | Broken/incomplete exports reach recruiters | Explicit pre-export completeness check |
| 14 | Storing AI-generated content indistinguishably from user content | Simpler storage model | Loses attribution, breaks trust/transparency features | Persistent `source` metadata on content |
| 15 | Synchronous, blocking AI calls within the main edit flow | Simplicity of implementation | UI freezes/feels broken during generation | Async AI invocation with clear loading/failure states |
| 16 | No offline handling for autosave | Assumed always-online usage | Data loss or confusing failures on flaky connections | Local queueing + reconciled sync on reconnect |
| 17 | Pagination/page-break logic duplicated differently in Preview vs. Export | Built by different teams/times | Preview doesn't match final export, breaking trust | Shared pagination logic/contract between Preview and PDF module |
| 18 | No version history at all | Deprioritized as "nice to have" | Users can't recover from bad AI edits or accidental changes | Automatic snapshots at key lifecycle points (Part 6) |
| 19 | Section-specific validation logic scattered across the codebase | Organic growth without a strategy | Inconsistent rules, hard to audit/maintain | Centralized validation strategy applied per Part 5 |
| 20 | Treating ATS/ AI findings as blocking errors | Overzealous validation design | Frustrates users with advisory-only information | Findings are informational, routed to sections, never blocking |
| 21 | No keyboard-accessible alternative to drag-and-drop reordering | Drag-and-drop implemented as the only path | Excludes keyboard/screen-reader users entirely | Move up/down actions as first-class alternatives |
| 22 | Large resumes fully hydrated/rendered at once | Simpler initial rendering approach | Performance collapse for power users with extensive history | Progressive/section-scoped hydration |
| 23 | Template switch silently truncating/losing content | Overflow handling not considered | Users lose work without warning | Overflow detection + warning before committing template change |
| 24 | No distinction between advisory and blocking validation severity | Binary valid/invalid model | Either too strict (frustrating) or too lax (bad exports) | Tiered severity model (Part 5) |
| 25 | Logging full resume content (PII) in plaintext application logs | Convenient for debugging | Privacy/compliance risk | Structured event logging without raw content |
| 26 | No plan for multi-language content from the start | English-only assumption at launch | Retrofitting localization requires data-model rework | Structured content model decoupled from rendering language |
| 27 | Comments/suggestions modeled as embedded content | Fastest to bolt onto existing fields | Pollutes core content, hard to remove/version cleanly | Comments as overlay entities referencing section/entry IDs |
| 28 | No generic extensibility point for new section types | Sections hardcoded as an enum with unique handling | Every new section type requires broad codebase changes | Registration-based section-type extensibility |
| 29 | Assuming single-device, single-session usage permanently | Convenient initial assumption | Breaks down the moment users use mobile + desktop together | Design conflict/sync handling early, even pre-collaboration |
| 30 | No explicit event contract between Builder and other modules | Modules built in isolation, integrated ad hoc | Fragile, hard-to-trace integration bugs | Documented lifecycle event contract (Part 11) |
| 31 | Treating Preview as a separate fetch/render pipeline from the editor | Seems architecturally cleaner at first | Preview drifts out of sync with actual document state | Preview as a direct read-only projection of live document state |
| 32 | No recovery path when autosave fails repeatedly | Assumed saves "always eventually succeed" | Silent, unrecoverable data loss in edge cases | Escalating failure state with manual retry/backup option |
| 33 | Over-restricting required fields across every section | Defensive validation design | High abandonment from unnecessary friction | Minimal true requirements (Personal Info only), everything else advisory |
| 34 | Section reordering not persisted consistently with content edits | Treated as a separate, lower-priority operation | Order resets or desyncs from actual document state | Order is a first-class field on the same save path as content |
| 35 | No shared document-versioning concept between Builder and Export/Share | Each feature built its own snapshot mechanism | Fragmented, inconsistent version history across features | Single unified versioning model consumed by Export, Share, and Restore alike |

---

## Summary: Core Module Architectural Decisions

1. **A single generic Section/entry model** underlies every resume section — standard or custom — keeping the module maintainable and extensible.
2. **Content and template are strictly decoupled**, enabling independent evolution of both and consistent Preview/Export behavior.
3. **Continuous autosave with revision-based conflict detection** is the backbone of data safety, extending naturally into future offline and collaborative editing.
4. **AI is integrated as a proposer, not a mutator** — all AI output flows through the same edit/versioning path as manual changes, preserving attribution and reversibility.
5. **Validation is tiered by consequence** — advisory during editing, blocking only at genuine export/completeness gates.
6. **Versioning is unified** across autosave snapshots, AI-change snapshots, template-change snapshots, and published exports — one system, not several.
7. **Every module integration point (AI, ATS, PDF, Job Matching, Analytics, Notifications) treats the Builder's document as the single source of truth**, consumed via clear read/propose contracts rather than direct mutation.
8. **Scalability toward collaboration, portfolios, media, and plugins** is achieved by extending the existing generic model, not redesigning it.

This blueprint is intended as the shared reference for backend, frontend, AI engineering, QA, and product teams implementing the Resume Builder module.


# 23 Interview Preparation

## Architecture questions with model answers

**Why a modular monolith?** One deployment/database keeps operations simple for the current scale, while feature packages preserve ownership and future extraction seams.

**Why DTOs instead of returning entities?** DTOs control exposure, validation, compatibility, recursion/lazy-loading problems, and allow persistence to change independently.

**JPA versus JdbcTemplate?** JPA is productive for aggregate CRUD and relationships; JdbcTemplate gives explicit predictable SQL for reporting and operational workflows. The trade-off is two persistence styles.

**Why short JWT plus refresh token?** Short access lifetime limits stolen-token exposure; refresh rotation permits long sessions and server-side revocation without putting the long credential in JavaScript storage.

**Why Flyway with ddl-auto=none/validate?** Production schema changes become ordered, reviewed, repeatable, and auditable rather than silently inferred.

**How does React Query differ from context?** Query manages remote asynchronous server state and freshness. Auth context shares session identity/control. Local component state owns transient UI.

**How does AI provider switching work?** Business input becomes a provider-neutral request; a factory selects a strategy/adapter; each adapter handles vendor protocol; the gateway applies shared limits, cache, validation, health, cost, and logging.

**What prevents one user reading another resume?** Backend ownership checks tied to authenticated identity. Route guards are only user experience, never the authority.

**How would you scale?** Measure first; index slow queries, paginate lists, bound payloads, externalize Redis/rate limits, make async jobs durable, isolate AI worker capacity, add observability, cache safe reads, use managed database/backups, then extract services only where load/team boundaries justify it.

**Biggest current product gaps?** Payments, complete job matching, analytics UI accuracy, stronger background-job operations, comprehensive security/load testing, and some demo dashboard values.

## Rapid technical prompts

- Explain Java records, annotations, interfaces, generics, exceptions, transactions, and constructor injection using examples from common.dto and services.
- Explain React render, hooks, controlled forms, context, lazy routes, error boundaries, query invalidation, debounce, and undo/redo.
- Explain primary/foreign keys, unique constraints, indexes, transactions, soft delete, normalization, and migration immutability.
- Explain 200/201/202/204/400/401/403/404/409/422/429/500/502 semantics and identify which project workflows should return each.
- Explain CORS versus CSRF versus XSS versus SQL injection; never collapse them into one vague web-security idea.


# 24 Common Bugs

| Symptom | Likely root cause | Debugging path | Fix direction |
|---|---|---|---|
| Backend fails immediately | Missing DB/JWT/prod config | Read first startup exception; inspect non-secret env names | Correct working directory and environment |
| Flyway checksum error | Applied migration edited | Inspect schema history and Git diff | Restore immutable migration; add a new migration |
| Browser CORS error | Origin not allowed or backend unreachable | Network tab, backend logs, preflight | Exact allowed origin; avoid wildcards with credentials |
| Refresh loop | 401 interceptor retries refresh endpoint or stale session | Inspect network waterfall | Exclude auth endpoints and cap retries |
| Login works then reload logs out | Refresh cookie domain/SameSite/Secure/proxy mismatch | Inspect Set-Cookie and request cookies | Align same-origin proxy and HTTPS cookie config |
| 403 as admin | Token role stale or backend rule rejects | Decode non-secret claims; inspect authorities | Re-login after role change; map roles consistently |
| LazyInitializationException | Entity relationship accessed outside transaction | Stack trace and SQL | Map DTO inside transaction or fetch intentionally |
| N+1 queries | Loop triggers lazy queries | SQL logs/profiler | Fetch join/entity graph/batched query |
| Autosave overwrites newer edits | Out-of-order responses or stale closure | Timestamp requests and state | Cancel/version requests; optimistic concurrency |
| Resume preview differs from PDF | Separate rendering rules diverged | Compare shared template config | Define canonical presentation schema and parity tests |
| AI returns malformed content | Output treated as trusted/free text | Save redacted response metadata | Schema/length validation and safe fallback |
| AI 429/cost spike | Limits local-only/miscalculated | Usage ledger, Redis/provider metrics | Distributed quotas, exact provider usage where available |
| PDF memory pressure | Large documents/concurrent byte arrays | Heap and request sizes | Bound input/concurrency; stream where possible |
| Docker unhealthy | wrong host networking, DB, health startup time | Compose logs/health inspect | Correct env/network and startup period |

Professional debugging starts at the boundary where expected behavior first diverges: browser network, server filter/controller, service decision, SQL, external call, or render.


# 25 Performance

Potential bottlenecks are database query count/indexing, serialized AI latency, provider quotas, PDF CPU/memory, large resume payloads, React rerenders in the editor, repeated completion calculations, and a small EC2 memory budget.

Measure with browser performance/network tools, React profiler, Actuator/Micrometer metrics, structured latency logs with correlation IDs, datasource/slow-query metrics, AI latency/cost ledger, JVM heap/GC data, and container/host CPU/RAM/disk.

Optimize in order: remove accidental duplicate requests; paginate; select only required columns; index measured query predicates; avoid N+1; debounce/cancel autosave; memoize expensive pure computations; lazy-load route code; compress/cache static assets; bound uploads and AI input; isolate async executors; cache only safe deterministic results; tune JVM/container after measurement. Do not add Redis to hide an inefficient ownership query.


# 26 Future Improvements

| Level | Improvement |
|---|---|
| Junior | Remove proven-unused dependencies; fix stale README statements; add missing loading/empty/error states; add focused unit tests; improve accessible labels and keyboard behavior. |
| Mid | Add optimistic concurrency to autosave; finish analytics UI with real values; complete cover-letter persistence; improve query pagination; standardize repository style per module; add contract tests. |
| Senior | Durable AI job queue with retries/idempotency; provider circuit breakers; strong observability/SLOs; managed secrets; backup/restore drills; CSP/security headers; load tests; data-retention tooling. |
| Enterprise | Managed database/Redis, multi-AZ backups, zero-downtime deploys, WAF/CDN, tenant/data governance, audit immutability, billing provider with webhook reconciliation, privacy export/deletion, disaster recovery, threat modeling and independent security review. |

The next feature should be chosen from evidence: user value, operational risk, security exposure, and measured bottleneck - not architectural fashion.


# 27 Learning Roadmap

1. Learn web basics: browser, DOM, HTML, CSS, JavaScript, HTTP, JSON, cookies, headers, and status codes.
2. Learn Git and terminals; run the setup, tests, and one small UI change.
3. Learn React components, props, state, effects, forms, routing, context, then React Query.
4. Learn Java syntax, types, records, interfaces, collections, exceptions, streams, and testing.
5. Learn Spring Boot dependency injection, MVC controllers, validation, configuration, transactions, Security, and testing.
6. Learn SQL/MySQL: joins, constraints, indexes, transactions, query plans, normalization; replay migrations in a disposable database.
7. Trace one resume CRUD call end to end and explain every boundary without notes.
8. Trace login/refresh/logout and build a threat model.
9. Trace AI generation and calculate reliability, privacy, and cost failure modes.
10. Learn Docker, Nginx, TLS, Linux services, logs, metrics, backups, and CI/CD.
11. Practice professional work: small reversible changes, tests proportional to risk, design records, code review, monitoring, incident response, and clear communication.

### Capstone exercises

- Add one validated resume field from migration to entity/SQL, DTO, service, endpoint, API wrapper, form, preview, PDF, and tests.
- Add an ownership-negative integration test proving another user receives no data.
- Replace a demo dashboard metric with a real paginated/aggregated backend query.
- Simulate AI outage, expired access token, Redis absence, failed migration, and low-memory PDF load; document observed behavior.

When you can predict the request path, locate the owning layer, explain the security invariant, identify the schema constraint, and choose the right test before editing, you have moved from knowing files to professional system understanding.

