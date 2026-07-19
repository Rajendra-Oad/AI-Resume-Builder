# AI Resume Builder — Authentication & Security Architecture Blueprint

**Audience:** Backend, Frontend, QA, DevOps
**Status:** Architectural specification — no implementation code included
**Stack context:** Java 21 / Spring Boot / Spring Security / JWT / MySQL / React 19 / Docker

---

## 1. Authentication Philosophy

### 1.1 Authentication vs Authorization

| | Authentication (AuthN) | Authorization (AuthZ) |
|---|---|---|
| Question | "Who are you?" | "What are you allowed to do?" |
| Input | Credentials (password, OAuth token, biometric) | Identity + Roles/Permissions |
| Output | A verified identity (principal) | An access decision (allow/deny) |
| Failure mode | 401 Unauthorized | 403 Forbidden |
| Layer | Identity layer | Policy/decision layer |

These must be architecturally **decoupled**. Authentication produces a `SecurityContext` (a verified principal). Authorization is a separate decision engine that consumes that context plus resource metadata (ownership, role, plan tier) to decide access. Coupling them (e.g., baking role checks into the login flow) is a common design mistake that makes RBAC/ABAC expansion painful later.

### 1.2 Identity vs Permissions

- **Identity** = the durable "who" — user ID, email, account status. Rarely changes.
- **Permissions** = the "what can they do" — derived from roles, subscription tier, and resource ownership. Changes frequently (upgrades, downgrades, admin promotions).

Design implication: identity belongs in the token as a stable claim (`sub`); permissions should be **resolved at authorization time from the database/cache**, not frozen into a long-lived token, or they go stale (e.g., a demoted admin keeps admin access until token expiry).

### 1.3 Stateless vs Stateful Authentication

| | Stateless (JWT) | Stateful (Server Session) |
|---|---|---|
| Server storage | None (or minimal — revocation list) | Session store required (Redis/DB) |
| Horizontal scaling | Trivial | Needs sticky sessions or shared store |
| Revocation | Hard (needs denylist) | Instant |
| Mobile/SPA friendliness | High | Lower (cookie-centric) |
| Microservice friendliness | High (token passed downstream) | Low (needs session lookup per service) |

### 1.4 Why JWT Is Appropriate Here

- React SPA + future mobile clients + future API clients (job boards, ATS integrations) all favor a **bearer-token, stateless** model.
- Future roadmap includes API Clients and third-party integrations — JWTs are the natural fit for service-to-service and public API auth.
- Horizontal scaling on Render/AWS with multiple backend instances is simpler without sticky sessions.

### 1.5 Trade-offs of JWT

- Revocation is not instant unless you maintain a denylist/short expiry.
- Token size grows with claims — keep access tokens lean.
- If stored insecurely on the frontend, they're vulnerable to XSS-based theft.
- Requires careful signing-key management and rotation strategy.

### 1.6 When Sessions Would Be Preferable

- If the product were server-rendered (not the case here).
- If instant, centralized revocation was the top priority over scaling (e.g., banking).
- If there were no plans for mobile apps or third-party API consumers.

### 1.7 Recommendation

**Hybrid stateless-JWT model**:
- Short-lived **access token** (JWT, stateless, 10–15 min).
- Long-lived **refresh token** (opaque or JWT, stored server-side/hashed, rotated on use).
- This gives JWT's scaling benefits while retaining session-like revocation control through the refresh-token store.

---

## 2. User Identity Model

### 2.1 Conceptual Entities

```
User
 ├── Identity (id, email, status, createdAt)
 ├── Credentials (passwordHash, lastPasswordChange)
 ├── Roles[] (e.g., USER, ADMIN, RECRUITER)
 ├── Permissions[] (derived from Role + Plan + Ownership)
 ├── Claims (issued into JWT: sub, roles, plan, sessionId)
 ├── Ownership (resumes, cover letters, shared links)
 ├── AccountStatus (PENDING_VERIFICATION, ACTIVE, LOCKED, DEACTIVATED, DELETED)
 └── Lifecycle timestamps (createdAt, verifiedAt, lastLoginAt, deactivatedAt)
```

### 2.2 Roles vs Permissions vs Privileges vs Claims

- **Role** — a named bundle of permissions (`USER`, `ADMIN`, `RECRUITER`, `PREMIUM_USER`, `GUEST`, `API_CLIENT`). Coarse-grained.
- **Permission** — a specific allowed action (`resume:create`, `resume:delete:own`, `admin:users:manage`, `job:post`). Fine-grained, ideally modeled independently of role so roles are just permission sets.
- **Privilege** — often used interchangeably with permission; in this design, treat privilege as a *runtime-elevated capability* (e.g., "currently impersonating a user" for support), distinct from a standing permission.
- **Claim** — a piece of identity/authorization data embedded in the JWT (`sub`, `roles`, `plan`, `email_verified`). Claims are a **cache** of authorization-relevant facts at token-issuance time, not the source of truth.

### 2.3 Ownership Model

Every resource (resume, cover letter, shared link) has an `ownerId`. Authorization for resource-level actions is **ownership-first**: `isOwner(user, resource) OR hasRole(ADMIN)`. This is the foundation for ABAC expansion later (e.g., team/collaboration features).

### 2.4 Account Status Lifecycle

```
REGISTERED (unverified) → ACTIVE → [LOCKED ⇄ ACTIVE] → DEACTIVATED → DELETED
                                         ↑
                                  (failed logins / admin action)
```

### 2.5 Future Role Expansion

| Role | Notes |
|---|---|
| `GUEST` | Unauthenticated or anonymous session — limited to preview/demo features |
| `USER` | Standard authenticated user, base permission set |
| `PREMIUM_USER` | `USER` + feature-gated permissions (AI generation limits lifted, ATS checker, etc.) — modeled as an **entitlement**, not a hardcoded role check |
| `RECRUITER` | Distinct permission set: job posting, candidate search, resume visibility into shared/opted-in profiles |
| `ADMIN` | Full platform management, user lifecycle control, audit visibility |
| `API_CLIENT` | Machine identity, scoped permissions, no password — API-key/OAuth2 client-credentials issued |

Design principle: **roles are not hardcoded gates**. Store permissions in a `role_permission` mapping conceptually, so adding `RECRUITER` later doesn't require touching every authorization check — only the mapping.

---

## 3. Authentication Lifecycle

### 3.1 Registration → Verification

```
User submits email+password
        │
        ▼
Validate input (format, password policy, uniqueness)
        │
        ▼
Hash password (bcrypt/Argon2) → persist User (status = PENDING_VERIFICATION)
        │
        ▼
Generate verification token (short-lived, single-use) → email link
        │
        ▼
User clicks link → status = ACTIVE
```

### 3.2 Login → Token Issuance

```
User submits credentials
        │
        ▼
Verify status != LOCKED/DEACTIVATED/DELETED
        │
        ▼
Verify password hash match
        │
        ▼
Issue Access Token (JWT, short TTL) + Refresh Token (long TTL, stored hashed server-side)
        │
        ▼
Record login event (audit) → return tokens to client
```

### 3.3 Authenticated Requests

```
Client → Authorization: Bearer <access token>
        │
        ▼
Filter validates signature + expiry + claims
        │
        ▼
SecurityContext populated → Authorization layer checks permission
        │
        ▼
Request proceeds or 403
```

### 3.4 Token Expiration & Refresh

```
Access token expires (401 on next request)
        │
        ▼
Client silently calls /refresh with refresh token
        │
        ▼
Server validates refresh token (not revoked, not expired, matches stored hash)
        │
        ▼
Issue NEW access token + ROTATE refresh token (old one invalidated)
```

### 3.5 Logout

```
Client discards access token (client-side)
        │
        ▼
Server revokes/deletes the refresh token record
        │
        ▼
(Optional) Access token added to short-lived denylist if immediate revocation required
```

### 3.6 Password Change / Reset / Account Recovery

- **Password change** (logged in): re-verify current password → update hash → **invalidate all existing refresh tokens** (force re-login on other devices) → audit event.
- **Password reset** (forgot password): generate single-use, short-lived reset token → email → verify token → set new password → invalidate all sessions.
- **Account recovery**: fallback path (secondary email / support-assisted) for cases where email access is lost — always paired with manual identity verification and heavy audit logging.

### 3.7 Deactivation vs Deletion

- **Deactivation**: reversible, status flag flip, data retained, all tokens revoked, login blocked with a "reactivate" path.
- **Deletion**: user-initiated erasure request → soft-delete window (e.g., 30 days) for recovery → hard delete/anonymization for compliance (GDPR-style "right to be forgotten"), with owned resources cascade-handled (deleted or anonymized).

---

## 4. JWT Architecture

### 4.1 Token Types

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access Token | 10–15 min | Memory (frontend) — never localStorage | Authorizes API calls |
| Refresh Token | 7–30 days | HttpOnly, Secure, SameSite cookie *or* server-side record keyed to device | Mints new access tokens |

### 4.2 Claims Design (Access Token)

Minimal, non-sensitive, authorization-relevant only:
- `sub` (user ID)
- `roles` (coarse role list)
- `plan` (free/premium tier, for quick UI gating — **never trust this alone for server-side authorization**)
- `sessionId` / `jti` (unique token ID — enables targeted revocation)
- `iat`, `exp`, `iss`, `aud`

Never place: password hash, full PII, permanent permission lists (these should be resolved server-side per-request for anything sensitive).

### 4.3 Expiration Strategy

- Access: short (minimizes theft window).
- Refresh: longer, but **rotated on every use** (rotation-on-use = old refresh token immediately invalidated, detects token replay if an old one is reused → treated as a theft signal → revoke entire token family).

### 4.4 Signing

- Asymmetric signing (RS256/ES256) preferred over HMAC (HS256) once there are multiple services or the frontend/other services need to verify tokens without holding the signing secret — private key stays with the auth service, public key distributed for verification.
- Key rotation strategy: support multiple active `kid` (key ID) values so old tokens remain verifiable during rotation windows.

### 4.5 Validation

Every request: signature check → expiry check → issuer/audience check → (optional) denylist/revocation check → claims parsed into `SecurityContext`.

### 4.6 Rotation & Revocation

- Refresh tokens: rotated every use, stored hashed, one active family per device/session.
- Access tokens: not revocable individually without a denylist; mitigated by short TTL.
- **Denylist** (Redis, TTL = remaining token life): used only for high-severity events (logout-everywhere, compromised account, admin force-logout) — not for routine logout, to avoid unnecessary state.

### 4.7 Multi-Device Support (Future)

Model refresh tokens as **one row per device/session**, not one per user:

```
User ──< Sessions (deviceId, refreshTokenHash, createdAt, lastUsedAt, ip, userAgent)
```

This enables "manage active sessions," "log out this device," and "log out everywhere" as future features without redesign.

### 4.8 Trade-offs Summary

| Decision | Benefit | Cost |
|---|---|---|
| Short access TTL | Limits theft window | More refresh calls |
| Refresh rotation | Detects replay/theft | Slightly more DB writes |
| Asymmetric signing | Safe multi-service verification | Key management overhead |
| Per-device sessions | Rich device management UX | More storage/complexity |

---

## 5. Authorization Model

### 5.1 Layered Model: RBAC → ABAC-ready

- **Baseline**: Role-Based Access Control (`ADMIN`, `USER`, `RECRUITER`, `PREMIUM_USER`, `API_CLIENT`).
- **Resource layer**: Ownership check on top of role (`resume:edit` requires `isOwner OR ADMIN`).
- **Attribute layer (future)**: plan tier, feature flags, team membership — enables ABAC without replacing the RBAC core (e.g., "allow if role=USER AND plan=PREMIUM AND feature.atsChecker=enabled").

### 5.2 Permission Model (conceptual)

```
Permission = (action, resourceType, scope)
e.g. ("create", "resume", "own")
     ("delete", "resume", "any")     -- admin only
     ("post", "job", "own")          -- recruiter
     ("view", "analytics", "own")    -- premium
```

Roles map to permission *sets*; authorization checks against permissions, never against role names directly in business logic — this indirection is what makes adding `RECRUITER` or new premium tiers non-breaking.

### 5.3 Feature/Premium Gating

Treat premium features as **entitlements** resolved server-side per request (from subscription status in DB/cache), not from a JWT claim alone — subscriptions can lapse mid-token-life (e.g., payment failure) and access must reflect that promptly.

### 5.4 Admin Access

Admin actions (role changes, user lockout, content moderation) require:
- `ADMIN` role check, AND
- Step-up consideration for highly sensitive actions (see MFA in Part 11), AND
- Mandatory audit logging (Part 10).

### 5.5 Extensibility

New roles/permissions should be addable via configuration/data (role_permission mapping), not new code paths — critical given the long future-feature roadmap (Job Matching, Collaboration, Analytics all imply new permission types).

---

## 6. Frontend Security (React 19)

### 6.1 Route Guards

- **Protected routes**: require valid access token + role/permission check before rendering; unauthenticated → redirect to login, preserving intended destination.
- **Guest routes**: (login/register) redirect away if already authenticated.
- Route guards should check both authentication *and* authorization (e.g., `/admin` guarded by role, not just login status).

### 6.2 Token Storage

| Option | XSS Risk | CSRF Risk | Recommendation |
|---|---|---|---|
| `localStorage` | High (readable by any injected script) | None | Avoid for access tokens |
| In-memory (JS variable/React state) | Low (lost on refresh, by design) | None | **Access token: yes** |
| HttpOnly Secure cookie | Not directly readable by JS | Needs CSRF defenses | **Refresh token: yes** |

Recommended split: access token in memory only (re-fetched via silent refresh on page load); refresh token in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie.

### 6.3 Token Refresh Flow (Frontend)

- Axios interceptor: on `401`, attempt silent `/refresh` call once → retry original request → if refresh fails, force logout + redirect to login.
- Use a request queue/mutex during refresh to avoid a stampede of parallel refresh calls when several requests 401 simultaneously.

### 6.4 Session Expiration UX

- Proactive expiry warning before access-token expiry (optional).
- Graceful forced logout with a clear message when refresh fails, rather than a silent broken UI.

### 6.5 Multi-Tab Behavior

- Since access tokens live in memory (per tab), use `BroadcastChannel` or `storage` events to synchronize logout across tabs (e.g., logging out in one tab should log out all tabs).
- Refresh-token cookie is shared across tabs automatically (browser cookie jar), so a refresh in one tab should broadcast the new auth state to others.

### 6.6 Logout Flow

Frontend clears in-memory token + broadcasts logout event → calls backend logout (revokes refresh token/cookie) → redirects to login.

### 6.7 Frontend Security Considerations

- Sanitize any user-generated content rendered (resume content, cover letters) to prevent stored XSS.
- Never log tokens to console/analytics.
- CSP headers (Part 9) reduce blast radius of any injected script even with in-memory tokens.

---

## 7. Backend Security (Spring Boot / Spring Security — architecture only)

### 7.1 Filter Chain (Conceptual)

```
Request
  → HTTPS enforcement
  → CORS filter
  → Rate limiting filter
  → JWT extraction & validation filter
  → SecurityContext population
  → Authorization filter (role/permission check)
  → Input validation layer
  → Controller
  → Global exception handler
```

### 7.2 Authentication Flow (Backend)

Credential validation is isolated to a dedicated authentication service layer; controllers never touch password hashes directly. On success, a token-issuance service (separate from the authentication check) creates access/refresh tokens — keeping "verify identity" and "issue credentials" as distinct responsibilities.

### 7.3 Authorization Flow

Method- or endpoint-level authorization checks resolve permissions from the authenticated principal at request time (not solely from stale JWT claims) for sensitive operations — balancing performance (cheap claims-based checks for coarse routes) against correctness (DB-backed checks for sensitive/ownership-based actions).

### 7.4 Validation Layers

- **Transport**: HTTPS only.
- **Request shape**: schema/DTO validation (required fields, types, length limits) before business logic runs.
- **Business rules**: ownership, state transitions (e.g., can't reactivate a deleted account).
- **Output**: never leak internal fields (password hash, internal IDs where inappropriate) in responses.

### 7.5 Exception Handling

Centralized exception handler translates internal errors into **generic, non-leaking** responses (Part 9.11) while logging full detail server-side only. Distinguish authentication failures (401) from authorization failures (403) from validation failures (400) consistently across the API.

### 7.6 Security Context Propagation

For any async processing (e.g., AI resume generation jobs), the security context must be explicitly propagated to worker threads — a common gap where background jobs silently run without proper authorization checks.

---

## 8. Password Security

### 8.1 Hashing

- Adaptive hashing algorithm (bcrypt or Argon2id), never MD5/SHA-family alone, never reversible encryption.
- Per-password unique salt (handled automatically by bcrypt/Argon2).
- Configurable work factor, revisited periodically as hardware improves.

### 8.2 Password Policies

- Minimum length (favor length over complexity rules — e.g., 12+ characters) over forced special-character gymnastics that push users toward predictable patterns.
- Check against breached-password lists (e.g., Have I Been Pwned range API) at registration/change time.
- No mandatory periodic rotation without cause (modern guidance: rotate on evidence of compromise, not on a calendar).

### 8.3 Account Lockout / Brute Force Protection

- Progressive delay or temporary lockout after N failed attempts (e.g., exponential backoff), scoped per-account and per-IP to avoid trivial bypass.
- CAPTCHA or equivalent challenge after repeated failures.

### 8.4 Credential Stuffing Protection

- Rate-limit login endpoint aggressively.
- Detect anomalous login patterns (many accounts, same IP/device fingerprint) for monitoring/blocking.
- Encourage MFA adoption (Part 11) as the strongest mitigation.

---

## 9. API Security

| Concern | Architectural Control |
|---|---|
| HTTPS | Enforced everywhere; HSTS header; no plaintext fallback |
| CORS | Explicit allow-list of frontend origins; no wildcard `*` with credentials |
| CSRF | Primarily mitigated by bearer-token-in-header design (not cookie-auth for state-changing calls); if refresh cookie is used, `SameSite=Strict`/CSRF token for the refresh endpoint |
| XSS | Output encoding, CSP headers, sanitize user-generated resume/cover-letter content |
| Injection | Parameterized queries/ORM only, never string-concatenated SQL |
| Rate Limiting | Per-IP and per-account limits, stricter on auth endpoints |
| Input Validation | Schema validation at the edge, whitelist over blacklist |
| Request Size Limits | Cap payload size (especially file/resume uploads) |
| Secure Headers | `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` |
| Replay Attacks | Short-lived tokens, `jti` tracking for sensitive one-time actions (password reset, email verification) |

---

## 10. Audit & Monitoring

### 10.1 Events to Track

- Successful/failed logins (with IP, device, timestamp)
- Password changes/resets
- Role/permission changes
- Account status changes (lock, deactivate, delete)
- Admin actions (any action on another user's data)
- Token issuance/refresh/revocation
- Security-relevant errors (repeated 401/403, validation attacks)

### 10.2 Design Principles

- Audit logs are **append-only** and stored separately from operational data (tamper resistance).
- Never log sensitive values (passwords, full tokens) — log token IDs (`jti`), not the token itself.
- Retention: align with compliance needs (e.g., 90 days hot, longer cold storage for security events); define explicit retention policy per event category.
- Feed high-severity events (repeated failed logins, privilege escalation attempts) into alerting, not just passive storage.

---

## 11. Future Authentication Extensibility

The core model (identity + roles/permissions + JWT session layer) is designed so these integrate **without redesign**:

- **OAuth2/OIDC social login** (Google, GitHub, LinkedIn, Microsoft): treated as alternate credential-verification methods that resolve to the *same* internal `User` identity — a user can link multiple providers to one account.
- **MFA**: modeled as an additional verification step *after* primary credential check, before token issuance — fits into the existing lifecycle without changing token structure (add an `amr`/`mfa` claim).
- **Biometric / Passkeys (WebAuthn)**: another credential-verification method feeding the same "verified identity → issue tokens" pipeline.
- **SSO / Enterprise IdPs (SAML/OIDC)**: for future B2B/recruiter-org customers — federated identity resolves to internal user records via a trusted-issuer mapping, still producing the same internal JWT afterward.

This works because **credential verification is architecturally separate from token issuance** — any new verification method just needs to plug into the same "produce a verified principal" contract.

---

## 12. Threat Model

| Threat | Risk | Impact | Mitigation |
|---|---|---|---|
| Broken Authentication | High | Full account takeover | Strong hashing, MFA-ready design, lockout policy |
| Privilege Escalation | High | Unauthorized admin access | Server-side permission resolution, ownership checks, audit |
| Session Hijacking | Med | Account takeover | Short access TTL, HttpOnly refresh cookie, device binding |
| JWT Theft | Med-High | Impersonation until expiry | Short TTL, in-memory storage, CSP/XSS defenses |
| Replay Attacks | Med | Reuse of stolen tokens | `jti` tracking, refresh rotation with reuse detection |
| Token Leakage (logs/URLs) | Med | Credential exposure | Never put tokens in URLs/logs, header-only transmission |
| Brute Force | Med | Account compromise | Lockout, rate limiting, CAPTCHA |
| Enumeration (register/login/reset) | Low-Med | Reveals valid accounts | Generic error messages, consistent response timing |
| CSRF | Low (bearer-token design) | State-changing actions forged | SameSite cookies, CSRF token on cookie-auth endpoints |
| XSS | High | Token theft, account takeover | CSP, output encoding, sanitization, no localStorage tokens |
| SQL Injection | High | Data breach | ORM/parameterized queries only |
| Insider Threats | Med | Data misuse, unauthorized access | Least privilege, audit logging, admin action review |

---

## 13. Security Standards (Development Rules)

**Password Rules**
- Adaptive hashing only; minimum length policy; breached-password check at signup.

**Authentication Rules**
- All credential verification centralized in one service layer; no ad-hoc auth checks in controllers.

**Authorization Rules**
- All access decisions go through the permission layer; no role-name string comparisons scattered in business logic.

**Secure Coding Rules**
- Parameterized queries only; validate all input at the boundary; never trust client-supplied role/permission data.

**Logging Rules**
- No secrets, tokens, or passwords in logs; structured logs with correlation IDs; separate audit log stream.

**Error Message Rules**
- Generic external messages ("Invalid credentials"); detailed internal logs; no stack traces returned to clients.

**Secret Management**
- Signing keys, DB credentials, API keys in a secrets manager/env-injected, never committed to source control; rotate on schedule and on suspected compromise.

**Configuration Rules**
- Environment-specific configs (dev/staging/prod) strictly separated; production secrets never present in lower environments.

**Code Review Checklist (Security)**
- [ ] New endpoint has explicit authorization check
- [ ] No sensitive data in JWT claims
- [ ] No sensitive data logged
- [ ] Input validated/sanitized
- [ ] Ownership check present for resource access
- [ ] Errors don't leak internal detail
- [ ] Rate limiting considered for new public endpoints

---

## 14. Common Security Mistakes (Selected, High-Value Set)

| # | Mistake | Why It Happens | Why Dangerous | Professional Fix |
|---|---|---|---|---|
| 1 | Storing JWT in `localStorage` | Convenience, common tutorials | Readable by any XSS payload | In-memory access token + HttpOnly refresh cookie |
| 2 | Long-lived access tokens | Avoiding refresh-flow complexity | Large theft window | Short TTL + refresh rotation |
| 3 | Putting permissions/PII in JWT | Avoids DB lookups | Stale/leaked authorization data | Resolve sensitive permissions server-side |
| 4 | No refresh-token rotation | Simpler to implement | Stolen refresh token works indefinitely | Rotate + reuse-detection |
| 5 | Weak/no rate limiting on login | Overlooked until abused | Enables brute force/credential stuffing | Rate limit + lockout + CAPTCHA |
| 6 | Verbose error messages ("user not found" vs "wrong password") | Debugging convenience | Enables account enumeration | Generic unified error messages |
| 7 | Symmetric signing (HS256) shared across services | Simpler setup | Any service with the secret can forge tokens | Asymmetric (RS256/ES256) signing |
| 8 | No password breach checking | Not top-of-mind | Users reuse compromised passwords | Integrate breach-list check at signup/change |
| 9 | Role checks hardcoded as string comparisons in controllers | Fast to write | Unmaintainable, error-prone as roles grow | Centralized permission-resolution layer |
| 10 | No audit logging on admin actions | Deprioritized until incident | No accountability trail | Mandatory audit log on all sensitive/admin ops |
| 11 | CORS wildcard `*` with credentials | Copy-pasted config | Any origin can make authenticated requests | Explicit origin allow-list |
| 12 | Missing CSRF protection on cookie-based endpoints | Assumed JWT = immune | Cookie-based refresh flow still vulnerable | SameSite cookies + CSRF token |
| 13 | Trusting client-side role/permission checks alone | Faster UI development | Backend bypassed via direct API calls | Enforce all checks server-side; UI checks are UX only |
| 14 | No forced logout on password change | Overlooked edge case | Attacker with old session stays logged in | Invalidate all sessions on password change |
| 15 | Reversible password "encryption" instead of hashing | Misunderstanding of hashing vs encryption | Full password exposure on DB breach | Adaptive one-way hashing (bcrypt/Argon2) only |
| 16 | No account lockout | Fear of self-DoS | Unlimited brute-force attempts | Progressive lockout/backoff |
| 17 | Logging tokens or passwords | Debug logging left in place | Secrets exposed via log access | Redact secrets in all logging layers |
| 18 | No input validation on file/resume uploads | Feature shipped fast | Malicious file upload, oversized payloads, XSS via content | Strict size/type validation, content sanitization |
| 19 | Missing security headers (CSP, X-Frame-Options) | Not part of "functional" requirements | Clickjacking, XSS amplification | Standard secure-header baseline on all responses |
| 20 | Single shared signing key never rotated | "If it works, don't touch it" | Long-term compromise if leaked | Scheduled key rotation with `kid` support |
| 21 | Treating premium/plan claims in JWT as source of truth | Convenience for gating UI | Stale access after downgrade/chargeback | Resolve entitlements server-side per request |
| 22 | No device/session management | Not needed at MVP stage | Users can't revoke a lost device's access | Per-device refresh-token records from the start |
| 23 | Mixing authentication and authorization logic | Perceived as "simpler" | Impossible to extend (e.g., add RECRUITER role) | Strict separation of AuthN and AuthZ layers |
| 24 | No `SameSite`/`Secure` flags on cookies | Default browser behavior seems fine | CSRF and network interception risk | Explicit `Secure; HttpOnly; SameSite=Strict` |
| 25 | Skipping email verification | Reduces signup friction | Fake/throwaway accounts, spam vector | Verification required before full access |
| 26 | No rate limiting on password reset | Overlooked non-login endpoint | Abuse for enumeration/spam | Rate limit reset requests per account/IP |
| 27 | Overly permissive default role on new users | Simplicity | Unintended access to sensitive features | Least-privilege default role |
| 28 | No expiry on password-reset/verification tokens | Convenience | Old leaked links stay exploitable forever | Short single-use token expiry |
| 29 | Storing plaintext refresh tokens in DB | Simpler to compare on refresh | DB breach = all sessions compromised | Store hashed refresh tokens |
| 30 | No monitoring/alerting on auth anomalies | Built reactively, not proactively | Attacks go unnoticed until damage done | Alerting on spikes in failed logins/token errors |
| 31 | Trusting `X-Forwarded-For` blindly for rate limiting/IP logic | Quick implementation | Trivially spoofable, defeats protections | Validate via trusted proxy configuration only |
| 32 | No distinction between soft-delete and hard-delete | Deferred decision | Data compliance/legal exposure | Explicit deactivation vs deletion lifecycle |
| 33 | Returning different HTTP status/timing for valid vs invalid usernames | Natural code path difference | Enables enumeration via timing/response diffing | Constant-time, uniform responses |
| 34 | Hardcoded secrets in source/config committed to repo | Fast local dev | Secret leakage via version control history | Secrets manager / environment injection only |
| 35 | No CSP, relying only on framework defaults | Assumed "good enough" | XSS payloads execute freely | Explicit strict CSP policy |
| 36 | Excessive JWT expiry "for user convenience" | UX prioritized over security | Large attack window on theft | Balance via silent refresh instead of long TTL |
| 37 | No validation of `aud`/`iss` claims | Only checking signature | Tokens from another service/environment accepted | Full claim validation, not just signature |
| 38 | Authorization checks only at UI route level, not per-API-call | Assumed UI gating is sufficient | Direct API access bypasses all UI restrictions | Enforce authorization at every backend endpoint |
| 39 | No separation between internal admin API and public API | Faster initial build | Public exposure of sensitive admin operations | Separate network/route boundary for admin surface |
| 40 | Ignoring async/background-job security context | Not considered during initial design | Background jobs (AI generation) run unauthenticated/over-privileged | Explicit context propagation and scoped job permissions |
| 41 | Treating MFA as a "later" feature bolted onto login UI only | MFA deprioritized at MVP | Retrofitting later requires token/claim redesign | Reserve `amr`/mfa claim slots in JWT design from day one |
| 42 | No plan for multi-provider account linking (social login) | Single-provider assumption early on | Users end up with duplicate accounts per provider | Model identity as provider-agnostic from the start |

---

## Summary: Core Architectural Decisions

1. **Stateless access tokens (JWT) + server-tracked, rotated refresh tokens** — balances scale and revocability.
2. **Strict AuthN/AuthZ separation**, with authorization resolved via a role→permission mapping, not hardcoded checks.
3. **Ownership-first authorization** as the foundation for future ABAC/collaboration features.
4. **In-memory access tokens + HttpOnly refresh cookies** on the frontend to minimize XSS/CSRF blast radius.
5. **Per-device session records** from day one to support future multi-device management without redesign.
6. **Credential verification is pluggable** — social login, MFA, passkeys, and SSO all plug into the same "verify → issue token" pipeline.
7. **Audit-first mindset** on all sensitive and admin operations from the start, not retrofitted later.

This blueprint is intended as the shared reference for backend, frontend, QA, and DevOps teams as the AI Resume Builder scales from MVP toward enterprise-ready.
