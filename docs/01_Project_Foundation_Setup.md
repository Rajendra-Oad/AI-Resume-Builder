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
