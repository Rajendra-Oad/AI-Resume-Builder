# AI Resume Builder — Backend Architecture Guide

**Status:** Pre-development blueprint. No code, entities, SQL, or APIs exist yet. This document governs how backend developers structure and write code once feature work begins.

---

## PART 1 — Backend Philosophy

### Layered Architecture
Organizes code horizontally by technical responsibility: `controller → service → repository`. Simple to understand, easy to onboard into, but at scale it can encourage "fat services" that do everything for every feature in one place.

### Clean Architecture
Organizes code by dependency direction: business logic (domain) at the center, knowing nothing about frameworks; infrastructure (DB, web) at the edges, depending inward. Maximizes testability and framework independence, but adds ceremony (more interfaces, more mapping) that's costly for a small team moving fast.

### Feature-based Architecture
Organizes code vertically by business capability (`feature/resume/`, `feature/ai/`) rather than technical layer. Each feature owns its controller, service, repository, DTOs. Easiest to reason about "what does this feature touch," easiest to eventually extract into a microservice.

### Recommended approach: **Modular Monolith, layered internally within feature modules**
This project combines the two: top-level packages are organized **by feature** (Part 2), and *within* each feature, code is organized **by layer** (controller/service/repository/dto). This gives:
- Clear feature boundaries (good for future extraction into services)
- Familiar internal layering (good for a team, including junior developers, ramping up on each module)

### Why Modular Monolith first
- **Single deployable unit** — one Docker container, one CI pipeline, no distributed-systems complexity (network failures, distributed transactions, service discovery) before the product even has users.
- **Cheaper to develop and debug** — a stack trace stays in one process; no correlating logs across services.
- **Refactoring is local** — moving a class between packages in a monolith is a safe IDE operation; moving functionality between microservices is a project.
- Module boundaries (Part 2/3) are designed so that if a feature (e.g., AI processing, PDF generation) later needs independent scaling, it can be **extracted** into its own service with minimal rework — the modular boundary already exists in code, it just becomes a network boundary instead of a package boundary.

### When Microservices become appropriate
- When a specific module (typically AI processing or PDF generation — both CPU/latency heavy) needs to scale independently of the rest of the app.
- When team size grows enough that independent deployability per team outweighs the operational cost of distributed systems.
- When one module's reliability requirements diverge sharply from others (e.g., AI calls timing out shouldn't take down resume CRUD).

**Recommendation for this project:** modular monolith through v1 and v2 (Part 10 of the setup guide). Revisit AI and PDF modules as extraction candidates only once real usage data justifies it.

---

## PART 2 — Complete Package Structure

```
com.airesumebuilder
├── config/                 # Cross-cutting framework configuration (Part 5)
├── security/                # JWT filters, auth providers, RBAC config
├── common/
│   ├── dto/                  # Generic API response, pagination wrappers
│   ├── exception/              # Base exception types, global handler
│   ├── mapper/                   # Shared mapping utilities/interfaces
│   ├── util/                      # Stateless helpers (date, string utils)
│   ├── constant/                    # Shared constants/enums
│   └── validation/                    # Custom cross-feature validators
├── feature/
│   ├── auth/                # Registration, login, token refresh
│   ├── user/                  # User profile management
│   ├── resume/                  # Core resume CRUD (sections, entries)
│   ├── ai/                        # AI provider abstraction (Part 3)
│   ├── pdf/                        # PDF export/rendering
│   ├── ats/                          # ATS scoring/checking
│   ├── job/                            # Job matching
│   ├── notification/                     # Email/push notification dispatch
│   ├── admin/                              # Admin-only operations
│   └── audit/                                # Change history / audit trail
├── integration/           # External API clients (OpenAI, Gemini, payment, email providers)
├── scheduler/               # Scheduled/cron jobs
├── cache/                     # Cache configuration and cache-key strategy
├── events/                      # Application event publishers/listeners
└── ResumeBuilderApplication.java
```

### Package Responsibilities

| Package | Responsibility |
|---|---|
| `config/` | Wires framework beans — security filter chain, CORS, Jackson, OpenAPI, async executor, cache manager. No business logic. |
| `security/` | JWT generation/validation, `UserDetailsService` implementation, method-level `@PreAuthorize` support, role definitions. |
| `common/` | Anything genuinely shared across 2+ features. If only one feature uses it, it belongs inside that feature, not here. |
| `feature/*` | Vertical slices — each is close to self-contained (Part 3). |
| `integration/` | Isolates all outbound calls to third-party systems behind interfaces, so `feature/ai` calls `AiProviderClient`, not `OpenAiSdk` directly. |
| `scheduler/` | Cron-driven jobs (e.g., cleanup of expired tokens, usage-report generation) — kept separate so scheduled logic isn't hidden inside a service class that's also called synchronously. |
| `cache/` | Central place for cache region naming/TTL policy, so cache invalidation logic isn't duplicated per feature. |
| `events/` | Domain events (e.g., `ResumeCreatedEvent`) allowing features to react to each other (e.g., `audit` listens to events from `resume`) without direct coupling. |

**Why `common` is intentionally small:** a bloated `common`/`util` package is a common failure mode — it becomes a dumping ground and creates hidden coupling between every feature. The rule: something only moves into `common` after it's needed by a second feature, not in anticipation of being needed.

---

## PART 3 — Feature Module Organization

Each feature module follows the same internal shape:

```
feature/resume/
├── controller/
├── service/
├── service/impl/
├── repository/
├── entity/
├── dto/
│   ├── request/
│   └── response/
├── mapper/
├── validation/
└── exception/          # Feature-specific exceptions extending common base types
```

| Layer | Responsibility |
|---|---|
| Controller | HTTP mapping only — routes, status codes, delegates to service. |
| Service (interface) | Defines the feature's business capability contract. |
| Service/impl | Business logic implementation; the only place transactions and orchestration across repositories happen. |
| Repository | Spring Data JPA interfaces; no business logic. |
| Entity | Persistence model; never returned from a controller. |
| DTO | Request/response contracts, versioned independently of entities. |
| Mapper | Entity ↔ DTO conversion (e.g., MapStruct), isolated so services don't hand-roll mapping inline. |
| Validation | Feature-specific custom validators (e.g., resume section length rules) beyond simple Bean Validation annotations. |
| Exception | Feature-specific exceptions (`ResumeNotFoundException`) extending shared base exceptions from `common/exception`. |

### Independence rules
- **A feature package may depend on `common`, `security`, `integration`, and `events` — but not directly on another feature's `service.impl`, `repository`, or `entity`.**
- Cross-feature interaction happens through: (a) the other feature's **public service interface** (not impl), or (b) **domain events** for fire-and-forget reactions (e.g., `ai` completing a generation publishes an event; `notification` listens and emails the user).
- This rule is what makes future microservice extraction realistic — if `ai` never reaches into `resume`'s repository directly, extracting `ai` later doesn't require untangling database-level coupling.

### AI module specifics (`feature/ai`)
- Defines an `AiProvider` interface (`generateContent(prompt, context)`) with `OpenAiProviderAdapter` and `GeminiProviderAdapter` implementations living in `integration/`.
- Feature code depends on the interface only; provider selection is a configuration concern (Part 5), not a code branch scattered through business logic.

---

## PART 4 — Request Lifecycle

```
Client (React/Axios)
    │  HTTPS request + JWT bearer token
    ▼
Controller
    │  Deserialize JSON → Request DTO
    │  Trigger Bean Validation (@Valid)
    ▼
Service
    │  Business rules, orchestration, transaction boundary
    │  Calls Repository / Integration clients as needed
    ▼
Repository
    │  Translates to SQL via Hibernate/JPA
    ▼
Database (MySQL)
    │  Returns Entity/rows
    ▼
Service
    │  Applies business logic to results
    ▼
Mapper
    │  Entity → Response DTO
    ▼
Controller
    │  Wraps in standardized API response envelope (Part 6)
    ▼
Client
```

### Layer responsibilities and boundaries

| Layer | Should | Should never |
|---|---|---|
| Controller | Map routes, validate input shape, delegate, set HTTP status | Contain business logic, query the database directly, catch business exceptions silently |
| Service | Enforce business rules, coordinate repositories/integrations, define transaction boundaries | Know about `HttpServletRequest`/HTTP status codes, format JSON |
| Repository | Data access only | Contain business logic or call other repositories' business rules |
| Mapper | Pure data transformation | Contain validation or business logic |

---

## PART 5 — Configuration Strategy

```
config/
├── SecurityConfig.java        # Filter chain, JWT filter registration, RBAC rules
├── CorsConfig.java              # Allowed origins (frontend URL) per environment
├── JacksonConfig.java             # Date/time serialization, null handling policy
├── OpenApiConfig.java               # Swagger/OpenAPI doc generation config
├── AsyncConfig.java                   # Thread pool for @Async AI calls
├── SchedulingConfig.java                # Enables and configures @Scheduled jobs
├── CacheConfig.java                       # Cache manager, region definitions
└── DatabaseConfig.java                      # (mostly Spring Boot auto-config; explicit only if custom pooling needed)
```

| Config | Why it exists |
|---|---|
| Security | Central definition of which endpoints require auth/roles — must not be scattered as ad hoc checks inside controllers. |
| CORS | Frontend (Vercel) and backend (Render/AWS) are different origins; without explicit config, all browser requests fail. |
| Jackson | Prevents inconsistent JSON shape (e.g., date formats) across different DTOs written by different developers. |
| OpenAPI/Swagger | Auto-generates API documentation from code, keeping `API.md` and reality from drifting apart. |
| Environment Profiles | `dev`/`prod` properties (already defined in the setup guide) activated via `spring.profiles.active`, so behavior differences are declarative, not `if (env.equals("prod"))` in code. |
| Logging | Central logging pattern/level config so every module logs consistently (Part 9). |
| Async | AI calls are slow (seconds) — must run on a dedicated thread pool, not the request-handling pool, or the app starves under load. |
| Scheduling | Central `@EnableScheduling` + pool sizing, so cron jobs don't silently compete with request threads. |
| Caching | Central cache manager (e.g., for ATS scoring rules or job-matching reference data) so TTL/eviction policy is consistent. |

---

## PART 6 — DTO Strategy

### Why entities must never be exposed directly
- **Leaks internal schema** — renaming a database column shouldn't break the frontend contract.
- **Lazy-loading exceptions** — serializing an unfetched JPA relationship directly throws `LazyInitializationException` or accidentally triggers N+1 queries during JSON serialization.
- **Over-exposure** — an entity may carry fields (password hash, internal flags) that must never leave the server.
- **Contract stability** — a DTO can stay stable across schema refactors; an entity cannot.

### DTO categories
| DTO type | Purpose |
|---|---|
| Request DTO | Shape of incoming data (`CreateResumeRequest`) — validated with Bean Validation. |
| Response DTO | Shape of outgoing data (`ResumeResponse`) — only fields the client needs. |
| Error DTO | Standardized shape for all error responses (Part 7). |
| Pagination DTO | Wraps list responses with `page`, `size`, `totalElements`, `totalPages`. |
| Generic API Response | Envelope wrapping every response: `{ success, data, error, timestamp }` — gives the frontend one consistent shape to parse regardless of endpoint. |

**Rule:** one request DTO and one response DTO per meaningful operation, even if they're currently identical in shape — they evolve independently over time, and starting separate avoids a breaking-change refactor later.

---

## PART 7 — Exception Handling

```
common/exception/
├── GlobalExceptionHandler.java     # @ControllerAdvice — single place all exceptions are translated to responses
├── BaseException.java                # Root of custom hierarchy, carries an error code
├── ResourceNotFoundException.java
├── ValidationException.java
├── AuthenticationException.java
├── AuthorizationException.java
├── ConflictException.java
└── ExternalServiceException.java    # For AI provider/integration failures
```

| Exception | Maps to HTTP | Example trigger |
|---|---|---|
| `ResourceNotFoundException` | 404 | Resume ID doesn't exist |
| `ValidationException` | 400 | Bean Validation failure aggregation |
| `AuthenticationException` | 401 | Invalid/expired JWT |
| `AuthorizationException` | 403 | Valid user, insufficient role |
| `ConflictException` | 409 | Duplicate email on registration |
| `ExternalServiceException` | 502/504 | AI provider timeout or error |
| Unhandled `Exception` | 500 | Caught as a last-resort fallback in the global handler; never leaks stack traces to the client |

### Standardized error response shape (conceptual)
```
{
  success: false,
  error: {
    code: "RESUME_NOT_FOUND",
    message: "human-readable message",
    details: [ ... field-level validation errors, if any ... ]
  },
  timestamp: "..."
}
```
All exceptions funnel through **one** `GlobalExceptionHandler` — no controller ever has its own local `try/catch` for expected business errors; it throws, and the handler translates.

---

## PART 8 — Validation Strategy

| Validation type | Where it belongs |
|---|---|
| Field-level shape (`@NotBlank`, `@Email`, `@Size`) | Bean Validation annotations directly on Request DTOs. |
| Cross-field rules within one DTO (e.g., "end date must be after start date") | Custom class-level validator annotation on the DTO. |
| Business rules requiring a database lookup (e.g., "email must be unique") | Service layer — Bean Validation cannot query the database, and shouldn't. |
| Cross-feature rules (e.g., "user must have an active subscription to use AI") | Service layer, via the relevant feature's service interface. |

**Rule of thumb:** if validating the field requires only the data already in the request, it's Bean Validation. If it requires state from the database or another feature, it's service-layer validation. Controllers never contain validation logic beyond triggering `@Valid`.

---

## PART 9 — Logging Strategy

### Log levels
| Level | Use |
|---|---|
| ERROR | Unhandled exceptions, failed external calls after retries exhausted |
| WARN | Recoverable issues (e.g., AI provider fallback triggered, retry succeeded) |
| INFO | Key business events (user registered, resume created, AI generation completed) |
| DEBUG | Detailed flow useful in dev only — disabled in prod by profile config |

### Structured logging
Logs emitted as structured JSON (not free-text) in production, so they're queryable by log aggregation tools (e.g., filter by `userId`, `feature`, `requestId`) rather than grep'd manually.

### Correlation IDs
Every incoming request is assigned a correlation/request ID (via a filter, stored in MDC) that's attached to every log line for that request — essential for tracing one user's request across controller → service → AI integration call in production logs.

### Audit logs
Separate, append-only log stream (`feature/audit`) recording *who did what to which resource and when* (resume edits, admin actions) — distinct from application debug logs, and typically retained longer for compliance/support purposes.

### Security logs
Authentication attempts (success/failure), token refresh events, authorization denials — logged separately so suspicious patterns (repeated failed logins) are easy to monitor without wading through general app logs.

### AI request logs
Log that a generation request occurred, which provider, latency, token usage, and success/failure — **never** the full prompt/response content by default, since resumes contain personal data (Part 9 "never log" rule below).

### What must never be logged
- Passwords (even hashed, in most cases)
- JWT tokens or refresh tokens
- Full resume content / personal data (names, addresses, phone numbers) in plain application logs
- API keys/secrets for AI providers
- Full request/response bodies of authentication endpoints

---

## PART 10 — Design Patterns

| Pattern | Where it fits |
|---|---|
| **Strategy** | `AiProvider` interface with `OpenAiProviderAdapter`/`GeminiProviderAdapter` — swap providers without changing calling code. |
| **Factory** | `AiProviderFactory` selects the correct provider implementation based on config/user preference at runtime. |
| **Builder** | Constructing complex DTOs/entities with many optional fields (e.g., a `Resume` with many optional sections) without telescoping constructors. |
| **Adapter** | `integration/` layer wraps third-party SDKs (OpenAI SDK, Gemini SDK, email provider SDK) behind our own interfaces, isolating the app from SDK-specific APIs. |
| **Template Method** | A base PDF export/rendering flow (fetch data → apply template → render) with template-specific steps overridden per resume template. |
| **Observer (via Spring Events)** | `events/` package — e.g., `ResumeCreatedEvent` triggers audit logging and welcome-flow notifications without `resume` service directly calling `audit`/`notification` services. |
| **Dependency Injection** | Used throughout via Spring's constructor injection — enables testability (mocking dependencies) and enforces the "depend on interfaces, not implementations" rule across all service boundaries. |

---

## PART 11 — Scalability

| Scale | Considerations |
|---|---|
| **~100 users** | Single instance, single MySQL instance, no caching needed. Focus is correctness, not performance. |
| **~10,000 users** | Introduce connection pooling tuning (HikariCP defaults reviewed), add caching (Part 5) for read-heavy, rarely-changing data (e.g., ATS scoring rules, resume templates). Move AI calls fully to `@Async` so slow provider responses don't block request threads. Add database indexes on frequently-queried columns (documented in `Database.md`, not implemented here). |
| **~1,000,000 users** | Horizontal scaling of the backend (multiple stateless instances behind a load balancer) — enabled by the JWT-stateless design chosen from day one. Read replicas for MySQL to offload read-heavy queries. Extract the highest-load modules (AI, PDF generation) into independently-scaled services, per Part 1. Introduce a message queue (e.g., for AI generation jobs) so spikes in demand queue rather than overwhelm the API layer. CDN for static frontend assets (already implied by Vercel deployment). |

**Principle:** design decisions made now (statelessness, async AI calls, modular boundaries, caching config already scaffolded) mean scaling later is a matter of *adding infrastructure*, not *rewriting code*.

---

## PART 12 — Security Considerations

| Concern | Architectural approach |
|---|---|
| JWT | Stateless bearer tokens signed with a strong secret/key, short expiry, validated on every request via a security filter in `security/`. |
| Refresh Tokens | Longer-lived, stored securely (httpOnly cookie or secure storage), used only to mint new access tokens via a dedicated endpoint — never used directly as an access token. |
| RBAC | Roles (`USER`, `ADMIN`) enforced via method-level `@PreAuthorize` and centrally defined in `SecurityConfig`, not scattered `if` checks in controllers. |
| Password Encryption | BCrypt (or equivalent) via Spring Security's `PasswordEncoder` — plaintext passwords never touch the database or logs. |
| Rate Limiting | Applied at the gateway/filter level (e.g., per-IP or per-user limits on auth and AI endpoints specifically, since AI calls are costly and abuse-prone). |
| Input Validation | Enforced at the DTO boundary (Part 8) before any data reaches business logic — prevents malformed/malicious input from propagating. |
| CORS | Explicit allow-list of the frontend's origin(s) per environment — never `*` in production. |
| CSRF | Not applicable in the traditional sense since this is a stateless JWT API (no cookie-based session), but any cookie-stored refresh token requires CSRF-safe handling (`SameSite` cookie attributes). |
| Secure API design | Every endpoint's auth/role requirement explicitly declared, never assumed; sensitive endpoints (AI usage, admin) get extra scrutiny in code review per `Contributing.md`. |

---

## PART 13 — Backend Development Rules

| Rule | Standard |
|---|---|
| Package naming | all lowercase, singular (`feature.resume`, not `feature.resumes`) |
| Class naming | `PascalCase`, suffix reflects role (`ResumeService`, `ResumeServiceImpl`, `ResumeController`, `ResumeRequest`, `ResumeResponse`, `ResumeMapper`) |
| Method naming | `camelCase`, verb-first (`createResume`, `findById`, `mapToResponse`) |
| Service responsibilities | Own business logic and transaction boundaries; depend on repository/integration interfaces, never on other features' impl classes |
| Controller responsibilities | Thin — mapping, validation trigger, delegation only |
| Repository responsibilities | Data access only, Spring Data JPA method-naming conventions or `@Query` when needed, no business logic |
| Dependency Injection | Constructor injection only (never field injection) — required for testability and immutability |
| Transaction management | `@Transactional` declared at the service layer, at the boundary of one business operation — never in controllers or repositories |
| Documentation | Public service interfaces documented with Javadoc explaining the contract, not the implementation |
| Testing expectations | Every service method has at least one unit test (mocked dependencies); critical flows (auth, payment) get integration tests against a test database |

---

## PART 14 — Common Architecture Mistakes

| # | Mistake | Why harmful | Impact | Correct approach |
|---|---|---|---|---|
| 1 | Exposing JPA entities directly in controllers | Leaks schema, causes lazy-loading exceptions | Broken API contracts, serialization crashes | Always map to DTOs (Part 6) |
| 2 | Fat controllers with business logic | Untestable without HTTP context | Bugs, duplicated logic across endpoints | Move logic to services |
| 3 | Field injection (`@Autowired` on fields) | Hides dependencies, hard to test | Fragile unit tests, hidden coupling | Constructor injection only |
| 4 | No global exception handler | Inconsistent error responses per controller | Frontend can't parse errors reliably | Centralized `@ControllerAdvice` |
| 5 | Business logic in repositories | Mixes data access and rules | Hard to reuse, hard to test | Keep repositories query-only |
| 6 | `@Transactional` misuse (missing, or too broad) | Data inconsistency, or long-held locks | Corrupted state or DB contention | Transaction boundary = one business operation, at service layer |
| 7 | Catching generic `Exception` and swallowing it | Hides real failures | Silent data corruption, invisible bugs | Catch specific exceptions, let others propagate to global handler |
| 8 | Hardcoded secrets in `application.properties` | Secrets committed to Git | Security breach | Externalize via environment variables (Setup Guide, Part 7) |
| 9 | No DTO versioning discipline (reusing entities as both request/response) | Breaking changes ripple unpredictably | Frontend/backend contract breaks silently | Explicit, separate Request/Response DTOs |
| 10 | God service classes handling multiple features | Violates single responsibility | Impossible to test or extract later | One service per feature/capability |
| 11 | N+1 query problems from lazy-loaded collections serialized directly | Severe performance degradation | Slow endpoints, DB overload at scale | DTO projection, explicit fetch joins where needed |
| 12 | No pagination on list endpoints | Unbounded result sets | OOM errors, slow responses at scale | Pagination DTO on every list endpoint |
| 13 | Synchronous AI calls blocking request threads | Thread pool exhaustion under load | App-wide slowdown from one slow AI provider | `@Async` execution (Part 5, Part 11) |
| 14 | No correlation/request IDs in logs | Impossible to trace one request's flow | Debugging production issues becomes guesswork | MDC-based correlation ID (Part 9) |
| 15 | Logging sensitive data (passwords, tokens, PII) | Security/compliance violation | Data breach liability | Explicit "never log" list enforced in code review |
| 16 | No environment separation (same properties for dev/prod) | Dev settings leak into prod or vice versa | Debug logging in prod, or prod DB used locally | `application-{profile}.properties` (Setup Guide, Part 7) |
| 17 | Circular dependencies between feature services | Tight coupling, startup failures | Impossible to extract into microservices later | Communicate via public interfaces or events only (Part 3) |
| 18 | No input validation beyond "it compiles" | Malformed/malicious data reaches business logic | Data corruption, security vulnerabilities | Bean Validation + custom validators (Part 8) |
| 19 | Manually writing entity-to-DTO mapping inline in services | Duplicated, error-prone, clutters business logic | Inconsistent mapping, hard-to-spot bugs | Dedicated mapper classes (Part 3) |
| 20 | No RBAC enforcement at the method level | Relying only on frontend to hide admin features | Privilege escalation vulnerability | `@PreAuthorize` enforced server-side always |
| 21 | Overusing `@Component`/service-locator patterns instead of DI | Hidden runtime dependencies | Hard to reason about object graph | Explicit constructor-injected dependencies |
| 22 | Ignoring idempotency on retried operations (e.g., duplicate resume creation on network retry) | Data duplication | Corrupted user data | Idempotency keys or unique constraints where relevant |
| 23 | Tight coupling to a single AI provider's SDK types throughout the codebase | Impossible to switch providers without a rewrite | Vendor lock-in, contradicts project requirement | Strategy/Adapter pattern (Part 10) |
| 24 | No rate limiting on expensive endpoints (AI, PDF export) | Abuse or accidental overload drains cost/resources | Runaway cloud/AI provider bills | Rate limiting at gateway/filter level (Part 12) |
| 25 | Skipping tests on "simple" CRUD services because they seem obvious | False confidence | Regressions slip through as the "simple" service grows complex | Testing policy applies uniformly (Part 13) |
| 26 | Mixing configuration values with code logic (e.g., `if (profile.equals("prod"))`) | Behavior branches hidden in business code | Hard to audit environment-specific behavior | Externalize via Spring profiles/config beans (Part 5) |
| 27 | No standardized API response envelope | Every endpoint shaped differently | Frontend needs custom parsing per endpoint | Generic API Response wrapper (Part 6) |

---

## Summary

This architecture is deliberately **feature-first, layer-internal, interface-driven, and stateless** — chosen so the project can grow from 100 to 1,000,000 users, and from one AI provider to several features (Part 10 of the setup guide) without requiring a rewrite, only additive changes within the boundaries already defined here.

Before any developer writes the first controller, they should be able to point to the exact package their code belongs in, and the exact layer responsible for each decision they're about to make.
