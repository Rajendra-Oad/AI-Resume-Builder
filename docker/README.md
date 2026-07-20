# Docker

Copy `docker/.env.example` to `docker/.env`, fill in local-only values, then run
from the repository root:

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml up --build
```

The frontend is available at `http://localhost:5173`, the backend at
`http://localhost:8080`, and MySQL at `localhost:3306`.

For hot-reload development, include `docker-compose.dev.yml`:

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up
```
