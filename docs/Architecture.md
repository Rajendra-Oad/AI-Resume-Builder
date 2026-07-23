# Architecture

AI Resume Builder is a full-stack application with a React frontend, Spring Boot
backend, MySQL persistence layer, Docker deployment support, and provider-agnostic
AI integration.

## System Overview

| Layer | Responsibility | Canonical Guide |
|---|---|---|
| Frontend | React SPA, routing, feature modules, UI state, accessibility, and API clients. | [Frontend Architecture](04_Frontend_Architecture.md) |
| Backend | REST API, domain services, security, integrations, async work, and events. | [Backend Architecture](02_Backend_Architecture.md) |
| Database | MySQL schema design, migrations, relationships, indexes, and data integrity. | [Database Architecture](03_Database_Architecture.md) |
| API | Versioned REST contracts, response envelopes, errors, pagination, and auth rules. | [REST API Architecture](05_REST_API_Architecture.md) |
| Security | Authentication, authorization, JWTs, refresh tokens, account recovery, and hardening. | [Authentication & Security](06_Authentication_Security.md) |
| AI | Provider routing, prompts, BYOK, cost controls, safety, and output validation. | [AI Architecture](07_AI_Architecture.md) |
| Resume Domain | Resume lifecycle, sections, versioning, validation, templates, and export boundaries. | [Resume Domain Architecture](08_Resume_Domain_Architecture.md) |

## Design Principles

- Keep feature ownership clear across frontend, backend, database, and AI modules.
- Keep content, presentation, and generated artifacts separate.
- Treat the resume document as the source of truth for AI, ATS, PDF, and job matching.
- Prefer additive module growth over rewrites.
- Document implementation gaps explicitly in the audit files.

Start with the [Documentation Index](README.md) for the full map.
