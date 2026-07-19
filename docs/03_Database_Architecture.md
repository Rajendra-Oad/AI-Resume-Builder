# AI Resume Builder — Database Design Blueprint

**Status:** Conceptual data architecture. No SQL, entities, or migrations exist yet. This document is what backend developers translate directly into JPA entities and MySQL schema.

---

## PART 1 — Business Domain Analysis

| Domain | Why it exists |
|---|---|
| **Identity & Access** | Owns who a user is, how they authenticate, and what role they hold. Everything else is owned *by* an identity. |
| **Resume Management** | The core domain — a resume and its structured sections (education, experience, projects, skills). |
| **Templates** | Governs visual presentation, decoupled from resume content so one resume can render in multiple templates. |
| **AI** | Owns all interaction with AI providers — generation, improvement, cover letters — as its own domain because it has unique lifecycle (async, cost-bearing, provider-agnostic). |
| **ATS (Applicant Tracking System checking)** | Owns scoring a resume against a job description — depends on Resume and optionally on AI, but is conceptually a separate analysis domain. |
| **Job Matching** | Owns job description data and matching logic — related to ATS but distinct (ATS scores *one* resume vs *one* job; Job Matching surfaces *many* jobs against *one* resume). |
| **Versioning/History** | Owns the temporal dimension of a resume — drafts, published versions, rollback — cross-cutting but modeled as its own domain to avoid bloating the core Resume entity. |
| **Notifications** | Owns communication to the user, triggered by events from other domains, but stores its own delivery state. |
| **Administration** | Owns platform-level oversight — user management, moderation — operates *across* domains but is modeled separately for access-control clarity. |
| **Subscriptions/Billing** | Owns entitlement and payment state — gates access to premium features in other domains without those domains needing billing logic themselves. |
| **Analytics** | Owns aggregated/derived data about usage — reads from other domains but should not be a dependency *of* them (write-only consumer pattern). |
| **Audit** | Owns the "who did what, when" record across domains — a cross-cutting concern with its own storage, not scattered per-table history columns. |

### Interaction overview
```
Identity ──owns──> Resume ──renders-with──> Template
   │                  │
   │                  ├──scored-by──> ATS ──uses──> AI (optional)
   │                  ├──versioned-by──> Versioning
   │                  └──matched-against──> Job Matching
   │
   ├──gates──> Subscription
   ├──triggers──> Notification (via events from any domain)
   └──tracked-by──> Audit (cross-cutting)

AI ──serves──> Resume, ATS, Job Matching (as a shared capability, not owned by any one)
Analytics ──reads from──> all domains (never writes into them)
Administration ──oversees──> Identity, Resume, Subscription (elevated access)
```

---

## PART 2 — Domain Model (Entity Catalog)

### Identity & Access

**User**
- *Purpose:* represents a registered person.
- *Lifecycle:* created at registration → active → optionally deactivated/soft-deleted; never hard-deleted while any owned data exists.
- *Ownership:* root owner of Resume, Subscription, AI usage records.
- *Relationships:* 1-to-many with Resume, Notification, AuditLog; 1-to-one with UserProfile.
- *Required (conceptual):* unique email, password hash, role, status, created timestamp.
- *Optional:* display name, avatar reference.
- *Business rules:* email uniqueness enforced at domain level; password never stored in plaintext; role determines RBAC scope.
- *Future expansion:* social login providers, multi-factor auth flags — additive fields/related entity, not a redesign.

**UserProfile**
- *Purpose:* separates rarely-changing account credentials (User) from frequently-updated personal info (name, contact, location) used to pre-fill resumes.
- *Ownership:* 1-to-1 with User.
- *Business rules:* not required to exist immediately at registration — created lazily on first resume.

**RefreshToken**
- *Purpose:* supports JWT refresh flow without re-authenticating.
- *Lifecycle:* created at login, invalidated at logout/expiry/rotation.
- *Relationships:* many-to-one with User (a user may hold multiple active sessions/devices).
- *Business rules:* one row per active session; expired rows are purged, not retained indefinitely.

### Resume Management

**Resume**
- *Purpose:* the top-level container a user builds.
- *Lifecycle:* draft → (optionally) published → archived; see Part 10 for versioning.
- *Ownership:* belongs to exactly one User.
- *Relationships:* 1-to-many with Education, Experience, Project, Skill, Certification (all "section" entities); 1-to-one (current) with Template selection; 1-to-many with ResumeVersion.
- *Required:* owner reference, title, status.
- *Optional:* target job title, summary text.
- *Business rules:* a resume without at least a title is invalid; deleting a resume is a soft delete (Part 6).
- *Future expansion:* sharing/collaboration (Part 13) attaches without touching this entity's core shape.

**ResumeSection entities** (Education, Experience, Project, Skill, Certification — modeled as **separate entities**, not one generic "Section" table)
- *Purpose:* each captures domain-specific fields (Experience needs employer/dates; Skill needs proficiency; Education needs institution/degree).
- *Why separate rather than one generic key-value "Section" table:* generic EAV-style modeling sacrifices type safety, indexability, and query clarity — acceptable tradeoff for a CMS, not for structured resume data that AI and ATS need to reason over precisely.
- *Ownership:* many-to-one with Resume; each row is *owned* (weak entity — has no meaning without its parent Resume).
- *Business rules:* ordering within a resume (display sequence) is an attribute on each row, not inferred from insertion order.

### Templates

**Template**
- *Purpose:* defines a visual layout/style a resume can render with.
- *Lifecycle:* system-defined (seeded) initially; future: user-created/custom templates.
- *Relationships:* many-to-many conceptually with Resume — a resume references its *current* template, but ResumeVersion (Part 10) may reference a *different* template per version, since a user might re-style an old version.
- *Business rules:* deleting a template in use must not orphan resumes — either restrict deletion or reassign to a default template.

### AI Domain

See Part 11 for full detail. Summary entities: **AiRequest**, **AiProvider** (reference/config, not per-request), **AiGeneratedContent**, **AiUsageLedger**.

### ATS Domain

See Part 12. Summary entities: **AtsReport**, **AtsKeywordMatch**, **JobDescription** (shared with Job Matching).

### Job Matching

**JobDescription**
- *Purpose:* stores a job posting's text/requirements, either pasted by the user or ingested from a source.
- *Relationships:* referenced by both ATS (scoring one resume against it) and Job Matching (surfacing many jobs).
- *Business rules:* large text content; not owned by a single user if sourced externally (shared/reference data) — but user-pasted ones are owned by the user.

**JobMatch**
- *Purpose:* a computed relationship between a Resume and a JobDescription with a match score.
- *Lifecycle:* recomputed periodically or on demand; not a permanent fact, more a cached derived result.

### Versioning/History

See Part 10. Entities: **ResumeVersion**, **ResumeVersionSnapshot**.

### Notifications

**Notification**
- *Purpose:* a message queued/delivered to a user.
- *Relationships:* many-to-one with User; conceptually references a "source event" (e.g., `AI_GENERATION_COMPLETE`) without hard-coupling to the domain that triggered it — decoupled via the Events pattern from the backend architecture doc.
- *Business rules:* has delivery status (pending/sent/failed/read) distinct from its content.

### Administration

**AdminActionLog** (distinct from general Audit — admin actions are higher-sensitivity)
- *Purpose:* records elevated-privilege actions (e.g., admin disabling a user account).

### Subscriptions

**Subscription**
- *Purpose:* tracks a user's plan/entitlement level.
- *Relationships:* 1-to-1 (current) with User, but 1-to-many historically (a user has a subscription history over time).
- *Business rules:* current plan determines feature gates (e.g., AI generation limits) checked by other domains via a shared entitlement lookup, not duplicated logic.

**PaymentTransaction**
- *Purpose:* records payment events tied to a Subscription — kept distinct from Subscription state itself so payment history is immutable/append-only while subscription state can change.

### Analytics

**UsageMetric** (aggregated, not per-click event storage in the transactional DB)
- *Purpose:* rollup counts (resumes created per day, AI calls per user) for dashboard/admin reporting — deliberately *not* raw event logs in MySQL; raw events belong in a separate analytics pipeline if volume grows (Part 8).

### Audit

**AuditLog**
- *Purpose:* generic "who changed what, when, from what to what" record, applicable across domains via a polymorphic-style reference (entity type + entity ID), not a per-table history table.

---

## PART 3 — Relationship Modeling

| Relationship | Type | Notes |
|---|---|---|
| User → Resume | One-to-Many | A user owns many resumes; a resume has exactly one owner. |
| User → UserProfile | One-to-One | Profile is optional/lazy but never shared. |
| Resume → Education/Experience/Project/Skill | One-to-Many, **Composition** | These are weak entities — deleting a Resume deletes its sections; they have no independent existence or identity outside their parent. |
| Resume → Template | Many-to-One | Many resumes can use the same template; a resume has one *current* template. |
| Resume → ResumeVersion | One-to-Many, **Composition** | Versions are owned snapshots; cannot exist without the parent resume. |
| ResumeVersion → Template | Many-to-One | A version pins the template used *at that point in time* — independent of the resume's current template. |
| User → AiRequest | One-to-Many | A user issues many AI requests over time. |
| AiRequest → AiGeneratedContent | One-to-One (or One-to-Many for retries) | See Part 11. |
| Resume → AtsReport | One-to-Many | A resume can be scored many times against different job descriptions. |
| JobDescription → AtsReport / JobMatch | One-to-Many | One job description can be scored against/matched with many resumes. |
| User → Subscription | One-to-Many (historical), effectively One-to-One (current) | Modeled as many rows with an `is_current`-style flag or date range, not a single mutable row, to preserve history. |
| Subscription → PaymentTransaction | One-to-Many | **Aggregation**, not composition — payment records should outlive even a cancelled subscription for financial record-keeping. |
| User → Notification | One-to-Many | — |
| \* → AuditLog | Polymorphic **aggregation** (entity_type + entity_id reference, not a strict FK to one table) | Deliberately loose coupling — audit log must not block deletion of the record it describes, and must not require a schema change every time a new auditable entity is added. |

### Weak entities
Education, Experience, Project, Skill, Certification, ResumeVersion, ResumeVersionSnapshot — all lack independent meaning without their parent Resume. Their identity is scoped to the parent (conceptually a composite of parent ID + local ordering, even if a surrogate key is used for practicality — see Part 5).

### Cascade & delete strategy
| Parent deleted | Effect on children |
|---|---|
| Resume (soft-deleted) | Sections and versions are *not* physically deleted — they follow the same soft-delete flag, remain queryable for recovery/undo. |
| User (soft-deleted/deactivated) | Resumes become inaccessible via the app but are retained for a defined retention period (Part 9) before any hard purge job runs. |
| Template (deletion attempted while in use) | **Restrict** — deletion blocked, or resumes/versions referencing it are reassigned to a default/fallback template first. |
| JobDescription referenced by AtsReport | **Restrict or soft-delete** — historical reports must remain interpretable even if the original posting is removed. |
| Subscription cancelled | PaymentTransaction rows are never deleted — cascade never reaches financial records. |

---

## PART 4 — Normalization Walkthrough

Using **Resume + Experience** as the running example.

### Unnormalized Form (UNF)
A single conceptual "resume record" with repeating groups:
```
Resume { userEmail, userName, title, experience: [ {employer, role, startDate, endDate}, {employer, role, startDate, endDate}, ... ] }
```
Problems: repeating groups of experience inside one record; user data duplicated per resume.

### 1NF — Eliminate repeating groups
Split experience entries into their own rows, each atomic:
```
Resume(id, userId, title)
Experience(id, resumeId, employer, role, startDate, endDate)
```
Now every column holds a single atomic value, and each Experience row is independently addressable.

### 2NF — Eliminate partial dependency on a composite key
Not directly at risk here since `Experience.id` is a surrogate key, not composite — but conceptually: if we had modeled the key as `(resumeId, sequenceNumber)`, any Experience attribute (e.g., `employer`) depends on the *whole* composite key already, so no partial dependency exists once we use `resumeId` as a plain foreign key and a surrogate `id` as primary key. This is exactly why surrogate keys are chosen for section entities (Part 5).

### 3NF — Eliminate transitive dependencies
`Resume` initially might have carried `userEmail`, `userName` directly (as in UNF) — these depend on `userId`, not on `Resume.id` directly. Removing them and referencing `User` via `userId` eliminates the transitive dependency:
```
Resume(id, userId, title)
User(id, email, name)
```

### BCNF
Every determinant in each table is a candidate key: in `Experience(id, resumeId, employer, role, startDate, endDate)`, the only functional dependency is `id → {resumeId, employer, role, startDate, endDate}`, and `id` is the key — no other attribute determines another. The model is in BCNF as designed.

### Higher normal forms (4NF/5NF)
Generally unnecessary here — 4NF/5NF address multi-valued and join dependencies that arise in complex many-to-many scenarios (e.g., if Skills had independent multi-valued facets like "proficiency contexts" that vary independently). The Skill entity is modeled simply enough (resumeId, skillName, proficiencyLevel) that 4NF concerns don't apply. If future features introduce genuinely independent multi-valued facts on the same entity, revisit at that time rather than over-normalizing preemptively.

### Where denormalization is deliberately introduced
- **ResumeVersionSnapshot** (Part 10) intentionally stores a denormalized, flattened copy of resume content at a point in time — normalization is *not* applied here because a version snapshot must remain stable and readable even if the live normalized schema evolves later.
- **UsageMetric** (analytics) stores pre-aggregated counts rather than requiring expensive joins/aggregation over transactional tables at read time.
- **JobMatch.score** is a computed/cached value, denormalized for read performance, recomputed on a schedule rather than derived live on every request.

---

## PART 5 — Key Strategy

| Entity | Primary Key | Candidate/Alternate Keys | Notes |
|---|---|---|---|
| User | Surrogate (UUID or auto-increment) | `email` (unique, alternate key) | Surrogate preferred — email can theoretically change, and using it as PK would cascade to every FK referencing the user. |
| Resume | Surrogate | — | No natural key exists for a resume; title isn't unique per user necessarily. |
| Experience/Education/Project/Skill | Surrogate | Composite candidate key conceptually `(resumeId, displayOrder)`, but not used as PK | Surrogate simplifies FK references from future entities (e.g., AI suggestions referencing a specific experience entry) without needing a composite FK. |
| Template | Surrogate | `name` (unique, alternate key) for system templates | — |
| AiRequest | Surrogate | — | High insert volume; surrogate avoids any natural-key contention. |
| Subscription | Surrogate | `(userId, startDate)` conceptually unique | Composite uniqueness constraint prevents overlapping active subscriptions, but PK stays surrogate. |
| RefreshToken | Surrogate | `tokenHash` (unique, alternate key) | Never index/store the raw token value as a key — store a hash. |
| JobDescription | Surrogate | — | Text content is never a natural key. |
| AuditLog | Surrogate | `(entityType, entityId, timestamp)` as a practical composite lookup index, not a uniqueness constraint | — |

**Principle applied throughout:** **surrogate keys everywhere**, natural/business values (email, token hash, template name) enforced as **unique constraints**, never as primary keys. This insulates every foreign-key relationship in the schema from real-world data changing (emails change, template names get renamed) — a foundational scalability and maintainability decision.

**No composite primary keys** are used anywhere in this design, even for weak entities — a surrogate PK on weak entities keeps every future FK reference (e.g., AI suggestion pointing at one specific Experience row) a single-column join instead of a multi-column one.

---

## PART 6 — Integrity

| Integrity type | Rule |
|---|---|
| **Entity integrity** | Every table has a non-null, unique surrogate primary key; no entity can exist without one. |
| **Referential integrity** | Every foreign key must reference an existing row; enforced at the database level (FK constraints), not only in application code — prevents orphaned rows even if a bug bypasses the service layer. |
| **Domain integrity** | Enumerated fields (Resume.status, Notification.status, Subscription.plan) are constrained to a defined set of values — enforced via DB-level enum/check constraint plus application-level enum types, so the two never drift apart. |
| **Business integrity** | Rules not expressible as simple constraints (e.g., "a user can have at most one *active* subscription at a time") enforced via a combination of a partial unique constraint (where supported) and service-layer validation (Backend Architecture doc, Part 8). |
| **Preventing duplicates** | Unique constraints on natural keys (User.email, RefreshToken.tokenHash, Template.name) — never relying solely on application-level "check then insert" logic, which is race-condition-prone. |
| **Orphan records** | Prevented by FK constraints; where "soft" ownership is intentional (AuditLog's polymorphic reference), orphaning is an accepted tradeoff documented explicitly, not accidental. |
| **Deletions** | Governed by the cascade table in Part 3; hard deletes are reserved for genuinely ephemeral data (expired RefreshTokens) — see below. |
| **Soft Delete vs Hard Delete** | **Soft delete** (a `deletedAt`/`isDeleted` flag) for anything a user might want recovered or that has downstream references (Resume, User, JobDescription). **Hard delete** only for data with no recovery value and no downstream integrity concern (expired RefreshTokens, stale cache-like JobMatch computations, old AiRequest retry attempts beyond a retention window). |
| **Audit requirements** | Every soft-deletable entity carries `createdAt`, `updatedAt`, `deletedAt` (nullable) fields; significant state transitions (Resume published, Subscription changed, Admin actions) are additionally recorded in AuditLog for a durable trail beyond simple timestamps. |

---

## PART 7 — Index Strategy

| Index type | Where |
|---|---|
| **Primary index** | Automatic on every surrogate PK. |
| **Unique index** | `User.email`, `RefreshToken.tokenHash`, `Template.name` — enforce uniqueness *and* speed up the lookups that already happen on login/token validation. |
| **Foreign key indexes** | Every FK column (`Resume.userId`, `Experience.resumeId`, `AiRequest.userId`, `AtsReport.resumeId`, etc.) — MySQL doesn't always auto-index FK columns depending on engine/setup, and these are the most frequent join/filter columns. |
| **Composite indexes** | `(userId, status)` on Resume — supports the extremely common "list this user's active resumes" query with sorting/filtering in one index. `(resumeId, displayOrder)` on section entities — supports fetching a resume's sections pre-sorted. `(entityType, entityId)` on AuditLog — supports the polymorphic lookup pattern. |
| **Search optimization** | If free-text search over JobDescription or Resume content becomes a feature, a full-text index (MySQL `FULLTEXT`) is the appropriate mechanism — not a `LIKE '%...%'` query pattern, which can't use a standard B-tree index effectively. |
| **Sorting** | Any column used in default list ordering (`createdAt` on Resume/Notification) benefits from being the trailing column in a composite index alongside the filter column (e.g., `(userId, createdAt)`). |
| **Join optimization** | Ensure every join path used in common queries (Resume↔User, AtsReport↔Resume↔JobDescription) has indexed FK columns on both sides — the PK side is automatic, the FK side must be explicit. |
| **Trade-offs** | Every index speeds reads but slows writes and consumes storage — AiRequest and AuditLog are high-insert-volume tables, so indexes there should be limited to what's actually queried (e.g., `userId`, `createdAt`), not indexed defensively on every column. |

---

## PART 8 — Scalability

| Scale | Strategy |
|---|---|
| **~100 users** | Default MySQL configuration, no partitioning, no read replicas. Indexes from Part 7 are sufficient. |
| **~10,000 users** | Introduce read replicas for read-heavy paths (resume listing, template browsing) once write load and read load start contending. Begin archiving strategy for old AiRequest/AuditLog rows (move beyond a retention window to a cheaper storage tier or archive table) rather than letting operational tables grow unbounded. Caching (application-level, per Backend Architecture doc) absorbs repeated reads of rarely-changing data (Templates, ATS scoring reference data). |
| **~1,000,000 users** | Consider **partitioning** high-volume tables (AiRequest, AuditLog, UsageMetric) by date range — queries naturally filter by recent time windows, and partitioning keeps those queries fast while old partitions can be archived/dropped independently. Evaluate moving raw analytics events out of MySQL entirely into a purpose-built analytics store, keeping MySQL focused on transactional (OLTP) workloads — MySQL degrades on mixed heavy-write-analytics + heavy-read-transactional workloads at this scale. Read/write splitting becomes a formal application-level concern (routing analytics/reporting reads to replicas). Sharding by `userId` becomes a *future migration path* to keep in mind (not implemented preemptively) if a single MySQL instance's write throughput becomes the bottleneck. |

### Read-heavy vs write-heavy considerations
- **Read-heavy:** Resume viewing/listing, Template browsing, JobMatch results — well served by indexing, caching, and read replicas.
- **Write-heavy:** AiRequest logging, AuditLog, UsageMetric — better served by partitioning, batched/async writes, and eventual archiving rather than indexing everything defensively.

---

## PART 9 — Security

| Concern | Approach |
|---|---|
| **Sensitive data** | Password hashes, refresh token hashes, payment identifiers (never raw card data — handled by a payment processor, only a reference token stored). |
| **Password storage** | One-way hash (bcrypt/argon2 at the application layer) — the database never sees or stores a reversible password. |
| **PII** | Name, email, phone, address (in UserProfile and resume section entities) — treated as sensitive; access scoped to the owning user and admins with justified access, never exposed in logs (per Backend Architecture doc, Part 9). |
| **Encryption** | Encryption at rest for the database volume (infrastructure-level, e.g., managed MySQL encryption); TLS in transit for all DB connections; consider field-level encryption for highly sensitive optional fields if the product later stores things like national ID numbers. |
| **Audit trails** | AuditLog (Part 2) covers state-changing actions; AdminActionLog specifically covers elevated-privilege actions for accountability. |
| **Access control** | Application-layer RBAC (Backend Architecture doc) is the primary gate; database-level access is restricted to the application's service account, with no direct end-user DB access ever. |
| **Data retention** | Soft-deleted data retained for a defined window (e.g., 30–90 days) before a scheduled hard-purge job runs, balancing user "undo" ability against indefinite storage of unwanted data. |
| **Backup strategy** | Regular automated backups (managed MySQL snapshot capability) with a tested restore procedure — a backup that's never been restored isn't a real backup. |
| **Disaster recovery** | Point-in-time recovery capability (binlog-based) so accidental mass-deletion or corruption can be rolled back to a specific moment, not just the last nightly snapshot. |

---

## PART 10 — Versioning Strategy

### Core principle: separate the *live editable* Resume from *immutable historical* ResumeVersions.

```
Resume (live, mutable)
  │
  ├── currently being edited as draft
  │
  └── ResumeVersion (1..N, immutable once created)
         │
         └── ResumeVersionSnapshot (denormalized flattened content at that point in time)
```

- **Drafts:** the live `Resume` and its section entities (Experience, Education, etc.) represent the current draft — always mutable.
- **Published versions:** when a user "publishes" or explicitly saves a version, a `ResumeVersion` row is created, pointing to a `ResumeVersionSnapshot` — a **denormalized**, flattened copy of all section data *at that moment* (deliberately breaking normalization here, per Part 4, because a historical version must never change even if the live schema or live data changes later).
- **History:** `ResumeVersion` rows accumulate over time, ordered by `versionNumber`/`createdAt`, giving a full history without ever mutating a past version.
- **Rollback:** implemented as copying a chosen `ResumeVersionSnapshot`'s content back into the live `Resume`/section entities — never by deleting forward versions, preserving full history even after a rollback.
- **Template changes:** each `ResumeVersion` records which `Template` was used at that point (Part 3), so viewing history shows the resume as it actually looked, even if the user has since switched templates.
- **Future AI-generated versions:** an AI-generated draft is modeled as just another `ResumeVersion` with a `sourceType` attribute (`USER_EDIT` vs `AI_GENERATED` vs `AI_IMPROVED`), avoiding a parallel/separate versioning system for AI content.

**Why snapshot instead of re-deriving history from a full audit log:** reconstructing a past version by replaying every field-level change is expensive and fragile at read time; storing a denormalized snapshot trades some storage duplication for fast, reliable historical reads — an intentional, documented denormalization (Part 4).

---

## PART 11 — AI Data Architecture

```
AiProvider (reference/config table: "openai", "gemini", capabilities, active flag)
    │
AiRequest (one row per generation attempt)
    ├── userId (FK)
    ├── resumeId (FK, nullable — some AI actions aren't tied to a resume, e.g. cover letter for a job posting)
    ├── providerId (FK to AiProvider)
    ├── requestType (enum: GENERATE_SECTION, IMPROVE_SECTION, COVER_LETTER, ATS_SUGGESTION...)
    ├── status (enum: PENDING, PROCESSING, SUCCEEDED, FAILED, RETRYING)
    ├── promptReference (see note below — not raw prompt text by default)
    ├── createdAt / completedAt
    │
    ├──1:1──> AiGeneratedContent (the actual output, only on success)
    │              ├── content (the generated text)
    │              └── appliedToResume (boolean — did the user accept/insert it)
    │
    └──1:N──> AiRequestAttempt (retry tracking, one row per attempt if retried)
                   ├── attemptNumber
                   ├── errorCode (nullable)
                   └── latencyMs

AiUsageLedger (append-only, one row per completed request)
    ├── userId (FK)
    ├── providerId (FK)
    ├── tokensUsed (input/output split)
    ├── costEstimate
    └── billingPeriodReference (for future subscription-limit enforcement)
```

| Concern | Design decision |
|---|---|
| **Prompt History** | Store a *reference/summary*, not necessarily the full raw prompt verbatim by default, given resumes contain PII — full prompt storage (if needed for debugging/quality) should be a separate, access-restricted, short-retention table, not the primary AiRequest row. |
| **Provider Information** | `AiProvider` is a reference table (id, name, isActive) — `AiRequest.providerId` is a plain FK, never a hardcoded string like `"openai"` scattered through the schema, so adding a third provider is one new row, not a schema change. |
| **Token Usage / Cost Tracking** | `AiUsageLedger` is append-only and separate from `AiRequest` — usage/billing data has different retention and query patterns (monthly rollups) than operational request tracking. |
| **Response Metadata** | Stored on `AiGeneratedContent` (model version used, generation timestamp) — kept separate from the request row so the "did it succeed and what came back" concern is distinct from "what was asked." |
| **Generation Status** | Explicit `status` enum on `AiRequest`, not inferred from presence/absence of a `AiGeneratedContent` row — makes "show me in-progress generations" a simple indexed query. |
| **Retry Information** | Modeled as child `AiRequestAttempt` rows rather than overwriting the parent request — preserves full retry history for debugging provider reliability. |
| **Decoupling from specific providers** | No provider-specific fields (e.g., "openaiModelName") on shared tables — provider-specific metadata, if needed, lives in a flexible/JSON metadata column on `AiGeneratedContent`, isolated from the core relational structure. |

---

## PART 12 — ATS Architecture

```
JobDescription (shared with Job Matching, Part 2)

AtsReport
    ├── resumeId (FK)
    ├── jobDescriptionId (FK)
    ├── overallScore
    ├── createdAt
    │
    ├──1:N──> AtsKeywordMatch
    │              ├── keyword
    │              ├── foundInResume (boolean)
    │              └── importanceWeight
    │
    ├──1:N──> AtsMissingSkill
    │              ├── skillName
    │              └── suggestedAction (text, possibly AI-generated)
    │
    └──1:N──> AtsRecommendation
                   ├── recommendationText
                   └── category (enum: FORMATTING, KEYWORDS, STRUCTURE, CONTENT)
```

| Element | Design rationale |
|---|---|
| **ATS Reports** | One row per scoring event — a resume can be scored multiple times (against different jobs, or the same job after edits), so this is never a 1:1 with Resume. |
| **Keyword Analysis** | Modeled as child rows (`AtsKeywordMatch`) rather than a single JSON blob, so individual keyword matches are queryable/aggregable (e.g., "most commonly missing keyword across all reports" for future analytics). |
| **Missing Skills** | Separate from keyword matches since a "skill" gap is a higher-level, potentially AI-synthesized recommendation, not a raw keyword miss. |
| **Recommendations** | Generic, categorized rows — allows the ATS engine (rule-based today, possibly AI-assisted later) to emit an arbitrary number of suggestions without schema changes. |
| **Job Description Analysis** | `JobDescription` itself may hold derived fields (extracted required skills, seniority level) computed once and reused across many `AtsReport`/`JobMatch` rows rather than recomputed per report. |
| **Resume Scores** | `AtsReport.overallScore` is the summary; component scores (if the algorithm evolves to weight keywords/structure/skills separately) can live as additional columns or a related breakdown table without disrupting the summary field. |
| **Historical Comparisons** | Because every scoring event is its own `AtsReport` row tied to a timestamp, "show score improvement over time for this resume" is a simple time-ordered query — no special history mechanism needed beyond normal row accumulation. |

---

## PART 13 — Future Features (No Core Redesign Required)

| Feature | How it attaches |
|---|---|
| **Resume Sharing** | New `ResumeShare` entity (resumeId, sharedWithEmail or public token, permissionLevel, expiresAt) — additive, references existing Resume PK. |
| **Resume Collaboration** | `ResumeCollaborator` entity (resumeId, userId, role: EDITOR/VIEWER) — additive many-to-many between Resume and User. |
| **Recruiter Access** | A new `role` value on User (`RECRUITER`) plus a `RecruiterAccessGrant` entity scoping which resumes/candidates they can view — reuses existing RBAC pattern, no redesign. |
| **Interview Scheduling** | New `InterviewSchedule` entity (jobMatchId or resumeId, recruiterUserId, scheduledAt, status) — a new domain that references existing entities by FK. |
| **Payments** | Already scaffolded via `Subscription`/`PaymentTransaction` (Part 2) — new payment methods/providers are additive rows/columns, not structural changes. |
| **Premium Features** | Gated via `Subscription.plan` checked at the service layer — new premium features just add a check against existing entitlement data. |
| **Notifications** | Already modeled (Part 2); new notification *types* are new enum values, not new tables. |
| **Analytics** | `UsageMetric` (Part 2) already anticipates rollup-style analytics; deeper analytics needs (Part 8) are an infrastructure addition, not a core schema change. |
| **Activity History** | `AuditLog`'s polymorphic design (Part 2/6) already supports logging any new entity type without a schema change — new entities just start writing to the existing AuditLog structure. |

**Unifying principle:** every future feature above is satisfied by **adding a new entity with FKs into the existing model**, or **adding an enum value / column** — never by restructuring User, Resume, or the section entities that already exist. This is the direct database-level counterpart to the "additive, not disruptive" principle from the Backend Architecture doc (Part 10 there).

---

## PART 14 — Common Database Design Mistakes

| # | Mistake | Why it happens | Why dangerous | How professionals avoid it |
|---|---|---|---|---|
| 1 | Using natural keys (email) as primary keys | Seems simpler at first | Cascading updates across every FK when the natural value changes | Surrogate keys everywhere (Part 5) |
| 2 | One giant generic "Section" or EAV table for resume content | Looks flexible/DRY | Sacrifices type safety, indexability, query clarity | Separate typed entities per section (Part 2) |
| 3 | Storing repeating groups in a single column (e.g., comma-separated skills) | Fast to prototype | Breaks 1NF, unqueryable, unindexable | Separate child table (Skill entity) |
| 4 | No FK constraints, relying only on application code | Feels faster to build | Orphaned records the moment any bug or script bypasses the app layer | Enforce FK constraints at the DB level |
| 5 | Hard deleting user data on account deletion | Simplicity | Loses recovery ability, violates likely data-retention/legal needs | Soft delete with retention window (Part 6/9) |
| 6 | Storing raw passwords or reversible-encrypted passwords | Misunderstanding of hashing | Catastrophic breach impact | One-way hashing only, at the application layer |
| 7 | Denormalizing everywhere "for performance" from day one | Premature optimization | Data inconsistency, update anomalies, harder maintenance | Normalize first (Part 4), denormalize only with a documented reason |
| 8 | Over-normalizing to 4NF/5NF where unnecessary | Textbook purism | Excessive joins, harder queries, no real benefit | Stop at 3NF/BCNF unless a specific multi-valued dependency exists |
| 9 | No indexes on foreign key columns | Assuming MySQL indexes them automatically in all cases | Slow joins at scale | Explicit FK-column indexing (Part 7) |
| 10 | Indexing every column defensively | "More indexes = faster" misconception | Slower writes, wasted storage, diminishing/negative returns | Index based on actual query patterns |
| 11 | Using `SELECT *`-style unbounded queries with no pagination in schema/query design | Convenience during development | OOM/slow responses in production at scale | Design list queries with pagination from the start (Backend Architecture doc) |
| 12 | Storing computed/derived values without a refresh strategy (e.g., JobMatch score never recalculated) | Convenient to compute once | Stale data presented as current | Explicit recompute schedule or cache-invalidation strategy |
| 13 | No `createdAt`/`updatedAt` timestamps on tables | Overlooked until needed | No way to audit or debug data history later | Standard timestamp columns on every table from day one |
| 14 | Mixing transactional and analytical workloads in the same tables without a plan | Simplicity early on | Analytical queries lock/slow down transactional operations at scale | Separate analytics store planned ahead (Part 8) |
| 15 | Not planning for soft-delete filtering consistently (some queries forget `WHERE deletedAt IS NULL`) | Manual query writing | Deleted data reappears in the UI | Centralize soft-delete filtering (e.g., JPA `@Where` or repository-level default filters) |
| 16 | Composite primary keys on weak entities | Seems "more correct" relationally | Complicates every future FK reference into that table | Surrogate PK even on weak/owned entities (Part 5) |
| 17 | No unique constraint on business-critical uniqueness (e.g., one active subscription per user) | Assuming application code will always enforce it | Race conditions create duplicate/conflicting rows | DB-level unique/partial-unique constraints |
| 18 | Storing money as floating point | Familiarity with float types | Rounding errors in financial data | Fixed-point/decimal types for any money-related column |
| 19 | No plan for archiving high-volume log-like tables (AiRequest, AuditLog) | Not thinking ahead to scale | Tables grow unbounded, slow queries, expensive backups | Partitioning/archiving strategy defined early (Part 8) |
| 20 | Tightly coupling schema to one AI provider (e.g., an `openaiResponseId` column on a shared table) | Building for what exists today only | Painful migration when adding a second provider | Provider-agnostic reference table + FK (Part 11) |
| 21 | Using JSON columns for data that's actually relational and queried often | Perceived flexibility | Loses indexing, type safety, and query performance for that data | Use JSON only for genuinely unstructured/rarely-queried metadata |
| 22 | Ignoring timezone handling on timestamp columns | Overlooked detail | Inconsistent times across users/servers | Store UTC consistently, convert at the presentation layer |
| 23 | No versioning strategy for user-editable content (resumes) | Not anticipated until users ask for it | Expensive retrofit, or worse — no ability to recover overwritten data | Design ResumeVersion/Snapshot pattern from the start (Part 10) |
| 24 | Circular foreign key dependencies between tables | Ad hoc modeling without an ER diagram pass | Insertion order problems, unclear ownership | Draw the ER model first, ensure a clear dependency direction |
| 25 | No distinction between "reference/lookup" data and "transactional" data (e.g., hardcoding provider names as strings everywhere) | Fastest path to a working feature | Painful find-and-replace refactors later | Reference tables (AiProvider, Template) referenced by FK, never magic strings |
| 26 | Allowing NULL in columns that are always logically required, "just in case" | Avoiding upfront modeling decisions | Application code littered with null checks, ambiguous data states | Enforce NOT NULL wherever a value is truly always required |
| 27 | Not modeling audit/history needs until compliance or a support incident forces it | Reactive rather than proactive design | Expensive retrofit; historical data before that point is unrecoverable | Design AuditLog/versioning as first-class citizens from the start |
| 28 | Treating every entity as user-owned when some data (JobDescription sourced externally, Template system defaults) is actually shared/reference data | Not distinguishing ownership models | Incorrect access control, duplicate reference data per user | Explicitly model shared/reference vs. user-owned entities differently |
| 29 | No plan for what happens to child rows when a shared/reference row (Template) is deleted | Overlooking reference-data lifecycle | Orphaned resumes pointing at a deleted template | Restrict deletion or reassign to a default (Part 3) |
| 30 | Designing the schema entity-by-entity without a domain analysis pass first | Jumping straight to "what tables do I need" | Missed relationships, inconsistent ownership models, rework later | Start with business domain analysis (Part 1) before entities |
| 31 | Assuming "we'll add indexes later when it's slow" | Deferring a design concern as an optimization afterthought | Production incidents caused by missing indexes discovered under real load | Design index strategy alongside the schema (Part 7), even if not all are implemented on day one |

---

## Summary

This blueprint is built around three consistent principles: **surrogate keys with enforced natural-key uniqueness**, **composition for owned/weak data with explicit soft-delete cascading**, and **additive extensibility** — every future feature in Part 13 attaches via a new entity and foreign key, never a redesign of User, Resume, or the section entities already defined. A backend developer should be able to derive JPA entities and MySQL DDL directly from Parts 2, 3, and 5 without further architectural decisions.
