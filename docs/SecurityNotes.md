# Security Notes

The canonical security blueprint is
[Authentication & Security](06_Authentication_Security.md). This page is a quick
operational reminder.

## Non-Negotiables

- Never commit real `.env` files, API keys, JWT secrets, database passwords, or
  BYOK encryption keys.
- Store production secrets in the deployment platform's secret manager.
- Keep access tokens short-lived and refresh tokens protected with HttpOnly cookies.
- Enforce authorization on the backend; frontend checks are only user experience.
- Validate all incoming request data.
- Do not log full resume content, passwords, provider keys, or raw tokens.

## Review Checklist

- Run secret scanning before merging.
- Confirm CORS and secure-cookie settings for production.
- Confirm database users are least-privileged outside local development.
- Review new endpoints for authentication, ownership checks, validation, and
  stable error responses.
