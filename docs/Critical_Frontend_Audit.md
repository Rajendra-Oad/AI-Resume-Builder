# Critical Frontend Audit

Audit date: 2026-07-24

## Scope and method

The full `frontend/src` component, feature, route, layout, and stylesheet tree was
reviewed together with the lint, unit-test, style-token, production-build, and
Playwright configurations. This report distinguishes code-verified results from
browser metrics that require a deployed production URL.

## Findings

1. **Duplicate components** — Shared Button, Card, form controls, Modal,
   ConfirmationDialog, Dropdown, Skeleton, NotificationProvider, and AppIcon
   implementations exist. Feature code consumes these primitives. No second
   profile-menu or toast provider remains.
2. **Duplicate layouts** — Public authentication uses `AuthLayout`; authenticated
   features use `DashboardLayout`. Route pages are thin feature compositions.
3. **Duplicate styles** — Styles are separated by responsibility. Some repeated
   compact control declarations remain in `notifications.css`; they are local
   variants, not competing global primitives.
4. **Duplicate Tailwind classes** — The application primarily uses named semantic
   CSS classes. The token guard rejects arbitrary visual utilities in JSX.
5. **Duplicate icons** — `AppIcon` centralizes product navigation icons. Lucide is
   used by the notification system for its larger status vocabulary.
6. **Duplicate pages** — No route resolves to competing implementations. Feature
   routes lazy-load one canonical page or workspace.
7. **Inconsistent components** — Core controls share semantic tokens. Remaining
   risk is isolated feature CSS that should continue migrating to the global
   duration and elevation scales.
8. **Accessibility** — Route focus management, dialog focus trapping, labels,
   live regions, reduced-motion handling, keyboard navigation, and semantic error
   states are present. A manual screen-reader and zoom audit remains required
   before claiming WCAG conformance.
9. **Animation** — Previously, Lenis used an independent RAF loop and was not
   connected to ScrollTrigger. It now uses the GSAP ticker, updates
   ScrollTrigger, initializes once, cleans up listeners, and shares reusable
   motion functions. Route reveals remain scoped and revert on navigation.
10. **Responsive behavior** — The sidebar becomes a modal drawer below 800 px;
    editor and workspace grids collapse; table containers scroll internally;
    mobile actions wrap; media cannot exceed its container; and the document
    body clips accidental horizontal paint overflow. Browser viewport coverage
    is still required for every target width.
11. **Performance** — Feature routes are lazy-loaded, server state uses React
    Query, the scroll/animation libraries are dynamically imported, and Lenis is
    not recreated per navigation. The production build succeeds. The main
    application chunk is approximately 109 kB gzip; GSAP and ScrollTrigger are
    separate asynchronous chunks.
12. **UX** — Focus, hover, pressed, loading, disabled, success, error, empty,
    navigation-drawer, toast, and unsaved-change states are implemented. Motion
    is disabled when the user requests reduced motion.

## Priority and disposition

| Priority | Item | Status |
|---|---|---|
| P0 | Correct Lenis/GSAP/ScrollTrigger lifecycle | Fixed |
| P0 | Prevent global horizontal overflow and oversized media | Fixed |
| P0 | Preserve accessibility and reduced-motion behavior | Verified in code/tests |
| P1 | Consolidate reusable motion functions | Fixed |
| P1 | One notification/profile/navigation implementation | Verified |
| P1 | Responsive sidebar, grids, forms, tables, and actions | Implemented; viewport QA pending |
| P2 | Remove raw values remaining in specialist styles | Open; token check reports exact lines |
| P2 | Manual keyboard, screen-reader, zoom, and touch QA | Pending browser/device pass |
| P2 | Lighthouse production measurements | Pending deployed production URL |

## Verification

- ESLint: passed
- Vitest: 20 files, 51 tests passed
- Vite production build: passed
- Style-token guard: currently fails on raw palette/elevation/radius values in
  `marketing-auth.css` and `notifications.css`; this is intentionally not
  reported as complete.
- Lighthouse: not measured in this local source audit. Scores must be recorded
  against an optimized production deployment, not inferred from source code.

