# AI Resume Builder Documentation

This folder is the documentation hub for the AI Resume Builder project. The
numbered guides are the canonical architecture blueprints; the shorter reference
pages provide quick links for day-to-day development.

## Start Here

For a beginner-friendly explanation of the implemented application, including
the abstract, architecture, technology stack, folder connections, workflows,
feature status, unused/optional parts, setup, security, and presentation notes,
read the [Complete Learning Guide](../AI_RESUME_BUILDER_COMPLETE_LEARNING_GUIDE.md).

## Core Architecture Series

| # | Document | Purpose |
|---|---|---|
| 01 | [Project Foundation Setup](01_Project_Foundation_Setup.md) | Project planning, repository structure, environments, branching, and governance. |
| 02 | [Backend Architecture](02_Backend_Architecture.md) | Spring Boot module boundaries, layers, service patterns, events, and scaling strategy. |
| 03 | [Database Architecture](03_Database_Architecture.md) | PostgreSQL domain model, relationships, keys, constraints, indexing, and migration strategy. |
| 04 | [Frontend Architecture](04_Frontend_Architecture.md) | React feature structure, routing, state, design system usage, performance, and accessibility. |
| 05 | [REST API Architecture](05_REST_API_Architecture.md) | API resource model, response envelope, errors, pagination, auth, versioning, and documentation rules. |
| 06 | [Authentication & Security](06_Authentication_Security.md) | Identity lifecycle, JWTs, refresh tokens, RBAC, rate limits, account recovery, and hardening. |
| 07 | [AI Architecture](07_AI_Architecture.md) | Provider abstraction, prompts, validation, budgets, BYOK, retry behavior, and safety controls. |
| 08 | [Resume Domain Architecture](08_Resume_Domain_Architecture.md) | Resume lifecycle, business rules, versioning, validation, templates, analytics, and future growth. |
| 09 | [UX & Design System](09_UX-Design-System.md) | Product UX principles, flows, accessibility, responsive behavior, states, and design standards. |
| 10 | [Resume Builder Module](10_Resume_Builder_Module.md) | Builder-specific document model, editing lifecycle, autosave, preview, integrations, and quality rules. |
| 11 | [Motion Experience Architecture](11_Motion_Experience_Architecture.md) | Library-neutral motion, scrolling, transition, accessibility, performance, and future-plugin blueprint; no runtime implementation. |

## Audits And Status

| Document | Purpose |
|---|---|
| [Implementation Gap Audit](01-07_Implementation_Gap_Audit.md) | Tracks implementation gaps against architecture guides 01 through 07. |
| [Frontend Architecture Implementation Audit](Frontend_Architecture_Implementation_Audit.md) | Maps frontend implementation status against the frontend architecture guide. |
| [AI Provider Choice & BYOK](AI_Provider_Choice_BYOK.md) | Explains platform-provider and bring-your-own-key behavior. |

## Quick References

| Document | Use When |
|---|---|
| [Architecture](../ARCHITECTURE.md) | You need a short overview and links to the deeper architecture guides. |
| [API](API.md) | You need the current API conventions and the path to the full REST API guide. |
| [Database Architecture](03_Database_Architecture.md) | You need a compact database summary and the canonical schema guide. |
| [Development Guide](DevelopmentGuide.md) | You need local setup entry points and command references. |
| [Coding Standards](CodingStandards.md) | You need day-to-day Java and React coding conventions. |
| [Contributing](Contributing.md) | You need branch, PR, and commit rules for documentation or code changes. |
| [Deployment](Deployment.md) | You need deployment and Docker reference links. |
| [Roadmap](Roadmap.md) | You need phase-level project direction and audit links. |
| [Security Notes](SecurityNotes.md) | You need security reminders and the canonical security blueprint. |

## External Repository References

| Location | Purpose |
|---|---|
| [Root README](../README.md) | Local setup, environment variables, scripts, Docker workflow, CI, and project overview. |
| [Backend README](../backend/README.md) | Backend-specific setup and runtime notes. |
| [Frontend README](../frontend/README.md) | Frontend-specific setup and Vite notes. |
| [Database README](../database/README.md) | Migration location and database guidance. |
| [Docker README](../docker/README.md) | Containerized local and production-oriented workflows. |
| [Root Contributing Guide](../CONTRIBUTING.md) | Repository-wide contribution policy. |

## Maintenance Rules

- Keep the numbered guides as the source of truth for architectural decisions.
- Update this index whenever a documentation file is added, renamed, or retired.
- Keep quick-reference pages concise; link to the full numbered guide for details.
- Do not commit secrets, local `.env` files, generated reports, or machine-specific logs.
- When implementation diverges from a blueprint, update either the implementation or
  the relevant audit so the difference is visible.
