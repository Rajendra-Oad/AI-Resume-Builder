y# Resume Domain Architecture Blueprint
### AI Resume Builder — Official Domain Guide
**Audience:** Backend, Frontend, Database, AI, QA, Product
**Scope:** Business domain only — no code, SQL, APIs, or UI implementation

---

## Table of Contents
1. Business Domain Analysis
2. Resume Lifecycle
3. Resume Structure
4. Business Rules
5. Module Interactions
6. Versioning Strategy
7. Validation Strategy
8. Template Architecture
9. Import/Export Architecture
10. Analytics
11. Future Expansion
12. Development Standards
13. Common Business Logic Mistakes

---

## 1. Business Domain Analysis

Each capability below is a **business capability**, not a technical feature — it exists to serve a specific user or organizational need.

| Capability | Why It Exists |
|---|---|
| **Resume Creation** | Entry point to the domain. Users need a starting artifact before anything else can happen. |
| **Resume Editing** | Resumes are living documents; careers evolve, so content must be mutable. |
| **Resume Saving** | Users must not lose work; trust in the product depends on durable persistence. |
| **Resume Publishing** | Marks a resume as "ready for use" (export/share), distinct from a work-in-progress draft. |
| **Resume Versioning** | Enables experimentation (e.g., different resumes per job) without destroying prior work. |
| **Resume Preview** | Users need to see the *rendered* output before committing to export/share — WYSIWYG trust. |
| **Resume Sharing** | Enables external validation (recruiters, mentors, peers) without requiring an export. |
| **Resume Duplication** | Supports tailoring the same base resume for multiple roles/companies. |
| **Resume Import** | Reduces creation friction for users who already have a resume elsewhere. |
| **Resume Export** | The resume must leave the system in a portable, universally accepted format (PDF, DOCX). |
| **Resume Archiving** | Supports "soft retirement" of resumes without permanent loss — declutters active view. |
| **Resume Deletion** | Gives users control over their data (also a compliance/privacy requirement). |
| **Resume Recovery** | Protects against accidental loss; a safety net after deletion/archiving. |
| **Resume Analytics** | Gives users/product insight into resume quality, usage, and effectiveness. |
| **Resume Collaboration** (future) | Careers are often shaped with help from mentors, career coaches, or recruiters. |

**Key principle:** every capability maps to a *user intent* or *organizational need* — none exist purely for technical convenience.

---

## 2. Resume Lifecycle

### 2.1 Conceptual Stages

```
[Creation] → [Draft] → [Editing] ⇄ [Validation]
                                       │
                                       ▼
                                  [Preview]
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼              ▼
                 [AI Enhancement] [Template Assign] [Manual Edit]
                         └─────────────┼─────────────┘
                                       ▼
                                [PDF Generation]
                                       │
                                       ▼
                                  [Publishing]
                                       │
                                       ▼
                              [Version Creation]
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼              ▼
                   [Sharing]     [Archiving]     [Deletion]
                                                       │
                                                       ▼
                                                  [Recovery]
                                                  (time-boxed)
```

### 2.2 Stage Definitions

- **Creation** — a resume shell is instantiated; owned by exactly one user; empty or template-seeded.
- **Draft** — default state; not considered "final"; freely mutable; not guaranteed export-ready.
- **Editing** — active mutation of any section; can happen many times across the lifecycle, not just pre-publish.
- **Validation** — a continuous, non-blocking gate that classifies the resume as *incomplete*, *valid-but-improvable*, or *export-ready*.
- **Preview** — read-only rendering of current state using a selected template; does not alter domain data.
- **AI Enhancement** — optional, invoked, produces *suggestions* that a human must accept — AI never silently mutates the resume of record.
- **Template Assignment** — binds structural content to a presentational template; reversible, non-destructive.
- **PDF Generation** — a derived artifact; not the source of truth (the structured resume data is).
- **Publishing** — declares a version "intended for external use"; freezes that version's content.
- **Version Creation** — a snapshot event; can be automatic (autosave) or manual (explicit "save version").
- **Sharing** — exposes a specific version via a controlled channel (link, recruiter access).
- **Archiving** — soft-hides a resume from active workspaces; fully reversible.
- **Deletion** — soft-delete by default; enters a recovery window before permanent purge.
- **Recovery** — restores a deleted/archived resume to its prior active state within a policy window.

### 2.3 State Transition Diagram

```
DRAFT ──edit──> DRAFT
DRAFT ──validate(pass)──> READY
READY ──publish──> PUBLISHED
PUBLISHED ──edit──> DRAFT (new working copy; published version stays frozen)
ANY(non-deleted) ──archive──> ARCHIVED
ARCHIVED ──restore──> DRAFT/READY (previous state)
ANY ──delete──> SOFT_DELETED
SOFT_DELETED ──recover(within window)──> previous state
SOFT_DELETED ──purge(after window)──> PERMANENTLY_DELETED
```

---

## 3. Resume Structure

| Section | Purpose | Ownership | Required? | Business Rules | Dependencies | Future Expansion |
|---|---|---|---|---|---|---|
| **Personal Info** | Identity & contact | User | Required | Must have at least name + one contact method | None | Multiple profiles per identity (e.g., alt emails) |
| **Professional Summary** | Elevator pitch | User (AI-assisted) | Optional but strongly recommended | Length-bounded (business rule, not hard validation) | Benefits from Experience/Skills being filled first | AI tone variants (formal/casual) |
| **Education** | Academic credibility | User | Required unless Experience present | At least one entry if no work experience exists | None | Institution verification integration |
| **Experience** | Core value proof | User | Required unless Education-only path (students) | Reverse-chronological expected; overlapping dates allowed (concurrent roles) | None | Recruiter-verified experience |
| **Projects** | Practical proof of skill | User | Optional | Useful substitute for thin Experience (students, career changers) | Often linked to Skills | GitHub/Portfolio auto-sync |
| **Skills** | Searchable, matchable competencies | User (AI-assisted) | Required for Job Matching/ATS to function well | Should map to a normalized skill taxonomy | Referenced by Job Matching, ATS Checker | Skill proficiency levels, endorsements |
| **Certifications** | Verified credentials | User | Optional | Should include issuing body + date | None | Verification via issuer API |
| **Languages** | Communication reach | User | Optional | Proficiency scale should be standardized | None | Localization tie-in |
| **Achievements** | Differentiation | User | Optional | Should be quantifiable where possible | None | AI impact-scoring |
| **Interests** | Cultural fit signal | User | Optional | Low business weight; never blocks completeness | None | — |
| **References** | Trust signal | User | Optional | Should never be auto-shared without consent (PII) | None | Reference-request workflow |
| **Custom Sections** | Flexibility for edge cases (publications, patents, volunteering) | User | Optional | Must not break template mapping | None | Section marketplace/templates |

**General rule:** "Required" is *contextual*, not absolute — see Business Rules §4.4.

---

## 4. Business Rules

### 4.1 Editing & Ownership
- Only the owning user may edit a resume, unless Collaboration (future) grants explicit, scoped edit rights.
- System/AI processes may propose changes but never commit them without user confirmation.

### 4.2 Completeness
- A resume is "complete" when all *contextually required* sections are populated and pass validation — not when every possible section is filled.
- Completeness is a **spectrum** (percentage), not a boolean gate, except at the moment of Publish/Export, where a minimum threshold applies.

### 4.3 Resume Quantity
- Users have a tiered limit on number of active resumes (e.g., free vs. premium), enforced at creation, not silently at random points.
- Archived/deleted resumes should not count against active limits.

### 4.4 Contextual Requirement Logic
| Condition | Rule |
|---|---|
| No Experience entries | Education becomes required |
| No Education entries | Experience becomes required |
| Neither present | Resume is flagged incomplete; export is blocked or warned |

### 4.5 Section Reordering
- All sections are reorderable by the user except Personal Information (always first) — this is a presentation-layer concern but governed by a business rule to preserve ATS parsing conventions.

### 4.6 Templates
- Multiple templates may render the same underlying resume data (data/presentation separation).
- Switching templates must never mutate or lose structured data, only re-map presentation.

### 4.7 Deletion Behavior
- Deletion is soft by default; a recovery window (policy-defined, e.g., 30 days) precedes permanent purge.
- Deleting a resume does not delete its published, shared snapshots already distributed externally (those are frozen artifacts).

### 4.8 Duplication Behavior
- Duplication creates a fully independent copy (no shared version history with the original).
- Duplicated resumes reset analytics counters; they are treated as new entities.

### 4.9 Drafts
- Autosave applies only to Draft state.
- A Draft can be abandoned (never published) indefinitely without penalty.

### 4.10 Version History
- Every Publish action creates an immutable version snapshot.
- Autosave creates *recoverable checkpoints*, not full "versions" in the user-facing sense, unless promoted manually.

---

## 5. Module Interactions

| Module | Responsibility Boundary with Resume Domain |
|---|---|
| **Authentication** | Supplies identity/ownership context; Resume domain trusts but never manages credentials. |
| **AI Module** | Consumes resume data (read), returns *suggestions*; never writes directly to the resume of record. |
| **PDF Module** | Consumes a finalized/preview resume snapshot; produces a derived, disposable artifact. |
| **ATS Module** | Reads resume + job context (optional); returns a compatibility score/report; read-only relationship. |
| **Job Matching** | Reads Skills/Experience taxonomy; resume domain does not know matching algorithm internals. |
| **Notifications** | Subscribes to domain events (resume created, published, AI suggestion ready); Resume domain only emits events. |
| **Analytics** | Subscribes to lifecycle/usage events; Resume domain is a data source, not a consumer of analytics. |
| **Admin** | Read/audit access for support and compliance; write access only for moderation actions (e.g., policy violations), always logged. |
| **Collaboration (future)** | Will require a permissions layer sitting *above* the Resume domain — Resume domain itself stays single-owner at its core. |

**Design principle:** the Resume domain is the *source of truth*; every other module is either a consumer, an event subscriber, or a bounded contributor via suggestions — never a silent mutator.

---

## 6. Resume Versioning

### 6.1 Concepts
- **Draft (working copy):** current mutable state.
- **Published Version:** immutable snapshot at time of publish; carries its own template + content freeze.
- **Autosave:** frequent, low-ceremony checkpoint of the Draft; not shown as a formal "version" by default.
- **Manual Save (Version Checkpoint):** user-triggered, named snapshot — distinct from Publish (doesn't imply "ready for external use").

### 6.2 Version Diagram

```
Draft --autosave--> Checkpoint(t1)
Draft --autosave--> Checkpoint(t2)
Draft --manual save--> Named Version(v1)
Draft --publish--> Published(v1-final) [immutable]
Draft --edit continues--> Draft(v2-in-progress)
Draft --publish--> Published(v2-final) [immutable]
```

### 6.3 Restore & Compare
- **Restore Version:** creates a *new* Draft seeded from a past version's content — never rewrites history in place.
- **Compare Versions:** a read-only diff across sections (conceptually similar to document diffing); no mutation.

### 6.4 Template Changes & AI-Generated Versions
- Changing a template on a published version does not alter that version; it creates a new derivative version.
- AI-generated rewrites are proposed as a *candidate version* the user can accept (creating a new checkpoint) or discard.

### 6.5 Rollback & Conflict Resolution
- Rollback = Restore + Publish in sequence; never destructive to intervening versions.
- Conflict Resolution (e.g., concurrent edits from two devices): last-write-wins at the checkpoint level is acceptable for single-owner resumes; Collaboration (future) will require operational-transform-style resolution.

---

## 7. Validation Architecture

### 7.1 Validation Layers

| Layer | Concern | Example |
|---|---|---|
| **Formatting Validation** | Structural correctness | Dates are valid ranges, emails are well-formed |
| **Business Validation** | Domain rules | Contextual requirement (§4.4), section limits |
| **Consistency Validation** | Cross-section coherence | Skills referenced in Experience exist in Skills section |
| **Export Validation** | Fitness for output | Minimum completeness threshold before PDF/DOCX export |
| **AI Validation** | Quality of AI-assisted content | AI suggestions must not introduce factual claims not present in original input |

### 7.2 Where Validation Belongs
- **Structural/formatting** validation lives close to data entry (immediate feedback).
- **Business/consistency** validation is a domain-service concern, run on save and before publish/export.
- **Export validation** is a *gate*, evaluated only at the export/publish boundary — it should never block ordinary editing.
- Validation results are always advisory during Draft state and only become blocking at Publish/Export.

### 7.3 Required vs Optional Decision Table

| Section | Default | Becomes Required When |
|---|---|---|
| Personal Info | Required | Always |
| Experience | Optional | No Education present |
| Education | Optional | No Experience present |
| Skills | Recommended | Job Matching/ATS features are used |
| All others | Optional | Never mandatory |

---

## 8. Resume Templates

### 8.1 Core Principles
- **Data/Presentation Separation:** the resume's structured content never depends on a specific template.
- **Template Assignment** is a pointer/reference, not a copy of content into a template-specific format.

### 8.2 Compatibility & Section Mapping
- Every template declares which sections it supports and in what order/layout — the Resume domain does not adapt to templates; templates adapt to resume structure.
- Custom Sections must degrade gracefully in templates that don't explicitly support them (e.g., generic "additional section" rendering).

### 8.3 Theme, Customization, Localization, Accessibility
- **Theme support:** color/typography variations are presentation-only, never alter data.
- **Customization:** user-level tweaks (spacing, accent color) stored as template preferences tied to a resume-template pairing.
- **Premium Templates (future):** gated by entitlement, not by domain logic — Resume domain only checks "is this template available to this user."
- **Localization:** section labels and date formats must be externalized from day one, even before multi-language is built.
- **Accessibility:** templates must guarantee a logical reading order independent of visual layout (critical for ATS parsing and screen readers alike).

---

## 9. Import & Export Architecture

### 9.1 Import Workflow (Conceptual)

```
[Source File] → [Parsing] → [Field Extraction] → [Validation] → [Draft Resume]
                                                        │
                                                 (on failure)
                                                        ▼
                                          [Partial Import + User Review]
```

- **Parsing** must be tolerant — partial success is preferred over all-or-nothing failure.
- **Error Handling:** unparseable fields are flagged for manual entry, not silently dropped.
- Imported resumes always land in Draft state — never auto-published.

### 9.2 Export Workflow (Conceptual)

```
[Resume Data (Draft or Published)] → [Export Validation] → [Render] → [Artifact: PDF/DOCX/JSON]
```

- **PDF:** primary, human-facing export; must pass Export Validation.
- **DOCX (future):** same pipeline, different renderer; structural fidelity must match PDF output.
- **JSON Backup:** full-fidelity structured dump — used for portability and disaster recovery, not for human reading.
- **Cloud Backup (future):** an automated, periodic JSON export to external storage; conceptually a subscriber to save events, not a special-cased code path.

---

## 10. Analytics

| Metric | Business Value |
|---|---|
| **Completion Percentage** | Nudges users toward export-ready resumes |
| **Missing Sections** | Directs user attention; feeds AI suggestions |
| **Skill Distribution** | Powers Job Matching quality and product-level talent trend insight |
| **Update Frequency** | Signals active vs. dormant users; informs re-engagement |
| **AI Usage** | Measures feature adoption; informs AI cost/product decisions |
| **Export History** | Indicates real-world usage intent (job-seeking activity) |
| **Template Popularity** | Informs template roadmap and premium template investment |

**Principle:** Analytics is always a *read-only subscriber* to Resume domain events — it never feeds back into resume content directly.

---

## 11. Future Expansion

The domain model already supports these without redesign, because of the separations established above (data/presentation, source-of-truth vs. derived artifacts, event-driven module boundaries):

- **Team Collaboration** — adds a permissions layer above existing single-owner model.
- **Recruiter Comments / Resume Reviews** — modeled as annotations referencing a specific version, not mutations of it.
- **Portfolio Links / GitHub Integration / LinkedIn Import** — extensions of the Import workflow (§9.1) and Custom Sections (§3).
- **Multiple Languages** — extension of the localization groundwork in Templates (§8.3).
- **Premium Features / Resume Marketplace** — entitlement checks layered on existing Template Assignment concept.
- **Interview Tracking** — a new bounded context that references Resume versions but doesn't alter this domain.

---

## 12. Development Standards

- **Resume Services:** one cohesive domain service per lifecycle concern (Creation, Versioning, Validation, Export) — avoid a single monolithic "ResumeService" god-object.
- **Validation:** centralized rule definitions, layered per §7, reusable across create/edit/publish/export flows.
- **DTOs:** never expose internal domain models directly to AI, PDF, or Export modules — always a purpose-built contract per consumer.
- **Mappers:** one mapper per (domain model ↔ external representation) pair; mappers are one-directional in intent even if bidirectional in code.
- **Versioning:** every mutation-worthy event is snapshot-capable; version identity must be immutable once published.
- **Logging:** every lifecycle transition (create, publish, delete, restore) must be logged with actor, timestamp, and resume/version ID.
- **Testing:** every business rule in §4 and every validation rule in §7 must have a corresponding test case — rules are the real "spec."
- **Documentation:** this blueprint is the canonical source; module-specific docs must reference, not restate, these rules.
- **Future Feature Development:** any new feature must map to an existing lifecycle stage or module boundary before implementation begins — if it doesn't fit, the blueprint gets updated first.

---

## 13. Common Business Logic Mistakes

| # | Mistake | Why It Happens | Why It's Harmful | Professional Solution |
|---|---|---|---|---|
| 1 | Treating "Draft" and "Published" as the same entity | Simpler initial data model | Editing a published resume silently breaks shared/exported copies | Model Published as an immutable snapshot |
| 2 | Hard-deleting on user "delete" | Seems simpler than soft-delete | No recovery path; one accidental click = data loss | Always soft-delete with a recovery window |
| 3 | Making all sections mandatory | Easier validation logic | Blocks legitimate use cases (students, career changers) | Contextual requirement rules (§4.4) |
| 4 | Letting AI write directly to resume data | Feels "seamless" | Removes user consent/control, causes trust issues | AI proposes; user commits |
| 5 | Coupling template to resume data structure | Fast to build v1 | Any new template requires a data migration | Strict data/presentation separation |
| 6 | Using booleans for "complete" | Simple UI badge | Loses nuance; frustrates users at the margin | Percentage-based completeness |
| 7 | No distinction between autosave and versions | Fewer concepts to build | Version history becomes noisy and meaningless | Separate checkpoint vs. named version |
| 8 | Validating everything synchronously and blocking saves | Simplifies flow control | Frustrates users; punishes normal incremental editing | Validation is advisory until export/publish |
| 9 | Sharing links pointing to live (mutable) data | Convenient, no snapshotting needed | Recruiter sees content change/disappear unexpectedly | Share always points to a frozen version |
| 10 | No limit on resume count | Avoids building quota logic | Abuse, storage bloat, unclear pricing tiers | Explicit, enforced tiered limits |
| 11 | Duplication copying version history | Feels "complete" | Confuses lineage; bloats storage | Duplicate = new entity, fresh history |
| 12 | Treating Skills as free text | Fastest to implement | Breaks Job Matching/ATS accuracy | Normalize against a skill taxonomy |
| 13 | No import error handling (all-or-nothing) | Simpler pipeline | Users abandon import after one bad field | Partial import + manual review |
| 14 | Export bypassing validation | Faster path to "done" | Broken/incomplete PDFs damage user's job search | Mandatory export validation gate |
| 15 | Analytics module writing back to resume data | Tempting for "smart" features | Breaks single-source-of-truth, creates hidden coupling | Analytics is read-only, event-driven |
| 16 | No event model between modules | Direct calls are "simpler" at first | Tight coupling; any module change ripples everywhere | Domain events + subscribers |
| 17 | Assuming one owner forever | No time spent on future-proofing | Collaboration becomes a full rewrite later | Design ownership as a relationship, not a hardcoded field |
| 18 | Storing rendered PDF as source of truth | Avoids "extra" structured storage | Impossible to re-template or re-edit reliably | Structured data is always the source of truth |
| 19 | No section ordering flexibility | Simpler fixed layout | Users can't emphasize what matters to them | User-controlled ordering with sane defaults |
| 20 | Ignoring ATS parsing conventions in template design | Design-led thinking only | Beautiful resumes that fail ATS scans | Bake ATS-parseable structure into every template |
| 21 | Treating References as always public | Overlooked as "just another section" | Privacy violation, PII exposure | Explicit consent-gated visibility |
| 22 | No conflict resolution strategy for concurrent edits | Rare edge case, deprioritized | Silent data loss across devices/tabs | Explicit last-write-wins or merge strategy |
| 23 | Coupling AI suggestions tightly to one model/vendor | Fastest integration path | Painful vendor lock-in, hard to improve later | Abstract AI suggestions behind a domain-level contract |
| 24 | No distinction between "empty" and "not applicable" sections | Binary thinking | Analytics/completeness scoring becomes misleading | Support explicit "N/A" state per section |
| 25 | Version history growing unbounded with no policy | No one thinks about it early | Storage costs balloon, performance degrades | Retention policy + archival strategy |
| 26 | Localizing text only in the UI layer | Feels like a frontend-only concern | Backend validation messages, exports stay English-only | Localize at the domain/message layer too |
| 27 | Hardcoding template layouts into business logic | Fast initial delivery | Every new template requires backend changes | Templates as configuration/data, not code |
| 28 | Treating "archived" and "deleted" as the same state | Reduces state count | Users lose the ability to simply "hide" without risking loss | Separate, distinct states with different semantics |
| 29 | No audit trail for admin actions on user resumes | Deprioritized until an incident | No accountability, compliance risk | Mandatory logging of all privileged actions |
| 30 | Letting Job Matching dictate Resume domain structure | Reactive, feature-driven design | Resume domain becomes fragmented by consumer needs | Resume domain stays consumer-agnostic; consumers adapt |
| 31 | No clear "minimum viable resume" definition | Ambiguity deferred to later | Inconsistent export/publish gating across the team | Explicitly documented minimum thresholds (this blueprint) |
| 32 | Overloading one "status" field for lifecycle + validation + visibility | Seems efficient | Impossible to reason about state transitions | Separate orthogonal state dimensions |
| 33 | No plan for permanent purge after soft-delete window | Deferred as "not urgent" | Compliance/privacy exposure (data retention laws) | Scheduled purge policy from day one |
| 34 | Assuming resume content is always well-formed input | Optimistic design | Downstream AI/export/ATS modules crash on edge cases | Defensive validation at domain boundaries |
| 35 | Designing Collaboration as an afterthought bolt-on | Not in initial scope | Requires a full data-model rewrite later | Reserve ownership/permission seams now (§11) |

---

## Appendix: Cross-Cutting Design Principles Recap

1. **Single Source of Truth:** structured resume data — never a rendered artifact.
2. **Immutability of Published Versions:** publishing freezes; editing continues on a working draft.
3. **AI Proposes, User Disposes:** no silent AI mutation.
4. **Soft-Delete Everywhere:** deletion and archiving are reversible by default.
5. **Event-Driven Module Boundaries:** other modules subscribe/consume; they don't reach in and mutate.
6. **Contextual, Not Absolute, Requirements:** "required" depends on what else is present.
7. **Data/Presentation Separation:** templates render; they never define content structure.

---

*This document is the canonical Resume Domain reference. Any implementation detail that contradicts this blueprint should trigger a review of either the code or the blueprint — not silent divergence.*
