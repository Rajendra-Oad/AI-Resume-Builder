# Docker support

The production target is Render for the Spring Boot backend and PostgreSQL, plus Vercel for the frontend. Use the root `render.yaml` and `vercel.json` for production.

`backend/Dockerfile` is the authoritative backend image and is used directly by Render. It is multi-stage, runs Java 21 as a non-root user, contains no environment files, and exposes the Actuator health check.

The files under `docker/` remain an optional self-hosted HTTPS topology. They assume an externally managed PostgreSQL service reachable through `DB_URL`; they do not provision a database and must not be used with MySQL configuration.

Before using the optional Compose stack:

```bash
cp docker/.env.example docker/.env
docker compose -f docker/docker-compose.yml config --quiet
docker compose -f docker/docker-compose.yml build backend
docker compose -f docker/docker-compose.yml up -d
```

Set PostgreSQL, JWT, encryption, SMTP, AI, frontend URL, CORS and TLS values in ignored environment files or the deployment secret manager. See [`docs/Deployment.md`](../docs/Deployment.md) for the production Render/Vercel runbook.
