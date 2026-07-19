# AI Resume Builder — Frontend Architecture Guide

**Status:** Pre-development architecture blueprint. No JSX, components, or CSS exist yet. This governs how every frontend developer structures and writes code once feature work begins.

---

## PART 1 — Frontend Architecture Philosophy

### Why React
Component-based composition matches the product's nature — a resume builder is fundamentally a tree of reusable, nestable pieces (a section is made of fields, a resume is made of sections, a template renders sections differently). React's ecosystem also gives mature answers for routing, forms, and state management, which this project needs extensively (Parts 4–7).

### Feature-Based vs Layer-Based Architecture
- **Layer-based** organizes by technical type across the whole app (`all components/`, `all hooks/`, `all services/`) — simple at first, but every new feature touches many top-level folders, and it's hard to tell what belongs to what once the app has 10+ features (Resume Builder, ATS, Job Matching, Admin, etc.).
- **Feature-based** organizes by business capability (`features/resume/`, `features/ats/`), each feature owning its own components, hooks, and API calls — mirrors the backend's feature-module structure (Backend Architecture doc, Part 2), makes it obvious where new code belongs, and makes a feature easy to reason about or eventually remove.

**Recommendation: feature-based at the top level, with a shared layer-based `components/` for truly cross-feature primitives (Part 2).** This mirrors the backend's modular monolith decision and keeps frontend and backend mental models consistent for developers working across both.

### Atomic Design principles
Applied loosely, not dogmatically: shared UI primitives are organized by composability level —
- **Atoms:** Button, Input, Label, Icon
- **Molecules:** FormField (label + input + error), Card, SearchBar
- **Organisms:** Navbar, ResumeSectionList, ATSReportPanel
- **Templates/Pages:** full page layouts composed of organisms

This vocabulary (Part 3) gives the team a shared language for "how reusable is this component" without forcing a rigid folder-per-level structure, which tends to fight against feature-based organization.

### Component-Driven Development
Components are built and validated in isolation (conceptually — e.g., via a tool like Storybook, decided at implementation time) before being wired into pages. This keeps shared components (Part 8) honest — if a Button only works inside one specific page's context, it wasn't actually reusable.

### Separation of concerns
- **Presentation vs logic:** display components (Part 3) receive data and render; they don't fetch data or contain business rules.
- **Data fetching vs UI state:** server state (Part 5) is handled distinctly from local UI state (open/closed, hover, form input before submit).
- **Routing vs feature logic:** routes (Part 4) compose feature pages; they don't contain business logic themselves.

### Reusability strategy
A component is promoted from `features/*/components/` to the shared `components/` only after it's needed by a **second** feature — same rule as the backend's `common/` package (Backend Architecture doc, Part 2). Premature sharing creates hidden coupling between unrelated features.

### Scalability strategy
Each feature module is self-contained enough to be **code-split** (Part 9) and **independently developed** — a new team member can be handed the entire `features/ats/` folder and rarely need to touch anything outside it plus the shared layer.

---

## PART 2 — Complete Folder Structure

```
src/
├── assets/                 # Static images, fonts, icons (raw files, not components)
├── components/                # Shared, cross-feature UI primitives (Part 3 — atoms/molecules/organisms)
├── features/                     # Feature-based modules (Part 3)
│   ├── auth/
│   ├── dashboard/
│   ├── resume/
│   ├── templates/
│   ├── coverLetter/
│   ├── ats/
│   ├── jobMatching/
│   ├── aiAssistant/
│   ├── notifications/
│   ├── profile/
│   ├── settings/
│   └── admin/
├── pages/                           # Route-level composition (thin — assembles feature components + layout)
├── layouts/                           # Shell layouts (AuthLayout, DashboardLayout, AdminLayout)
├── hooks/                                # Shared, cross-feature custom hooks
├── services/                               # Cross-cutting business/service logic not tied to one feature (e.g., auth session logic)
├── api/                                       # Axios instance, interceptors, API module registry (Part 6)
├── routes/                                       # Route definitions, route guards (Part 4)
├── context/                                         # Global React Context providers (Part 5)
├── store/                                             # Global client state store, if/when needed (Part 5)
├── utils/                                               # Stateless pure helper functions
├── constants/                                             # App-wide constant values, enums mirrored from backend
├── config/                                                  # Environment-driven configuration (API base URL, feature flags)
├── styles/                                                    # Tailwind config extensions, global style tokens (Part 8)
├── types/                                                       # Shared TypeScript-ready type/interface definitions
├── validators/                                                    # Shared validation schemas (Part 7)
├── App.jsx
└── main.jsx
```

### Folder Responsibilities

| Folder | Responsibility |
|---|---|
| `assets/` | Raw static files only — never logic, never components. |
| `components/` | Reusable across 2+ features; no feature-specific business logic or API calls. |
| `features/*/` | Self-contained feature modules (Part 3 internal structure). |
| `pages/` | One file per route, composes layout + feature components; contains no business logic itself. |
| `layouts/` | Structural shells (nav, sidebar, footer) shared across multiple pages within a route group. |
| `hooks/` | Cross-feature hooks (e.g., `useDebounce`, `useMediaQuery`) — feature-specific hooks live inside their feature folder instead. |
| `services/` | Logic that isn't UI and isn't a single feature's concern (e.g., token storage service used by both `auth` and the `api` layer). |
| `api/` | The only place Axios is configured; all feature API modules import from here (Part 6). |
| `routes/` | Route tree definition and guard components (`ProtectedRoute`, `AdminRoute`, `GuestRoute`) — Part 4. |
| `context/` | Providers for truly global concerns (auth session, theme) — not a dumping ground for feature state (Part 5). |
| `store/` | Only introduced if/when Context proves insufficient (Part 5) — kept as a placeholder folder so the decision is deliberate, not default. |
| `utils/` | Pure functions with no side effects, no React dependency — testable in isolation. |
| `constants/` | Values like `RESUME_STATUS`, `SUBSCRIPTION_PLAN` mirrored from backend enums, so the frontend never hardcodes magic strings inline. |
| `config/` | Reads `import.meta.env` (Vite env vars) in one place, so no component reaches into `import.meta.env` directly. |
| `styles/` | Tailwind theme extension (colors, spacing tokens) — the single source of design tokens (Part 8). |
| `types/` | Shared shape definitions (e.g., `ResumeResponse` shape matching the backend DTO) — reduces frontend/backend contract drift. |
| `validators/` | Shared form validation schemas usable across features that share field types (e.g., email validation used in both `auth` and `profile`). |

### Internal structure of a feature module
```
features/resume/
├── components/          # Feature-specific components (not reusable elsewhere)
├── hooks/                  # Feature-specific hooks (e.g., useResumeAutosave)
├── api/                       # Resume-specific API calls, built on the shared axios instance
├── routes.jsx                    # This feature's route definitions, merged into the app route tree
├── types.js                        # Feature-specific shape definitions (or .ts if/when TypeScript is adopted)
└── index.js                          # Public exports — other features import only from here, never reaching into internal files
```

**Rule mirrored from the backend:** a feature may import another feature's `index.js` public exports, or shared `components/`/`hooks/`/`api/`, but never reach directly into another feature's internal `components/` or `hooks/` folders — this is what keeps features independently removable/refactorable.

---

## PART 3 — Component Architecture

| Category | Examples | Reusable? | Lives in |
|---|---|---|---|
| **Layout Components** | `AppShell`, `Sidebar`, `Navbar`, `Footer` | Shared across route groups | `layouts/` |
| **Shared/Design-System Components** | `Button`, `Input`, `Card`, `Modal`, `Dropdown`, `Table` | Fully reusable, no business logic | `components/` (Part 8) |
| **Feature Components** | `ResumeSectionEditor`, `AtsScoreGauge`, `JobMatchCard` | Feature-specific, not reused elsewhere | `features/*/components/` |
| **Form Components** | `FormField`, `MultiStepFormWizard` (shared shell) vs. `ExperienceFormStep` (feature-specific) | Shell is shared; step content is feature-specific | Shared shell in `components/`, steps in `features/resume/components/` |
| **Display Components** | `ResumePreview`, `AtsReportSummary` | Feature-specific (render feature data) | `features/*/components/` |
| **AI Components** | `AiSuggestionCard`, `AiGenerateButton`, `AiLoadingIndicator` | The loading/status pattern is shared; the content rendering is feature-specific | Shared status components in `components/`; content in `features/aiAssistant/components/` |
| **Resume Components** | `ResumeCard`, `TemplateThumbnail`, `SectionList` | Feature-specific | `features/resume/components/`, `features/templates/components/` |
| **Admin Components** | `UserTable`, `AdminStatsPanel` | Feature-specific, admin-only | `features/admin/components/` |

### Decision rule for reusability
A component qualifies for `components/` (shared) only if it:
1. Has no dependency on a specific feature's data shape.
2. Is used, or realistically will soon be used, by 2+ features.
3. Contains no feature-specific business logic (only presentation + generic interaction).

`AiLoadingIndicator` is shared because "show a spinner + status" is generic; `AiSuggestionCard` is feature-specific because rendering an AI-generated resume bullet vs. a cover letter paragraph differs enough that forcing one shared component creates awkward conditional branching.

---

## PART 4 — Routing Strategy

```
routes/
├── index.jsx              # Root route tree assembly
├── ProtectedRoute.jsx        # Requires valid auth session
├── GuestRoute.jsx               # Only accessible when NOT authenticated (login/register)
└── AdminRoute.jsx                  # Requires ProtectedRoute AND admin role
```

### Route categories
| Type | Examples | Guard |
|---|---|---|
| **Public** | Landing page, pricing, about | None |
| **Guest-only** | `/login`, `/register` | `GuestRoute` — redirects to dashboard if already authenticated |
| **Protected** | `/dashboard`, `/resumes/:id`, `/ats`, `/job-matching`, `/profile`, `/settings` | `ProtectedRoute` — redirects to `/login` if unauthenticated |
| **Admin** | `/admin/*` | `AdminRoute` — redirects non-admins to dashboard or a 403 page |
| **Dynamic** | `/resumes/:resumeId`, `/resumes/:resumeId/versions/:versionId` | Nested under Protected |
| **Nested** | `/resumes/:resumeId` with child routes for `/edit`, `/preview`, `/ats-check` | Shares a layout (e.g., resume editor shell) via a parent route with an `<Outlet />` |
| **Error** | 404 catch-all, 403 forbidden, 500 fallback boundary | Rendered outside auth guards, always reachable |

### Navigation flow (conceptual)
```
Unauthenticated user → GuestRoute-guarded pages only (login/register/landing)
      │ successful login
      ▼
Protected app shell (DashboardLayout)
      │
      ├── /dashboard → overview
      ├── /resumes → list → /resumes/:id → nested (edit | preview | ats-check | versions)
      ├── /templates
      ├── /job-matching
      ├── /notifications
      ├── /profile, /settings
      │
      └── (if role === ADMIN) /admin/* → AdminLayout shell
```

Each feature module contributes its own `routes.jsx` (Part 2), merged into the root tree in `routes/index.jsx` — adding a new feature never requires editing unrelated route files, only adding one import.

---

## PART 5 — State Management

| State type | Belongs where | Examples |
|---|---|---|
| **Local component state** | `useState`/`useReducer` inside the component | A dropdown's open/closed state, an input's uncommitted value |
| **Context** | `context/` (global) or a feature-scoped context provider | Auth session (user, role, token presence), theme, feature flags — data that's genuinely global and changes rarely |
| **Global store** | `store/` — introduced only if Context's re-render characteristics become a measured problem | Cross-feature client state with frequent updates read by many disconnected components (e.g., a real-time notification count) |
| **Server state** | A dedicated data-fetching pattern (e.g., a query-caching library, decided at implementation time) — never stored in Context or a global store | Resume data, ATS reports, job matches — anything that originates from and is validated against the backend |

### Trade-offs and recommendation
- **Context is the default** for genuinely global, infrequently-changing state (auth, theme) — simplest option, no extra dependency.
- **A dedicated global store (e.g., Zustand/Redux Toolkit) is deferred** until a concrete need appears (e.g., complex cross-feature client-only state like a multi-panel AI assistant session) — introducing it prematurely adds boilerplate and a second state paradigm for no immediate benefit.
- **Server state is never treated as client state.** Resume data fetched from the backend should live in a caching/fetching layer (e.g., a query library) with its own loading/error/staleness handling, not copied into Context or manually synced — this avoids the classic bug class of "the UI shows stale data because someone forgot to manually refetch."

**Rule of thumb:** if the data came from an API, it's server state. If it only exists in the browser and is genuinely shared across distant components, it's Context (or store, once justified). If it's local to one component's rendering, it's local state.

---

## PART 6 — API Layer

```
api/
├── axiosInstance.js        # Single configured Axios instance (baseURL from config/, timeout, headers)
├── interceptors/
│   ├── requestInterceptor.js     # Attaches JWT from the auth session to every outgoing request
│   └── responseInterceptor.js       # Global error normalization, triggers token refresh on 401
├── tokenRefresh.js           # Encapsulates the refresh-token flow, called by the response interceptor
└── errorHandler.js             # Maps backend error response shape (Backend Architecture doc, Part 7) to a frontend-friendly error object
```

Each feature then has its own `features/*/api/` module (e.g., `features/resume/api/resumeApi.js`) that imports the shared `axiosInstance` and defines only the endpoints that feature needs — never a second axios instance per feature.

### Request interceptors
Attach the JWT bearer token from the auth session automatically — individual API calls never manually add the `Authorization` header, eliminating an entire class of "forgot to attach the token" bugs.

### Response interceptors
- Normalize every error response into the frontend's standard error shape, regardless of which backend endpoint produced it — feature code never has to know the raw Axios error structure.
- On a `401` response, trigger the token refresh flow once, retry the original request, and only redirect to login if refresh itself fails — this logic lives centrally, not duplicated per API call.

### Retry strategy
Applied selectively — safe to auto-retry idempotent GET requests on transient network failures (with backoff), but AI generation calls (Part 7, Backend Architecture Part 11) are **not** blindly auto-retried by the interceptor layer, since a retried AI request may have cost/billing implications; retry decisions for those live explicitly in the feature's calling code.

### API Modules
One module per feature (`resumeApi.js`, `atsApi.js`, `aiApi.js`) exporting plain functions (`getResume(id)`, `createResume(data)`) — components and hooks call these functions, never `axios` directly.

### Independence from backend implementation details
- Feature code never constructs URLs inline — all endpoint paths live inside the feature's `api/` module.
- Response shapes are normalized (matched against `types/`, Part 2) at the API-module boundary, so if the backend's envelope shape (Backend Architecture doc, Part 6) evolves, only the API layer needs updating, not every component that consumes the data.

---

## PART 7 — Form Architecture

The Resume Builder is the largest form surface in the app — architecture here matters disproportionately.

| Concern | Approach |
|---|---|
| **Validation** | Shared validation schemas (`validators/`, Part 2) define rules once, reused both for inline field validation and full-section validation before save — mirrors backend Bean Validation rules (Backend Architecture doc, Part 8) so frontend and backend never silently disagree on what's valid. |
| **Error Display** | Field-level errors shown inline, next to the field; section-level/summary errors shown at the top of a form step — consistent pattern across every form in the app via the shared `FormField` component (Part 3). |
| **Autosave** | Resume editing autosaves on a debounced interval (and/or on field blur) rather than requiring an explicit "Save" click — implemented as a feature-specific hook (`useResumeAutosave` in `features/resume/hooks/`) that calls the resume API module, with a visible "saving/saved" status indicator. |
| **Dirty State** | Tracked per form/section so the UI can warn on navigation away with unsaved changes, and so autosave only fires when something actually changed. |
| **Multi-step Forms** | A shared `MultiStepFormWizard` shell (Part 3) manages step navigation, progress indication, and per-step validation gating; each step's actual fields are feature-specific content passed into the shell. |
| **Draft Saving** | Distinct from autosave-in-progress-editing: an explicit "save as draft" maps to the backend's Resume draft state (Database Design doc, Part 10), while autosave is the mechanism that keeps the draft continuously up to date. |

**Principle:** the resume editing form treats the backend as the source of truth for validation rules where they matter for data integrity (e.g., required fields for ATS scoring to work), while providing immediate client-side feedback for UX — client validation is a UX convenience, never the sole gatekeeper, since the backend re-validates independently (Backend Architecture doc, Part 8).

---

## PART 8 — Design System

| Category | Approach |
|---|---|
| **Buttons** | A small fixed set of variants (primary, secondary, destructive, ghost) and sizes — no ad hoc one-off button styles created per feature. |
| **Inputs** | Shared `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup` primitives — every form in the app (auth, resume, settings) composes from these, never raw `<input>` elements styled inline. |
| **Cards** | One `Card` primitive with slot-based composition (header/body/footer) reused for resume cards, template cards, job match cards — visual consistency without duplicated markup patterns. |
| **Tables** | One shared `Table` primitive (used by admin user lists, job match lists) supporting sorting/pagination props generically. |
| **Dialogs** | One shared `Modal`/`Dialog` primitive with consistent focus-trap and close behavior (Part 10) — no feature builds its own modal. |
| **Dropdowns** | One shared `Dropdown`/`Menu` primitive for both simple selects and action menus. |
| **Navigation** | `Navbar` and `Sidebar` are layout-level (Part 3), but their interactive sub-elements (nav item, active-state indicator) are shared primitives. |
| **Typography** | A fixed type scale (heading levels, body, caption) defined as Tailwind theme tokens (`styles/`) — components reference the scale, never arbitrary font sizes. |
| **Icons** | One icon library/source, wrapped in a consistent `Icon` usage pattern so swapping icon sets later touches one place. |
| **Colors** | A semantic token layer (`primary`, `danger`, `success`, `muted`) defined once in `styles/`/Tailwind config — components reference semantic names, never raw hex values, which is also what makes Dark Mode (Part 13) additive rather than a rewrite. |
| **Spacing** | A consistent spacing scale (Tailwind's default scale, used consistently) — no arbitrary pixel values scattered through the app. |
| **Responsive Breakpoints** | A small, fixed set of breakpoints (mobile/tablet/desktop) defined once in Tailwind config, used consistently rather than ad hoc `max-width` media queries per component. |

### Consistency rules
- No component reaches for a raw color/spacing/font-size value — everything routes through the shared tokens.
- A new visual pattern is proposed as an addition to the design system (Part 8) before being used feature-specifically — prevents every feature slowly inventing its own visual language.

---

## PART 9 — Performance

| Strategy | When to use |
|---|---|
| **Lazy Loading** | Route-level: each feature's page bundle is lazy-loaded (`React.lazy`) so users only download code for the features they visit — critical given the number of planned features (14+). |
| **Code Splitting** | Natural byproduct of feature-based folder structure (Part 2) combined with route-level lazy loading — the Admin module in particular should never be in the main bundle for regular users. |
| **Image Optimization** | Resume template thumbnails and any user-uploaded images (avatar) served in optimized formats/sizes; lazy-loaded below the fold (e.g., template gallery). |
| **Memoization** | Applied selectively to expensive derived computations (e.g., live resume preview re-render, ATS score visualization) — not applied reflexively to every component, which adds complexity without benefit for cheap renders. |
| **Virtualization** | Applied to long lists that could grow large (job match results, admin user tables) — not needed for inherently short lists (a resume's own sections). |
| **Bundle Optimization** | Vite's production build + route-level code splitting is the primary lever; periodically audit bundle size per route to catch an accidentally-bundled heavy dependency. |
| **Caching** | Server state caching (Part 5) avoids redundant API calls for data that hasn't changed (e.g., Template list, ATS reference data) — paired with backend caching (Backend Architecture doc, Part 5). |
| **Skeleton Loading** | Used for any data-dependent view with meaningful load time (resume list, ATS report generation, AI suggestion loading) — improves perceived performance versus a blank screen or spinner-only state, particularly important for AI calls which are inherently slow (Backend Architecture doc, Part 11). |

**Principle:** performance techniques are applied where the feature's actual usage pattern justifies them (long lists, slow AI calls, many routes) — not uniformly everywhere, which adds maintenance cost without measurable benefit.

---

## PART 10 — Accessibility

| Area | Standard |
|---|---|
| **Keyboard Navigation** | Every interactive element (buttons, form fields, modals, dropdowns) reachable and operable via keyboard alone — enforced as a requirement on every shared design-system component (Part 8), so it's inherited by every feature automatically. |
| **Screen Readers** | Meaningful accessible names on all interactive elements and images; dynamic content changes (AI suggestion appearing, autosave status) announced via appropriate live-region patterns. |
| **Focus Management** | Modals trap focus while open and return focus to the triggering element on close (built once into the shared `Modal` primitive, Part 8); route changes move focus to the new page's main heading. |
| **Color Contrast** | Design tokens (Part 8) are chosen/validated to meet WCAG AA contrast ratios by default, so individual features don't need to reason about contrast per use. |
| **ARIA Attributes** | Used to supplement semantic HTML where native elements aren't sufficient (custom dropdowns, tab panels) — never used to patch over non-semantic markup that could have been a native element instead. |
| **Semantic HTML** | Native elements (`<button>`, `<nav>`, `<table>`, `<label>`) preferred over generic `<div>`s with click handlers — the default assumption for every component, with ARIA as the exception, not the rule. |
| **Responsive Accessibility** | Touch targets sized appropriately on mobile breakpoints (Part 8); no functionality that's available on desktop hover-only interactions becomes inaccessible on touch devices. |

**Enforcement point:** because interaction patterns (focus trap, keyboard handling) are built once into shared design-system primitives (Part 8), individual feature developers inherit accessibility correctness by using the shared components — accessibility isn't something each feature has to re-implement or remember.

---

## PART 11 — Frontend Security

| Concern | Approach |
|---|---|
| **JWT Storage** | Access token held in memory (React state/Context), **not** `localStorage`, to reduce XSS exfiltration risk; refresh token handling follows the backend's chosen mechanism (Backend Architecture doc, Part 12 — e.g., httpOnly cookie) so the frontend never directly reads/stores the refresh token in JS-accessible storage. |
| **XSS Prevention** | Never render unsanitized user or AI-generated content via `dangerouslySetInnerHTML`; React's default JSX escaping is relied upon, and any case requiring raw HTML rendering (rare — e.g., a rich-text resume field) goes through an explicit sanitization step. |
| **CSRF Considerations** | Primarily a backend concern given the JWT-bearer design (Backend Architecture doc, Part 12), but if any cookie-based mechanism is used for the refresh token, the frontend respects `SameSite` cookie behavior and never needs to manually attach CSRF tokens to bearer-authenticated requests. |
| **Input Sanitization** | Client-side validation (Part 7) is a UX layer, not a security boundary — all real sanitization/validation is enforced server-side; the frontend's job is to not blindly trust or re-render unvalidated input. |
| **Route Protection** | `ProtectedRoute`/`AdminRoute` (Part 4) prevent rendering protected UI without a valid session, but this is a UX convenience, not the actual security boundary — the backend independently enforces authorization on every request regardless of what the frontend shows. |
| **Secure API Calls** | All API calls go over HTTPS; the shared Axios instance (Part 6) is the only path to the backend, so security headers/token attachment logic exists in exactly one place, not duplicated per feature. |

**Core principle:** the frontend's security measures are about **defense in depth and good UX**, never the actual trust boundary — every authorization and validation decision is re-enforced by the backend (Backend Architecture doc, Parts 8 & 12), because client-side code is inherently visible and modifiable by the end user.

---

## PART 12 — Frontend Development Standards

| Rule | Standard |
|---|---|
| **Folder naming** | `camelCase` for feature/utility folders (`jobMatching/`), lowercase for structural folders (`components/`, `hooks/`) |
| **File naming** | `PascalCase.jsx` for components (`ResumeCard.jsx`), `camelCase.js` for hooks/utils/services (`useResumeAutosave.js`, `resumeApi.js`) |
| **Component naming** | `PascalCase`, descriptive of what it renders, not how (`AtsScoreGauge`, not `Circle1`) |
| **Hook naming** | Always prefixed `use` (`useDebounce`, `useAuthSession`) per React convention, camelCase after the prefix |
| **Custom hook rules** | A custom hook exists to extract genuinely reusable stateful logic (data fetching pattern, subscription, debouncing) — not created reflexively for logic used only once in one component |
| **Service rules** | Files in `services/` contain no React (no hooks, no JSX) — pure logic callable from anywhere, testable without rendering |
| **Utility rules** | Files in `utils/` are pure functions — same input always produces same output, no side effects, no API calls |
| **Styling rules** | Tailwind utility classes are the default; no separate CSS files per component unless a genuinely complex animation/layout requires it — keeps styling co-located and consistent with the design system (Part 8) |
| **Import organization** | Grouped and ordered: external packages → shared (`components/`, `hooks/`, `utils/`) → feature-internal → relative — enforced by lint config, not manual discipline |
| **Code formatting** | Enforced automatically via Prettier + ESLint (Setup Guide, Part 6/8) — not a matter of individual preference or PR debate |
| **Documentation expectations** | Complex hooks and non-obvious business logic get a brief comment explaining *why*; component props are self-documenting via clear naming and, once TypeScript is adopted, explicit types rather than prop-type comments |

---

## PART 13 — Future Expansion (No Major Restructuring Required)

| Feature | How it attaches |
|---|---|
| **Dark Mode** | Additive — since colors are already semantic tokens (Part 8), dark mode is a second token set + a theme toggle stored in Context; no component needs to change. |
| **Internationalization (i18n)** | An i18n provider added at the app root (Context, Part 5) and a translation-key convention adopted; existing components swap hardcoded strings for translation keys incrementally, not all at once — the architecture doesn't block a gradual rollout. |
| **Multiple Themes** | Extension of the Dark Mode pattern — more token sets, same mechanism, no structural change. |
| **Premium Features** | Gated by reading subscription/entitlement state (mirrors backend Subscription entity, Database Design doc Part 2) from the auth/session Context — a `PremiumRoute` guard or conditional rendering pattern, following the same shape as `AdminRoute` (Part 4). |
| **Offline Support** | Service worker + a defined caching strategy for static assets and possibly last-known server state — layers on top of the existing API layer (Part 6) as an enhancement, doesn't require replacing it. |
| **Notifications** | Already scaffolded as its own feature module (Part 2); real-time delivery (below) attaches to the same feature. |
| **Collaboration** | New feature module (`features/collaboration/`) plus real-time updates (below) for a resume being edited by multiple users — additive feature, uses existing routing/auth patterns. |
| **Real-time Updates** | A WebSocket/SSE connection managed centrally (a new `services/realtime.js` or similar), with features subscribing to relevant event types — doesn't require restructuring the API layer, sits alongside it. |
| **Plugin System** | If ever needed (e.g., third-party resume template plugins), the existing feature-module boundary (Part 2) already demonstrates the isolation pattern a plugin architecture would need — feature modules are already loaded somewhat independently via lazy route-based code splitting (Part 9). |

**Unifying principle:** because styling is token-based, state is layered (local/Context/store/server) rather than monolithic, and features are isolated modules with a defined public-export boundary, every item above is satisfied by **adding a new feature module, a new token set, or a new Context provider** — never a rewrite of existing feature code.

---

## PART 14 — Common Frontend Architecture Mistakes

| # | Mistake | Why it happens | Why harmful | How professionals avoid it |
|---|---|---|---|---|
| 1 | Storing server data in `useState`/Context and manually keeping it in sync | Feels simpler than learning a data-fetching library | Stale data bugs, duplicated fetch logic, no automatic revalidation | Treat server state distinctly (Part 5) |
| 2 | Storing JWT in `localStorage` | Simplicity, common tutorials do it | Vulnerable to XSS-based token theft | In-memory storage + secure refresh mechanism (Part 11) |
| 3 | One massive global store for all state | Seems like a single source of truth | Every component re-renders on unrelated state changes, hard to reason about | Layered state strategy (Part 5) — local/Context/store/server only where each fits |
| 4 | Prop drilling many levels instead of using Context appropriately | Avoiding "premature" Context usage | Fragile, hard-to-refactor component trees | Introduce Context at the right global boundary, not too early or late |
| 5 | Introducing Context for everything, including frequently-changing data | Overcorrecting from prop drilling | Excessive re-renders across the whole subtree | Reserve Context for infrequently-changing global data (Part 5) |
| 6 | Feature folders reaching into each other's internal files | No enforced public-export boundary | Tight coupling, impossible to refactor one feature without breaking another | `index.js` public export boundary per feature (Part 2) |
| 7 | Building a new modal/dropdown/button per feature instead of reusing the design system | Faster in the moment | Visual inconsistency, duplicated accessibility bugs | Shared design-system primitives (Part 8) |
| 8 | No route-level code splitting | Not thought about until bundle size becomes a problem | Slow initial load as the app grows | Lazy-load every feature's routes from day one (Part 9) |
| 9 | Manually attaching the auth token to every API call | Not centralizing early | Easy to forget on a new call, inconsistent error handling | Centralized Axios interceptor (Part 6) |
| 10 | No centralized error handling for API failures | Each component handles errors its own way | Inconsistent UX, duplicated error-parsing logic | Response interceptor + shared error shape (Part 6) |
| 11 | Client-side validation treated as the only validation | Assuming the frontend is trustworthy | Security vulnerability if backend doesn't independently validate | Backend re-validates always (Part 7, Part 11) |
| 12 | Using `dangerouslySetInnerHTML` for AI-generated or user content without sanitization | Convenience for rendering formatted text | XSS vulnerability | Rely on JSX escaping; sanitize explicitly if raw HTML is unavoidable (Part 11) |
| 13 | Deeply nested prop-based conditional rendering for role-based UI | Ad hoc as admin features get added | Hard to audit who can see what | Centralized route guards + explicit role checks (Part 4) |
| 14 | No skeleton/loading states, blank screens during fetch | Overlooked during initial build | Feels broken/slow to users, especially for AI calls | Skeleton loading as a standard pattern (Part 9) |
| 15 | Over-memoizing everything with `useMemo`/`useCallback` reflexively | Cargo-culting performance advice | Added complexity, sometimes worse performance than no memoization | Memoize only measured, expensive computations (Part 9) |
| 16 | Not virtualizing long lists | Not anticipated until real data volume appears | Slow rendering, janky scrolling at scale | Virtualization for lists that can grow large (Part 9) |
| 17 | Inconsistent file/folder naming across the codebase | No enforced convention from day one | Harder navigation, inconsistent imports | Documented naming standards (Part 12), enforced via lint |
| 18 | Business logic embedded directly inside components | Fastest path to a working feature | Untestable without rendering, duplicated logic across components | Extract to hooks/services (Part 2, Part 12) |
| 19 | Hardcoded colors/spacing instead of design tokens | Faster than looking up the token | Inconsistent visuals, painful to theme later (Dark Mode) | Token-only styling rule (Part 8) |
| 20 | No accessibility consideration until an audit forces it | Reactive rather than built-in | Expensive retrofit, excludes real users in the meantime | Accessibility built into shared primitives from day one (Part 10) |
| 21 | Building custom form state management from scratch per form | Not evaluating existing patterns | Inconsistent validation/error UX, duplicated bugs | Shared form patterns and validation schemas (Part 7) |
| 22 | Ignoring autosave/dirty-state for a long editing flow like the Resume Builder | Not anticipated until users lose work | Data loss, poor UX for the app's core feature | Autosave + dirty-state tracking designed upfront (Part 7) |
| 23 | Fetching the same reference data (Templates, ATS rules) repeatedly across components | Each component fetches independently | Redundant network calls, inconsistent data if one fetch is stale | Server-state caching layer (Part 5, Part 9) |
| 24 | No environment-based configuration, hardcoded API URLs | Simplicity during local development | Breaks or requires manual editing when deploying to different environments | Centralized `config/` reading Vite env vars (Part 2) |
| 25 | Mixing feature-based and layer-based organization inconsistently | No architecture decision made upfront | Confusing structure, new features placed inconsistently | Explicit, documented folder structure decision (Part 1, Part 2) |
| 26 | Not lazy-loading the Admin module | Overlooked since admin isn't used by most users | Regular users download admin-only code unnecessarily | Route-level code splitting applied to every feature, especially low-traffic ones like Admin (Part 9) |
| 27 | Treating AI response latency the same as a normal API call in the UI | Not accounting for AI's inherent slowness | Confusing UX (no feedback during a multi-second wait) | Explicit loading/status components for AI interactions (Part 3, Part 9) |
| 28 | No plan for how new global client-only state (e.g., real-time notification count) fits into existing state layers | Added ad hoc as features arrive | Inconsistent state management patterns across the app | Evaluate every new piece of state against the layered strategy (Part 5) before implementing |
| 29 | Duplicating validation logic between a form's inline checks and its submit handler | Not sharing a single schema | Inconsistent validation behavior, bugs when one is updated and not the other | Single shared validation schema per form (Part 7, Part 2 `validators/`) |
| 30 | Assuming TypeScript (or type safety generally) can be "added later" without planning for it | Deferred as non-urgent | Retrofitting types onto an untyped, large codebase is expensive and error-prone | Establish a `types/` convention and TypeScript-ready patterns from day one, even before full adoption (Part 2) |
| 31 | No shared error boundary strategy — one component crash takes down the whole app | Not considered until it happens in production | Poor resilience, entire app blank on one feature's bug | Route-level (or feature-level) error boundaries isolating failures |

---

## Summary

This architecture is **feature-based at the top level, layer-based within each feature**, mirroring the backend's modular monolith structure so frontend and backend developers share a consistent mental model. State is deliberately layered (local → Context → store → server) rather than defaulting to one paradigm for everything, and every cross-cutting concern (API calls, design tokens, validation schemas, route guards) exists in exactly one place, so features remain additive — every item in Part 13 attaches without requiring existing feature code to change.
