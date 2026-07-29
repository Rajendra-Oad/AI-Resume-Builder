# Production Docker deployment

The production Compose stack contains only:

- Spring Boot backend
- Unprivileged Nginx HTTPS reverse proxy

MySQL remains the existing EC2 host service. The Vercel frontend is not rebuilt
or served from this stack.

From the repository root:

```bash
cp docker/.env.example docker/.env
# Set the existing host TLS certificate paths in docker/.env.

docker compose -f docker/docker-compose.yml config --quiet
docker compose -f docker/docker-compose.yml build backend
docker compose -f docker/docker-compose.yml up -d backend
docker compose -f docker/docker-compose.yml logs -f backend
```

After the backend is healthy and host ports 80/443 are available:

```bash
docker compose -f docker/docker-compose.yml up -d nginx
```

See [the complete EC2 runbook](../docs/Deployment.md) before performing the
host-Nginx cutover or the first Flyway migration.
