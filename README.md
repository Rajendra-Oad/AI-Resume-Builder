# AI Resume Builder

> An enterprise-grade AI-powered Resume Builder that helps users create, optimize, analyze, and manage professional resumes using modern AI models and best software engineering practices.

---

## 📌 Project Overview

AI Resume Builder is a full-stack web application designed to simplify resume creation while providing intelligent AI-powered assistance.

The project focuses on:

* Creating professional resumes
* AI-generated resume content
* Resume improvement suggestions
* ATS (Applicant Tracking System) optimization
* Cover letter generation
* Job matching
* Resume templates
* Resume version history
* PDF export
* Secure authentication
* Scalable enterprise architecture

The application is designed using production-level architecture and modular design principles to ensure maintainability, scalability, and future expansion.

---

# Local Quick Start

## Prerequisites

Install these before running the project directly on your computer:

| Tool | Supported version | Required? | Check |
| --- | --- | --- | --- |
| Git | Current stable | Yes | `git --version` |
| Java JDK | 21 | Yes | `java -version` |
| Maven | 3.9+ | Yes, unless the Maven wrapper works on your system | `mvn -version` |
| Node.js | 20+ | Yes | `node --version` |
| npm | Included with Node.js | Yes | `npm --version` |
| MySQL | 8.0+; 8.4 recommended | Yes | `mysql --version` |
| Redis | 7+ | No | `redis-cli ping` |
| SMTP account | Provider-specific | No for basic development | Not applicable |
| Docker Desktop/Engine + Compose | Current stable | Only for the Docker workflow | `docker compose version` |

The default local ports are:

- Frontend: `5173`
- Backend: `8080`
- MySQL: `3306`
- Redis: `6379` when enabled

## 1. Prepare local configuration

From the repository root, copy the example files. Never put real credentials in an
`.env.example` file.

PowerShell:

```powershell
.\scripts\setup.ps1 -InstallFrontendDependencies
```

macOS/Linux:

```bash
./scripts/setup.sh
cd frontend && npm install
```

The scripts create ignored local files:

- `backend/.env`
- `docker/.env`

Open `backend/.env` and replace every required placeholder. Confirm that `.env` files
remain ignored before adding files to Git:

```bash
git check-ignore backend/.env docker/.env
```

## 2. Generate local secrets

`JWT_SECRET` must contain at least 32 characters. Use a cryptographically random value,
not a memorable password.

OpenSSL:

```bash
openssl rand -base64 48
```

PowerShell:

```powershell
$jwtBytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Fill($jwtBytes)
[Convert]::ToBase64String($jwtBytes)
```

Paste the output into `JWT_SECRET` in `backend/.env`.

BYOK support requires a separate Base64-encoded 32-byte AES key. This key encrypts
user-provided OpenAI/Gemini credentials and must be backed up securely.

OpenSSL:

```bash
openssl rand -base64 32
```

PowerShell:

```powershell
$aesBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($aesBytes)
[Convert]::ToBase64String($aesBytes)
```

Paste that output into `USER_API_KEY_ENCRYPTION_KEY`. Do not reuse `JWT_SECRET` as the
encryption key.

### Automatic startup validation

The backend validates configuration before creating database, security, or integration
beans. It reports all detected problems in one numbered message, identifies the exact
environment variable to fix, and never includes secret values.

| Variable | When required | Validation |
| --- | --- | --- |
| `DB_URL` | Always | Non-placeholder MySQL JDBC URL beginning with `jdbc:mysql://` |
| `DB_PASSWORD` | Always | Non-empty, non-placeholder value |
| `JWT_SECRET` | Always | Non-placeholder value containing at least 32 characters |
| `USER_API_KEY_ENCRYPTION_KEY` | When enabling BYOK/personal provider keys | Valid Base64 that decodes to exactly 32 bytes; platform AI mode may leave it unset |
| `DB_USERNAME` | `prod` profile | Non-empty, non-placeholder least-privileged database user |
| `APP_FRONTEND_URL` | `prod` profile | Absolute HTTPS URL |
| `APP_CORS_ALLOWED_ORIGINS` | `prod` profile | Non-empty explicit frontend origin list |
| `APP_SECURE_COOKIES` | `prod` profile | Must be `true` |
| `SPRING_MAIL_HOST`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | When any SMTP setting is supplied | All three must be supplied; the port must be valid |
| `REDIS_HOST` | When `AI_REDIS_ENABLED=true` | Non-empty; `REDIS_PORT` must be valid |
| `DEV_SEED_PASSWORD` | When `DEV_SEED_ENABLED=true` | At least 12 characters and the `dev` profile must be active |

The validator also checks provider selection, boolean flags, ports, token durations,
rate limits, cache TTL, and the monthly AI budget when those optional overrides are
provided. A failed startup ends with `Update backend/.env or deployment environment
variables, then restart.`

## 3. Configure MySQL

Create the database and a dedicated local application user. Adjust the password before
running these statements:

```sql
CREATE DATABASE ai_resume_builder
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'ai_resume_app'@'localhost' IDENTIFIED BY 'replace-this-password';
GRANT ALL PRIVILEGES ON ai_resume_builder.* TO 'ai_resume_app'@'localhost';
FLUSH PRIVILEGES;
```

Configure `backend/.env`:

```env
DB_URL=jdbc:mysql://localhost:3306/ai_resume_builder
DB_USERNAME=ai_resume_app
DB_PASSWORD=replace-this-password
```

Flyway runs automatically when the backend starts. Do not manually edit a database that
Flyway manages and do not modify a migration that has already been applied; add a new
versioned migration instead.

## 4. Configure AI providers

There are two supported modes:

- **Platform AI:** the server uses `OPENAI_API_KEY` or `GEMINI_API_KEY` from
  `backend/.env`.
- **BYOK:** a signed-in user adds an encrypted personal key from **AI Center** in the UI.

The backend can start without provider keys, but generation will be unavailable until a
platform key or user key is configured.

Platform example:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=replace-with-a-gemini-key
OPENAI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
OPENAI_MODEL=gpt-5-mini
```

Use `AI_PROVIDER=openai` when OpenAI should be the default platform provider. Provider
keys must be created in the provider's own console. Never expose them through `VITE_*`
variables: Vite variables are shipped to the browser.

BYOK still requires `USER_API_KEY_ENCRYPTION_KEY` on the server even though the user
supplies the provider credential.

## 5. Optional Redis mode

Redis is disabled by default:

```env
AI_REDIS_ENABLED=false
```

With this setting, the application uses its in-process AI rate limiter and does not need
a Redis server. This is suitable for one local backend instance.

To test the distributed limiter:

```env
AI_REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

Start Redis first and verify it:

```bash
redis-cli ping
```

The expected response is `PONG`. Use Redis for multi-instance deployments so rate-limit
counters are shared between backend instances.

## 6. Optional SMTP mode

SMTP is used for password-reset and verification messages. Leave these values empty when
email delivery is not needed locally:

```env
MAIL_FROM=AI Resume Builder <no-reply@example.com>
SPRING_MAIL_HOST=
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=
SPRING_MAIL_PASSWORD=
```

Without SMTP, the web application and normal authentication can run, but email actions
cannot be delivered. The server logs a warning instead of logging token-bearing links.

For Gmail or another SMTP provider, use an app password or provider-issued SMTP token;
never use or commit the account's normal password. Example:

```env
SPRING_MAIL_HOST=smtp.example.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=replace-with-smtp-user
SPRING_MAIL_PASSWORD=replace-with-an-app-password
SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true
```

## 7. Start the application

Terminal 1:

```bash
cd backend
mvn spring-boot:run
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. Vite proxies browser `/api` requests to
`http://localhost:8080`, which keeps the HttpOnly refresh cookie same-origin.

After pulling backend changes, always restart the backend so Spring discovers new
controllers and Flyway applies new migrations.

## Reproducible development data

The development seed is disabled by default and is registered only when the Spring
`dev` profile is active. It creates realistic local data beyond the baseline provider
and template rows: a user and administrator, a profile, two resumes, a job description,
an ATS report with keyword results and recommendations, a job match, prompt workflows,
a notification, an AI usage entry, and an audit record.

Start the backend with seeding enabled and choose a local password (minimum 12
characters):

```powershell
# Windows PowerShell, from the repository root
.\scripts\seed-dev.ps1 -Password "LocalDemoPass123!"
```

```bash
# macOS/Linux, from the repository root
./scripts/seed-dev.sh 'LocalDemoPass123!'
```

Then sign in with either `demo.user@local.test` or `demo.admin@local.test` and the
password supplied to the script. Rerunning the workflow updates the known demo accounts
and reuses the seeded records instead of creating duplicates, so every developer starts
from the same dataset. The normal `mvn spring-boot:run` command does not seed data.

Do not set `DEV_SEED_ENABLED=true` outside local development. The profile guard prevents
the component from loading unless `SPRING_PROFILES_ACTIVE=dev`, and no seed password is
stored in source control.

## Docker workflow

Copy `docker/.env.example` to `docker/.env`, replace its placeholders, then run:

```bash
cd docker
docker compose up --build
```

The production-style Compose file starts MySQL, the backend, and the Nginx-served
frontend. Redis and SMTP are optional and are not started by the default Compose file.

## Troubleshooting

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| Backend reports `Communications link failure` | MySQL is stopped, the port is wrong, or `DB_URL` is invalid | Start MySQL, verify port `3306`, and test the same host/user with the MySQL client. |
| Backend reports `Access denied for user` | Incorrect `DB_USERNAME`/`DB_PASSWORD` or missing grants | Re-run the user/grant statements and update `backend/.env`. |
| Startup lists multiple environment validation errors | Required, conditional, or malformed configuration was detected | Fix every numbered variable in `backend/.env` or the deployment secret store, then restart. Values are intentionally omitted from the error. |
| Flyway validation or checksum error | An applied migration was edited | Restore the original migration. Add a new migration for the correction; do not delete Flyway history. |
| Table or endpoint added in code is missing | Backend was not restarted or a migration failed | Stop and restart the backend, then inspect the first Flyway error in the startup log. |
| `JWT_SECRET must contain at least 32 characters` | Secret is empty or too short | Generate a new random JWT secret using the commands above. |
| Dashboard refresh returns to login | Backend/cookie configuration is stale or frontend bypasses the proxy | Restart both apps, keep `VITE_API_BASE_URL` unset, clear old cookies, and log in again. |
| Browser reports CORS errors | Frontend origin is absent from `APP_CORS_ALLOWED_ORIGINS` | Add the exact scheme, hostname, and port, then restart the backend. Prefer the same-origin Vite proxy locally. |
| AI Center settings endpoint is missing | Backend is running an older build or Flyway V7 was not applied | Restart the backend and confirm migration `V7__user_ai_provider_credentials.sql` succeeds. |
| Saving a user API key says encryption is not configured | `USER_API_KEY_ENCRYPTION_KEY` is missing/invalid | Supply exactly 32 random bytes encoded as Base64, then restart the backend. |
| AI says a provider key is not configured | Neither platform nor selected BYOK key is available | Configure a platform key in `backend/.env` or add a personal key in AI Center. |
| AI provider returns 401/403 | Provider key is invalid, expired, restricted, or lacks billing/access | Replace the key in its provider console or AI Center and verify provider account access. |
| Development seed does not run | The `dev` profile or seed flag is missing | Use `scripts/seed-dev.ps1` or `scripts/seed-dev.sh`; both set `SPRING_PROFILES_ACTIVE=dev` and `DEV_SEED_ENABLED=true`. |
| Backend rejects `DEV_SEED_PASSWORD` | The chosen demo password is shorter than 12 characters | Run the seed script again with a longer local-only password. |
| Redis connection errors | `AI_REDIS_ENABLED=true` but Redis is unavailable | Start Redis and verify `PONG`, correct its host/port, or set the flag to `false`. |
| Password-reset email is not received | SMTP is blank, rejected, or filtered | Check backend SMTP warnings, app-password settings, sender address, and spam folder. |
| Frontend cannot reach the backend | Backend is stopped or Vite proxy target is wrong | Start port `8080` and set `VITE_DEV_PROXY_TARGET` only when the backend uses another host. |
| Port already in use | Another process owns `5173`, `8080`, `3306`, or `6379` | Stop that process or configure a different service port and update dependent settings. |

## Secret-handling rules

- Never commit `.env` files or real values in `.env.example`.
- Never place server secrets in `VITE_*` variables.
- Never log API keys, JWT secrets, SMTP passwords, reset links, or raw refresh tokens.
- Rotate a secret immediately if it appears in Git history, build output, screenshots, or
  chat messages. Removing it from the latest file does not remove it from history.
- Store production secrets in the deployment platform's secrets manager, not in Docker
  images or repository files.

## CI security gates

The `Security` GitHub Actions workflow runs on pushes and pull requests to `main` and
`develop`, every Monday, and on manual dispatch. It includes:

- Gitleaks scanning across the full Git history with detected values redacted.
- `npm audit` against the locked frontend dependency tree, failing at high severity.
- OWASP Dependency-Check for Maven dependencies, failing at CVSS 7 or higher and
  retaining HTML/JSON reports for 14 days.
- GitHub dependency review, blocking pull requests that introduce high-severity
  vulnerable packages.
- CodeQL extended security analysis for Java/Kotlin and JavaScript/TypeScript.

For faster and more reliable OWASP vulnerability database updates, configure an
`NVD_API_KEY` GitHub Actions secret. The workflow can run without it, but initial NVD
downloads may be slower or rate-limited. Treat security workflow jobs as required branch
protection checks.

## Coverage and migration gates

The normal CI workflow publishes HTML coverage reports for both applications and fails
when coverage drops below the checked-in minimums:

- Backend: JaCoCo line coverage must remain at or above 24% across the complete bundle
  (current measured coverage: 25.02%).
- Frontend: V8 coverage must remain at or above 12% lines, 13% statements, 10% functions,
  and 20% branches across all source files, including files that tests never import
  (current measurements: 12.93%, 13.63%, 10.93%, and 20.59%, respectively).

Behavioral coverage includes authentication and administrator route decisions, modal
keyboard/focus behavior, async retry states, debouncing, validation and error
normalization, in-memory token lifecycle, JWT creation/expiry/tampering, AI output bounds,
provider health fallback, and provider-specific cost calculation. Thresholds should keep
increasing as page workflows and database-backed services gain tests.

Run the same checks locally:

```bash
cd backend
mvn verify

cd ../frontend
npm run test:coverage
```

The CI `database-integration` job starts a fresh MySQL 8.4 service and runs the
`integration-test` Maven profile. `FlywayMigrationIT` applies all seven migrations,
runs Flyway validation, verifies the schema's representative tables, and confirms the
provider seed rows. This checks real MySQL behavior rather than merely compiling SQL
resources.

For a local migration test, create an empty, disposable database whose name contains
`test`, then provide `IT_DB_URL`, `IT_DB_USERNAME`, and `IT_DB_PASSWORD` before running:

```bash
cd backend
mvn -Pintegration-test verify
```

Never point the integration profile at a development or production database. The test
intentionally requires a dedicated test database and expects to apply every migration to
an empty schema.

## Repository governance

Contribution, review, Conventional Commit, and required branch-rules policies are defined
in [CONTRIBUTING.md](CONTRIBUTING.md). CI validates every pull request title and non-merge
commit subject. Branch protection and approval enforcement remain GitHub repository
settings and must be verified against the live repository rather than inferred from these
files.

---

# Technology Stack

## Frontend

* React 19
* Vite
* Tailwind CSS
* React Router
* Axios

## Backend

* Java 21
* Spring Boot
* Spring Security
* Spring Data JPA
* Hibernate
* Maven

## Database

* MySQL

## Authentication

* JWT (JSON Web Token)

## AI Providers

Current

* OpenAI
* Google Gemini

Future

* Anthropic Claude
* Azure OpenAI
* Ollama
* LM Studio

## Deployment

* Docker
* Docker Compose
* Vercel
* Render / AWS

---

# Project Structure

```text
AI-Resume-Builder/
│
├── backend/
├── frontend/
├── database/
├── docker/
├── docs/
├── scripts/
├── .gitignore
├── README.md
└── LICENSE
```

---

# Architecture Documentation

The project is implemented in phases using architecture-first development.

| No. | Document                   |
| --- | -------------------------- |
| 01  | Project Foundation & Setup |
| 02  | Backend Architecture       |
| 03  | Database Architecture      |
| 04  | Frontend Architecture      |
| 05  | REST API Architecture      |
| 06  | Authentication & Security  |
| 07  | AI Architecture            |
| 08  | Resume Domain Architecture |
| 09  | UX & Design System         |
| 10  | Resume Builder Module      |

Each document acts as the source of truth before implementation begins.

---

# Core Features

* User Registration & Login
* JWT Authentication
* Resume Builder
* Resume Templates
* Live Resume Preview
* Resume Version History
* Resume Import
* Resume Export (PDF)
* AI Resume Generation
* AI Resume Improvement
* Cover Letter Generator
* ATS Score & Suggestions
* Job Match Analysis
* Dashboard
* User Profile
* Settings

---

# Future Features

* Recruiter Portal
* Resume Collaboration
* Portfolio Integration
* Multi-language Support
* Premium Templates
* Analytics Dashboard
* Cloud Backup
* Plugin System
* AI Chat Assistant
* Voice Assistance

---

# Development Workflow

Development follows an architecture-first approach.

1. Complete architecture documentation.
2. Set up project foundation.
3. Build backend foundation.
4. Design database.
5. Build frontend.
6. Implement APIs.
7. Implement authentication.
8. Develop features module by module.
9. Test each module.
10. Deploy to production.

---

# Git Workflow

Typical workflow:

```bash
git pull
git checkout -b feature/<feature-name>

# Make changes

git add .
git commit -m "Add <feature-name>"
git push origin feature/<feature-name>
```

---

# Coding Principles

* Clean Architecture
* SOLID Principles
* DRY
* KISS
* Separation of Concerns
* Domain-Driven Design (DDD)
* Secure by Design
* API First
* Modular Development

---

# Project Status

Current Phase:

**Phase 1 — Architecture & Project Foundation**

Progress:

* ✅ Architecture Planning
* ⏳ Project Setup
* ⏳ Backend Development
* ⏳ Frontend Development
* ⏳ AI Integration
* ⏳ Testing
* ⏳ Deployment

---

# Documentation

All architecture documents are located in:

```text
docs/
```

These documents should be completed and reviewed before implementation.

---

# License

This project is intended for educational and portfolio purposes unless otherwise specified.

---

# Author

**Rajendra** and **Gangadhar**

Built as a professional, enterprise-scale AI Resume Builder to demonstrate full-stack software engineering, AI integration, and scalable system design.
