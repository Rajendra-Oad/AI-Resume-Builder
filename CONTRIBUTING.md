# Contributing to AI Resume Builder

Thanks for contributing! This guide covers the workflow, conventions, and setup you need.

## Quick links

- [Architecture](ARCHITECTURE.md)
- [Coding standards](docs/CodingStandards.md)
- [Deployment](docs/Deployment.md)
- [Environment variables](docs/EnvironmentVariables.md)

## Development setup

```bash
git clone https://github.com/Rajendra-Oad/AI-Resume-Builder.git
cd AI-Resume-Builder
scripts/setup.sh            # copies .env.example -> backend/.env
scripts/seed-dev.sh '<password>=12 chars>'   # optional dev seed data
```

Run backend and frontend separately:

```bash
cd backend && ./mvnw spring-boot:run     # http://localhost:8080
cd frontend && npm run dev               # http://localhost:5173
```

## Branch naming

Use the format `type/scope/description`:

| Type       | When                                    | Example                              |
|------------|-----------------------------------------|--------------------------------------|
| feat/      | New feature                             | feat/ai-cover-letter                 |
| fix/       | Bug fix                                 | fix/render-env-defaults              |
| refactor/  | Code restructure (no behavior change)   | refactor/auth-refresh-flow           |
| docs/      | Documentation only                      | docs/api-setup-guide                 |
| chore/     | Maintenance, dependencies, CI           | chore/bump-spring-boot               |
| perf/      | Performance improvement                 | perf/font-loading                    |
| test/      | Adding or fixing tests                  | test/pdf-export-coverage             |

Scope is optional but recommended -- use the feature area (backend, frontend, deploy, ai, auth, etc.).

Bad: fix-stuff, update, changes, my-feature
Good: fix/pdf-export-null-check, feat/admin-dashboard

## Commit messages

Follow Conventional Commits (https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

CI validates commit messages on every push. Allowed types: feat fix docs style refactor perf test build ci chore revert.

Examples:
```
fix(backend): add fallback defaults to env-var property mappings
feat(frontend): add resume preview modal
docs: update deployment guide for Render
chore(deps): bump spring-boot to 3.5.15
```

## Pull request workflow

### 1. Create a feature branch

```bash
git checkout main && git pull
git checkout -b fix/render-env-defaults
```

### 2. Make changes and commit

```bash
git add .
git commit -m "fix(backend): add fallback defaults to env-var property mappings"
```

### 3. Push and open a PR

```bash
git push -u origin fix/render-env-defaults
```

Open a PR against main. The PR template will guide you through what to include.

### 4. PR requirements

- Link an issue -- use Fixes #123 in the PR description to auto-close the issue on merge
- One approval required -- branches are protected
- CI must pass -- backend tests, frontend lint/tests/build, Playwright e2e, security scans
- Squash merge -- PRs are squash-merged into main

### 5. After merge

- Delete your feature branch (GitHub offers this on merge)
- Render auto-deploys from main
- Set any new required env vars in the Render dashboard before the deploy completes

## Running tests

### Backend

```bash
cd backend
./mvnw test                    # unit tests
./mvnw verify                  # tests + JaCoCo coverage (minimum 24%)
./mvnw test -Dtest=ClassName   # single test class
```

### Frontend

```bash
cd frontend
npm run lint                   # ESLint
npm run test                   # Vitest
npm run test:coverage          # coverage thresholds
npm run build                  # production build
npm run test:e2e               # Playwright e2e
```

## Creating issues

Use the issue templates:
- Bug report -- reproduction steps, expected vs actual behavior
- Feature request -- problem, proposed solution, acceptance criteria
- Question -- setup, usage, or architecture questions

## Code review checklist

Before requesting review, verify:

- Tests pass locally
- No new lint warnings
- Changes match coding standards (see docs/CodingStandards.md)
- Environment variable changes are documented
- Database migrations are forward-only and tested against a scratch DB

## Environment variables

Never commit secrets. Use .env files (gitignored) for local development. Set production values in the Render dashboard.

Required variables for production:
- DB_URL, DB_USERNAME, DB_PASSWORD
- JWT_SECRET (>=32 characters)
- USER_API_KEY_ENCRYPTION_KEY (Base64 of 32 bytes)
- APP_FRONTEND_URL, APP_CORS_ALLOWED_ORIGINS
- SPRING_MAIL_HOST, SPRING_MAIL_USERNAME, SPRING_MAIL_PASSWORD, MAIL_FROM
- MANAGEMENT_METRICS_TOKEN

See docs/EnvironmentVariables.md for the full list.

## Questions?

Open a Question issue (https://github.com/Rajendra-Oad/AI-Resume-Builder/issues/new?template=question.yml) or check the docs/.
