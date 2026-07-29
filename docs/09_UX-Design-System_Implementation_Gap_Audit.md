# Guide 09 — UX & Design System Implementation Gap Audit

Audit date: 2026-07-24  
Source: `09_UX-Design-System.md`

## Executive result

The UX and design-system blueprint is **substantially implemented, but not complete**.
The application has a strong reusable component foundation, responsive navigation,
accessible forms and dialogs, a working resume builder, autosave, undo/redo, version
history, ATS/PDF flows, soft deletion, restoration, and consistent loading/error/empty
states.

The largest gaps are the AI review experience, dashboard search/filter/sort, meaningful
resume-completion tracking, safe template previews, large-resume controls, and manual
accessibility/device verification.

## Progress estimate

This estimate treats each user-visible capability in sections 2–11 of the guide as one
check. Product principles, standards, warnings, and explicitly future-only features are
not counted as separate implementation checks.

| Status | Checks | Share |
|---|---:|---:|
| Complete | 31 | 56% |
| Partially complete | 18 | 33% |
| Missing | 6 | 11% |
| **Total** | **55** | **100%** |

Using half credit for partially completed checks, current delivery coverage is
approximately **73%**. This is a planning estimate, not a test-coverage metric.

## Status by guide area

| Guide area | Complete | Partial | Missing | Assessment |
|---|---:|---:|---:|---|
| Information architecture | 4 | 1 | 0 | Main app navigation and focused builder navigation exist; Help/Support is absent. |
| User journeys | 7 | 3 | 1 | Core resume, ATS, export, duplicate, delete, and restore flows work; AI improvement and template switching need safer review flows. |
| Resume Builder UX | 7 | 3 | 1 | Autosave, manual save, history, shortcuts, validation, preview, and versioning work; completion tracking and large-resume controls are incomplete. |
| Dashboard UX | 3 | 2 | 0 | Recent resumes, metrics, quick actions, empty/error/loading states exist; search/filter/sort and data-backed suggestions need work. |
| AI experience | 0 | 4 | 2 | Generation works, but accept/edit/regenerate/discard, attribution, history, and user-level suggestion controls are not complete. |
| Design system | 1 | 1 | 0 | Shared primitives and semantic tokens exist; the automated token guard still reports specialist-style violations. |
| Large-form UX | 1 | 0 | 0 | Labels, helper/error text, sections, keyboard support, and submit state patterns exist. |
| Accessibility | 4 | 2 | 1 | Strong code foundation; screen-reader, zoom, contrast, and device testing remain open. |
| Mobile experience | 2 | 1 | 1 | Responsive drawer and collapsed layouts exist; target viewport/touch QA and offline draft behavior are incomplete. |
| Empty/loading/error states | 2 | 1 | 0 | Reusable patterns exist; some feature screens still use generic loaders or status text. |

## Implemented

### Navigation and core journeys

- Authenticated application shell with desktop sidebar, collapsible icon rail, mobile
  drawer, utility navigation, notifications, profile access, and command search.
- Focused Resume Builder navigation for edit, preview, ATS check, and version history.
- Registration, email verification, login, onboarding, dashboard, and returning-user
  resume continuation flows.
- Resume create/edit, live preview, typed-section editing, publishing, PDF export, ATS
  analysis, template application, duplication, soft deletion, 30-day Recently Deleted
  messaging, and restoration.
- Route-level loading, forbidden, not-found, and recoverable error behavior.

### Resume Builder

- Multi-step, freely selectable builder sections with edit-only, split, and preview-only
  layouts.
- Debounced autosave plus explicit **Save now**, visible saving/dirty/saved state,
  autosave error display, unload protection, and an in-app unsaved-changes dialog.
- Session undo/redo with buttons and standard keyboard shortcuts.
- Discoverable keyboard-shortcut dialog for save, undo, redo, AI improvement, and section
  navigation.
- Inline validation with focus directed toward the relevant builder step.
- Draft/published status support in the resume model and cards.
- Immutable version list, version detail, and restore-as-new-version behavior.
- Typed experience, education, projects, skills, and certification sections with ordering.

### Dashboard and system feedback

- Recent-resume cards, resume count, ATS/profile metrics, AI allowance, quick actions, and
  a first-resume empty state.
- Separate network error, retry, empty data, and loading presentations.
- Reusable card/list/form/table/document/AI-job skeleton components.
- Toast/notification behaviors for success, failure, retry, undo, progress, offline,
  restored connection, and expired sessions.

### Design system and accessibility foundation

- Semantic color, typography, spacing, radius, elevation, focus, overlay, and layout
  tokens.
- Shared Button, Card, FormField, Input, Textarea, Select, Checkbox, RadioGroup, Table,
  Dropdown, Modal, ConfirmationDialog, Skeleton, AsyncState, and icon primitives.
- Consistent icon entry point for product navigation and one separate, deliberate status
  icon vocabulary for notifications.
- Semantic labels, field-error association, live regions, route-heading focus,
  focus-trapped dialogs, Escape dismissal, trigger-focus restoration, reduced-motion
  support, and keyboard-operable actions.
- Responsive sidebar/drawer, collapsing editor and workspace grids, wrapping mobile
  actions, scroll-contained tables, and oversized-media protection.

## Partially complete — work still required

### P1 — Resume completion and builder structure

- [ ] Add a meaningful completion model based on required content, not visited steps.
- [ ] Show `x/y sections complete` and per-section **Complete / In progress / Empty**
  markers in the builder navigation.
- [ ] Show the same completion state on dashboard resume cards.
- [ ] Make typed sections collapsible and preserve their expanded/collapsed state during
  an editing session.
- [ ] Add a “hide completed sections” control for long resumes.
- [ ] Confirm whether legacy text sections remain part of v1; if not, finish migration and
  remove the duplicate editing path.

**Done when:** completion status is derived from saved resume data, updates live, remains
consistent after reload, and has unit/component tests.

### P1 — Safe AI suggestion review

- [ ] Stop replacing the summary immediately after generation.
- [ ] Present the original and AI suggestion side by side or in a clearly separated review
  panel.
- [ ] Add explicit **Accept**, **Edit**, **Regenerate**, and **Discard** actions.
- [ ] Label generated text as AI-generated until the user materially edits it.
- [ ] Preserve the original content through failures, retries, and cancellation.
- [ ] Add the same interaction contract to cover letters and future bullet/skill flows.
- [ ] Give errors an inline one-click retry action and explicitly state that existing text
  was not lost.

**Done when:** no AI response can overwrite user content without explicit acceptance and
tests cover accept, edit, regenerate, discard, retry, and failure.

### P1 — Dashboard discovery

- [ ] Add resume search by title and, if supported safely by the API, content.
- [ ] Add status and template filters.
- [ ] Add sorting by last edited, created date, and name.
- [ ] Distinguish “no resumes exist” from “no resumes match these filters.”
- [ ] Replace static/demo-looking dashboard metrics and recommendations with API-backed
  values or clearly label unavailable metrics.
- [ ] Make AI suggestions dismissible and persist the preference.

**Done when:** query state is reflected in the URL or retained on navigation, empty and
filtered-empty states differ, and keyboard users can operate every control.

### P1 — Template switching safety

- [ ] Let users preview templates without saving the selection.
- [ ] Require confirmation before committing a template change when layout may materially
  change.
- [ ] Detect likely page overflow/truncation and show the affected content before commit.
- [ ] Allow cancel/revert without losing resume content or editor history.

**Done when:** browsing templates is non-destructive and overflow behavior has component
and browser tests.

### P2 — Remaining state consistency

- [ ] Replace generic loaders/status text in profile, settings, AI Center, admin, typed
  section editing, and any remaining workflow pages with shape-matched skeletons where
  loading is long enough to be visible.
- [ ] Audit every feature for distinct initial-empty, filtered-empty, network-error,
  permission-error, and retry states.
- [ ] Standardize wording and placement of inline errors and success messages.

### P2 — Accessibility and responsive verification

- [ ] Run and record manual keyboard-only testing for every primary journey.
- [ ] Test NVDA or JAWS on Windows and VoiceOver on Safari/iOS for forms, dialogs,
  notifications, builder navigation, preview, and generated content.
- [ ] Verify browser zoom at 200% and text-only zoom where supported.
- [ ] Record automated contrast results for normal, hover, focus, disabled, status badge,
  and notification states.
- [ ] Test target widths at 320, 375, 768, 1024, 1280, and 1440 pixels.
- [ ] Verify touch targets are at least 44×44 CSS pixels for primary mobile controls.
- [ ] Test phone landscape layouts and on-screen keyboard behavior.
- [ ] Fix the remaining raw palette/elevation/radius values in
  `marketing-auth.css` and `notifications.css`, then make the style-token guard pass.

**Done when:** results are recorded with defects linked to fixes; WCAG conformance must not
be claimed from source inspection alone.

## Missing — new implementation required

### P1 — AI history

- [ ] Add a per-resume/per-section AI generation history.
- [ ] Record workflow, prompt/version reference, generated output, timestamp, and whether
  the suggestion was accepted, edited, regenerated, or discarded.
- [ ] Provide an owner-scoped UI for reviewing and reusing prior suggestions.
- [ ] Define retention and deletion behavior for stored generated content.

### P1 — Complete AI user controls

- [ ] Add a setting to disable proactive AI suggestions without disabling manual AI
  actions.
- [ ] Ensure core resume creation and editing never require AI usage.
- [ ] Persist the preference and apply it to dashboard recommendations.

### P2 — Large-resume handling

- [ ] Add drag or keyboard-accessible reordering for repeated entries if current ordering
  controls do not satisfy the final interaction design.
- [ ] Test resumes with 10+ experiences/projects and large text blocks.
- [ ] Add rendering optimization only if measurement shows editor or preview slowdown.
- [ ] Surface content overflow before export instead of discovering it after PDF creation.

### P2 — Help and support destination

- [ ] Add a Help/Support route reachable from authenticated navigation.
- [ ] Include keyboard shortcuts, autosave/version recovery, export troubleshooting, AI
  behavior, ATS explanation, and contact/escalation guidance.

### P2 — Offline draft recovery

- [ ] Define whether offline editing is v1 or future scope.
- [ ] If v1, queue local draft changes, show sync state, resolve conflicts, and test
  reconnect behavior.
- [ ] If future, keep the current offline warning but explicitly document that unsynced
  edits may not persist after closing the tab.

### P3 — Recruiter/admin UX expansion

- [ ] Keep recruiter views future-only unless product scope changes.
- [ ] Complete admin UX-specific table filtering, bulk-action safety, audit drill-down,
  and responsive verification before treating the future admin design as finished.

## Recommended work order

1. Safe AI review: original/suggestion comparison and Accept/Edit/Regenerate/Discard.
2. Resume completion model and per-section progress indicators.
3. Dashboard search, filters, sorting, and filtered-empty state.
4. Non-destructive template preview with overflow warnings.
5. Accessibility, viewport, touch, and token-guard verification.
6. AI history and proactive-suggestion preference.
7. Large-resume controls, remaining skeletons, and Help/Support.
8. Offline drafts only after the product explicitly confirms them as v1 scope.

## Suggested first implementation slice

Start with the AI summary flow because the current behavior conflicts with the blueprint’s
highest-trust rule: AI should never silently replace user work.

- [ ] Introduce an `AiSuggestionReview` component.
- [ ] Keep `values.summary` unchanged while generation is pending and after output arrives.
- [ ] Store the response in temporary suggestion state.
- [ ] Render original and suggestion with Accept, Edit, Regenerate, and Discard controls.
- [ ] Apply the suggestion to `values.summary` only on Accept.
- [ ] Preserve undo/redo integration by recording acceptance as one history entry.
- [ ] Add accessible status announcements and focus the review heading after generation.
- [ ] Add tests for generation success, failure, retry, accept, edit, regenerate, discard,
  and original-content preservation.

## Verification baseline

Existing repository audits dated 2026-07-24 report:

- ESLint passed.
- Vitest passed with 20 files and 51 tests.
- Vite production build passed.
- Responsive and accessibility foundations are present in source and automated tests.
- The style-token guard still fails on raw values in two specialist stylesheets.
- Manual screen-reader, zoom, touch, viewport, and Lighthouse production checks remain
  unverified.

Statuses in this document are based on the current frontend source, routes, components,
styles, tests, and the existing frontend audits. A feature is marked complete only when
the user-visible behavior exists; architectural readiness alone is not counted as
completion.
