# Architecture Report — AI Resume Builder

**Date:** 2026-08-04
**Reference:** `ARCHITECTURE.md` (audit through V16) is the canonical structural reference; this report summarizes the architecture as validated this pass and lists the known structural debts.

---

## 1. Shape

Feature-first on both sides; there is no global controller/service/repository layering.

- **Backend** (`com.airesumebuilder`): `common/` (DTOs, exceptions, validation, correlation-ID filter), `config/`, `events/`, `security/` (JWT/filters), `integration/ai/` (provider gateways), and `feature/*` — `admin`, `ai`, `analytics`, `ats`, `audit`, `auth`, `job`, `notification`, `pdf`, `resume`, `subscription`, `template`, `user`. Each feature owns its controller/service/repository/entity.
- **Frontend** mirrors this: `src/features/*` (routes, components, api, hooks per feature) plus `src/pages/` (resume + basic auth screens), `src/components/` (shared primitives), `src/api/` (shared Axios), `src/context/` (session), `src/hooks/`, `src/routes/`.

## 2. Data model

- **Persistence is hybrid**: JPA repositories *and* `JdbcTemplate`-backed classes returning records coexist; naming does not reveal the mechanism. Five real tables intentionally have no JPA entity (`ai_prompt_templates`, `user_ai_settings`, `user_ai_provider_credentials`, `pdf_exports`, `user_notification_preferences`).
- **Flyway owns the schema** (`ddl-auto=none`; `validate` in prod). Executable migrations live in `backend/src/main/resources/db/migration` (V1–V17). Root `database/migrations/` is documentation only.
- **API envelope:** controllers return `ApiResponse<T>` `{success, data, message, error, meta}` with pagination in `meta.pagination`; one shared Axios instance normalizes the envelope, refreshes once on an eligible 401, and emits auth lifecycle events.

## 3. Auth flow

Stateless HMAC JWT (15-min) in memory + opaque refresh token hashed server-side, delivered as an HttpOnly `SameSite=Strict` cookie. Full reloads reconstruct the session via `/auth/refresh`. Refresh does **not** rotate (rotation code exists, not wired). Access JWTs are not revocable until expiry.

## 4. AI subsystem

- **Generic and string-keyed:** one `POST /api/v1/ai/generate` (plus async `/jobs`) handles `resume-summary`, `cover-letter`, and resume improvement via the `workflow` string — not distinct backend modules. Providers: Gemini (default) / OpenAI; BYOK credentials stored encrypted; Redis backs rate limiting only when enabled.
- **"Streaming"** (`GET /ai/jobs/{id}/stream`) is SSE that polls job state from a raw thread — it does not stream model tokens.
- **ATS scoring** is deterministic keyword matching (not AI); `job_matches` has a table/entity but no read/write code path (the UI routes to ATS analysis).

## 5. Config & validation

- Base `application.properties` + `dev`/`prod` profiles; `spring.config.import=optional:file:./.env` loads `backend/.env`.
- `EnvironmentConfigurationValidator` (an `EnvironmentPostProcessor`, lowest precedence) fails fast on missing/placeholder/malformed env vars **before** Spring creates DB/security beans, with prod-aware guidance (committed this pass, `a8a686a`).

## 6. Integration health

OpenAPI/Swagger via springdoc; Actuator health/metrics are the real dependency health check — readiness includes a real `db` check (`management.endpoint.health.group.readiness.include=readinessState,db,diskSpace`). The feature-level `/health` endpoints return constant `"UP"` and should not be treated as dependency checks.

## 7. Structural debts (documented, product decisions required)

| Debt | Detail | Where |
|------|--------|-------|
| Dual resume content models | Typed joined tables (`resume_sections` + `educations`/…) edited via CRUD; denormalized text columns on `resumes` updated on full PUT. **PDF/preview read only the denormalized columns** — a resume with typed sections but empty content columns exports blank. | `feature/resume`, `feature/pdf` |
| `job_matches` dead schema | Table + entity exist; no code reads or creates matches. | `feature/job` |
| SSE is polling | Not a token stream. | `feature/ai` |
| Refresh non-rotation | Rotation code exists but unused. | `feature/auth` |
| `database/migrations/` duplication risk | Docs-only dir must never become a second migration source. | repo root |

## 8. Verdict

The architecture is coherent, well-documented, and matches the product scope. The feature-first organization and the envelope/refresh-cookie conventions are consistent enough to onboard a new engineer quickly. The debts above are all *understood and documented* rather than hidden, which is the right state — each is a deliberate future decision, tracked in `PRODUCTION_CHECKLIST.md`.
