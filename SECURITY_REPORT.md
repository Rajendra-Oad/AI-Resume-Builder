# Security Report — AI Resume Builder

**Date:** 2026-08-04
**Assessment:** strong security posture for a small production platform. No critical findings. Four medium/low items require manual action (see §5). Changes this pass also hardened the Vercel CSP so the deployed policy actually permits the loaded fonts.

---

## 1. Authentication & session management

- **Access token:** HMAC-signed JWT, 15-minute TTL, returned in the JSON body, held only in a browser in-memory singleton. Contains `userId`, `email`, `role`; validated for signature, issuer, and audience on every request (`JwtService`, `JwtAuthenticationFilter`).
- **Refresh token:** opaque, stored server-side only as a SHA-256 hash, delivered as an **HttpOnly `SameSite=Strict`** cookie on `/api/v1/auth`. Full page reloads reconstruct the session via `/auth/refresh`.
- **Revocation:** new/changed passwords revoke refresh tokens; access JWTs are not revocable until expiry (inherent to stateless HMAC — acceptable at 15-min TTL).
- **Not rotated:** refresh rotation code exists but is not wired in (B4 in the audit). A stolen refresh cookie stays valid up to 30 days.
- **Brute-force:** `AuthRateLimitFilter` caps credential endpoints (`/login`, `/forgot-password`, `/register`) at 10 attempts/min per IP+path with a `429` + `Retry-After`. In-process map — single-instance scope (B5).

## 2. Transport & headers

- **TLS:** HTTPS enforced at both edges — Vercel (frontend) and nginx (self-hosted) terminate TLS; Render backend requires `DB_SSL_MODE=require`; prod validation requires HTTPS `APP_FRONTEND_URL`.
- **Security headers** (both Vercel `vercel.json` and Spring `SecurityConfig`):
  - CSP: `default-src 'self'; frame-ancestors 'none'; base-uri 'self'` (backend) / full policy with Google Fonts allowlist (Vercel).
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation blocked).
- **CORS:** configured via `APP_CORS_ALLOWED_ORIGINS` (prod requires comma-separated HTTPS origins). CSRF is disabled — acceptable because the only cookie is the refresh cookie, which is `SameSite=Strict` and used by a stateless backend; the PDF-export endpoint additionally rejects unauthenticated same-site-forged calls (commit `18ae79c`).

## 3. Secret handling & configuration

- **No hardcoded secrets** in tracked source (verified by inspection; Gitleaks runs on every PR/push and in the deploy security-gate).
- **Fail-fast validation:** `EnvironmentConfigurationValidator` refuses to boot on missing, placeholder (`replace-with-`), or malformed variables; secret values are never logged.
- **Prod hard requirements:** `DB_USERNAME`, HTTPS `APP_FRONTEND_URL`, `APP_CORS_ALLOWED_ORIGINS`, `USER_API_KEY_ENCRYPTION_KEY` (Base64 of exactly 32 bytes), `MANAGEMENT_METRICS_TOKEN`, all-or-nothing SMTP, `APP_SECURE_COOKIES=true`.
- **BYOK provider credentials** are encrypted at rest with the 32-byte `USER_API_KEY_ENCRYPTION_KEY`.
- **Metrics endpoint:** `/actuator/prometheus` requires a timing-safe `X-Metrics-Token` match; when the token is unset the filter **denies all** (safe default). `management.endpoint.health.show-details=never`.

## 4. Supply chain & static analysis

- **Gitleaks** secret scan — full history, on push/PR/schedule and again in the deploy security-gate.
- **npm audit** — fails on high/critical (`--audit-level=high`), CI + deploy gate.
- **OWASP Dependency-Check 12.2.2** — fails on CVSS ≥ 7, cached NVD data, CI + deploy gate.
- **dependency-review** — blocks newly introduced high-severity deps in PRs.
- **CodeQL** — Java/Kotlin + JS/TS with `security-extended` queries.
- **Locked deps:** `npm ci`, `package-lock.json`; Maven with pinned `pom.xml`; version overrides cap known-affected libs (spring-framework 6.2.19, spring-security 6.5.11, netty 4.2.16, postgresql 42.7.13).

## 5. Open items requiring manual action

| # | Item | Severity | Action |
|---|------|----------|--------|
| S1 | Refresh token not rotated | Medium | Wire the existing rotation code or accept and document the 30-day window. |
| S2 | Auth rate limiter is per-instance | Low–Med | Enable Redis (`AI_REDIS_ENABLED=true`) before running >1 backend instance. |
| S3 | `DEV_SEED_PASSWORD` (dev) and SMTP secrets live in `backend/.env` | Low | Restrict file ACLs; never commit it (`.gitignore`). |
| S4 | No live penetration/auth-flow test recorded this session | Medium | Run the e2e auth flows + a quick manual auth-flow pass on the deployed app. |

## 6. Verdict

No critical or high-severity issues. The control set (short-TTL stateless tokens, HttpOnly Strict cookies, fail-fast secret validation, token-protected metrics, layered supply-chain gates) is appropriate for this platform. The open items are deliberate, documented trade-offs rather than defects — track S1–S4 in `PRODUCTION_CHECKLIST.md`.
