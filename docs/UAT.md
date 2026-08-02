# User Acceptance Testing

## Purpose

This is the release acceptance plan for the AI Resume Builder. It validates user-visible behavior against the implementation that exists now. It does not treat planned but unavailable behavior as passed.

UAT has three evidence layers:

1. **Automated mocked UI acceptance** — deterministic Playwright journeys verify routing, browser behavior, forms, API contracts, role boundaries, responsiveness and accessibility without external side effects.
2. **Deployed integration acceptance** — a production-like environment verifies Spring Boot, PostgreSQL, Flyway, SMTP, AI providers, PDF generation, cookies and monitoring together.
3. **Manual product acceptance** — named business representatives judge content quality, usability and operational suitability using synthetic data.

A mocked browser pass is not evidence that SMTP, PostgreSQL, an AI provider, or Render/Vercel works. Release approval requires the applicable deployed/manual cases as well.

## Current product boundaries

- Registration, email verification, login/logout, password recovery, resume CRUD, templates, versions, PDF, AI summary improvement, cover-letter generation, ATS, job matching, dashboard analytics, billing history/cancellation, notification read/read-all, personal audit history, and administrative analytics/audit/prompt management have implementation paths.
- Billing exposes no provider-backed self-service paid upgrade. Paid-plan buttons state “Contact support.” Only cancellation/downgrade to Free is actionable. Upgrade cannot be accepted until it is a committed product requirement and implementation.
- Notifications can be received/listed and marked read individually or together. There is no dismiss/delete-notification API or UI. “Dismiss” is unsupported rather than failed.
- Safari automation uses Playwright WebKit. Final Safari acceptance requires a real supported Safari/macOS/iOS device because WebKit automation is not identical to shipping Safari.
- Real Edge can be enabled with `UAT_EDGE=true`; regular CI uses Chromium, Firefox and WebKit plus device emulation.
- AI output quality is nondeterministic. Automation verifies lifecycle/contracts; a human verifies factuality, relevance, tone and absence of invented claims.
- Dashboard labels and secondary text meet the automated WCAG AA contrast gate. Playwright now fails the UAT suite if a serious or critical axe violation is introduced on the authenticated dashboard.

## Entry criteria

- [ ] Release commit and deployed environment are recorded.
- [ ] CI, PostgreSQL integration, frontend build and performance smoke gates are green.
- [ ] Flyway history and Hibernate validation are successful.
- [ ] Backup/recovery point exists and rollback owner is available.
- [ ] Synthetic USER and ADMIN accounts are verified and isolated from customers.
- [ ] SMTP inboxes, AI provider budget, PDF storage and monitoring are available.
- [ ] Test data, supported browsers/devices and expected subscription state are documented.
- [ ] No overlapping deployment, load test or destructive recovery exercise is running.

## Test data and evidence

Use synthetic identities and content only. Maintain:

- one verified standard user;
- one verified administrator;
- one expired/revoked-token case;
- active and cancelled subscription fixtures supported by the service;
- one resume with all section types and one intentionally incomplete resume;
- one synthetic job description with known keywords;
- dedicated SMTP inboxes and approved AI provider/test budget.

For every execution record test ID, release SHA, environment, browser/device, UTC time, tester, result, defect IDs, screenshots/traces and relevant correlation IDs. Never attach passwords, JWTs, reset/verification tokens, AI keys, resumes belonging to real people, or unmasked payment data.

## Execution

Automated UAT:

```bash
cd frontend
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run test:uat
```

The complete mocked workflow suite runs in Chromium. Firefox, WebKit and responsive projects run the shared navigation/accessibility acceptance cases; the manual cross-browser matrix covers complete deployed workflows. Real Edge, on a host with Microsoft Edge installed:

```powershell
$env:UAT_EDGE = "true"
npx playwright test e2e/uat --project=edge
Remove-Item Env:UAT_EDGE
```

HTML results are written to `frontend/playwright-report`; traces, screenshots and failure videos are under `frontend/test-results/playwright`. CI uploads the HTML report. The mocked suite is repeatable regression evidence, not deployed integration evidence.

## Test matrix

Legend: **A** automated Playwright, **D** deployed integration/manual evidence, **U** unsupported in the current product, **P** pending execution, **Pass/Fail/Blocked/N/A** execution result.

| ID       | Area           | Scenario                 | Method | Acceptance criteria                                                                                           | Result |
| -------- | -------------- | ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------- | ------ |
| AUTH-01  | Authentication | Register                 | A+D    | Valid form creates pending account, sends no password/token to UI logs, and routes to verification checkpoint | P      |
| AUTH-02  | Authentication | Verify email             | A+D    | Valid single-use token activates account; missing/invalid/expired token gives actionable error                | P      |
| AUTH-03  | Authentication | Login                    | A+D    | Verified valid user reaches dashboard; secure refresh cookie and access token behavior work                   | P      |
| AUTH-04  | Authentication | Logout                   | A+D    | Session is revoked/cleared and protected routes redirect to login                                             | P      |
| AUTH-05  | Authentication | Forgot password          | A+D    | Response does not reveal account existence; valid account receives time-limited link                          | P      |
| AUTH-06  | Authentication | Reset password           | A+D    | Valid token and strong matching password succeed; token cannot be reused                                      | P      |
| AUTH-07  | Negative       | Invalid login            | A+D    | Generic error, no session, no account disclosure; limiter returns controlled `429` when exercised             | P      |
| AUTH-08  | Negative       | Expired JWT              | A+D    | One refresh succeeds and retries request; invalid refresh ends session safely                                 | P      |
| AUTH-09  | Authorization  | Permission denied        | A+D    | USER cannot open `/admin` or invoke admin APIs; ADMIN can                                                     | P      |
| RES-01   | Resume         | Create resume            | D      | Valid title/summary creates an owned draft visible in list/dashboard                                          | P      |
| RES-02   | Resume         | Edit/autosave            | D      | Metadata and typed sections persist, validation is clear, and reload retains changes                          | P      |
| RES-03   | Resume         | Delete/restore           | A+D    | Delete removes active item, recently-deleted view shows it, permitted restore returns it                      | P      |
| RES-04   | Negative       | Deleted resume           | D      | Direct active-resource access is denied/not found; no other user's data appears                               | P      |
| RES-05   | Templates      | Apply template           | D      | Selected active template changes presentation without losing resume content                                   | P      |
| RES-06   | Versioning     | View and restore version | D      | Immutable snapshot is readable; restore creates a new current version without erasing history                 | P      |
| RES-07   | PDF            | Download export          | D      | Valid PDF downloads with expected filename/content and appears in export history                              | P      |
| AI-01    | AI             | Generate summary         | D      | Job completes; output uses supplied facts, is editable and records usage/status                               | P      |
| AI-02    | AI             | Improve resume           | D      | Suggested summary is reviewable and does not silently overwrite unrelated content                             | P      |
| AI-03    | AI             | Cover letter             | D      | Synthetic facts produce an editable draft with no invented experience/company facts                           | P      |
| AI-04    | Negative       | Invalid AI request       | D      | Blank/oversized/unknown workflow is rejected safely with no stuck job or secret leakage                       | P      |
| AI-05    | Negative       | Provider failure/budget  | D      | Failure is actionable, retry state is bounded, and previous resume data remains intact                        | P      |
| JOB-01   | Job matching   | Create/list job          | D      | Owned job is created/listed and another user cannot access it                                                 | P      |
| JOB-02   | Job matching   | Match results            | D      | ATS analysis updates job-match output for the selected owned resume/job                                       | P      |
| ATS-01   | ATS            | Analyze resume           | D      | Score, keyword matches, missing skills and recommendations correspond to synthetic fixture                    | P      |
| ATS-02   | ATS            | Report history           | D      | Report is saved and paginated under the correct resume/user                                                   | P      |
| DASH-01  | Dashboard      | Overview                 | D      | Values come from `/api/v1/analytics/overview` and match created synthetic activity                            | P      |
| BILL-01  | Billing        | View current/history     | D      | Current plan, entitlement, subscription timeline and masked payments render correctly                         | P      |
| BILL-02  | Billing        | Cancel/downgrade to Free | D      | Confirmation is required; cancellation activates Free and preserves resumes/history                           | P      |
| BILL-03  | Billing        | Upgrade to paid          | U      | No provider-backed self-service implementation exists                                                         | N/A    |
| BILL-04  | Billing        | Paid-to-paid downgrade   | U      | No provider-backed self-service implementation exists                                                         | N/A    |
| BILL-05  | Negative       | Expired subscription     | D      | Entitlements fall back to implemented Free limits without deleting user content                               | P      |
| NOTIF-01 | Notifications  | Receive/list             | D      | Triggered business event creates the expected owned notification                                              | P      |
| NOTIF-02 | Notifications  | Read/read-all            | D      | Read state and unread counts persist after reload                                                             | P      |
| NOTIF-03 | Notifications  | Dismiss/delete           | U      | No dismiss/delete endpoint or control exists                                                                  | N/A    |
| AUD-01   | Audit          | Personal activity        | D      | Owner sees relevant activity only, paginated, with safe detail                                                | P      |
| ADM-01   | Administration | Analytics                | D      | ADMIN sees totals/range metrics; USER receives `403`/forbidden                                                | P      |
| ADM-02   | Administration | Audit logs               | D      | ADMIN can inspect sanitized audit entries without secrets                                                     | P      |
| ADM-03   | Administration | Prompt management        | D      | Review/approve/publish lifecycle respects roles and immutable version history                                 | P      |
| ADM-04   | Administration | User role/status         | D      | Changes require ADMIN and produce admin/audit records                                                         | P      |

## Detailed manual workflows

### Authentication and recovery

1. Register a new synthetic account and capture the generic confirmation.
2. Confirm verification email sender, subject, link origin, expiry and mobile rendering; never paste the token into evidence.
3. Verify once, confirm reuse/expiry fails, then login.
4. Logout and prove both the UI session and server refresh session are invalid.
5. Request password reset for existing and nonexistent addresses; UI responses must be indistinguishable.
6. Reset with a strong password; confirm old password and reused token fail, new password succeeds.

### Resume lifecycle

1. Create a resume and add personal, experience, education, project, skill and certification content using synthetic facts.
2. Reload after edits and verify persistence, ordering, keyboard operation and validation.
3. Apply at least two active templates and compare preview/PDF without content loss.
4. Capture versions before/after a material edit; restore the older version and confirm a new snapshot records restoration.
5. Soft-delete, verify direct access behavior, restore, then export PDF and inspect history/checksum metadata.

### AI, ATS and job matching

1. Use facts with deliberately known expected phrases and facts absent from input.
2. Generate/improve summary and cover letter. Reject the run if absent facts are invented or existing content is overwritten without user action.
3. Create a synthetic job, run ATS, compare expected present/missing skills, recommendations and job-match record.
4. Exercise provider error, invalid request and entitlement/budget behavior without exposing provider keys or prompts in logs.

### Billing, notifications, audit and administration

1. Compare current plan/entitlement with backend response and history.
2. Cancel an implemented paid fixture after confirmation; verify Free activation and preserved content.
3. Trigger notification-producing actions, verify ownership/read/read-all and preferences.
4. Confirm personal activity reflects accepted actions without sensitive state.
5. As ADMIN, verify analytics ranges, audit/admin logs, prompt lifecycle, and controlled user role/status changes.
6. Repeat admin URLs/APIs as USER and record denial.

## Cross-browser and responsive matrix

| Target                     | Automated project             | Required manual evidence                                   |
| -------------------------- | ----------------------------- | ---------------------------------------------------------- |
| Chromium / Chrome behavior | `chromium`                    | Current stable Google Chrome for final release             |
| Firefox                    | `firefox`                     | Current supported desktop Firefox                          |
| Safari engine              | `webkit`                      | Current Safari on supported macOS and iPhone/iPad hardware |
| Microsoft Edge             | optional `edge`               | Current stable Edge on Windows                             |
| Desktop                    | Browser projects              | 1280×720 minimum and representative large display          |
| Tablet                     | `tablet` (`iPad Pro 11`)      | Portrait and landscape physical/device-cloud tablet        |
| Mobile Chrome              | `mobile-chrome` (`Pixel 7`)   | Supported Android device/device cloud                      |
| Mobile Safari              | `mobile-safari` (`iPhone 13`) | Supported iPhone/device cloud                              |

For each target verify authentication, navigation, resume editing, dialogs, tables, PDF download, no horizontal clipping, readable touch targets, virtual keyboard behavior, and orientation/zoom where applicable.

## Accessibility acceptance

Automated UAT runs axe and fails serious/critical violations on public login and authenticated dashboard views. Manual acceptance remains mandatory:

- [ ] Complete primary workflows using keyboard only; no traps except correctly contained modal focus.
- [ ] Visible focus is never obscured and follows a logical order.
- [ ] Route changes move focus to the page heading.
- [ ] Modal open moves focus inside; Escape/cancel closes; focus returns to trigger.
- [ ] Form labels, errors, descriptions, required state and password feedback are announced.
- [ ] Dynamic notifications, AI progress/results and validation use appropriate live regions without excessive announcement.
- [ ] Navigation, buttons, links, headings, tables and landmarks expose correct names/roles/states.
- [ ] Screen-reader smoke passes with NVDA + Chrome/Firefox and VoiceOver + Safari.
- [ ] Layout remains usable at 200% browser zoom and with reduced motion, dark theme and high contrast.
- [ ] PDF content order and text readability are manually inspected; browser accessibility does not prove PDF accessibility.

## Regression checklist

### Release-critical

- [ ] Register → verify → login → refresh → logout.
- [ ] Forgot/reset password and token expiry/reuse.
- [ ] USER/ADMIN ownership and permission boundaries.
- [ ] Create/edit/reload/delete/restore resume.
- [ ] Typed sections, template apply, version view/restore.
- [ ] AI summary/improvement/cover letter success and provider failure.
- [ ] Job create, ATS analysis, match output and report history.
- [ ] Dashboard metrics reflect activity.
- [ ] PDF download and export history.
- [ ] Billing current/history/cancel behavior.
- [ ] Notifications, preferences and audit activity.
- [ ] Admin analytics/audit/prompts/user controls.
- [ ] Browser, responsive, keyboard, focus, axe and screen-reader gates.
- [ ] Monitoring shows no new error/security regression and no secrets/PII in logs.

### Nonfunctional

- [ ] Flyway/Hibernate validation, backups and rollback evidence are current.
- [ ] Normal-load performance remains within approved baseline.
- [ ] Vercel API proxy, CORS, cookies, CSP and HTTPS work in the release environment.
- [ ] SMTP/AI integrations use approved production configuration.
- [ ] No console errors, failed unhandled requests or stuck background jobs.

## Pass/fail rules

- **Pass:** observed behavior meets every acceptance criterion and evidence is attached.
- **Fail:** behavior reproducibly violates a criterion; create a defect.
- **Blocked:** required environment, provider, account, data or authorization is unavailable; blocked is not pass.
- **N/A:** product owner approves that the case is outside the implemented/release scope, such as current self-service upgrade/dismiss behavior.

Release blockers are any open critical/high defect involving authentication, authorization/ownership, data loss/corruption, secret/PII exposure, unusable core resume flow, migration failure, inaccessible primary workflow, or unmet approved recovery/performance objective. Medium/low exceptions require product owner and engineering owner approval with expiry and follow-up.

## Bug report template

```markdown
# [UAT-ID] Concise defect title

- Release SHA/build:
- Environment:
- Browser/device/viewport:
- User role and synthetic fixture:
- Severity: Critical / High / Medium / Low
- Reproducibility: Always / Intermittent (rate)
- Related requirement/test ID:

## Preconditions

## Steps to reproduce

1.
2.
3.

## Expected result

## Actual result

## User/business impact

## Evidence

- Screenshot/video/trace:
- UTC timestamp and correlation ID:
- Sanitized logs/response status:

## Security and data handling

- Does this expose customer data, credentials, tokens or payment data?
- Was evidence sanitized?

## Workaround

## Retest result

- Fix build/SHA:
- Result and tester:
```

## Release approval checklist

- [ ] Test matrix has Pass/Fail/Blocked/N/A for every in-scope row.
- [ ] Automated unit/integration/UAT/browser suites and production build pass on the release SHA.
- [ ] Deployed USER and ADMIN journeys pass with synthetic data.
- [ ] Chrome, Firefox, Edge and real Safari evidence is attached for supported targets.
- [ ] Desktop, tablet and mobile evidence is attached.
- [ ] Keyboard, screen-reader, focus, ARIA and axe acceptance passes.
- [ ] No unresolved release-blocking defects.
- [ ] Known limitations and approved exceptions are documented.
- [ ] Performance, monitoring, backup/recovery and rollback readiness remain valid.
- [ ] Synthetic data/provider jobs are cleaned up or retained under approved test policy.
- [ ] Product Owner approves user outcomes.
- [ ] QA owner approves evidence and regression scope.
- [ ] Engineering owner approves technical risk.
- [ ] Operations owner approves deployment/rollback readiness.

| Approval          | Name | Decision | UTC date | Evidence/exception link |
| ----------------- | ---- | -------- | -------- | ----------------------- |
| Product Owner     |      |          |          |                         |
| QA Owner          |      |          |          |                         |
| Engineering Owner |      |          |          |                         |
| Operations Owner  |      |          |          |                         |

Production release is approved only when all required approvers sign the same immutable release SHA. A blocked test, unsupported requirement, or untested external integration must be explicitly accepted; silence is not approval.
