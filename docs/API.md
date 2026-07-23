# API Reference

The application API is versioned under `/api/v1` and returns JSON through a
consistent response envelope. The full API design rules live in
[REST API Architecture](05_REST_API_Architecture.md).

## Conventions

- Successful responses include `success`, `data`, `error`, `meta`, and optional
  `pagination`.
- Errors use stable codes such as `VALIDATION_ERROR`, `UNAUTHENTICATED`,
  `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UPSTREAM_ERROR`, and `INTERNAL_ERROR`.
- `meta.correlationId` and `meta.timestamp` are included in API responses.
- Authenticated routes require a bearer access token unless explicitly public.
## Endpoint inventory

Authentication and account recovery:

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/auth/register` | Public |
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/refresh` | Public; refresh cookie required |
| POST | `/api/v1/auth/logout` | Public; clears refresh cookie |
| POST | `/api/v1/auth/forgot-password` | Public |
| POST | `/api/v1/auth/reset-password` | Public; reset token required in body |
| POST | `/api/v1/auth/verify-email?token=...` | Public |
| POST | `/api/v1/auth/resend-verification` | Public; non-enumerating response |
| POST | `/api/v1/auth/change-password` | Bearer token |
| GET | `/api/v1/users/me` | Bearer token |
| PATCH | `/api/v1/users/me` | Bearer token |

Resume workflow:

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/resumes?page=0&size=20` | Bearer token |
| POST | `/api/v1/resumes` | Bearer token |
| GET | `/api/v1/resumes/{id}` | Owner bearer token |
| PUT | `/api/v1/resumes/{id}` | Owner bearer token |
| DELETE | `/api/v1/resumes/{id}` | Owner bearer token |
| GET | `/api/v1/resumes/{resumeId}/versions?page=0&size=20` | Owner bearer token |
| GET | `/api/v1/resumes/{resumeId}/versions/{versionId}` | Owner bearer token |
| POST | `/api/v1/resumes/{resumeId}/versions/{versionId}/restore` | Owner bearer token |
| GET | `/api/v1/templates` | Bearer token |
| GET | `/api/v1/templates/{id}` | Bearer token |
| POST | `/api/v1/templates/{templateId}/apply/{resumeId}` | Resume owner bearer token |
| GET | `/api/v1/pdf/resumes/{id}` | Resume owner bearer token; returns PDF |
| GET | `/api/v1/pdf/resumes/{id}/history` | Resume owner bearer token |

Resume create/update responses include full single-column content fields for
contact details, objective, skills, experience, projects, certifications,
education, and languages. Presentation settings are persisted per resume:
`fontFamily` (`HELVETICA`, `TIMES`, or `COURIER`), `fontSize` (9–13 pt),
`lineSpacing` (1–1.8), `sectionSpacing` (6–24 pt), and `pageMargin` (24–72 pt).
The live preview and A4 PDF renderer apply the same settings. Server and database
constraints enforce these ranges even when clients bypass the UI.

Jobs and ATS:

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/jobs` | Bearer token; current user's jobs |
| POST | `/api/v1/jobs` | Bearer token |
| GET | `/api/v1/jobs/{id}` | Job owner bearer token |
| DELETE | `/api/v1/jobs/{id}` | Job owner bearer token |
| POST | `/api/v1/ats/analyze` | Resume/job owner bearer token |
| GET | `/api/v1/ats/reports/{id}` | Report owner bearer token |
| GET | `/api/v1/ats/resumes/{resumeId}/reports` | Resume owner bearer token |

AI Center:

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/ai/generate` | Bearer token |
| POST | `/api/v1/ai/jobs` | Bearer token; returns `202 Accepted` |
| GET | `/api/v1/ai/jobs/{id}` | Job owner bearer token |
| GET | `/api/v1/ai/jobs/{id}/stream` | Job owner bearer token; SSE |
| GET | `/api/v1/ai/usage` | Bearer token |
| GET | `/api/v1/ai/settings` | Bearer token |
| PUT | `/api/v1/ai/settings` | Bearer token |
| PUT | `/api/v1/ai/settings/credentials/{provider}` | Bearer token |
| DELETE | `/api/v1/ai/settings/credentials/{provider}` | Bearer token |

User activity and subscriptions:

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/notifications?unreadOnly=false` | Bearer token |
| PATCH | `/api/v1/notifications/{id}/read` | Notification owner bearer token |
| PATCH | `/api/v1/notifications/read-all` | Bearer token |
| GET/PUT | `/api/v1/notifications/preferences` | Bearer token |
| GET | `/api/v1/audit?page=0&size=20` | Bearer token; current user's events |
| GET | `/api/v1/subscriptions/plans` | Bearer token |
| GET | `/api/v1/subscriptions/current` | Bearer token |
| GET | `/api/v1/subscriptions/entitlement` | Bearer token |
| GET | `/api/v1/subscriptions/history?page=0&size=20` | Bearer token |
| GET | `/api/v1/subscriptions/payments?page=0&size=20` | Bearer token |
| POST | `/api/v1/subscriptions/cancel` | Bearer token |
| GET | `/api/v1/analytics/overview?from=2026-07-01&to=2026-07-31` | Bearer token |

Administration:

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/admin/users?page=0&size=20` | Admin bearer token |
| PATCH | `/api/v1/admin/users/{id}/status` | Admin bearer token |
| PATCH | `/api/v1/admin/users/{id}/role` | Admin bearer token |
| GET | `/api/v1/admin/actions?page=0&size=20` | Admin bearer token |
| GET | `/api/v1/admin/audit?page=0&size=20` | Admin bearer token |
| GET | `/api/v1/admin/analytics/overview?from=2026-07-01&to=2026-07-31` | Admin bearer token |
| GET | `/api/v1/admin/ai/prompts/providers/health` | Admin bearer token |
| POST | `/api/v1/admin/ai/prompts` | Admin bearer token |
| POST | `/api/v1/admin/ai/prompts/{workflow}/{version}/review` | Admin bearer token |
| POST | `/api/v1/admin/ai/prompts/{workflow}/{version}/approve` | Admin bearer token |
| POST | `/api/v1/admin/ai/prompts/{workflow}/{version}/publish` | Admin bearer token |

## Authentication and session contract

Login and registration return a short-lived access token in the response data
and set the opaque refresh token as an `HttpOnly`, `SameSite=Strict` cookie.
JavaScript must not attempt to read or persist that cookie. Send the access token
on protected requests as:

```http
Authorization: Bearer <access-token>
```

The frontend may call `POST /api/v1/auth/refresh` with browser credentials when
an access token expires or after a page reload. Logout and password changes
revoke refresh sessions. Authentication failure responses intentionally avoid
revealing whether an account exists; forgot-password always returns the same
successful public response.

## Common request rules

- JSON requests use `Content-Type: application/json`; PDF download and SSE
  endpoints are the documented exceptions.
- Path resources are always checked against the authenticated owner. A resource
  owned by someone else uses the not-found contract rather than disclosing it.
- Page numbers start at zero. Unless explicitly stated otherwise, page size is
  normalized to `1..100`.
- Dates use ISO `YYYY-MM-DD`; timestamps in responses use ISO-8601 UTC values.
- Provider API keys are write-only. The API returns configured/not-configured
  state and never returns the original key after saving it.
- AI `workflow` is limited to 80 characters, prompt input to 12,000 characters,
  and locale to 20 characters.

## AI execution contract

`POST /api/v1/ai/generate` is synchronous. `POST /api/v1/ai/jobs` queues the
same validated request and returns `202 Accepted`; clients can poll its owned
status endpoint or consume the `job` events from the SSE endpoint. Terminal job
states are `SUCCEEDED` and `FAILED`.

AI settings select platform allowance or a user-owned provider credential.
BYOK calls do not consume platform allowance unless platform fallback is enabled
and actually used. Credentials are encrypted server-side and are never included
in API responses or logs.

## Resume-version endpoints

Creating a resume records version 1, and every successful `PUT` records another
immutable JSON snapshot in the same database transaction. Snapshots include the
resume title, summary, target job title, status, display ordering, and every
typed education, experience, project, skill, and certification section.

History is owner-scoped, newest first, paginated, and capped at 100 entries per
page. Version detail returns the immutable snapshot for preview or comparison.
Requests for another user's resume or version return the same not-found contract
as an unknown resource, avoiding ownership disclosure.

Restoring a version never edits or deletes historical rows. It applies the
snapshot to the active resume and creates a new version with source `ROLLBACK`
and a label identifying the restored version. Concurrent saves lock the resume
while allocating the next version number, preventing duplicate version numbers.

## Analytics endpoints

`GET /api/v1/analytics/overview` returns the authenticated user's resume,
ATS-report, PDF-export, and AI activity. It includes total AI tokens, estimated
AI cost, average ATS score, and a continuous daily activity series (days with no
activity contain zeroes rather than being omitted).

`GET /api/v1/admin/analytics/overview` returns aggregate system adoption and
workload counts. It does not expose user identities or per-user activity and is
protected by the `ADMIN` role.

Both endpoints accept optional inclusive ISO dates through `from` and `to`.
They default to the most recent 30 days and reject reversed ranges or ranges
longer than 366 days. The end date is implemented with an exclusive next-day
boundary so activity with sub-second timestamps is counted correctly.

## Subscription endpoints

Every subscription and payment query is scoped to the authenticated user. A
new account receives a `FREE` subscription lazily when its current subscription
is first requested. `GET /api/v1/subscriptions/entitlement` resolves the active
plan from the database, making it suitable for server-side feature gates; JWT
plan claims must not be treated as the source of truth.

Subscription and payment histories are paginated, newest first, with page size
capped at 100. Provider payment references are masked in API responses and
payment rows remain immutable.

`POST /api/v1/subscriptions/cancel` closes the current paid subscription and
atomically activates a Free subscription. The Free plan cannot be cancelled.
Premium checkout and external payment-provider webhooks remain future scope, as
defined by the project roadmap; the API does not simulate a successful payment
or accept raw card details.

## Admin endpoints

All `/api/v1/admin/**` routes require the `ADMIN` role. The user listing and
action-history endpoints are paginated, ordered newest first, and cap page size
at 100.

Change a user's account status with:

```http
PATCH /api/v1/admin/users/42/status
Content-Type: application/json

{"value":"SUSPENDED"}
```

Allowed statuses are `ACTIVE`, `INACTIVE`, and `SUSPENDED`. Suspending or
deactivating an account revokes its active refresh sessions. Administrators
cannot suspend or deactivate their own account.

Change a user's authorization role with the same request shape at
`PATCH /api/v1/admin/users/{id}/role`. Allowed roles are `USER`, `ADMIN`, and
`RECRUITER`; administrators cannot demote themselves. Every successful role or
status change is written to `admin_action_logs` and exposed through
`GET /api/v1/admin/actions`.

## Audit endpoints

`GET /api/v1/audit` returns the authenticated user's audit trail. Resume
creation, update, and deletion events are recorded after the owning transaction
commits. Update events include JSON `beforeState` and `afterState` snapshots;
delete events retain the final state before deletion. Results are ordered newest
first, page numbering starts at zero, and page size is capped at 100.

`GET /api/v1/admin/audit` returns the system-wide audit trail and is protected
by the `ADMIN` role. Regular users cannot use this endpoint.

## Selected Implemented Endpoints

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Create a user account. |
| POST | `/api/v1/auth/login` | Public | Sign in and receive an access token. |
| POST | `/api/v1/auth/refresh` | Refresh cookie | Refresh the access token. |
| POST | `/api/v1/auth/logout` | Refresh cookie | Revoke the refresh token. |
| GET | `/api/v1/users/me` | Bearer token | Return the signed-in user's profile. |
| GET | `/api/v1/resumes` | Bearer token | List the signed-in user's resumes. |
| POST | `/api/v1/resumes` | Bearer token | Create a resume. |
| GET | `/api/v1/resumes/{id}` | Owner bearer token | Read one resume. |
| PUT | `/api/v1/resumes/{id}` | Owner bearer token | Update one resume. |
| DELETE | `/api/v1/resumes/{id}` | Owner bearer token | Delete one resume. |
| GET | `/api/v1/ats/health` | Bearer token | Check ATS module availability. |
| GET | `/api/v1/jobs/health` | Bearer token | Check job matching module availability. |
| GET | `/api/v1/notifications/health` | Bearer token | Check notifications module availability. |

For contract expansion rules, versioning policy, and anti-patterns, use
[REST API Architecture](05_REST_API_Architecture.md).
