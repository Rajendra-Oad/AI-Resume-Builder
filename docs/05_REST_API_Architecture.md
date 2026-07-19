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
