# Development Guide

Use the [Root README](../README.md) as the complete local setup guide. This page is
a quick pointer to the commands developers use most often.

## Local Setup Checklist

1. Install Java 21, Node.js 20+, npm, Git, and PostgreSQL.
2. Run the setup script for your platform from the repository root.
3. Fill `backend/.env` with local database, JWT, and optional AI settings.
4. Start the backend and frontend in separate terminals.

## Common Commands

Backend:

```bash
cd backend
./mvnw spring-boot:run
./mvnw test
```

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run test -- --run
```

Docker:

```bash
cd docker
docker compose up --build
```

See [Docker README](../docker/README.md) for container-specific details.
