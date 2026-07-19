# AI Resume Builder — Resume Builder Module Blueprint

**Audience:** Backend, Frontend, UX, QA, AI Engineering, Product Management
**Status:** Module architecture specification — no code, SQL, or API definitions included

---

## 1. Module Overview

### 1.1 Purpose

The Resume Builder is the core authoring engine of the product: it owns the structured data model of a resume, the editing experience over that data, and the handoff points to every feature that acts on a resume (AI, ATS, PDF export, templates, job matching, future collaboration). Every other module treats a resume as a well-defined, versioned document produced and owned by this module.

### 1.2 Goals

- Provide a structured, section-based data model flexible enough for any resume shape (from a student's first resume to a senior professional's dense history).
- Guarantee users never lose work (autosave + recovery + versioning).
- Present a single, consistent document representation that AI, ATS, Preview, and Export modules all consume identically.
- Remain extensible toward collaboration, portfolios, and plugins without a data-model rewrite.

### 1.3 Responsibilities

- Own the resume document model (sections, ordering, content, metadata).
- Own the editing lifecycle (create, edit, reorder, validate, save, version).
- Own draft/completeness state.
- Provide the canonical document representation consumed by Preview, AI, ATS, and Export.
- Emit lifecycle events (created, updated, section-completed, exported) for Analytics/Notifications to consume.

### 1.4 Out of Scope (owned by other modules, consumed here)

- AI text generation logic (AI module) — Builder only orchestrates *when* AI is invoked and merges results.
- PDF rendering engine (PDF module) — Builder provides the document + template reference; PDF module renders.
- ATS scoring logic (ATS module) — Builder supplies the document; ATS module returns findings.
- Authentication/authorization (Auth module) — Builder enforces ownership checks using identity supplied by Auth.

### 1.5 Dependencies

```
Resume Builder
   ├── depends on → Auth Module (identity, ownership)
   ├── depends on → Template Module (layout definitions)
   ├── provides document to → AI Module
   ├── provides document to → ATS Module
   ├── provides document to → PDF/Export Module
   ├── provides document to → Job Matching Module
   ├── emits events to → Analytics Module
   └── emits events to → Notifications Module
```

### 1.6 Interaction with Other Modules

The Builder is the **document of record**. Other modules never mutate resume content directly — they either read the document (Preview, PDF, ATS, Job Matching) or propose changes that flow back through the Builder's own edit/versioning pipeline (AI suggestions are *applied* through the same section-update mechanism a manual edit would use, not through a side channel).

---

## 2. End-to-End Builder Workflow

```
Create Resume
     │
     ▼
Enter Personal Information ──► (minimum viable identity for the document)
     │
     ▼
Add Sections ──► (choose from standard set + custom sections)
     │
     ▼
Edit Sections ──► (iterative, non-linear, autosaved continuously)
     │
     ▼
Validate ──► (inline as you go; blocking only at export/finalize)
     │
     ▼
Preview ──► (continuously available, not a separate "step")
     │
     ▼
Template Assignment ──► (can happen at any point, re-flows Preview)
     │
     ▼
AI Improvements ──► (optional, per-section or whole-document, always previewed before applying)
     │
     ▼
ATS Analysis ──► (optional, on-demand, produces actionable findings routed back to relevant sections)
     │
     ▼
Export ──► (final validation gate; produces immutable snapshot)
     │
     ▼
Version History ──► (every meaningful state change retained)
     │
     ▼
Share (future) ──► (publishes a controlled-access reference to a specific version)
```

### 2.1 Stage Detail

**Create Resume** — instantiate an empty document shell (owner, timestamps, default status = `DRAFT`), optionally seeded from a template's default section set or a duplicated resume.

**Enter Personal Information** — the only section treated as required at document creation (name + contact minimum); everything else is optional at this stage to avoid front-loading friction.

**Add Sections** — user selects from the standard section catalog (Part 3) and/or adds custom sections; sections are independent, addable/removable at any time.

**Edit Sections** — the primary work loop; non-linear, autosaved, individually validated (Part 5).

**Validate** — continuous, non-blocking inline feedback; a distinct "completeness check" runs before Export/Share to catch anything the user hasn't visited.

**Preview** — a read-only, continuously synchronized projection of the document through the currently assigned template (Part 7); not a discrete workflow step, but an ever-present view.

**Template Assignment** — selecting/changing a template re-renders Preview against the same underlying document; content is never mutated by a template change, only its presentation.

**AI Improvements** — optional enrichment step invocable at any point in editing, not a gate before export; results are proposed, never auto-committed (Part 9.2).

**ATS Analysis** — on-demand evaluation of the current document state; findings reference specific sections so users can jump directly to fix them.

**Export** — the finalize step; runs full completeness/export validation, then hands the document + template to the PDF module and records an immutable **published version snapshot**.

**Version History** — every export, and periodic/major-edit snapshots, are retained and browsable/restorable (Part 6).

**Share (future)** — publishes a stable reference to a chosen version for external viewing/collaboration, decoupled from the live editable draft.

---

## 3. Section Architecture

### 3.1 General Section Model

Every section — standard or custom — shares a common conceptual shape:

```
Section
 ├── type (PERSONAL_INFO, EXPERIENCE, EDUCATION, ... or CUSTOM)
 ├── order (position within document)
 ├── visibility (shown/hidden in export, independent of completeness)
 ├── entries[] (one or more items, where applicable — e.g., multiple jobs)
 ├── completeness state (empty / partial / complete)
 └── metadata (lastEditedAt, source: manual | ai-generated | ai-assisted)
```

This uniform shape is what lets AI, Validation, Preview, and future Collaboration all operate generically across sections rather than needing section-specific logic everywhere.

### 3.2 Section-by-Section Design

**Personal Information**
- *Purpose:* Establishes identity/contact — the only mandatory section.
- *Business rules:* Single entry (not a list); name + one contact method required to leave `DRAFT`-incomplete state.
- *Dependencies:* None; every other section depends on this existing.
- *Validation:* Format checks (email, phone, links) on top of required-field checks.
- *Ordering:* Always first; not user-reorderable.
- *Visibility:* Always visible in export.
- *Future expansion:* Portfolio/profile links, photo (region-dependent — flagged as optional given resume norms vary by country).

**Professional Summary**
- *Purpose:* Short narrative hook, prime candidate for AI generation.
- *Business rules:* Single entry, character-length guidance rather than hard limit (template-dependent fit).
- *Dependencies:* Benefits from Experience/Skills being filled first (better AI context) but not required.
- *Validation:* Length guidance (soft warning, not blocking).
- *Ordering:* Second by default, user-repositionable.
- *Visibility:* Optional — can be hidden.
- *Future expansion:* Multiple tailored variants per job application (linked to Job Matching).

**Education**
- *Purpose:* Academic background.
- *Business rules:* Multi-entry list; each entry = institution, degree, dates, optional details.
- *Dependencies:* None.
- *Validation:* Date-range sanity (end not before start); at least one entry recommended for students/freshers (soft nudge, not blocking).
- *Ordering:* User-reorderable list; entries typically reverse-chronological (system can suggest, not enforce).
- *Visibility:* Optional to hide (e.g., senior professionals may minimize this).
- *Future expansion:* Coursework/thesis sub-details, verified-credential linking.

**Experience**
- *Purpose:* Core credibility section for most users.
- *Business rules:* Multi-entry list; each entry = role, company, dates (or "present"), bullet achievements.
- *Dependencies:* Primary input source for AI Improve/Summary generation.
- *Validation:* Date logic (no overlapping "present" markers beyond one active role unless explicitly allowed); at least one bullet recommended per entry.
- *Ordering:* Reverse-chronological by convention, user-adjustable.
- *Visibility:* Always relevant; hide only in unusual cases (e.g., students with none — section simply empty/omitted).
- *Future expansion:* Achievement quantification prompts, linked recommendation/endorsement data.

**Projects**
- *Purpose:* Substitute/supplement for Experience, critical for students/freshers.
- *Business rules:* Multi-entry; title, description, tech/tools, optional link.
- *Dependencies:* None; often cross-referenced by Skills.
- *Validation:* Link format validation if provided.
- *Ordering:* User-reorderable.
- *Visibility:* Optional.
- *Future expansion:* Media embeds (screenshots, demo links) — see Part 10.

**Skills**
- *Purpose:* Scannable keyword surface, heavily weighted by ATS systems.
- *Business rules:* Tag/list structure rather than free paragraph; optional grouping (technical/soft/tools).
- *Dependencies:* Cross-checked by ATS module against job description keywords.
- *Validation:* Duplicate detection; minimum count soft-suggested for ATS quality.
- *Ordering:* Grouping order user-adjustable; individual skill order lower priority.
- *Visibility:* Always relevant.
- *Future expansion:* Proficiency levels, endorsements, auto-suggested skills from Experience text (AI-assisted).

**Certifications**
- *Purpose:* Credential validation.
- *Business rules:* Multi-entry; name, issuer, date, optional expiry/credential ID.
- *Dependencies:* None.
- *Validation:* Date sanity; expiry-awareness (soft flag for expired certs).
- *Ordering:* Reverse-chronological convention.
- *Visibility:* Optional.
- *Future expansion:* Verified-issuer integrations (future credentialing APIs).

**Languages**
- *Purpose:* Language proficiency listing.
- *Business rules:* Multi-entry; language + proficiency level (structured, not free text).
- *Dependencies:* None.
- *Validation:* Proficiency from a controlled vocabulary (structured, not implemented here as UI — conceptually enumerated).
- *Ordering:* User-reorderable.
- *Visibility:* Optional.
- *Future expansion:* Multi-language resume generation ties into this section directly.

**Achievements / Awards**
- *Purpose:* Differentiating accomplishments outside standard experience.
- *Business rules:* Multi-entry; title, context, date.
- *Dependencies:* None.
- *Validation:* Minimal — mostly free text with date sanity.
- *Ordering:* User-reorderable.
- *Visibility:* Optional.
- *Future expansion:* Linking to Experience/Project entries as supporting evidence.

**Interests**
- *Purpose:* Optional personality/culture-fit signal.
- *Business rules:* Simple tag list.
- *Dependencies:* None.
- *Validation:* None beyond basic length limits.
- *Ordering:* Low priority, typically last.
- *Visibility:* Optional, off by default for space-constrained templates.
- *Future expansion:* None significant.

**References**
- *Purpose:* Contact/referee information, or a placeholder statement.
- *Business rules:* Multi-entry or a single "available upon request" toggle.
- *Dependencies:* Privacy-sensitive — visibility defaults conservative.
- *Validation:* Contact-format validation if full details provided.
- *Ordering:* Typically last.
- *Visibility:* Optional, hidden by default given privacy norms.
- *Future expansion:* Consent-tracking if referee contact details are stored (privacy compliance).

**Custom Sections**
- *Purpose:* Escape hatch for anything not covered (publications, volunteer work, patents).
- *Business rules:* User-defined title + free-form entries following the generic section shape.
- *Dependencies:* None structurally, but AI/ATS treat custom sections generically (title + content heuristics) rather than with section-specific logic.
- *Validation:* Basic structural checks only (non-empty title if section is shown).
- *Ordering:* Fully user-controlled, insertable anywhere.
- *Visibility:* Optional.
- *Future expansion:* Templated custom-section presets (e.g., "Publications" as a semi-standard option) promoted from common custom-section patterns.

---

## 4. Editing Experience

### 4.1 Inline vs. Section Editing

Inline editing (edit-in-place within the section card) is the default interaction for most fields; a dedicated section editing surface is used for entries with many sub-fields (e.g., a full Experience entry) to avoid overcrowding the section card.

### 4.2 Drag-and-Drop Reordering

Both section-level (reordering entire sections) and entry-level (reordering entries within a section, e.g., job order) reordering are supported, with keyboard-accessible alternatives (move up/down actions) for parity (Part 9 of the UX blueprint applies here).

### 4.3 Undo / Redo

A single undo/redo stack spans the entire editing session (not per-section), since actions like AI-apply, reorder, and field edits are often corrected in sequence and users expect one consistent history.

### 4.4 Autosave & Manual Save

Continuous autosave is the primary save mechanism (Part 8); manual save exists as a user-facing confidence action but triggers the same underlying persistence path — there is no separate "unsaved draft vs. saved draft" data model, only one draft continuously synchronized.

### 4.5 Draft Recovery

On reopening a resume (new session, crash recovery, or after connectivity loss), the Builder reconciles against the last persisted autosave state and restores the user to it, with a brief non-intrusive confirmation of what was restored.

### 4.6 Conflict Detection

Even before real-time collaboration exists, conflicts can occur (same user editing from two tabs/devices). The Builder detects a stale write (based on a document version/revision marker) and resolves by presenting the newer state rather than silently overwriting — this same mechanism is the foundation for future multi-user conflict resolution (Part 10).

### 4.7 Keyboard Navigation

Full keyboard operability across section navigation, field editing, reordering (move up/down as an alternative to drag), and core actions (save, undo, AI-improve) — a functional requirement, not a nice-to-have, given accessibility standards set in the UX blueprint.

### 4.8 Large Resume Performance

For resumes with many entries, the Builder loads/renders sections progressively (only the active/visible sections fully hydrated) and defers heavy operations (AI calls, ATS analysis) to explicit user action rather than running continuously in the background.

---

## 5. Validation Strategy

| Validation Type | Where It Belongs | Behavior |
|---|---|---|
| Field Validation | Within each field, real-time | Format checks (email, dates, URLs); immediate, non-blocking |
| Business Validation | Section level | Rules like date-range sanity, single-active-role logic; on-blur or on-save |
| Cross-Section Validation | Document level | Rules spanning sections (e.g., flagging if Skills is empty but Experience references tools) — advisory, not blocking |
| Completeness Checks | Document level, triggered pre-export/share | Confirms required minimums (Personal Info) and flags empty-but-expected sections |
| Export Validation | Gate before handoff to PDF module | Blocking only on genuinely required data (Personal Info); everything else is a warning the user can override |
| AI Validation | Within the AI module boundary, but surfaced in Builder | Checks AI output isn't empty/malformed before offering it for user acceptance |
| ATS Validation | Within the ATS module boundary, surfaced via findings routed to sections | Not a gate — informational, drives user-initiated fixes |

**Principle:** validation gets stricter and more consequential as the user moves toward Export/Share; it stays advisory and non-blocking throughout ordinary editing.

---

## 6. Versioning

### 6.1 Version Types

```
Live Draft (continuously autosaved, always mutable)
     │
     ├── Periodic Snapshot (e.g., daily or after significant edit volume)
     ├── AI-Generated-Change Snapshot (before/after any AI apply)
     ├── Template-Change Snapshot (before switching templates, if content overflow risk detected)
     └── Published Version (created on every Export/Share — immutable)
```

### 6.2 Restore & Rollback

Any snapshot or published version can be restored, which creates a **new live draft state seeded from that version** (never destructively rewinds history) — restoring is itself a recorded action, preserving a full audit trail rather than deleting intermediate history.

### 6.3 Compare Versions

Version comparison is section-aware (diff by section/entry) rather than raw-text diffing, since resume content is structured — this makes "what changed" meaningful to a user reviewing an AI edit or a prior export.

### 6.4 Relationship to Export

Every completed Export creates a Published Version snapshot automatically; this is how "Version History" (Part 2) stays populated even for users who never manually trigger a snapshot.

---

## 7. Resume Preview

### 7.1 Synchronization

Preview is a **read-only projection** of the same document state the editor holds — not a separately fetched/rendered copy — updated reactively as the user edits, so there is never a "stale preview" state to reconcile.

### 7.2 Refresh Strategy

Debounced re-render on edit (avoiding a full re-render per keystroke) balances responsiveness with performance, especially for template layouts with complex pagination logic.

### 7.3 Template Rendering

Preview renders the document through the currently assigned template's layout rules; switching templates re-runs rendering against the *same* document data — template and content are strictly decoupled (Part 2.6).

### 7.4 Zoom & Print Preview

Preview supports zoom for detail review and a distinct "print preview" mode that shows exact page boundaries/pagination as the export will produce, avoiding surprises between what's edited and what's exported.

### 7.5 Page Breaks

Page-break calculation must be template-aware and content-aware (e.g., don't split a single Experience entry mid-entry across pages where avoidable) — this logic is owned by the Template/PDF rendering layer but must be reflected identically in Preview to keep the two consistent.

### 7.6 Performance

For large resumes, Preview should avoid full re-layout on every keystroke by scoping re-render to the affected section where possible, falling back to full re-render only when pagination-affecting changes occur.

---

## 8. Autosave Architecture

### 8.1 Frequency

Debounced save triggered after a pause in active editing (not on every keystroke), supplemented by save-on-blur (leaving a field) and save-before-navigation as safety nets.

### 8.2 Conflict Handling

Each save carries a document revision marker; if the server detects the client's base revision is stale (edited elsewhere since last sync), the save is rejected with the newer state returned for reconciliation rather than silently overwritten (ties directly to Part 4.6).

### 8.3 Offline Changes

Edits made while offline are queued locally and flushed once connectivity returns, using the same revision-conflict mechanism to reconcile if the server state changed in the meantime — surfaced to the user via a clear "offline — changes will sync" indicator rather than failing silently.

### 8.4 Recovery

If a save fails (network/server error), the Builder retries with backoff and keeps the unsaved state resident in the client until confirmed persisted — never discarding local edits on a failed save.

### 8.5 Status Indicators

A consistent, always-visible save-state indicator (Saved / Saving… / Offline / Save failed — retrying) gives the user constant confidence about the safety of their work, per the UX blueprint's autosave principles.

### 8.6 Failure Handling

Persistent failures (repeated retries exhausted) escalate to a visible, actionable error state — never a silent stop — with an option to manually retry or export/download a local backup of current content as a last resort.

---

## 9. Integration with Other Modules

| Module | Integration Pattern |
|---|---|
| **Authentication** | Every Builder operation resolves ownership from the authenticated identity; no resume operation proceeds without an ownership/permission check |
| **AI Module** | Builder sends section content + context (job description, if provided) as input; receives proposed content back; nothing is applied to the document until the user accepts, at which point it flows through the normal section-update path (indistinguishable from a manual edit once accepted, except for retained `source: ai-generated` metadata) |
| **PDF Module** | Builder hands off the finalized document + assigned template reference at Export time; PDF module owns rendering-to-file, Builder owns triggering it and recording the resulting Published Version |
| **ATS Module** | Builder supplies the current document (optionally with a job description) on request; ATS module returns structured findings (section-referenced) that the Builder surfaces as actionable, dismissible items linked back to the relevant section |
| **Job Matching** | Builder's document (especially Skills/Experience) is the input signal; Job Matching is a consumer, not a mutator, of Builder data |
| **Analytics** | Builder emits lifecycle events (resume created, section completed, exported, AI-used) that Analytics aggregates; Builder itself holds no analytics logic |
| **Notifications** | Builder emits state-change events (e.g., "resume incomplete for 7 days," "ATS check available") that Notifications module decides whether/how to surface |
| **Templates** | Builder references a template by ID/version; template rendering rules live in the Template module, keeping content and presentation independently versionable |
| **Future Collaboration** | Builder's section-level structure and revision-marker mechanism (Part 4.6, 8.2) are the foundation collaboration will extend with presence/locking rather than requiring new document-model concepts |

---

## 10. Scalability Plan

The module is designed so the following are additive, not restructuring:

- **Collaborative Editing:** the existing document revision-marker and section-level granularity (Parts 4.6, 8.2) become the basis for operational-transform/CRDT-style merge logic at the section level.
- **Real-Time Presence:** presence indicators attach to the existing section-boundary concept (who's viewing/editing which section) without new document structure.
- **Comments & Suggestions:** modeled as an overlay entity referencing a section/entry ID, not embedded in the content itself — keeps the core document model clean and comments independently addable later.
- **Portfolio Sections:** fits the existing generic Section model (Part 3.1) as a new section type with media-capable entries.
- **Embedded Media:** extends the entry model with a media-reference field, following the same entry shape already used for Projects/Certifications.
- **Custom Widgets:** the Custom Section mechanism (Part 3.2) is the extensibility point — a widget is a specialized rendering of a custom-section entry.
- **Plugin System:** plugins register new section types or AI actions against the same generic Section/entry contracts, rather than requiring core model changes.
- **Multiple Languages:** since section content is stored as structured data rather than pre-rendered text, localized rendering (labels, dates, template chrome) is a presentation-layer concern; content translation is modeled as an alternate-language variant of the same document (linked, versioned) rather than a new resume.

---

## 11. Quality Standards

| Area | Standard |
|---|---|
| Validation | Layered per Part 5; never block ordinary editing, always block malformed export |
| Performance | Section-scoped rendering/persistence; no operation should require full-document reprocessing for a single-field edit |
| Accessibility | Full keyboard operability and screen-reader semantics for every editing interaction (aligned with the UX blueprint's Part 9) |
| Maintainability | All sections conform to the generic Section/entry model (Part 3.1) — section-specific logic is the exception, not the rule |
| Extensibility | New section types, AI actions, and export targets must be addable via configuration/registration, not core rewrites |
| Testing | Every section type covered by validation/completeness test cases; autosave/conflict paths explicitly tested for race conditions |
| Logging | Lifecycle events (create, edit, AI-apply, export, restore) logged with enough context for support/debugging, without logging full resume content in plaintext logs |
| Documentation | Section catalog, validation rules, and event contracts documented centrally as the source of truth for cross-team implementation |

---

## 12. Common Design Mistakes (Selected, High-Value Set)

| # | Mistake | Why It Happens | Why It Causes Problems | Professional Solution |
|---|---|---|---|---|
| 1 | Treating each resume section as a bespoke data structure | Built incrementally, feature-by-feature | Explodes maintenance cost; every new feature must special-case every section | Generic Section/entry model (Part 3.1) applied uniformly |
| 2 | Coupling content data to template/presentation | Fastest way to get a first render working | Any template addition requires touching content logic | Strict content/template separation (Part 7.3) |
| 3 | Saving only on explicit "Save" click | Simpler initial implementation | Users lose work on crash/navigation | Continuous debounced autosave from the start |
| 4 | No document revision/versioning marker | Not needed until multi-tab/multi-device use appears | Silent overwrite conflicts, undetectable data loss | Revision marker + conflict detection from day one |
| 5 | AI output directly overwriting document state | Simplifies the AI integration | Destroys trust, unrecoverable bad edits | AI proposes; user-accept flows through normal edit path |
| 6 | Full-document re-render on every keystroke | Simplicity of a naive reactive binding | Severe performance degradation on large resumes | Section-scoped reactivity/rendering |
| 7 | Blocking validation during normal editing | Easiest validation to implement | Interrupts flow, punishes exploration | Non-blocking inline validation; blocking only at export |
| 8 | No distinction between draft and published state | Deferred as unnecessary complexity | Users unintentionally share/export incomplete work | Explicit draft vs. published-version model (Part 6) |
| 9 | Undo/redo scoped per-field instead of per-session | Easier to implement locally | Confusing, inconsistent undo behavior across actions | Single session-wide undo/redo stack |
| 10 | No conflict handling for concurrent edits (even single-user, multi-tab) | Assumed single-session usage | Silent data loss when two tabs save | Revision-based conflict detection and reconciliation |
| 11 | Hardcoding section order | Simplifies initial data model | Blocks user customization and future section types | User-controlled `order` field per section |
| 12 | Treating custom sections as second-class/hacked-in | Added late as an afterthought | Inconsistent behavior vs. standard sections | Custom sections conform to the same generic model |
| 13 | No completeness/export validation gate | Deferred, seems unnecessary early on | Broken/incomplete exports reach recruiters | Explicit pre-export completeness check |
| 14 | Storing AI-generated content indistinguishably from user content | Simpler storage model | Loses attribution, breaks trust/transparency features | Persistent `source` metadata on content |
| 15 | Synchronous, blocking AI calls within the main edit flow | Simplicity of implementation | UI freezes/feels broken during generation | Async AI invocation with clear loading/failure states |
| 16 | No offline handling for autosave | Assumed always-online usage | Data loss or confusing failures on flaky connections | Local queueing + reconciled sync on reconnect |
| 17 | Pagination/page-break logic duplicated differently in Preview vs. Export | Built by different teams/times | Preview doesn't match final export, breaking trust | Shared pagination logic/contract between Preview and PDF module |
| 18 | No version history at all | Deprioritized as "nice to have" | Users can't recover from bad AI edits or accidental changes | Automatic snapshots at key lifecycle points (Part 6) |
| 19 | Section-specific validation logic scattered across the codebase | Organic growth without a strategy | Inconsistent rules, hard to audit/maintain | Centralized validation strategy applied per Part 5 |
| 20 | Treating ATS/ AI findings as blocking errors | Overzealous validation design | Frustrates users with advisory-only information | Findings are informational, routed to sections, never blocking |
| 21 | No keyboard-accessible alternative to drag-and-drop reordering | Drag-and-drop implemented as the only path | Excludes keyboard/screen-reader users entirely | Move up/down actions as first-class alternatives |
| 22 | Large resumes fully hydrated/rendered at once | Simpler initial rendering approach | Performance collapse for power users with extensive history | Progressive/section-scoped hydration |
| 23 | Template switch silently truncating/losing content | Overflow handling not considered | Users lose work without warning | Overflow detection + warning before committing template change |
| 24 | No distinction between advisory and blocking validation severity | Binary valid/invalid model | Either too strict (frustrating) or too lax (bad exports) | Tiered severity model (Part 5) |
| 25 | Logging full resume content (PII) in plaintext application logs | Convenient for debugging | Privacy/compliance risk | Structured event logging without raw content |
| 26 | No plan for multi-language content from the start | English-only assumption at launch | Retrofitting localization requires data-model rework | Structured content model decoupled from rendering language |
| 27 | Comments/suggestions modeled as embedded content | Fastest to bolt onto existing fields | Pollutes core content, hard to remove/version cleanly | Comments as overlay entities referencing section/entry IDs |
| 28 | No generic extensibility point for new section types | Sections hardcoded as an enum with unique handling | Every new section type requires broad codebase changes | Registration-based section-type extensibility |
| 29 | Assuming single-device, single-session usage permanently | Convenient initial assumption | Breaks down the moment users use mobile + desktop together | Design conflict/sync handling early, even pre-collaboration |
| 30 | No explicit event contract between Builder and other modules | Modules built in isolation, integrated ad hoc | Fragile, hard-to-trace integration bugs | Documented lifecycle event contract (Part 11) |
| 31 | Treating Preview as a separate fetch/render pipeline from the editor | Seems architecturally cleaner at first | Preview drifts out of sync with actual document state | Preview as a direct read-only projection of live document state |
| 32 | No recovery path when autosave fails repeatedly | Assumed saves "always eventually succeed" | Silent, unrecoverable data loss in edge cases | Escalating failure state with manual retry/backup option |
| 33 | Over-restricting required fields across every section | Defensive validation design | High abandonment from unnecessary friction | Minimal true requirements (Personal Info only), everything else advisory |
| 34 | Section reordering not persisted consistently with content edits | Treated as a separate, lower-priority operation | Order resets or desyncs from actual document state | Order is a first-class field on the same save path as content |
| 35 | No shared document-versioning concept between Builder and Export/Share | Each feature built its own snapshot mechanism | Fragmented, inconsistent version history across features | Single unified versioning model consumed by Export, Share, and Restore alike |

---

## Summary: Core Module Architectural Decisions

1. **A single generic Section/entry model** underlies every resume section — standard or custom — keeping the module maintainable and extensible.
2. **Content and template are strictly decoupled**, enabling independent evolution of both and consistent Preview/Export behavior.
3. **Continuous autosave with revision-based conflict detection** is the backbone of data safety, extending naturally into future offline and collaborative editing.
4. **AI is integrated as a proposer, not a mutator** — all AI output flows through the same edit/versioning path as manual changes, preserving attribution and reversibility.
5. **Validation is tiered by consequence** — advisory during editing, blocking only at genuine export/completeness gates.
6. **Versioning is unified** across autosave snapshots, AI-change snapshots, template-change snapshots, and published exports — one system, not several.
7. **Every module integration point (AI, ATS, PDF, Job Matching, Analytics, Notifications) treats the Builder's document as the single source of truth**, consumed via clear read/propose contracts rather than direct mutation.
8. **Scalability toward collaboration, portfolios, media, and plugins** is achieved by extending the existing generic model, not redesigning it.

This blueprint is intended as the shared reference for backend, frontend, AI engineering, QA, and product teams implementing the Resume Builder module.
