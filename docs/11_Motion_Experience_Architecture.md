# Motion Experience Architecture

**Status:** Architecture blueprint only. This document defines future extension
points and governance. It does **not** authorize or implement animations, smooth
scrolling, motion dependencies, motion components, or runtime modules.

## 1. Goals and non-goals

Motion should make state, hierarchy, and continuity easier to understand while
keeping the application fast, accessible, and productive. The eventual experience
may use polished motion comparable to modern productivity products, but visual
spectacle must never take priority over task completion.

This architecture provides:

- one policy boundary for all application motion;
- library-independent contracts between product components and motion adapters;
- static, reduced-motion, and low-capability fallbacks;
- reusable vocabulary for page, scroll, component, and feature motion;
- future adapters for 3D, WebGL, Lottie, cursor, and generated motion.

This phase intentionally provides no JavaScript interfaces, React providers,
hooks, CSS keyframes, data attributes, dependencies, or executable presets. The
names and shapes below are conceptual contracts for a later implementation plan.

## 2. Design principles

1. **Static-first:** content, focus order, validation, navigation, and every
   operation work correctly with motion unavailable.
2. **Progressive enhancement:** motion adapters may decorate an already correct
   interface; they may not own content visibility or business state.
3. **Intent over technique:** components request an intent such as
   `feedback.confirm`, not a GSAP tween or CSS transition.
4. **One owner:** only the motion subsystem coordinates global scrolling,
   timelines, route transitions, and media-query policy.
5. **Interruptible:** route changes, user input, drag operations, and dialogs can
   cancel decorative work immediately.
6. **Transform-safe:** future motion favors compositor-friendly `transform` and
   `opacity`; layout animation requires measurement and review.
7. **Accessible by construction:** reduced motion is a different behavior policy,
   not merely a shorter duration.
8. **Measurable:** motion is accepted only when performance and usability budgets
   pass on representative low-end and touch devices.

## 3. Conceptual architecture

```text
Product components and feature workflows
                |
        semantic motion intents
                |
        Motion Manager (policy)
       /          |            \
Scroll Manager  Transition    Preset registry
                Manager             |
       \          |            /
          library adapter ports
        /          |             \
 native/static   GSAP adapter   future adapters
                  |
          ScrollTrigger / Lenis
```

Product code depends only on semantic intents and lifecycle signals. Vendor APIs
remain behind adapters. The static adapter is the required baseline and completes
all lifecycle callbacks synchronously without visual motion.

### Planned ownership boundaries

The following is a proposed future layout, not a folder-creation instruction:

```text
src/motion/
  core/          # policy and orchestration
  config/        # tokens, capability policy, component rules
  presets/       # declarative intent definitions
  adapters/      # vendor-specific implementations
  plugins/       # optional 3D, WebGL, Lottie, and cursor integrations
  testing/       # static adapter, fixtures, and motion assertions
```

Feature modules may own a mapping from feature events to shared intents, but they
must not import vendor libraries or create global scroll/ticker instances.

## 4. Responsibilities

### Motion Manager

The sole public orchestration boundary. It resolves user preference, device
capability, page context, priority, and the selected adapter. It registers scopes,
starts and cancels intents, prevents competing transforms on the same element,
and exposes lifecycle completion. It does not contain feature business logic.

### Scroll Manager

Owns the single optional smooth-scrolling engine and normalizes scroll signals for
observers. It preserves native semantics for touch, wheel, touchpad, scrollbar,
keyboard, anchors, focus movement, history restoration, and nested scroll areas.
It can switch immediately to native scrolling and must never hijack browser zoom,
text selection, or assistive technology.

### Transition Manager

Coordinates route, shared-element, modal, drawer, dialog, and toast lifecycles.
It integrates with routing and focus management so the incoming screen is usable
without waiting for visual completion. It defines cancellation and replacement
behavior for rapid navigation and repeated interaction.

### Motion Configuration

Combines product defaults, feature flags, user preferences, media queries,
capability checks, and test overrides into an immutable runtime policy. Expected
policies are `full`, `limited`, `reduced`, and `none`; `reduced` and `none` must
not be treated as error states.

### Animation Presets

Declarative, semantic recipes such as reveal, exit, feedback, progress, and
continuity. Presets specify allowed properties, tokens, fallback behavior, and
interruptibility. They contain no direct feature selectors and no business state.

### Timing Configuration

Defines named duration and stagger tokens instead of arbitrary component values.
The future token set should cover instant state changes, micro feedback, standard
transitions, deliberate transitions, and bounded sequences. Infinite decorative
motion is opt-in and prohibited in productivity workspaces by default.

### Easing Configuration

Defines semantic curves for enter, exit, move, emphasis, and linear progress.
Adapters translate these meanings to vendor syntax, keeping product code portable.

### Global Motion Tokens

The shared source for duration, easing, distance, scale, blur, rotation, stagger,
parallax depth, z-order, and capability limits. Tokens should be available to
JavaScript and CSS from one generated source when implementation begins.

### Component Motion Rules

A reviewable registry of allowed intents by component and state. Rules include
priority, trigger, cancellation, focus behavior, reduced-motion substitution, and
whether layout measurement is permitted. Shared components expose state; they do
not choose vendor techniques.

### Future Animation Plugins

Optional adapters registered through the same port as 2D motion. Each plugin
declares capabilities, loading strategy, cleanup, reduced-motion behavior,
performance budget, and fallback. Plugin failure must leave the static UI intact.

## 5. Conceptual contract

A future motion request should be expressible in library-neutral terms:

| Field | Meaning |
|---|---|
| `intent` | Semantic name, for example `reveal.section` |
| `scope` | Owning component or route lifecycle |
| `targets` | Explicit element references, never global selectors |
| `trigger` | State, viewport, route, pointer, or progress signal |
| `priority` | Functional, feedback, continuity, or decorative |
| `policy` | Allowed capability levels |
| `tokens` | Named timing, easing, distance, and stagger values |
| `fallback` | Static or reduced behavior |
| `interrupt` | Cancel, finish, reverse, or replace |
| `onComplete` | Optional visual lifecycle signal, never business success |

Business operations must not await `onComplete`. For example, saving a resume
finishes when the API operation finishes, not when an autosave indicator settles.

## 6. Smooth scrolling policy

Native scrolling is the default and fallback. A future smooth-scrolling adapter
may activate only after checking reduced motion, input modality, browser support,
page type, device capability, and an application feature flag.

The adapter must:

- target 60 FPS without promising a fixed rate on every device;
- accept mouse wheel and precision touchpad deltas without flattening intent;
- retain native touch behavior on mobile unless device testing proves an
  enhancement beneficial;
- preserve Page Up/Down, Home/End, Space, arrow keys, anchor links, focus scroll,
  skip links, browser find, restoration, and visible scrollbars;
- exclude editors, modals, dropdowns, previews, and other nested scroll containers
  unless explicitly registered;
- use passive input listeners where possible and a single animation-frame loop;
- expose current position and progress without causing React renders per frame;
- stop and restore native behavior cleanly when policy changes;
- disable immediately for `prefers-reduced-motion: reduce`;
- avoid changing PDF/resume preview geometry or print output.

Locomotive-style DOM transforms are not the default because they can complicate
native positioning, focus, sticky elements, and accessibility. Any exception
requires a documented browser and accessibility test result.

## 7. Reusable motion taxonomy

Presets should be composed from a small vocabulary rather than one-off effects:

| Family | Supported future intents |
|---|---|
| Reveal/exit | fade in/out, slide up/down/left/right, scale in/out, subtle rotate, blur reveal |
| Sequence | staggered lists, sequential cards, timelines, hero entrance, footer reveal |
| Scroll | section reveal, progress indicator, sticky continuity, lightweight parallax, background motion |
| Data | number counters, chart and progress updates |
| Navigation | route transition, shared element, crossfade, fade, slide, scale |
| Overlay | modal, drawer, dialog, dropdown, profile menu, toast |
| Feedback | validation, save status, loading, skeleton, notification, AI progress |

Each preset requires a static fallback. Essential content is rendered visible in
the initial DOM; a reveal adapter may establish a hidden visual state only after
it has successfully initialized.

## 8. Navigation and section scrolling

Section navigation is a first-class navigation concern, not an animation preset.
Its semantic destination, URL behavior, focus transfer, and final position must
work with native scrolling before optional smoothing is applied.

### 8.1 Responsibilities

The future navigation subsystem is divided into library-neutral roles:

| Role | Responsibility |
|---|---|
| Section Registry | Maintains stable section IDs, hierarchy, labels, element references, and availability |
| Target Resolver | Resolves a link, route fragment, or semantic destination to a registered section |
| Offset Resolver | Calculates the current safe top boundary from sticky UI and spacing tokens |
| Navigation Coordinator | Owns one navigation transaction from activation through final settlement |
| Scroll Adapter | Performs native, instant, or optionally smoothed movement without changing semantics |
| Visibility Observer | Reports candidate visible sections without updating React state every frame |
| Active Section Arbiter | Selects exactly one active section using deterministic rules |
| History Adapter | Reads and writes fragments while preserving browser back/forward behavior |
| Focus Coordinator | Places focus or announces the destination after intentional navigation |
| Layout Stabilizer | Revalidates the target when fonts, images, lazy content, or disclosures change layout |

These roles may be packaged within the future Scroll Manager, but their contracts
remain separate so scroll spy, deep links, and focus behavior can be tested without
a smooth-scrolling library.

### 8.2 Stable destination contract

Every navigable destination requires a unique, URL-safe, stable section ID.
Generated array indexes, localized labels, and visible heading text are not stable
IDs. A destination registration conceptually contains:

| Field | Meaning |
|---|---|
| `id` | Canonical fragment identifier |
| `element` | Current destination element reference |
| `heading` | Focusable or programmatically focusable section heading |
| `parentId` | Optional parent for nested navigation |
| `order` | Document-order tie breaker |
| `offsetGroup` | Header/sidebar context that defines the safe boundary |
| `historyMode` | Push, replace, or no URL update for the navigation context |
| `availability` | Present, loading, collapsed, disabled, or removed |

Ordinary links should use real fragment-capable URLs such as `href="#features"`.
This preserves copying, opening in a new context, status-bar destinations, and a
functional no-JavaScript/native fallback. Buttons may request section navigation
only when the control performs an action in addition to ordinary navigation.

### 8.3 Positioning and sticky offsets

The final alignment rule is: the destination heading and its contextual beginning
must be visible below all persistent chrome, with a consistent breathing-space
token. Section height does not determine which offset is used.

The effective top inset is conceptually:

```text
safe top = active sticky header stack + safe-area inset + section gap token
```

The future implementation should expose the same offset as a CSS
`scroll-margin-block-start` token for native fragment navigation and through the
Offset Resolver for programmatic navigation. Sticky elements report their current
occupied block size; callers do not hard-code header pixels.

Offsets must be recalculated at navigation time and after relevant resize events,
because mobile navigation, responsive headers, banners, browser zoom, wrapping
content, and safe-area insets can change the boundary. The coordinator aligns the
heading to the safe top rather than centering sections or assuming equal heights.

Nested scroll containers, including sidebars, dashboard panels, dialogs, and the
Resume Builder, register their own scroll root and offset group. A transaction
scrolls only the required root or ordered chain of roots.

### 8.4 Navigation transaction

One activation creates one interruptible transaction:

1. Resolve the canonical destination and reveal collapsed ancestors if permitted.
2. Measure the scroll root, destination, and current safe offset in one read phase.
3. Update history according to the link context without duplicating entries.
4. Move using native/instant behavior for reduced motion, otherwise use the
   selected Scroll Adapter.
5. Suppress scroll-spy URL writes while the transaction owns the active target.
6. Recheck alignment after settlement and relevant layout stabilization.
7. Apply focus or an accessible announcement without causing a second scroll.
8. Release ownership so user scrolling can determine the active section again.

Wheel, touch, pointer, keyboard, route change, or a second navigation request may
cancel or replace a running transaction. Cancellation preserves the user's current
position; it must not snap back, overshoot, or continue fighting user input.

The correction step is bounded and only runs when the measured heading is outside
an allowed alignment tolerance. This accommodates font loading, responsive images,
lazy content, data arrival, and opening FAQ items without creating an endless
measurement loop or visible jitter.

### 8.5 Active navigation and scroll spy

Visibility observation should use `IntersectionObserver` with the actual scroll
root and an effective root margin derived from the safe top inset. Continuous
`scroll` handlers and per-frame bounding-box scans are not acceptable for ordinary
section tracking.

The Active Section Arbiter chooses exactly one item:

1. During a navigation transaction, its resolved destination remains active unless
   the user interrupts.
2. Otherwise, prefer the first eligible heading crossing the safe-top activation
   line.
3. If multiple sections intersect, prefer the section with the greatest meaningful
   visibility near that line.
4. At the document end, allow the last eligible section to become active even when
   it cannot reach the activation line.
5. Resolve remaining ties by document order and retain the previous active item
   within a small stability band to prevent boundary flicker.

The observer reports changes only when the selected ID changes. Visual highlight
transitions are optional decoration; `aria-current="location"` is the authoritative
state and only one navigation item receives it. Scroll-spy changes normally replace
the URL fragment rather than pushing an entry for every section passed.

### 8.6 Deep links and browser history

On initial load and route changes, the History Adapter resolves the decoded
fragment after the route shell and destination are available. It must tolerate
temporarily unavailable lazy or dynamic sections without clearing the fragment.

User-activated links normally push a history entry. Passive scroll-spy updates use
replace semantics or remain URL-silent according to page policy. `popstate` and
fragment navigation restore the requested section without creating another history
entry, preserving Back and Forward traversal.

Deep links must support landing sections, documentation headings, FAQ items,
dashboard modules, and resume editor sections. If a destination is inside a
collapsed disclosure or inactive panel, the owning feature decides whether it can
be revealed safely before alignment. Missing or unauthorized targets fall back to
the route start and accessible page heading; they never expose hidden content.

### 8.7 Focus and accessibility

- Native anchors remain keyboard operable and expose meaningful link text.
- Intentional in-page navigation moves programmatic focus to the destination
  heading or section landmark when that improves orientation.
- A temporary focus target uses `tabindex="-1"` without changing normal tab order.
- Focus occurs with scroll prevention after alignment to avoid a second jump.
- Passive scroll-spy changes never steal focus or trigger live announcements.
- Skip links bypass optional smooth behavior, reveal focus clearly, and move
  directly to the main landmark.
- Screen readers receive correct headings, landmarks, expanded state, and
  `aria-current`; animation is never required to understand arrival.
- Reduced motion uses native or instant scrolling and no inertial correction.
- Keyboard scrolling, Page Up/Down, Home/End, Space, arrows, browser find, text
  selection, zoom, and assistive-technology scroll commands remain native.

### 8.8 Supported navigation contexts

The same destination contract supports:

- navbar to page section;
- hero action to features;
- CTA to pricing;
- footer link to a section;
- sidebar or table of contents to document content;
- dashboard menu to a panel;
- Resume Builder navigation to an editor section;
- nested and multi-level navigation;
- dynamic or collapsible sections;
- one-page landing and documentation layouts;
- multi-step forms where steps are route/state destinations rather than fake
  document fragments.

Context adapters define scroll roots, hierarchy, history policy, and reveal rules;
they do not replace the registry, observer, arbiter, or focus contracts.

### 8.9 Performance and acceptance criteria

- Target 60 FPS while treating dropped-frame and input-latency measurements as the
  acceptance evidence.
- Cache registered references and update them on registration changes, not on every
  scroll event.
- Batch geometry reads and writes; never measure through React render loops.
- Use observers for visibility and resize invalidation.
- Reserve space for lazy content and images where dimensions are known.
- Recalculate only affected offset groups and scroll roots.
- Permit one active navigation transaction per scroll root.
- Avoid `setTimeout` guesses for content readiness; use route, disclosure, font,
  image, resize, and registration lifecycle signals.
- Test short, tall, nested, last-page, dynamically inserted, lazy-loaded, and
  collapsed destinations at mobile and desktop widths.
- Test repeated clicks, rapid Back/Forward, user interruption, sticky-header
  resizing, zoom/reflow, reduced motion, touch, touchpad, mouse wheel, and keyboard.
- A destination passes when its heading remains fully visible within the alignment
  tolerance, exactly one item is current, focus is understandable, and no jitter
  or layout shift is introduced by navigation.

## 9. Component rules

| Component group | Permitted future role | Required behavior |
|---|---|---|
| Buttons and links | press/hover feedback, progress | No pointer-only meaning; no delayed activation |
| Cards and widgets | subtle hover, reveal, reorder | Stable layout; disable tilt/parallax for reduced motion and touch |
| Navigation/sidebar | selection continuity, open/close | Focus and active route update immediately |
| Dropdown/accordion/tabs | spatial continuity | ARIA state is authoritative; keyboard operation never waits |
| Forms and inputs | focus and validation feedback | Errors remain visible and announced; no shake-only communication |
| Search/profile menu | overlay transition | Correct focus trap/return and escape behavior |
| Resume/PDF preview | content crossfade or page continuity | Never animate printable geometry; preserve selection and zoom |
| Charts/counters | data-change explanation | Accessible final value exists independently of animation |
| Notifications/toasts | enter/exit and lifetime | Pause rules, readable duration, persistent alternative |
| AI chat/progress | streaming and status continuity | Honest, non-looping progress where measurable; cancel remains immediate |
| Loading/skeletons | perceived continuity | No flashing; reduced mode uses stable placeholder or status |

## 10. Resume Builder motion map

| Workflow | Future intent | Productivity constraint |
|---|---|---|
| Section switching | continuity/crossfade | New fields become interactive immediately |
| Drag and drop | lift, placeholder, settle | Keyboard reorder and live-region result are equal first-class paths |
| Expand/collapse | disclosure | ARIA state and focus remain correct |
| Validation | localized feedback | Never move the entire form or hide the message |
| Live preview | content-diff continuity | Debounce rendering; do not animate every keystroke |
| Autosave | quiet status transition | Saving is never blocked by motion |
| AI generation | bounded progress/status | Cancellation and partial results remain usable |
| Version history | list/detail continuity | Preserve scroll, comparison context, and focus |

## 11. Landing page motion map

Hero entrance, scroll storytelling, feature reveals, counters, testimonial
carousels, calls to action, gradient/background motion, floating UI, pointer
effects, and scroll illustrations may be layered onto the static landing page.

Rules:

- hero copy and primary CTA are present and readable before enhancement;
- storytelling does not pin users through essential content;
- carousels have manual controls, pause behavior, and no forced auto-advance;
- pointer effects are decorative and omitted for coarse pointers;
- parallax is shallow, transform-only, and absent in reduced/limited modes;
- background and floating motion pause offscreen and when the page is hidden;
- scroll-triggered illustrations lazy-load near the viewport with stable space;
- CTA activation and navigation never depend on a completed timeline.

## 12. Page and shared-element transitions

The router owns navigation; the Transition Manager observes it. Route data,
authorization, error boundaries, document title, scroll restoration, and focus
placement occur independently of visual transitions.

Shared-element transitions require stable semantic IDs and a static crossfade
fallback. Missing elements, interrupted navigation, loading errors, or unsupported
browsers must not strand an overlay clone or conceal either page. Modal, drawer,
dialog, and toast transitions remain local scopes and cannot commandeer the route
timeline.

## 13. Accessibility policy

- Subscribe to `prefers-reduced-motion` changes, not only the initial value.
- In reduced mode, remove inertial scrolling, parallax, tilt, blur travel,
  rotation, large scaling, autoplay, and decorative sequencing.
- Prefer instant state changes or a brief opacity-only substitution when useful.
- Never use motion as the sole carrier of status, direction, validation, or success.
- Keep DOM order, accessible names, live regions, focus traps, and focus return
  independent from visual layers.
- Do not set essential content to hidden before an adapter is ready.
- Test keyboard-only, screen-reader, zoom/reflow, forced-colors, reduced-motion,
  touch, and switch-like repeated input paths.

## 14. Performance and lifecycle budgets

Future implementation acceptance criteria:

- no motion code in the critical path for first content and primary actions;
- route- and feature-level adapters are lazy-loaded;
- at most one global ticker and one smooth-scroll owner;
- no React state update on every animation frame;
- geometry reads are batched before writes; no read/write loops;
- prefer `transform` and `opacity`; blur, filters, shadows, masks, and large
  backdrops require profiling;
- `will-change` is temporary and scoped, not a permanent blanket declaration;
- viewport observers replace continuous scroll handlers for simple reveals;
- offscreen, hidden-tab, and completed animations release observers and tickers;
- every scope cleans up on unmount, route replacement, error, and policy change;
- limited mode disables costly sequences based on measured capability;
- lazy assets reserve dimensions and never trigger avoidable layout shifts.

Measure frame time, long tasks, layout shift, interaction latency, memory, bundle
cost, and battery/CPU behavior in production builds. A visually impressive effect
that misses the budget is simplified or removed.

## 15. Technology recommendation

Libraries are adapter choices, not architecture dependencies.

- **GSAP:** appropriate for coordinated timelines, interruption, transforms, and
  complex component or route sequences. Keep imports and GSAP-specific easing
  syntax inside an adapter.
- **ScrollTrigger:** appropriate for efficient scrubbed timelines, pinning where
  justified, progress, and lifecycle management tied to GSAP. Prefer
  `IntersectionObserver` for simple one-time reveals.
- **Lenis (preferred):** a relatively focused smooth-scroll layer that can feed a
  shared animation clock while preserving a clearer native fallback boundary.
  Activate it through the Scroll Manager only.
- **Locomotive Scroll:** consider only if a validated storytelling requirement
  cannot be met with native scroll plus Lenis/ScrollTrigger. Its transformed-scroll
  model carries greater sticky, focus, positioning, and accessibility risk.

The mandatory adapter port and static adapter allow GSAP, ScrollTrigger, or Lenis
to be replaced without changing components or feature workflows.

## 16. Future expansion

3D interactions, WebGL/Three.js scenes, Lottie, micro-interactions, cursor effects,
and AI-generated animation register as optional capability plugins. They must:

- lazy-load behind explicit feature and capability checks;
- render in isolated layers with deterministic cleanup;
- accept the same policy, lifecycle, tokens, and cancellation signals;
- expose a static image, poster, DOM, or no-motion equivalent;
- avoid intercepting semantics, focus, text selection, or essential pointer input;
- declare asset, CPU/GPU, memory, and network budgets;
- validate generated motion against property, duration, flashing, and safety limits.

This plugin boundary permits new renderers without redesigning product components.

## 17. Delivery gates

Implementation should proceed only through reviewed gates:

1. Approve semantic intents, tokens, static adapter behavior, and reduced policy.
2. Build contract tests and accessibility fixtures before a vendor adapter.
3. Add the Motion and Transition Managers with the static adapter as default.
4. Add one adapter behind a disabled feature flag and validate cleanup.
5. Pilot one low-risk component and one route transition.
6. Add the Scroll Manager separately; test every native input and focus path.
7. Pilot Resume Builder workflows, then landing-page storytelling.
8. Enable by capability cohort only after performance and accessibility review.

No feature may bypass these boundaries by importing a vendor library directly.

## 18. Current-state note

This blueprint is normative for future motion work. Any existing direct vendor
imports, global tickers, smooth-scroll instances, or component-owned timelines
should be treated as migration candidates during a separate, explicitly authorized
implementation task. This document does not modify or remove them.
