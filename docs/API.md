# API Reference

The public API is versioned from its first release. All application endpoints
use the `/api/v1` prefix and JSON responses use one consistent envelope.

## Core endpoints

| Method | Path | Authentication |
|---|---|---|
| POST | `/api/v1/auth/register` | Public |
| POST | `/api/v1/auth/login` | Public |
| GET | `/api/v1/resumes?page=0&size=20` | Bearer token |
| POST | `/api/v1/resumes` | Bearer token |
| GET | `/api/v1/resumes/{id}` | Owner bearer token |
| PUT | `/api/v1/resumes/{id}` | Owner bearer token |
| DELETE | `/api/v1/resumes/{id}` | Owner bearer token |

Every response includes `meta.correlationId` and `meta.timestamp`. Clients may
send `X-Correlation-Id`; otherwise the API generates one and returns it in the
response header and body metadata.

Successful collection responses include `pagination` with `page`, `size`,
`totalElements`, and `totalPages`. Page numbering starts at zero and size is
capped at 100.

Errors use `error.code` and `error.message`; stable codes include
`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`UPSTREAM_ERROR`, and `INTERNAL_ERROR`.
