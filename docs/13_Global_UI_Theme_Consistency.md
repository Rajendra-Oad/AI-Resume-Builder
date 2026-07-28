# Global UI Theme Consistency Architecture

**Status:** Design architecture only. This document defines visual governance,
semantic tokens, component rules, and module-level guidance. It does **not**
authorize or contain implementation code, CSS values, component rewrites, or
runtime theme changes.

## 1. Product design direction

The AI Resume Builder is one product with one design language. The Landing Page
is the brand reference; authenticated workspaces translate that identity into a
denser, quieter SaaS interface rather than creating a second visual system.

The target character is:

- professional, minimal, premium, and productive;
- dark-surface first, with an equally governed light-theme counterpart;
- indigo-led, slate-supported, and violet-accented;
- restrained in glow, gradient, blur, and motion;
- consistent across marketing, authentication, dashboard, editor, and admin
  experiences.

Marketing may use more expressive composition. Product surfaces prioritize
information hierarchy, speed, focus, and predictable interaction. Both use the
same foundations: color roles, typography, spacing, radii, borders, shadows,
icons, controls, and motion vocabulary.

## 2. Governance and source of truth

One centralized design system owns all visual primitives and reusable component
states. Feature modules consume semantic roles and shared components; they do not
invent hex colors, spacing scales, shadows, border radii, typography styles, or
motion timings.

```text
Landing-page brand foundations
              |
      Global semantic tokens
              |
   Shared component system
              |
 Product composition patterns
              |
 Dashboard, Resume, Templates, ATS, AI,
 Profile, Settings, Admin, Auth, future modules
```

The landing palette must first be recorded in an approved canonical palette
specification. “Indigo,” “slate,” and “violet” are semantic families; exact
values come from that approved source and are not reinterpreted independently by
each page.

### Ownership

| Owner | Responsibility |
|---|---|
| Brand foundations | Canonical indigo, slate, violet, neutral, status, and logo usage |
| Token registry | Semantic aliases for theme, density, elevation, and interaction |
| Component library | Shared anatomy, variants, responsive behavior, and states |
| Pattern library | Navigation, dashboard, editor, data, form, and feedback compositions |
| Feature modules | Choose approved patterns and supply domain content only |
| Design review | Prevent visual forks and approve new semantic roles |

## 3. Token architecture

Tokens use three layers:

1. **Foundation tokens** describe raw palette families, type families, spacing
   steps, radius steps, and motion values.
2. **Semantic tokens** describe intent such as canvas, primary action, muted text,
   focus ring, or destructive surface.
3. **Component tokens** map semantic roles to a specific shared component anatomy.

Features may use semantic or approved component tokens. Foundation palette values
are not used directly in feature-level design specifications.

## 4. Color system

### Foundation families

| Family | Product role |
|---|---|
| Indigo | Brand, primary actions, active navigation, focus, selected state |
| Slate | Structural surfaces, navigation, secondary controls, subdued framing |
| Violet | Selective AI, premium, or creative accent; never a competing primary |
| Zinc/gray | Neutral surfaces, borders, disabled states, metadata, skeletons |
| White/light gray | Primary and secondary text on dark surfaces |
| Status | Success, warning, error, and information with accessible tonal scales |

### Semantic surface roles

- `canvas`: application background;
- `surface`: default cards, panels, menus, and controls;
- `surface-raised`: dropdowns, popovers, dialogs, and elevated cards;
- `surface-sunken`: editors, wells, grouped controls, and nested data regions;
- `surface-hover`: quiet interactive highlight;
- `surface-selected`: indigo-tinted selected state;
- `surface-overlay`: modal and drawer scrim;
- `paper`: resume and document preview surface;
- `border-subtle`, `border-default`, and `border-strong`;
- `text-primary`, `text-secondary`, `text-muted`, and `text-disabled`;
- `action-primary`, `action-primary-hover`, and `action-primary-pressed`;
- `focus-ring`;
- status foreground, surface, and border roles for each status family.

Dark mode uses elevated dark surfaces separated primarily by small luminance
changes and subtle borders. It must not rely on large glows or translucent glass.
Light mode preserves the same hierarchy and component identity rather than
becoming a separate visual theme.

### Color discipline

- Indigo is the only general primary action and active-navigation color.
- Violet is reserved for AI or explicitly premium meaning.
- Status colors communicate state, not decoration.
- A component uses at most one accent role unless displaying data categories.
- Large gradients are limited to approved marketing or empty-state artwork.
- Text and control contrast must meet WCAG 2.2 AA.
- Focus, selected, hover, and active states remain distinguishable without color
  alone.

## 5. Typography

The typography system defines:

- one product sans-serif family for interfaces;
- one optional brand/display family for controlled marketing use;
- one monospace family for identifiers, technical values, and code-like content;
- named styles for display, page title, section title, card title, body, compact
  body, label, metadata, helper text, and data value.

Dashboard pages do not use oversized marketing headings. Page titles are compact,
section headings are functional, and dense tools use consistent label and
metadata styles. Line height, weight, and letter spacing are tokenized.

## 6. Spacing, layout, and density

Use one spacing scale across all modules. Named layout roles cover:

- page gutter;
- section gap;
- panel padding;
- card padding;
- control gap;
- inline gap;
- table row height;
- editor toolbar height;
- sidebar width;
- content maximum width.

Three supported density modes are `comfortable`, `standard`, and `compact`.
Modules may select an approved density by context, but cannot define a new scale.
Marketing defaults to comfortable; dashboards use standard; tables and admin
tools may use compact.

Responsive layouts preserve hierarchy rather than shrinking desktop geometry.
Navigation collapses predictably, grids reduce columns, secondary tools move into
menus, and documents remain usable without horizontal page overflow.

## 7. Borders, radii, and elevation

### Borders

Subtle borders are the primary means of separating dark surfaces. Strong borders
are reserved for focus, selected states, validation, and important boundaries.
Separators align with the spacing grid and never create a boxed border around
every piece of content.

### Radii

A small governed scale covers controls, cards, large panels, dialogs, and pills.
Cards and controls share compatible geometry. Pills are reserved for tags,
statuses, filters, and compact segmented choices.

### Elevation

Elevation levels are:

1. flat application surface;
2. bordered card or panel;
3. raised menu, popover, or hover state;
4. dialog, drawer, or command palette.

Shadows remain soft and low-contrast. Blur and glow are not substitutes for
hierarchy.

## 8. Shared component rules

### Cards

Cards use shared padding, title hierarchy, border, radius, and elevation tokens.
Interactive cards may receive a small border change and very light lift. They do
not use shine sweeps, large glow halos, or unrelated gradients.

Approved families include content card, metric card, resume card, action card,
insight card, settings section, and selectable template card.

### Buttons

| Variant | Visual role |
|---|---|
| Primary | Solid landing-page indigo; one dominant action per local context |
| Secondary | Dark/slate surface with subtle border |
| Ghost | Minimal surface and border, visible on hover/focus |
| Destructive | Status error role, used only for destructive confirmation |
| Icon | Same states and focus treatment as textual controls |

Button height, padding, typography, icon size, disabled state, pending state, and
focus ring are shared. Hover and press feedback are restrained and never delay
activation.

### Forms

Inputs, selects, textareas, search, checkboxes, radios, date controls, and file
controls share label placement, helper text, validation spacing, dark surfaces,
border strength, and indigo focus treatment.

Errors remain visible and are not communicated by red borders alone. Disabled and
read-only states are visibly distinct. Search and complex controls retain native
keyboard and assistive-technology behavior.

### Menus and navigation

Top navigation, sidebar, breadcrumbs, tabs, dropdowns, command menus, and context
menus share text styles, icon geometry, item height, hover surface, selected
surface, and focus behavior.

The active route uses an indigo accent plus a non-color indicator. Navigation
depth is expressed through alignment and type hierarchy, not multiple unrelated
colors.

### Tables

Tables use compact professional typography, soft row separators, restrained
hover highlighting, optional sticky headers, aligned numeric columns, and
responsive fallback patterns. Actions remain discoverable by keyboard and do not
depend on hover.

### Icons

One rounded, outline-based icon family is canonical. Shared stroke width, optical
size, alignment, and semantic sizing are documented. Brand marks and data
visualizations are explicit exceptions; mixing general-purpose icon libraries is
not permitted.

## 9. Product composition patterns

### Application shell

The shell owns canvas, sidebar, top bar, breadcrumbs, responsive navigation,
content gutter, theme behavior, command access, and global notifications. Feature
pages compose inside it and do not recreate navigation chrome.

### Dashboard

The dashboard is a productive SaaS workspace, not a marketing page. It uses:

- a compact page header and task-oriented primary action;
- a restrained metric grid;
- recent resumes or activity with real hierarchy;
- ATS and AI insights using shared card patterns;
- consistent empty, loading, error, and permission states;
- limited chart colors derived from the approved palette.

### Resume Builder

The editor uses a dark, focus-oriented work surface, a clean shared toolbar, and a
professional paper preview. Editing controls stay quiet until active. The
document itself retains print-appropriate color and typography independent of
the application chrome.

Panels, section navigation, validation, autosave, AI assistance, version history,
and export status use shared product components. Live preview updates avoid
decorative animation on every keystroke.

### Templates

Template cards use consistent paper thumbnails, metadata, tags, and selection
states. The gallery behaves like a product catalog, not a promotional carousel.

### ATS Checker

ATS score, keyword findings, checks, and recommendations use the status and data
visualization system. Indigo structures the workflow; status colors express
actual result meaning; violet may identify AI-generated interpretation.

### AI Assistant

AI identity uses restrained violet accents within the same cards, forms, menus,
and typography as the rest of the application. Chat must not resemble an embedded
third-party product.

### Profile and Settings

Use a shared settings-shell pattern with section navigation, grouped controls,
descriptions, validation, and stable save actions. Avoid unique card styles per
section.

### Admin and Analytics

Admin tools favor compact density, tables, filters, explicit status, and strong
permission boundaries. Analytics reuse the metric, chart, insight, and table
patterns rather than introducing a separate reporting theme.

### Authentication

Authentication may retain a simplified branded composition, but inputs, buttons,
validation, typography, focus, status, and theme values come from the same design
system. The transition into the product shell must feel continuous.

## 10. Dashboard widgets and data visualization

Metrics, charts, recent activity, resume cards, ATS scores, AI suggestions,
notifications, and quick actions share:

- one header anatomy;
- standard and compact padding;
- common empty/loading/error states;
- aligned value, label, trend, and action positions;
- accessible status and trend wording;
- palette-limited charts.

Charts use indigo as the primary series, violet as a secondary semantic series,
and neutral slate/zinc for grids and context. Success, warning, error, and info
colors appear only when the data carries those meanings. Patterns, labels, or
shapes supplement color.

## 11. Loading, empty, error, and feedback states

Loading uses content-aware skeletons shaped like the current UI. There is no
separate global loading animation, circular spinner, or generic ATS document for
ordinary page preparation.

Required skeleton mappings:

| Content | Loading representation |
|---|---|
| Dashboard | Metric cards, chart region, activity rows, actions |
| Resume list | Resume-card grid |
| Resume editor | Form sections plus paper preview |
| Templates | Template thumbnail cards |
| ATS | Input/report structure; process skeleton only during real analysis |
| AI | Conversation or document-generation structure |
| Profile/settings | Form and settings-section skeletons |
| Admin/table | Header, filters, columns, and rows |

Skeleton surfaces inherit the active theme, reserve final layout, respect reduced
motion, and expose one accessible status per region.

Empty states explain the next useful action. Errors preserve context and provide
recovery. Success feedback is quiet and proportional to the action.

## 12. Motion system

Motion is semantic, short, and interruptible:

- fade for presence;
- short slide for spatial continuity;
- subtle scale for press or local emphasis;
- light card elevation on hover;
- restrained page transition;
- optional ripple only when it does not conflict with the visual language.

Large travel, neon trails, repeated glow, heavy blur, parallax in workspaces, and
decorative perpetual animation are prohibited. Motion uses shared duration and
easing tokens and follows the existing Motion Experience Architecture.

Reduced motion removes travel, scale, shimmer movement, and non-essential
sequencing while retaining immediate state feedback.

## 13. Accessibility and resilience

- WCAG 2.2 AA contrast for text, controls, focus, and meaningful graphics.
- Visible keyboard focus using the shared indigo focus role.
- Complete keyboard operation for navigation, editors, menus, forms, and tables.
- Screen-reader names, descriptions, status, errors, and relationships independent
  of visual placement.
- High-contrast and forced-colors fallbacks for surfaces and selection.
- Zoom, text scaling, reflow, touch target, and mobile viewport support.
- Reduced-transparency and reduced-motion policies.
- No information conveyed solely through hue, hover, icon, or animation.

## 14. Consistency review rules

A new or changed screen passes design review only when:

1. It uses approved semantic tokens without local palette values.
2. Shared components cover its common controls and surfaces.
3. Navigation, page header, spacing, and density match an approved pattern.
4. Loading, empty, error, success, and permission states are specified.
5. Dark and light themes preserve equivalent hierarchy.
6. Keyboard, focus, contrast, reflow, and reduced motion pass.
7. Motion is restrained and has a static substitute.
8. Icons come from the canonical family.
9. No new radius, shadow, gradient, blur, or type style is introduced without
   design-system approval.
10. The page looks like a product workspace derived from the Landing Page—not an
    independently branded module or a marketing section.

## 15. Expansion policy

Future modules begin by selecting existing shell, page-header, navigation, card,
form, table, feedback, and loading patterns. A genuinely new requirement adds a
semantic token or shared pattern through design-system review; it does not fork
the theme.

Tenant branding may replace approved brand tokens while retaining semantic
contrast, component anatomy, accessibility, density, and interaction rules.
Seasonal or premium themes remain optional decoration and cannot change core
usability or module identity.

## 16. Delivery sequence

1. Audit and approve the Landing Page’s exact canonical indigo/slate/violet
   palette.
2. Inventory current colors, fonts, spacing, radii, shadows, icons, and component
   variants across all routes.
3. Approve foundation and semantic token names for dark and light themes.
4. Standardize shared primitives: typography, button, input, card, navigation,
   table, overlay, status, and skeleton.
5. Standardize the application shell and dashboard composition patterns.
6. Migrate Resume Builder, Templates, ATS, AI, Profile, Settings, Admin, Analytics,
   and Authentication in reviewed cohorts.
7. Add automated token, contrast, visual-regression, and component-state checks.
8. Remove legacy visual values only after every consumer has migrated.

This document defines the target architecture; implementation requires a separate
explicitly authorized migration plan.
