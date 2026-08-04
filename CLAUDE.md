# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Production-oriented AI resume platform: React 19/Vite frontend, Java 21/Spring Boot 3.5 API, PostgreSQL schema owned by Flyway. Frontend deploys to Vercel; backend and PostgreSQL deploy to Render (`backend/Dockerfile`, `render.yaml`). `vercel.json` rewrites `/api/*` to the Render backend. `docs/` holds canonical architecture guides; `ARCHITECTURE.md` is an audit of the code as built (updated through V16) and is the most reliable structural reference.

## Commands

Run everything from each subproject's own directory.

### Backend (`backend/`, Maven wrapper — Java 21)

```bash
cd backend
./mvnw spring-boot:run        # API on http://localhost:8080
./mvnw test                   # unit tests
./mvnw verify                 # test + JaCoCo minimum 24% line coverage (enforced)
./mvnw test -Dtest=ClassName  # single test class (e.g. -Dtest=AuthServiceTest)
```

- Integration tests (`*IT.java`, under `src/test/java/.../database` and `integration/`) are excluded from plain `test`. Run them against a dedicated PostgreSQL test DB:

```bash
IT_DB_URL=jdbc:postgresql://localhost:5432/ai_resume_builder_test \
IT_DB_USERNAME=app_test IT_DB_PASSWORD=... \
./mvnw -Pintegration-test verify
```

- The `.env` file at `backend/.env` is loaded automatically (`spring.config.import=optional:file:./.env`). Copy `backend/.env.example` to `backend/.env` first; `JWT_SECRET` (≥32 chars) and DB credentials are required.
- Test config is read from env vars; there is no `application-integration-test.properties`.

### Frontend (`frontend/`, npm — Node 20+, plain JavaScript, no TypeScript)

```bash
cd frontend
npm ci
npm run dev                 # http://localhost:5173, Vite proxies /api to :8080
npm run lint                # ESLint; lint:fix to auto-fix
npm run test                # Vitest
npm run test -- src/path/to/file.test.jsx   # single test file
npm run test:coverage       # enforces low global thresholds in vite.config.js
npm run build
npm run test:e2e            # Playwright (e2e/), installs browsers
npm run styles:check        # design-token checker (scripts/check-style-tokens.mjs)
npm run format:check        # Prettier check; format to write
```

- Keep `VITE_API_BASE_URL` unset so the browser calls same-origin `/api` and the refresh cookie works; `VITE_DEV_PROXY_TARGET` (default `http://localhost:8080`) is server-side only.

### Setup / seed / optional Docker

```bash
scripts/setup.sh            # copies .env.example -> backend/.env, docker/.env
scripts/seed-dev.sh '<password≥12 chars>'   # runs backend with dev seed data
docker compose -f docker/docker-compose.yml up -d   # optional self-hosted stack
```

## Architecture

Feature-first, not a global controller/service/repository layering — on both sides. Backend packages under `com.airesumebuilder`: `common/` (DTOs, exceptions, validation, correlation-ID filter), `config/`, `events/`, `security/` (JWT/filters), `integration/ai/` (provider gateways), and `feature/*` (`admin`, `ai`, `analytics`, `ats`, `audit`, `auth`, `job`, `notification`, `pdf`, `resume`, `subscription`, `template`, `user`) — each feature holds its own controller/service/repository/entity. Frontend mirrors this with `src/features/*` (routes, components, api, hooks per feature), plus `src/pages/` for resume and basic auth screens and `src/components/` for shared primitives.

Critical facts that require reading multiple files to discover:

- **Two resume content models exist simultaneously.** Typed joined tables (`resume_sections` + `educations`/`experiences`/`projects`/`skills`/`certifications`) are edited via the sections CRUD; denormalized text columns on `resumes` (`skills_content`, `experience_content`, …) are updated on full resume PUT. **PDF rendering and previews read only the denormalized columns** — a resume with typed sections but empty content columns exports blank.
- **Persistence is hybrid JPA + hand-written JDBC.** "Repositories" named `XxxRepository` may be JPA interfaces or `JdbcTemplate`-based classes returning records; naming does not identify the mechanism. Five real tables intentionally have no JPA entity (`ai_prompt_templates`, `user_ai_settings`, `user_ai_provider_credentials`, `pdf_exports`, `user_notification_preferences`).
- **Flyway owns the schema** (`ddl-auto=none`). Executable migrations live in `backend/src/main/resources/db/migration` (V1–V17). The root `database/migrations/` directory is documentation only — never add a second migration source. Migration edits are destructive; validate against a scratch DB with the integration profile.
- **The frontend is JavaScript/JSX, not TypeScript.** `src/types/contracts.js` is documentation/runtime constants, not a compiled contract.
- **Auth model**: HMAC JWT access token (15-min TTL) returned in JSON, held only in a browser in-memory singleton (`src/context/`); an opaque refresh token is stored only as a SHA-256 hash and delivered as an HttpOnly `SameSite=Strict` cookie on `/api/v1/auth`. CSRF is disabled; full page reloads reconstruct the session via `/auth/refresh` using the cookie. **Refresh does not rotate** (rotation code exists but is not wired in). New/changed passwords revoke refresh tokens; access JWTs are not revocable until expiry.
- **API envelope**: controllers return `ApiResponse<T>` `{success, data, message, error, meta}`; pagination is `meta.pagination`. One shared Axios instance in `src/api/` normalizes the envelope, refreshes once on eligible 401, and emits auth lifecycle events.
- **AI is generic and string-keyed.** One `POST /api/v1/ai/generate` (and async `/jobs`) handles all workflows (`resume-summary`, `cover-letter`, resume improvement) keyed by the `workflow` string, not distinct backend modules. Providers are Gemini (default) / OpenAI; users can BYOK (encrypted). Redis backs the rate limiter only when `AI_REDIS_ENABLED=true` (off by default).
- **AI "streaming"** (`GET /ai/jobs/{id}/stream`) is SSE that polls job state from a raw thread — it does not stream model tokens.
- **ATS scoring is deterministic keyword matching**, not AI or an external ATS. `job_matches` has a table/entity but no code path that reads or creates matches; the UI routes to ATS analysis instead.
- **OpenAPI/Swagger** is served by springdoc; Actuator health/metrics are the real dependency health check (feature `/health` endpoints return constant `"UP"`).

## Workflow conventions

- Conventional Commits (`type(scope): description`); allowed types `feat fix docs style refactor perf test build ci chore revert`. CI validates every commit and the PR title.
- Changes go to `develop` or `main` via squash-merged PRs requiring one approval; both branches are protected (no direct pushes, no force-push).
- Production CI (`.github/workflows/ci.yml`) runs: backend `mvn verify`, frontend lint + `test:coverage` + build, a `database-integration` job (`-Pintegration-test` against a Postgres 17 service), and Playwright e2e. `deploy.yml`, `security.yml`, `performance.yml`, and `release.yml` add scanning/deploy gates.
- `docs/CodingStandards.md` is short and authoritative for Java/React conventions (thin controllers, DTOs, constructor injection, feature-level API modules, route guards).
