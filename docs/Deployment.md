# Deployment

Deployment requires separate configuration for the frontend, backend, database,
secrets, CORS, cookies, and optional AI provider keys.

## Primary References

- [Root README](../README.md) covers environment variables, local setup, Docker,
  CI, and operational checks.
- [Docker README](../docker/README.md) covers Compose-based workflows.
- [Authentication & Security](06_Authentication_Security.md) covers secure cookie,
  token, CORS, and production hardening expectations.

## Deployment Checklist

- Use managed secrets for database credentials, JWT secrets, AI provider keys, and
  BYOK encryption keys.
- Set production CORS origins explicitly.
- Enable secure cookies in production.
- Run Flyway migrations before serving traffic.
- Confirm frontend `VITE_*` values contain only public browser-safe settings.
- Run backend tests, frontend lint, and frontend tests before deployment.
