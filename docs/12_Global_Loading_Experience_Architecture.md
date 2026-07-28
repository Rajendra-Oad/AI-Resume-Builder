# Global Loading Experience Architecture

**Status:** Architecture blueprint only. This document defines product behavior,
responsibilities, contracts, and delivery gates. It does **not** authorize or
contain implementation code, animation timelines, React components, CSS,
dependencies, or runtime changes.

## 1. Purpose

The loading system should make waiting feel like visible progress through a
professional resume workflow. Generic circular spinners are not part of the
target experience. Each loading state must either preserve the shape of the
content being requested or explain the work currently being performed.

The system must be:

- reusable across routes and feature modules;
- honest about determinate and indeterminate work;
- independent of any animation library;
- interruptible and never responsible for business completion;
- accessible and useful without motion;
- responsive from mobile to large desktop layouts;
- progressively enhanced according to device capability;
- extensible without changing feature-level contracts.

Loading visuals decorate application state. They do not own fetching,
authentication, routing, AI jobs, upload processing, export jobs, or error
handling.

## 2. Experience principles

1. **Content-shaped first:** use a skeleton that resembles the incoming content
   whenever its layout is predictable.
2. **Process-shaped when meaningful:** long or multi-stage operations explain
   actual stages through a resume-centered visualization.
3. **No false precision:** show percentages only when measurable progress exists.
4. **No artificial delay:** never hold completed content merely to finish an
   animation. The branded entrance may enforce only a very short anti-flash
   threshold, never a theatrical minimum.
5. **Continuity over replacement:** keep stable navigation, page structure, user
   input, and previously loaded data visible where safe.
6. **One semantic source:** status text, visual stage, progress, and accessible
   announcement derive from the same loading state.
7. **Motion is optional:** every state has a stable, understandable non-animated
   presentation.
8. **Errors are terminal states:** a failed operation exits loading immediately
   into a specific, recoverable error experience.

## 3. Loading taxonomy and selection

The Loading Manager chooses the smallest loader that accurately represents the
wait. Feature modules request an intent; they do not select animation techniques.

| Loading class | Use when | Preferred presentation |
|---|---|---|
| Application bootstrap | Initial shell is not yet ready | Full-screen branded Resume Loader |
| Route shell | A destination layout is being resolved | Page-specific skeleton |
| Section/data fetch | A known region awaits content | Local content-aware skeleton |
| Background refresh | Usable data is already present | Keep content; use quiet inline status |
| User action | A control started bounded work | Inline control/status treatment |
| Multi-stage workflow | Upload, ATS, AI, or PDF stages are meaningful | Specialized process loader |
| Streaming result | Valid partial output is arriving | Render partial content plus writing status |
| Unknown-duration task | Progress cannot be measured | Stage/status activity without a fake percent |

Selection priority:

```text
usable existing content
        |
        +-- yes --> preserve content + local status
        |
        +-- no --> predictable incoming shape?
                      |
                      +-- yes --> content-aware skeleton
                      |
                      +-- no --> meaningful process stages?
                                    |
                                    +-- yes --> specialized process loader
                                    |
                                    +-- no --> compact branded status placeholder
```

Full-screen loading is reserved for bootstrap or a truly blocking application
boundary. It must not appear for routine navigation or local data refreshes.

## 4. Conceptual architecture

```text
Routes, features, queries, and background jobs
                    |
          semantic loading events
                    |
        Loading State Manager
                    |
             Loading Context
                    |
             Loading Manager
          /          |          \
     loader policy  message    progress
                    policy      model
          \          |          /
          Loading presentation registry
        /       |        |         \
   skeletons  resume    workflow   inline
               loader    loaders    status
                    |
          Transition Manager
                    |
        Animation preset adapter port
          /          |             \
       static    native/CSS       GSAP or
       adapter     adapter       future adapter
```

The loading subsystem consumes state from product workflows and sends lifecycle
intents to the existing Motion and Transition architecture. It does not introduce
a second global animation clock, route-transition owner, or accessibility policy.

### Proposed future ownership

The following is a conceptual package map, not an instruction to create folders:

```text
src/loading/
  core/          # manager, state model, arbitration, lifecycle
  context/       # scoped state exposure
  registry/      # semantic loader and message definitions
  skeletons/     # content-aware placeholder families
  workflows/     # ATS, AI, PDF, upload, and bootstrap presentations
  presets/       # library-neutral loading animation intents
  adapters/      # static, CSS/native, GSAP, Lottie, and future adapters
  testing/       # fixtures, policy assertions, accessibility contracts
```

## 5. Module responsibilities

### Loading Manager

The single presentation-policy boundary. It resolves the current loading intent,
scope, priority, duration, known progress, motion policy, device capability,
viewport, and loader registry entry. It prevents competing full-screen loaders,
selects fallbacks, coordinates cancellation, and exposes presentation lifecycle
signals. It never starts or completes business operations.

### Loading Context

Makes the resolved loading state available to a route or component subtree.
Contexts are scoped and nestable: a local query may update a card without
replacing the page loader. The application scope is reserved for bootstrap and
global blocking recovery. Context must not cause the whole application to render
on high-frequency progress updates.

### Loading State Manager

Normalizes signals from routing, Suspense boundaries, queries, uploads, AI jobs,
ATS jobs, and export jobs into one state model. It owns arbitration, deduplication,
minimum anti-flash thresholds, maximum presentation rules, cancellation, terminal
success/error transitions, and stale-operation protection.

### Skeleton Component Library

Defines accessible, responsive placeholder compositions using shared geometry and
surface tokens. Skeletons preserve expected layout, avoid content shift, and
mirror density rather than copying sensitive user content. The library owns
families and variants; feature modules only supply semantic shape and count.

### Animation Presets

Defines library-neutral intents for shimmer, reveal, scan, highlight, document
assembly, writing, progress, and completion. Each preset declares permitted
properties, tokens, capability level, interruption behavior, and a static or
reduced-motion substitute.

### Resume Loader

Owns the branded application-bootstrap narrative: paper entrance, section
construction, ATS scan, keyword recognition, score resolution, and ready state.
It is a presentation of readiness, not a claim that each depicted stage maps to
actual bootstrap work.

### ATS Loader

Maps real ATS analysis stages to scanning, section checks, keyword findings, and
score resolution. It distinguishes current, complete, waiting, failed, and
cancelled stages and never animates a final score before the server supplies one.

### AI Loader

Represents generation through document changes, streaming text, and semantic job
stages such as summary, experience, skills, keywords, or cover letter. It renders
valid partial output as soon as available and keeps cancellation available.

### PDF Loader

Maps export states such as layout preparation, font rendering, pagination,
compression, and final file readiness. Only stages reported by the export
pipeline may appear as completed.

### Upload Loader

Represents transfer separately from server processing. Byte progress may drive a
determinate upload indicator; parsing, extraction, and section recognition use
reported job stages. The original filename and cancel/retry actions remain
available.

### Page Loader

Chooses a route-specific skeleton composition and retains stable application
chrome. It is not a generic full-page spinner and is not shown for background
refetches with usable data.

### Transition Manager

Coordinates loader-to-content replacement, route continuity, focus, and
cancellation through the existing motion architecture. Content becomes available
immediately when ready; visual completion cannot delay interaction.

## 6. Conceptual loading contract

A future loading request should be expressible without React, GSAP, Framer
Motion, Lottie, or CSS-specific fields.

| Field | Meaning |
|---|---|
| `id` | Stable operation identifier used to reject stale updates |
| `intent` | Semantic purpose, such as `resume.bootstrap` or `ats.analyze` |
| `scope` | Application, route, region, component, or control |
| `priority` | Blocking, foreground, background, or decorative |
| `mode` | Skeleton, staged, determinate, streaming, or inline |
| `stage` | Current domain-reported stage |
| `progress` | Optional measured value and unit |
| `messageKey` | Contextual copy selected from the approved registry |
| `shape` | Expected content family and density |
| `canCancel` | Whether an immediate cancel action is available |
| `fallback` | Static, compact, or preserved-content behavior |
| `startedAt` | Used for anti-flash and observability policy |
| `terminal` | Success, error, cancelled, or superseded outcome |

Business state is authoritative. Animation callbacks may report that a visual has
settled, but must never mark an API call, job, upload, or export successful.

## 7. Lifecycle and concurrency

The normalized lifecycle is:

```text
idle -> pending -> active -> success
                     |  |       |
                     |  |       +-> settled
                     |  +-> error
                     +----> cancelled or superseded
```

- **Pending** absorbs very short waits to prevent flashing.
- **Active** exposes the selected loader and status.
- **Success** permits a brief interruptible visual handoff while content is
  already usable.
- **Error** and **cancelled** replace loading without waiting for an exit effect.
- **Superseded** silently retires stale operations after navigation or a newer
  request.

One scope has one winning foreground presentation. A child scope may show local
loading while its parent remains usable. Blocking priority must be explicitly
requested by the owning workflow. Concurrent background operations appear in a
task/status surface rather than repeatedly taking over the screen.

## 8. Global website loading screen

### Entry policy

The branded full-screen Resume Loader appears only while the application shell
cannot yet render safely. It is eligible on a cold start and exceptional
application reinitialization, not on every refresh of route data. If meaningful
shell content is available quickly, the loader may be skipped.

Target visible duration is approximately 1.5–3 seconds only when genuine startup
work lasts that long. Completion is immediate when readiness arrives; no maximum
duration may conceal a stalled boot. At a defined timeout, the experience changes
to a recovery state with a useful explanation and retry action.

### Visual narrative

The complete capability sequence is:

1. A blank professional paper slides into view.
2. Header, avatar, contact lines, and dividers appear sequentially.
3. Experience, education, skills, and project skeletons assemble.
4. An ATS scan line travels from top to bottom.
5. A small set of keyword regions receives restrained highlights.
6. A score indicator resolves only as a visual readiness motif.
7. Sparse AI sparkles and slow gradient light add branded polish.
8. The completed paper settles with a soft glow.
9. The paper/surface crossfades or shares continuity with the homepage.

The document uses professional spacing, rounded corners, restrained shadow,
high-quality type proportions, and an ATS-friendly single-column reading order.
The background supports the paper without competing with it.

### Capability variants

| Policy | Bootstrap behavior |
|---|---|
| Full | Complete bounded paper, scan, highlight, and transition sequence |
| Limited | Short paper assembly and opacity-only scan; no particles or heavy filters |
| Reduced | Stable completed paper with concise status changes and brief crossfade |
| None | Static branded document and accessible text; immediate replacement when ready |

Mobile uses fewer document details and shorter travel distances. It must not
simulate a desktop sheet at an unreadable scale.

## 9. Skeleton system

### Shared anatomy

Every skeleton family defines:

- stable container geometry and responsive variants;
- placeholder hierarchy for headings, body copy, media, controls, and data;
- density variants for compact, standard, and spacious layouts;
- a single status owner per meaningful region;
- shimmer only at the containing surface level where practical;
- a no-animation high-contrast presentation;
- content replacement rules that minimize cumulative layout shift.

Skeleton colors come from semantic surface and border tokens. Shimmer contrast is
subtle, never flashes, and does not travel across the entire viewport as one
costly layer.

### Required families

| Family | Required content shape |
|---|---|
| Navigation | Brand area, primary destinations, utility action |
| Sidebar | Section labels, active item, lower utility group |
| Cards | Media/avatar, title, metadata, body lines, action |
| Tables | Header cells, responsive rows, row actions |
| Forms | Label, control, help/error reserve, action group |
| Dashboard | Metric cards, chart frame, activity list, actions |
| Resume preview | Real paper proportions and resume section hierarchy |
| Templates | Thumbnail paper, template name, tags, selection action |
| Profile | Avatar, identity, details, completion/action areas |
| Settings | Section navigation, labels, controls, save area |
| Analytics | Metrics, chart axes/plot region, legend, insight cards |
| Charts | Stable plot, axes, legend; no invented data trace |
| Notifications | Icon, title, message lines, timestamp, action |
| AI chat | Message groups, document/result block, composer continuity |
| History | Timestamped entries, labels, comparison/action controls |
| Search results | Query context, result rows/cards, filters, count reserve |

### Resume-specific skeletons

The Resume Card includes an avatar or document mark, title, metadata, representative
text lines, and actions. The Resume Editor preserves editor navigation, form
sections, and a realistic paper preview. The paper includes name, contact,
education, experience, skills, and projects in the same approximate geometry as
the selected template without exposing stale or fabricated personal data.

Skeletons indicate loading structure, not disabled content. They are normally
removed from the accessibility tree while their region exposes one concise status.

## 10. Specialized workflow loaders

### ATS analysis

Preferred sequence:

```text
document received -> structure scan -> keyword analysis
-> section checks -> scoring -> AI findings -> result ready
```

The visualization may show a scan line, current keyword regions, completed
section checks, measured progress, and the final supplied score. Copy should
identify the current operation, such as “Analyzing resume structure” or “Matching
role keywords.” An unknown-duration scan uses stage activity, not a cycling fake
percentage.

### AI generation

The loader resembles real writing: a summary grows, experience bullets are added,
skills are grouped, keywords are matched, and quality indicators update. These
changes must reflect the requested generation type. Streaming output replaces
placeholders as soon as chunks are valid. The user can cancel, retain acceptable
partial output where supported, and continue working elsewhere when the workflow
allows it.

### PDF export

Preferred stages are preparing layout, resolving fonts, formatting pages,
numbering pages, compressing the document, and making the PDF available. The
paper assembly can show page boundaries and a restrained progress track. Export
history and retry behavior are product state, not animation state.

### File upload

Preferred stages are uploading, validating, parsing, extracting text, recognizing
sections, and ready for review. Transfer progress and processing progress remain
visually distinct. The system must not claim to be parsing while bytes are still
being transferred unless the backend genuinely performs both concurrently.

## 11. Progress and messaging

Messages come from a centralized, localized registry grouped by intent and stage.
They describe observed work, not random reassurance. Examples include:

- Preparing your workspace
- Loading resume templates
- Initializing AI tools
- Analyzing resume structure
- Matching important keywords
- Generating a professional layout
- Preparing your dashboard
- Loading analytics
- Formatting your PDF
- Finalizing your resume

Rotation is permitted only within a long-lived stage and at a calm cadence. The
current stage is announced once; cosmetic message rotation is not repeatedly
announced to screen readers.

Rules:

- never use “Almost ready” until the workflow reports a finalizing stage;
- never show a percentage derived from elapsed time alone;
- retain the last meaningful message long enough to read;
- pair jargon with plain-language meaning;
- use past tense or a checkmark only for completed stages;
- switch immediately to actionable error or cancellation copy when terminal.

## 12. Timing and transition policy

Named timing tokens should cover anti-flash, micro feedback, standard replacement,
deliberate stage transition, and bounded showcase sequences. Exact values belong
to the later implementation specification.

Policy:

- very short local operations may render no placeholder;
- reserve layout immediately even when the visual skeleton is delayed;
- do not impose a minimum duration on control actions, navigation, or results;
- crossfade skeleton and content only when both occupy stable geometry;
- long sequences compress or skip ahead when backend stages complete quickly;
- a success glow/check may be omitted if the next content is already ready;
- route change, cancellation, error, or user input can interrupt all decoration;
- never queue animations for every high-frequency progress update.

## 13. Accessibility

- Each meaningful loading region exposes one `status` message with a concise
  accessible name.
- Stage changes use polite announcements and are deduplicated; errors use the
  application’s error announcement policy.
- Decorative paper details, shimmer, scan lines, particles, and skeleton children
  are hidden from assistive technology.
- Existing keyboard focus is preserved when a local region refreshes.
- A blocking bootstrap state places focus only after the destination page is
  available, following the existing route focus policy.
- Cancellation, retry, and navigation controls remain keyboard accessible and
  visibly focused.
- Reduced motion removes scan travel, shimmer translation, particles, paper fold,
  large scale, blur motion, and sequential choreography.
- Forced-colors and high-contrast modes use solid outlines and distinguishable
  blocks rather than gradient-dependent meaning.
- Status is never conveyed only by color, glow, motion, or spatial position.
- Loading placeholders do not falsely expose buttons, headings, or values to a
  screen reader.

## 14. Performance and resilience

The target is smooth rendering on representative devices, measured rather than
assumed. Acceptance budgets:

- no loading animation in the critical path for shell content or primary actions;
- prefer compositor-friendly transform and opacity;
- profile shimmer, filters, shadows, masks, blur, and large gradient surfaces;
- no React state update for each animation frame;
- batch reads and writes and avoid layout-dependent paper animation;
- use one animation clock through the Motion Manager;
- pause decorative activity offscreen, in hidden tabs, and under battery/data
  saving or low-capability policy;
- lazy-load specialized assets and adapters with reserved dimensions;
- release timelines, observers, timers, and job subscriptions on completion,
  cancellation, error, unmount, or policy change;
- preserve stable geometry to minimize layout shift;
- provide a lightweight static fallback if an adapter or asset fails;
- never let a loading presentation prevent timeout, retry, cancel, or error UI.

Low-performance mode removes particles, continuous gradient travel, complex paper
folds, blur, and simultaneous animated regions. It favors a stable document,
opacity changes, and truthful status text.

## 15. Responsive behavior

Skeletons follow the same breakpoints and information hierarchy as their final
content. They do not merely shrink a desktop placeholder.

- Mobile favors one-column structures, fewer decorative paper details, and short
  status copy.
- Tablet preserves document identity while simplifying simultaneous panels.
- Desktop may show editor and paper preview skeletons side by side when the final
  layout does.
- Resume paper retains its page ratio within available space without causing
  horizontal overflow.
- Orientation, zoom, text scaling, and responsive header changes must not restart
  a workflow or replay the global entrance.

## 16. Observability and product metrics

The loading subsystem should emit privacy-safe lifecycle telemetry:

- intent and scope;
- time to first placeholder;
- time to usable content;
- total operation duration;
- stage duration where supplied;
- loader skipped, shown, or upgraded;
- cancellation, timeout, retry, error, and superseded outcomes;
- selected capability policy;
- long tasks, layout shift, and dropped-frame evidence during presentation.

Telemetry must distinguish perceived presentation time from actual operation
time. It must not include resume content, filenames, prompts, extracted keywords,
or personal information.

## 17. Technology boundary

Implementation may use the following tools behind adapters:

- **GSAP** for coordinated document and specialized workflow timelines;
- **Framer Motion** for React-local presence and layout continuity;
- **Lenis** only through the existing Scroll Manager, not as a loading dependency;
- **CSS skeleton shimmer** for lightweight content placeholders;
- **React Suspense** for declarative loading boundaries;
- **React Lazy** for route and specialized-presentation splitting;
- **Intersection Observer** to pause or defer offscreen presentation.

No feature component should import an animation vendor merely to express loading.
Using both GSAP and Framer Motion requires explicit ownership rules so they never
animate the same property on the same target. Native/CSS and static adapters are
mandatory fallbacks. Suspense boundaries expose readiness; they do not replace
domain job state or measurable progress.

## 18. Future expansion

The presentation registry and adapter port allow:

- AI avatars as optional status presenters;
- Lottie assets with DOM/static fallbacks;
- capability-gated 3D paper effects;
- light, dark, and theme-specific loader packs;
- holiday decoration packs;
- premium experience variants;
- tenant and enterprise custom branding;
- generated motion reviewed against duration, flashing, property, and performance
  policies.

Each extension registers semantic intents, capability needs, asset budgets,
cleanup behavior, accessibility alternatives, and failure fallback. Feature
workflows remain unchanged.

## 19. Governance and delivery gates

1. Approve the semantic contract, loading taxonomy, priority rules, and copy
   registry.
2. Define static, reduced, limited, and full policies before animated adapters.
3. Build accessibility and lifecycle contract tests for arbitration,
   cancellation, stale updates, errors, and focus.
4. Establish skeleton geometry tokens and pilot Resume Card, Dashboard, and Resume
   Editor shapes.
5. Replace the generic route spinner with route-specific skeleton policy.
6. Pilot the branded bootstrap Resume Loader behind a feature flag.
7. Add ATS, AI, upload, and PDF loaders only after their backend stage contracts
   are authoritative.
8. Validate low-end mobile performance, reduced motion, forced colors, keyboard,
   screen reader, zoom, interruption, timeout, and error recovery.
9. Roll out by capability cohort and monitor actual time-to-content and
   abandonment.

No feature may invent its own global overlay, circular spinner, progress math,
message rotation, shimmer, or vendor animation import outside these boundaries.

## 20. Current-state migration note

The frontend currently contains reusable skeleton primitives and a generic
circular page loader. During a separately authorized implementation phase:

- retain useful skeleton composition concepts but move them under the shared
  loading policy and accessibility contract;
- expand document and AI placeholders into the defined semantic families;
- replace the circular page loader with route-aware skeletons and the bootstrap
  Resume Loader where eligible;
- audit direct pulse/shimmer styles for reduced motion, forced colors, layout
  stability, and performance;
- connect loading presentation to the existing Motion Provider and route focus
  behavior instead of creating parallel global managers.

This document itself changes no runtime behavior.
