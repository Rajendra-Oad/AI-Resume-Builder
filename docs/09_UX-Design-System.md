# AI Resume Builder — UX & Design System Blueprint

**Audience:** Designers, Frontend Developers, QA, Product Management
**Status:** UX architecture specification — no code, components, or markup included

---

## 1. Product Vision

### 1.1 Problem Statement

Writing an effective, ATS-friendly resume is a high-stakes, low-frequency task most users are bad at by no fault of their own — they don't know what recruiters/ATS systems look for, struggle to phrase achievements, and second-guess formatting. The product removes that expertise gap by combining structured guided input, AI writing assistance, and instant ATS feedback in one flow.

### 1.2 Primary Personas

| Persona | Context | Core need |
|---|---|---|
| Student | Little/no work history | Guidance on what to even put in a resume; confidence |
| Fresher | 0–2 years experience | Translate coursework/projects into resume language |
| Professional | Career history, time-poor | Fast editing, tailoring per job, ATS optimization |
| Recruiter (future) | Reviews others' resumes | Fast scanning, comparison, structured candidate view |
| Administrator | Platform operations | Oversight, moderation, account/support actions |

### 1.3 User Goals

- Produce a polished, ATS-passing resume with minimal friction.
- Tailor a resume quickly for a specific job description.
- Trust that AI suggestions are accurate and editable, not a black box.
- Never lose work (autosave, recoverability).

### 1.4 User Frustrations (to design against)

- Generic resume builders that produce templated, robotic text.
- Losing edits due to crashes or accidental navigation.
- Not knowing *why* an ATS score is low or how to fix it.
- Overwhelming forms with no sense of progress.

### 1.5 Success Criteria

- Time-to-first-completed-resume is short for a first-time user.
- Users return to tailor/update resumes rather than starting over elsewhere.
- AI suggestions are accepted/edited (used) more often than discarded.
- Low error/support-ticket rate around lost work or export failures.

### 1.6 Product Principles

1. **Never lose user work** — autosave and recoverability are non-negotiable.
2. **AI assists, never overrides** — every AI output is editable and attributable.
3. **Progress should always be visible** — users should always know where they are and what's left.
4. **Guidance over gatekeeping** — validation helps, never blocks unnecessarily.
5. **Consistency compounds trust** — the same patterns repeat across every feature.

---

## 2. Information Architecture

### 2.1 Top-Level Navigation Tree

```
Landing (unauthenticated)
 ├── Login
 ├── Register
 └── (marketing/feature overview)

Authenticated App
 ├── Dashboard                      (home base)
 ├── Resume Builder
 │    ├── Editor (section-based)
 │    ├── Live Preview
 │    └── Template Switcher
 ├── AI Assistant                   (writer / improver / cover letter)
 ├── ATS Checker
 ├── Job Matching
 ├── Notifications
 ├── Profile
 ├── Settings
 └── Help / Support

Future
 └── Admin Console (separate navigation shell, role-gated)
```

### 2.2 Navigation Model

- **Primary nav (persistent):** Dashboard, Resumes, AI Assistant, Job Matching, Settings — always reachable, representing the app's top-level modes.
- **Contextual nav (in-flow):** Inside the Resume Builder, navigation shifts to section-based (Personal Info → Experience → Education → Skills → Preview) rather than global nav, since the user is in a focused task.
- **Utility nav (top bar):** Notifications, Profile, Search — always accessible regardless of context.

### 2.3 How Users Move Through the App

```
Landing → Register/Login → Dashboard (hub)
                              │
        ┌─────────────────────┼──────────────────────┐
        ▼                     ▼                       ▼
  Resume Builder        AI Assistant             ATS Checker
  (create/edit)      (generate/improve)        (analyze resume)
        │                     │                       │
        └────────► Live Preview ◄──────────────────────┘
                        │
                  Export / Share
```

The Dashboard is the **hub-and-spoke center** — every major feature is reachable from it and returns to it, so users are never "lost" more than one step from home.

---

## 3. User Journeys

Each journey follows: **Goal → Steps → Decision Points → Possible Errors → Recovery.**

### 3.1 New User (First-Time)

- **Goal:** Understand the product and create a first resume with minimal friction.
- **Steps:** Land → Register → (optional) quick onboarding/goal question ("student/professional/switching jobs?") → Dashboard (empty state) → "Create your first resume" CTA → Template selection → Builder.
- **Decision points:** Start from a template vs. blank; import existing resume (future) vs. build fresh.
- **Errors:** Email already registered; verification email not received.
- **Recovery:** Inline "resend verification" action; clear duplicate-account messaging without confirming which detail (email) already exists — recoverable without account enumeration.

### 3.2 Returning User

- **Goal:** Resume exactly where they left off.
- **Steps:** Login → Dashboard shows recent resumes sorted by last edited, with draft/complete status.
- **Decision points:** Continue editing vs. start a new resume vs. duplicate an existing one for a new job application.
- **Errors:** Session expired mid-navigation.
- **Recovery:** Redirect to login with a "your session expired" notice, then return to the exact page they intended after re-authentication.

### 3.3 Create Resume

- **Goal:** Produce a complete resume.
- **Steps:** Choose template → fill sections sequentially (or in any order) → live preview updates continuously → mark complete.
- **Decision points:** Use AI writer per-section vs. write manually; skip optional sections.
- **Errors:** Required field left empty when attempting export.
- **Recovery:** Inline validation pointing to the specific incomplete section, not a generic blocking error.

### 3.4 Improve Resume (AI)

- **Goal:** Strengthen existing content without losing the user's voice.
- **Steps:** Select section/bullet → "Improve with AI" → AI shows a suggested rewrite *side-by-side* with original → user accepts, edits, or discards.
- **Decision points:** Accept as-is vs. edit suggestion vs. regenerate vs. keep original.
- **Errors:** AI service timeout/failure.
- **Recovery:** Clear failure state with a retry action; original content is never overwritten until the user explicitly accepts.

### 3.5 Generate Cover Letter

- **Goal:** Produce a tailored cover letter from resume + job description.
- **Steps:** Provide/select job description → AI drafts letter → user reviews and edits → save/export.
- **Decision points:** Tone selection (formal/conversational); link to a specific resume version.
- **Errors:** No job description provided.
- **Recovery:** Prompt for minimal required input rather than failing silently; allow generation from resume alone with a lower-confidence disclaimer.

### 3.6 Run ATS Analysis

- **Goal:** Understand and improve ATS compatibility.
- **Steps:** Select resume → run check → view score + itemized issues → jump directly to the relevant builder section to fix each issue → re-run.
- **Decision points:** Fix now vs. save issues for later.
- **Errors:** Analysis fails or resume too sparse to analyze meaningfully.
- **Recovery:** Explain *why* (e.g., "add work experience to get an ATS score") rather than a generic failure.

### 3.7 Export PDF

- **Goal:** Get a usable file.
- **Steps:** Preview → Export → format/template confirmation → download.
- **Decision points:** Template/format choice at export time.
- **Errors:** Export fails (rendering/service error); incomplete resume.
- **Recovery:** Retry action; warn *before* export if required sections are missing rather than failing after the user waits.

### 3.8 Change Template

- **Goal:** Restyle without losing content.
- **Steps:** Open template switcher from within Builder/Preview → live preview updates per template → confirm.
- **Decision points:** Preview-only browsing vs. committing the switch.
- **Errors:** Content overflow/truncation in the new template layout.
- **Recovery:** Visual warning on any content that won't fit, with a chance to trim or switch back before committing.

### 3.9 Duplicate Resume

- **Goal:** Create a tailored variant for a different job application.
- **Steps:** From Dashboard or Builder → "Duplicate" → new copy appears, clearly labeled, editable independently.
- **Decision points:** Rename immediately vs. later.
- **Errors:** None significant; low-risk action.
- **Recovery:** N/A — duplication is itself the safe/recoverable action.

### 3.10 Delete Resume

- **Goal:** Remove unwanted resumes without risk of accidental data loss.
- **Steps:** Select delete → confirmation dialog stating consequence → soft-delete (moved to "Recently Deleted").
- **Decision points:** Confirm vs. cancel.
- **Errors:** Accidental deletion.
- **Recovery:** "Recently Deleted" holding area with a restore option for a defined window (e.g., 30 days) before permanent removal.

### 3.11 Restore Resume

- **Goal:** Recover an accidentally deleted resume.
- **Steps:** Navigate to Recently Deleted (from Dashboard or Settings) → select → Restore.
- **Decision points:** Restore vs. permanently delete now.
- **Errors:** Restore window expired.
- **Recovery:** Clear messaging on remaining time before permanent deletion, visible at deletion time and in the deleted-items list.

---

## 4. Resume Builder UX

### 4.1 Navigation & Section Switching

Section-based left-side (or top, on mobile) navigation listing: Personal Info, Summary, Experience, Education, Skills, Projects, Certifications, Custom Sections. Users can jump freely — no forced linear order — since experienced users often skip around while students may prefer top-to-bottom guidance.

### 4.2 Progress Tracking

A persistent completion indicator (e.g., "6/9 sections complete") reflecting *meaningful* completion (required fields filled), not just "visited." Per-section status markers (complete / in progress / empty) in the section nav itself.

### 4.3 Autosave & Manual Save

- **Autosave** on a debounce (e.g., after a pause in typing) with a subtle, non-intrusive "Saved" / "Saving…" indicator — never a blocking spinner.
- **Manual save** action still available for user confidence, especially before risky actions (template change, navigation away).
- Autosave failures must surface clearly (not fail silently) with a retry affordance, since silent autosave failure is a top cause of "I lost my work" complaints.

### 4.4 Undo / Redo

Standard undo/redo stack scoped to the editing session, accessible via a visible control and standard keyboard shortcuts — critical for a tool where AI rewrites and manual edits are frequently reverted/compared.

### 4.5 Keyboard Shortcuts

Section navigation, save, undo/redo, and "improve with AI" should have discoverable shortcuts (surfaced via a shortcuts help panel), benefiting power users (professionals iterating quickly) without being required for anyone else.

### 4.6 Validation Feedback

Inline, section-scoped, non-blocking for optional fields; blocking only at export/finalize time for genuinely required data (e.g., name, one experience or education entry). Validation messages explain *what to fix*, not just *that something is wrong*.

### 4.7 Draft Indicators

Clear visual distinction between "Draft" and "Complete" resumes throughout the Dashboard and Builder, so users always know a resume's readiness state at a glance.

### 4.8 Version History

Lightweight version snapshots (e.g., on major edits or daily) accessible from the Builder, allowing users to view/restore a prior version — particularly valuable after AI rewrites replace substantial content.

### 4.9 Collapsible Sections

Long resumes (extensive experience) benefit from collapsible section cards to reduce scroll fatigue and let users focus on one section at a time while retaining an overview.

### 4.10 Large Resume Handling

For resumes with many entries (10+ jobs, extensive projects), the builder should support reordering (drag-to-reorder), pagination/virtualization considerations in the underlying UX (not layout collapse), and a way to temporarily hide completed sections to reduce visual load.

### 4.11 Future Collaboration

Design section-level ownership/locking concepts now (even if unused) so real-time collaboration (Part 12) can be added by exposing existing section boundaries as the unit of concurrent editing, rather than restructuring the editor.

---

## 5. Dashboard UX

### 5.1 Core Modules

- **Recent Resumes** — most-recently-edited first, with status (draft/complete), last-edited timestamp, quick actions (edit, duplicate, delete, export).
- **Quick Actions** — "Create New Resume," "Run ATS Check," "Generate Cover Letter" as prominent, low-friction entry points.
- **Statistics** — lightweight, motivating (e.g., "3 resumes tailored this month," "average ATS score"), never overwhelming or resembling a corporate analytics dashboard.
- **AI Suggestions** — surfaced proactively but dismissibly (e.g., "Your Software Engineer resume hasn't been ATS-checked yet").
- **Notifications** — system/account-relevant items (verification reminders, feature announcements), separate from AI suggestions.

### 5.2 Search, Filters, Sorting

Search across resume titles/content; filters by status (draft/complete), template, or tag; sorting by last edited, created date, or name — standard, predictable patterns since this is a utility surface, not a place for novel interaction.

### 5.3 Empty States

First-time Dashboard (zero resumes) should not look like a broken/empty version of the returning-user Dashboard — it should be a distinct, welcoming state with a single clear primary action ("Create your first resume") and brief reassurance about what to expect.

### 5.4 Loading States

Skeleton screens matching the eventual content shape (resume cards, stat placeholders) rather than a generic spinner, to reduce perceived wait time and layout shift.

### 5.5 Error States

Distinguish network errors ("couldn't load your resumes, retry") from empty results from filters ("no resumes match your filters, clear filters") — these are different situations and must not share the same message.

---

## 6. AI Experience

### 6.1 Core AI Touchpoints

Generating a resume from scratch, improving existing content, writing a summary, generating bullet points, drafting cover letters, suggesting skills, and job matching all follow a consistent interaction pattern:

```
User triggers AI action (explicit button, never automatic overwrite)
        │
        ▼
Loading state (contextual, e.g., "Writing your summary…")
        │
        ▼
AI output shown alongside/instead-of original, clearly labeled as AI-generated
        │
        ▼
User: Accept / Edit / Regenerate / Discard
```

### 6.2 Trust & Transparency Principles

- **AI output is always attributed** — visually distinguished (e.g., a subtle "AI-generated" label) so users always know what they wrote vs. what AI wrote, even after acceptance (until edited).
- **AI never silently overwrites user content.** Every AI action is opt-in and previewable before replacing existing text.
- **Explain confidence, not just output** — e.g., job-matching or ATS scoring should briefly explain *why* a score/suggestion was given, not just present a number.
- **Regeneration is cheap and expected** — a visible "Try again" affordance normalizes that first AI output isn't final.

### 6.3 Loading & Retry

Contextual loading messages (tied to the specific action) rather than a generic spinner; on failure, a clear inline error with a one-click retry, and explicit reassurance that no existing content was lost.

### 6.4 Streaming Responses (Future)

Design the AI output area to support incremental/streaming text rendering later (progressive reveal) without restructuring — treat the "AI output" surface as append-friendly from the start.

### 6.5 AI History

A lightweight, accessible log of prior AI generations per section/resume (what was suggested, what was accepted) supports trust and lets users revisit a discarded suggestion.

### 6.6 User Control

Users can always: turn off AI suggestions on the Dashboard, revert any AI edit, and choose to write entirely manually without the product ever gating core functionality behind AI usage.

---

## 7. Design System

### 7.1 Foundations (conceptual, not implementation)

| Category | Direction |
|---|---|
| Typography | A clear type scale (display/heading/body/caption) with generous body-text legibility, since users read/edit dense text-heavy content for extended periods |
| Spacing | Consistent spacing scale (token-based, e.g., 4/8px rhythm) applied uniformly across forms, cards, and dashboard modules |
| Color System | Neutral-dominant palette (resume content is the visual focus) with a single confident accent color for primary actions, plus semantic colors (success/warning/error/info) |
| Elevation | Subtle, purposeful elevation (cards vs. modals vs. dropdowns) to convey hierarchy without visual noise |
| Buttons | Clear primary/secondary/tertiary/destructive hierarchy, consistent sizing and states (default/hover/active/disabled/loading) |
| Inputs | Consistent field styling with clear label, helper text, and error-state patterns across every form in the product |
| Cards | Standardized resume/template card pattern reused across Dashboard, Templates, and Recently Deleted |
| Badges | Status badges (Draft/Complete, AI-generated, Premium) with consistent color-to-meaning mapping |
| Navigation | Consistent primary/contextual/utility nav patterns as defined in Part 2 |
| Tables | Used sparingly (e.g., future Admin/Recruiter views) with clear sorting/filtering affordances |
| Lists | Reusable list patterns for resumes, notifications, AI history |
| Dialogs | Reserved for confirmations and focused tasks (delete confirmation, template switch warning); never used for primary workflows |
| Alerts | Distinct visual language per severity (info/success/warning/error), consistently positioned |
| Icons | A single consistent icon set/style throughout — no mixing icon families |
| Animations | Purposeful, brief motion for state transitions (save confirmation, section expand/collapse); never decorative-only |
| Responsive Grid | A defined breakpoint system driving layout decisions consistently across all screens |
| Design Tokens | Centralized token source (color, spacing, type, radius) as the single source of truth consumed by all components |
| Dark Mode | Token-driven theme support planned from the start, not a bolt-on later |
| Accessibility | WCAG-conformant contrast, focus, and semantics baked into every component definition (see Part 9) |

### 7.2 Consistency Rules

- One button hierarchy, used identically everywhere (no ad-hoc "just this once" styling).
- One error-message tone and structure across the entire app.
- One loading-state pattern (skeleton vs. spinner) per content type, applied uniformly.
- Any new UI pattern must be justified against existing tokens/components before introducing a new one.

---

## 8. Form UX (Large Forms)

### 8.1 Core Patterns

- **Validation:** inline, real-time for format errors (e.g., invalid email), deferred/on-blur for content-quality nudges, blocking only at genuinely required checkpoints.
- **Inline Errors:** positioned directly beside/below the relevant field, specific and actionable ("Add at least one bullet point" vs. "Invalid input").
- **Autosave:** as in Part 4.3 — continuous, visible, failure-transparent.
- **Progress Indicators:** section-level completion status, plus an overall resume-completeness indicator.
- **Section Completion:** visually marked (checkmark/badge) once required fields in a section are filled.
- **Required vs. Optional Fields:** clearly labeled (mark optional fields, since most fields in a resume form are semi-required by convention — mislabeling causes abandonment).
- **Draft Recovery:** if a session ends unexpectedly, the next visit resumes from the last autosaved state with a brief confirmation ("Restored your draft from [time]").
- **Unsaved Changes Warning:** only shown if autosave genuinely hasn't caught up (rare) — prefer fixing the underlying gap over relying on browser "leave site?" dialogs.
- **Performance:** large forms (many experience entries) must remain responsive; lazy-render off-screen sections rather than mounting the entire form at once.

---

## 9. Accessibility

### 9.1 Standards

- **Keyboard Navigation:** every interactive element (including AI actions, section nav, template switcher) fully operable without a mouse.
- **Focus Order:** logical, matching visual/reading order; focus is never trapped or lost after dynamic content changes (e.g., AI output appearing).
- **Screen Readers:** meaningful labels for all form fields, AI-generated content clearly announced as such, live regions used for autosave/AI-loading status updates.
- **Color Contrast:** WCAG AA minimum across all text/background/status-color combinations, including badges and disabled states.
- **ARIA:** used to reinforce semantic structure (dialogs, live regions, expandable sections), never as a substitute for proper semantic elements.
- **Semantic Structure:** proper heading hierarchy, landmark regions, and form/field associations throughout.
- **Reduced Motion:** respect user's reduced-motion preference; all functional animations have a non-animated equivalent.
- **Responsive Accessibility:** touch targets, focus indicators, and reading order all hold up identically across mobile/tablet/desktop, not just desktop.
- **Accessibility Testing:** built into the standard QA checklist (Part 13) — automated linting plus periodic manual screen-reader and keyboard-only passes.

---

## 10. Mobile Experience

### 10.1 Responsive Strategy

| Breakpoint | Navigation | Layout notes |
|---|---|---|
| Mobile | Bottom nav or collapsible top nav; Builder becomes single-column, section-by-section flow | Live Preview becomes a separate toggled view, not side-by-side |
| Tablet | Condensed side nav; Builder may support two-column (form + preview) in landscape | Touch targets remain large; density between mobile and desktop |
| Desktop | Full persistent side nav; Builder shows form + live preview side-by-side | Highest information density |

### 10.2 Touch Targets

Minimum comfortable tap-target sizing across all interactive elements, especially in dense form contexts (section nav, field actions, AI action buttons).

### 10.3 Landscape Mode

On mobile landscape, prioritize either the form or the preview (user-toggled) rather than cramming both — avoid forcing a squeezed side-by-side layout below a reasonable width threshold.

### 10.4 Offline Considerations

Since autosave depends on connectivity, the mobile experience should clearly indicate offline status and queue edits locally where feasible, syncing once reconnected — surfaced via the same "Saving… / Saved" indicator pattern extended with an "Offline — will sync" state.

---

## 11. Empty, Loading & Error States

| State | Design Standard |
|---|---|
| No Data (empty list) | Distinct empty-state illustration/message + single clear primary action, never a blank void |
| First-Time User | Welcoming, guided empty state distinct from "returning user with zero items after deleting everything" |
| Network Errors | Clear, non-technical message + retry action; distinguish from empty-results states |
| AI Failures | Reassure that original content is untouched; offer retry; avoid technical error text |
| Permission Errors | Explain *what* is restricted and, where relevant, how to gain access (e.g., upgrade for premium feature) rather than a bare "403" |
| Session Expired | Redirect to login with context preserved, clear explanatory message, return to prior location post-login |
| Server Errors | Generic, reassuring message ("something went wrong on our end") with a retry/support path; never expose technical detail |
| Maintenance Mode | Dedicated, branded maintenance page with expected-resolution messaging where possible, distinct from a generic error |

---

## 12. Future UX Extensibility

The navigation and interaction patterns defined above are designed to absorb these without restructuring:

- **Multi-language:** all copy is treated as externalized content from day one (no hardcoded assumptions about text length/direction), so localization doesn't require re-layout.
- **Voice Assistant / AI Chat:** the existing "AI Assistant" nav entry and the AI-output interaction pattern (Part 6.1) generalize naturally into a conversational surface without a new top-level architecture.
- **Resume Collaboration:** the section-level ownership concept (Part 4.11) becomes the concurrency unit for real-time multi-user editing.
- **Recruiter Mode:** a parallel persona-scoped navigation shell (candidate search, review queues) reusing the same design system and card/list/table patterns rather than a new product.
- **Premium Features:** already modeled as entitlement-gated affordances (badges, upsell states) rather than hidden features, so gating is a state, not a redesign.
- **Marketplace (templates/add-ons):** the existing Template Switcher pattern (Part 4) extends into a browsable catalog using the same card system.
- **Real-Time Editing:** builds on autosave infrastructure and section-level boundaries already established.
- **Plugin System:** the Settings and Builder section-navigation architecture can host third-party/plugin sections as additional entries in the same list pattern, without new navigational concepts.

---

## 13. UX Standards

| Principle | Standard |
|---|---|
| Consistency | Every recurring pattern (cards, buttons, states) looks and behaves identically everywhere it appears |
| Feedback | Every user action produces a visible, timely response (saved indicator, loading state, confirmation) |
| Discoverability | Core actions are visible by default; advanced actions (shortcuts, version history) are discoverable, not buried |
| Error Prevention | Destructive actions require confirmation; required-field gaps are shown before, not just after, an attempted action |
| User Control | Users can always undo, revert AI output, or opt out of AI assistance entirely |
| Accessibility | WCAG AA is the floor, not the ceiling, for every new component |
| Performance | Perceived performance (skeletons, optimistic UI) is treated as a UX requirement, not just an engineering concern |
| Trust | The product never silently changes or discards user content |
| AI Transparency | AI-generated content is always labeled, always previewable, and never auto-applied without explicit user action |

---

## 14. Common UX Mistakes (Selected, High-Value Set)

| # | Mistake | Why It Happens | Why It Harms Usability | Professional Solution |
|---|---|---|---|---|
| 1 | No autosave in a long form | Deferred as "nice to have" | Users lose significant work on crash/navigation | Debounced autosave with visible status from MVP |
| 2 | Generic "Something went wrong" everywhere | Fastest to implement | Users can't tell what happened or what to do | Context-specific, actionable error messages |
| 3 | AI silently overwrites user content | Simpler flow to build | Destroys trust instantly when a good edit is lost | Always preview AI output before applying |
| 4 | No distinction between draft and complete resumes | Not considered at data-model stage | Users export/share incomplete resumes unknowingly | Explicit status model surfaced everywhere |
| 5 | Blocking validation on every field as you type | Easiest validation to wire up | Interrupts typing, feels punitive | Real-time format checks only; defer content checks |
| 6 | Deleting with no confirmation or recovery | Deprioritized "edge case" | Irreversible accidental data loss | Confirm + soft-delete with restore window |
| 7 | Empty states that look broken | Not designed intentionally | Users think the product is malfunctioning | Purpose-built empty states with clear next action |
| 8 | Spinner-only loading with no context | Default framework behavior | Users don't know what's loading or how long | Skeleton screens + contextual loading text |
| 9 | Mixing icon styles/families | Icons sourced ad hoc over time | Feels unpolished, undermines trust | Single icon system enforced via design tokens |
| 10 | Inconsistent button hierarchy across pages | Built by different people/times without a system | Users can't predict which action is primary | Centralized button hierarchy in the design system |
| 11 | Hiding required fields until submission fails | Form built section-by-section without a full-picture review | Users hit a wall late in the process | Show required-field status throughout, not just at the end |
| 12 | No way to undo an AI rewrite | Undo treated as a "nice to have" | Users fear using AI features at all | Undo/redo and version history as core, not optional |
| 13 | Overloading the Dashboard with every metric possible | "More data = more value" assumption | Cognitive overload, buries the real next action | Curate to a few motivating, actionable stats |
| 14 | Session expiry with silent logout | Simplicity of implementation | Users lose context and think the app is broken | Explicit expiry message + return-to-context after login |
| 15 | Long forms with no progress indicator | Deprioritized as "just UI polish" | Users don't know how much is left, causing abandonment | Section-level and overall progress indicators |
| 16 | Destructive action and safe action styled identically | No defined color/hierarchy system | Accidental irreversible actions | Distinct, consistent destructive-action styling |
| 17 | Mobile nav is a shrunk desktop nav | Ported without redesign | Cramped, hard-to-tap navigation | Purpose-built mobile navigation pattern |
| 18 | Tooltips as the only source of critical information | Convenient to add later | Inaccessible on mobile/touch and to screen readers | Critical info visible inline, not tooltip-only |
| 19 | AI loading state indistinguishable from a frozen app | Generic spinner reused everywhere | Users think the app has crashed | Action-specific loading messaging |
| 20 | No empty-state guidance for first-time users | Empty state treated as edge case, not onboarding | New users don't know what to do first | Welcoming first-run empty state with a single clear CTA |
| 21 | Error messages using technical/internal language | Copy written by engineers under time pressure | Confuses and alarms non-technical users | Plain-language, user-facing error copy |
| 22 | Inconsistent spacing/density across pages | No shared spacing token system | Product feels stitched-together | Token-driven spacing scale applied everywhere |
| 23 | Forcing linear step-by-step resume creation | Simplifies initial build | Frustrates experienced users who want to jump around | Free navigation between sections, with optional guided mode |
| 24 | No way to preview before exporting | Export treated as a simple action | Users export flawed/incomplete resumes repeatedly | Live preview always visible before/at export |
| 25 | Overusing modals for core workflows | Modals are quick to implement | Breaks flow, hides context, poor on mobile | Reserve modals for short confirmations only |
| 26 | Color as the only error/status indicator | Fastest way to signal state | Inaccessible to colorblind users | Pair color with icon/text labeling |
| 27 | No feedback after autosave | Assumed "silent = fine" | Users repeatedly click save or worry work is lost | Explicit, brief "Saved" confirmation |
| 28 | Dense, unbroken long-experience lists | No handling for power users with lots of history | Overwhelming, hard to scan or reorder | Collapsible sections + drag-to-reorder |
| 29 | Feature-gating with no explanation | Quick to hide behind a lock icon | Users don't understand why or how to unlock | Clear entitlement messaging with upgrade path |
| 30 | Notification and AI-suggestion feeds combined | Simpler single feed to build | Users can't distinguish system alerts from suggestions | Separate, clearly labeled feeds |
| 31 | No keyboard shortcuts in a heavy editing tool | Deprioritized for MVP | Power users (professionals) are slowed down | Core shortcuts with a discoverable reference panel |
| 32 | Inconsistent terminology (e.g., "Improve" vs "Enhance" vs "Rewrite") | Copy written independently across features | Confuses users about whether actions differ | Centralized terminology/content style guide |
| 33 | No indication of what's AI-generated vs user-written | Seen as unnecessary friction | Undermines trust and authorship clarity | Persistent AI-generated labeling until edited |
| 34 | Template switch destroys formatting/content silently | Not tested for edge cases (overflow) | Users lose visual work switching templates | Preview + overflow warning before committing |
| 35 | Search with no empty/no-results state | Overlooked secondary state | Users think search is broken when it returns nothing | Explicit "no results" state with filter-clearing action |
| 36 | Overly aggressive "unsaved changes" browser dialogs | Used as a safety net for weak autosave | Annoys users who trust autosave, feels untrustworthy itself | Fix autosave reliability instead of relying on browser prompts |
| 37 | Accessibility treated as a post-launch fix | Deprioritized under deadline pressure | Excludes users, costly to retrofit | Accessibility built into the design system from day one |
| 38 | Recruiter/Admin views reusing candidate UI unchanged | Fastest path to a new persona surface | Wrong information density/priorities for a different job-to-be-done | Persona-specific layout reusing the same design system |
| 39 | Dark mode as an inverted color hack | Retrofitted quickly | Contrast/legibility issues, inconsistent components | Token-driven theming designed alongside light mode |
| 40 | No clear path back to Dashboard from deep flows | Nav treated as "always in the corner" | Users feel stuck inside a task with no way out | Persistent, obvious way back to the hub from every screen |
| 41 | Job Matching results with no explanation of relevance | Score/ranking shown without reasoning | Feels arbitrary, reduces trust in the feature | Brief rationale alongside each match |
| 42 | Treating loading and error states as afterthoughts in design handoff | Design focuses on the "happy path" | Engineers improvise these states inconsistently | Every screen spec includes loading/empty/error states explicitly |

---

## Summary: Core UX Architectural Decisions

1. **Dashboard as hub-and-spoke center** — every feature is one step away and returns cleanly.
2. **Autosave-first philosophy** — visible, reliable, failure-transparent, with version history as a safety net.
3. **AI as a transparent assistant, never an invisible editor** — labeled, previewable, always reversible.
4. **Section-based, non-linear Builder** — free navigation now, and the natural concurrency unit for future collaboration.
5. **A single design-token system** driving typography, spacing, color, and theming (including future dark mode) consistently.
6. **Accessibility and responsive behavior as first-class requirements**, not later passes.
7. **Every screen explicitly specified for empty/loading/error states**, not just the happy path.
8. **Entitlement-based feature gating** (premium, recruiter mode) designed as a state layered on shared components, not a parallel product.

This blueprint is intended as the shared reference for design, frontend, QA, and product teams as the AI Resume Builder evolves from MVP toward a full enterprise-ready product experience.
