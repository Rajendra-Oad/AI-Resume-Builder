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
