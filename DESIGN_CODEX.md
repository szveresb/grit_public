# Grit.hu — UI Design Codex

> Living reference for the visual language, component patterns, and design principles of Grit.hu.

---

## 1. Design Philosophy

**Soft-UI Bamboo Aesthetic.** Every surface should feel approachable, warm, and safe — never clinical. The design avoids sharp edges, cold grays, and sterile layouts in favor of organic roundness, sage-green accents, and watercolor-style bamboo imagery.

**Core tenets:**
- **Warmth over sterility** — soft backgrounds, generous spacing, low-opacity textures.
- **Clarity over density** — one primary action per view, progressive disclosure via expand/collapse.
- **Non-clinical language** — no diagnostic labels in UI copy; use descriptive, human terms.

---

## 2. Color System

All colors are defined as HSL values in `src/index.css` and mapped to Tailwind tokens in `tailwind.config.ts`. **Never use raw color values in components** — always reference semantic tokens.

### Core Tokens (Light)

| Token                | HSL              | Usage                          |
|----------------------|------------------|--------------------------------|
| `--background`       | `48 19% 96%`    | Page background                |
| `--foreground`       | `146 15% 24%`   | Primary text                   |
| `--card`             | `60 14% 98%`    | Card surfaces                  |
| `--primary`          | `143 28% 44%`   | Sage green — CTAs, active states (Self context) |
| `--primary-foreground`| `48 20% 97%`   | Text on primary surfaces       |
| `--secondary`        | `60 12% 95%`    | Secondary surfaces             |
| `--muted`            | `60 10% 96%`    | Subdued backgrounds            |
| `--muted-foreground` | `140 8% 56%`    | De-emphasized text             |
| `--accent`           | Alias of `--self-accent` | Hover states, highlights |
| `--destructive`      | `0 60% 55%`     | Delete actions, warnings       |
| `--border`           | `120 17% 84%`   | Borders, dividers              |

### Stance Tokens

The design system supports two stance contexts — **Self** and **Observer** — each with its own primary/accent palette. The active stance is toggled via `.theme-self` / `.theme-observer` classes which remap `--primary`, `--accent`, `--ring`, and `--context-*` tokens.

| Group          | Token                     | Light HSL        | Usage                          |
|----------------|---------------------------|------------------|--------------------------------|
| Self           | `--self-primary`          | `143 28% 44%`   | Sage green primary             |
|                | `--self-accent`           | `120 17% 95%`   | Soft green accent              |
|                | `--surface-soft`          | `60 16% 97%`    | Self context panel bg          |
|                | `--surface-soft-border`   | `120 17% 84%`   | Self context border            |
| Observer       | `--observer-primary`      | `34 26% 42%`    | Warm amber primary             |
|                | `--observer-accent`       | `40 24% 94%`    | Soft amber accent              |
|                | `--surface-observer`      | `48 22% 96%`    | Observer context panel bg      |
|                | `--surface-observer-border`| `38 18% 82%`   | Observer context border        |

### Context Tokens (Dynamic)

These tokens are remapped automatically by `.theme-self` / `.theme-observer`:

| Token                    | Usage                               |
|--------------------------|-------------------------------------|
| `--context-surface`      | Panel background for active context |
| `--context-foreground`   | Text on context panels              |
| `--context-border`       | Panel borders                       |
| `--context-muted`        | Muted text in context panels        |
| `--context-accent`       | Accent color (buttons, links)       |

### Bamboo Palette

| Token                | HSL              | Usage                          |
|----------------------|------------------|--------------------------------|
| `--bamboo-sage`      | `143 24% 50%`   | Decorative sage accents        |
| `--bamboo-sage-light`| `120 17% 93%`   | Light sage tints               |
| `--bamboo-leaf`      | `140 24% 36%`   | Deep green accents             |
| `--bamboo-mist`      | `48 19% 96%`    | Misty background overlays      |
| `--bamboo-cream`     | `48 24% 95%`    | Warm cream tones               |

### Dark Mode

All tokens have dark-mode equivalents defined under `.dark` in `index.css`. The palette shifts to deep slate-greens (`150 15% 8%` background) with softer, lighter foreground values. Dark mode is toggled via the `class` strategy (`darkMode: ["class"]`).

### Usage Rules

```tsx
// ✅ Correct — use semantic tokens
className="bg-background text-foreground border-border"
className="bg-primary text-primary-foreground"
className="text-muted-foreground"
className="bg-bamboo-sage-light"

// ❌ Wrong — never use raw colors
className="bg-white text-gray-800"
className="bg-green-600 text-white"
className="text-amber-700"  // use design tokens instead
```

---

## 3. Typography

| Role       | Font           | Weight  | Tailwind class          |
|------------|----------------|---------|-------------------------|
| Body       | Quicksand      | 400–600 | `font-sans`             |
| Headings   | Quicksand      | 700     | `font-sans font-bold`   |
| Handwritten| Caveat         | 400     | `font-handwritten`      |

- **Base line-height:** `1.75` (set globally on `body`)
- **Heading scale:** `text-xl` for page titles, `text-sm` for body, `text-xs` for labels
- **Label style:** Uppercase, `tracking-widest`, `font-semibold`, `text-muted-foreground`

```tsx
// Section label pattern
<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
  Label Text
</span>
```

---

## 4. Spacing & Layout

- **Max content width:** `max-w-2xl` for main content areas, `max-w-4xl` for Dashboard
- **Vertical rhythm:** `space-y-6` or `space-y-8` between major sections, `space-y-3` within cards
- **Grid gaps:** `gap-4` for form grids, `gap-3` for card grids, `gap-2` for inline groups
- **Bottom padding:** `pb-20` on main content to prevent overlap with fixed bottom elements (RoleIndicator, EmergencyExit)

### Container Pattern

```tsx
<DashboardLayout>
  <div className="max-w-2xl mx-auto w-full space-y-8">
    {/* Page header */}
    {/* Content cards */}
  </div>
</DashboardLayout>
```

---

## 5. Border Radius

The design uses extreme rounded corners to maintain softness.

| Token       | Value           | Usage                          |
|-------------|-----------------|--------------------------------|
| `--radius`  | `1.5rem` (24px) | Default component radius       |
| `rounded-2xl`| `1.5rem`       | Buttons, inputs, badges, inner elements |
| `rounded-3xl`| `2rem`         | **All cards, panels, forms**   |
| `rounded-4xl`| `2.5rem`       | Hero sections                  |
| `rounded-full`| `9999px`      | Impact-level circles, avatars  |

**Rule:** Cards and panels always use `rounded-3xl`. Buttons and inputs use `rounded-2xl`.

---

## 6. Surface & Depth — Unified Card System

### The `.surface-card` Class (Preferred)

All card-like surfaces use a single consolidated CSS class defined in `index.css`:

```css
.surface-card {
  @apply rounded-3xl;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  box-shadow:
    0 24px 44px -30px hsl(140 16% 26% / 0.14),
    0 6px 14px hsl(140 10% 30% / 0.03);
}
```

**Usage in components:**

```tsx
// ✅ Standard card
<div className="surface-card p-5">...</div>

// ✅ Card with extra spacing
<div className="surface-card p-6 space-y-4">...</div>

// ✅ Clickable card (button)
<button className="surface-card p-5 text-left h-full transition-colors">...</button>

// ❌ DEPRECATED — do not use these ad-hoc patterns:
<div className="bg-card/60 backdrop-blur border border-border rounded-3xl">...</div>
<div className="reference-surface rounded-3xl">...</div>
<div className="context-panel">...</div>
<div className="subject-card-self">...</div>
```

### Grid Alignment Rules

Cards in grids **must** use `h-full` to ensure equal heights:

```tsx
<div className="grid gap-3 sm:grid-cols-2">
  <button className="surface-card p-5 h-full text-left">Card A</button>
  <button className="surface-card p-5 h-full text-left">Card B</button>
</div>
```

### Legacy Surface Classes

These remain in the CSS but should be **avoided for new components**:

| Class             | Status       | Replacement       |
|-------------------|--------------|--------------------|
| `reference-surface`| Legacy      | `surface-card`     |
| `context-panel`   | Legacy       | `surface-card`     |

### Special Surfaces

| Class                  | Usage                                   |
|------------------------|-----------------------------------------|
| `reference-auth-card`  | Login/signup card                        |
| `reference-auth-field` | Auth form inputs                         |
| `reference-auth-button`| Auth submit button                       |
| `stance-banner-self`   | Stance indicator banner (Self mode)      |
| `stance-banner-observer`| Stance indicator banner (Observer mode) |

---

## 7. Animation

| Name        | Keyframe                                | Usage                  |
|-------------|----------------------------------------|------------------------|
| `fade-in`   | `opacity 0→1`, `translateY 10px→0`     | Cards, forms appearing |
| `accordion-down/up` | Height 0 ↔ auto                | Collapsible sections   |
| `animate-spin` | Built-in Tailwind                    | Loading spinners       |

Apply `animate-fade-in` to elements entering the viewport (forms, panels).

---

## 8. Component Patterns

### Buttons

| Variant   | Usage                         | Class                              |
|-----------|-------------------------------|--------------------------------------|
| Default   | Primary actions (Save, Submit)| `rounded-2xl`                       |
| Outline   | Secondary actions (Patterns)  | `variant="outline" rounded-2xl`     |
| Ghost     | Tertiary (Edit, Reflect)      | `variant="ghost" rounded-2xl`       |
| Destructive| Delete confirmations         | `bg-destructive text-destructive-foreground` |

Small buttons use `size="sm"` with icon + text: `<FSave className="h-4 w-4 mr-1" />`.

### Form Inputs

All inputs use `rounded-2xl`. Labels follow the uppercase pattern:
```tsx
<Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
  Field Name
</Label>
<Input className="rounded-2xl" />
```

### Card Pattern

Standard card with header and content:
```tsx
<div className="surface-card p-6 space-y-4">
  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
    Section Title
  </h2>
  {/* Content */}
</div>
```

### Expandable Cards (Journal Entries)

- Collapsed: title, date badge, impact badge, edit/delete actions
- Expanded: content sections + AI reflection area
- Toggle via `FChevronDown`/`FChevronUp` icons
- Destructive actions require `AlertDialog` confirmation

### AI Reflection Sections

- Header: `FSparkles` icon + uppercase label in `text-primary`
- Content rendered via `ReactMarkdown` with `prose prose-sm`
- States: streaming (with `FLoader` spinner), completed (Save/Dismiss), saved (New/Remove)

### SubjectCardRegistry

Horizontal carousel of stance cards on the Dashboard/CheckIn pages:
- Each card is a `surface-card` with `min-h-[204px]`
- Active card gets `ring-2 ring-primary/30`
- Clicking a card sets the global stance context
- Carousel uses `embla-carousel-react`, no scroll-driven state updates

---

## 9. Icon Usage

All icons from the custom `FreudIcons` set (`src/components/icons/FreudIcons.tsx`). Standard sizes:

| Context       | Size                  |
|---------------|-----------------------|
| Button inline | `h-4 w-4`            |
| Card actions  | `h-3.5 w-3.5`        |
| Status/header | `h-3 w-3`            |
| Card icon box | `h-5 w-5` inside `h-10 w-10 rounded-2xl bg-primary/10` |

---

## 10. Navigation

- **Brand:** "Grit.hu" logo in top-left, links to home
- **Top menu:** Library, Self-Checks, About (visible on desktop)
- **Sidebar:** Home as first item; on mobile, top menu items fold into "Explore" group
- **Active route:** Highlighted via `NavLink` component

---

## 11. Language & Tone

**Critical:** All UI copy must follow non-clinical language constraints.

| ❌ Avoid                | ✅ Use instead                    |
|-------------------------|------------------------------------|
| Abuse                   | High-conflict dynamics             |
| Trauma bond             | Relational patterns                |
| BPD / NPD              | (Never label individuals)          |
| Codependency            | Boundary challenges                |
| Diagnosis / Treatment   | Self-awareness / Personal growth   |
| Therapist / Counselor   | Supportive companion               |

AI-generated content (reflections, pattern summaries) enforces this at the system-prompt level.

**Bilingual support:** Default language is Hungarian. All content must be available in English via the language toggle. Translation strings live in `src/i18n/hu.ts` and `src/i18n/en.ts`.

---

## 12. Stance-Aware Design

The UI adapts visually based on which subject the user is logging for:

| Context    | Theme class       | Primary color | Accent color | Sidebar tint  |
|------------|-------------------|---------------|--------------|---------------|
| Self       | `.theme-self`     | Sage green    | Soft green   | Sage sidebar  |
| Observer   | `.theme-observer` | Warm amber    | Soft amber   | Amber sidebar |

### How it works

1. `useStance()` provides `activeSubject` with `type`, `id`, `name`, `key`
2. `DashboardLayout` applies `.theme-self` or `.theme-observer` to the root container
3. All `--primary`, `--accent`, `--ring`, `--context-*`, and `--sidebar-*` tokens remap automatically
4. Data queries filter by `subject_type` + `subject_id` based on active stance

### Visual differentiation

- **SubjectCardRegistry** shows all available stance cards in a carousel
- **StanceBanner** shows current context with role label
- **RoleIndicator** (fixed bottom-left) shows active stance as a badge

---

## 13. File Architecture

```
src/
├── types/journal.ts           # Shared types & form defaults
├── lib/
│   ├── sse-stream.ts          # Reusable SSE stream parser
│   ├── date-locale.ts         # Date-fns locale helper
│   ├── db-error.ts            # Friendly DB error messages
│   └── moon-phase.ts          # Moon phase calculator
├── components/
│   ├── icons/FreudIcons.tsx   # Custom icon set
│   ├── journal/
│   │   ├── JournalForm.tsx    # Create/edit form
│   │   ├── JournalEntryCard.tsx # Expandable entry with reflections
│   │   ├── JournalCalendar.tsx # Calendar view
│   │   ├── ObservationTree.tsx # Observation category tree
│   │   └── PatternSummary.tsx # AI pattern analysis display
│   ├── checkin/               # CheckIn page components
│   ├── consent/               # Consent management
│   ├── observations/          # Observation stepper & history
│   ├── premium/               # Premium features (ManagedRelatives)
│   ├── timeline/              # Charts & timeline views
│   ├── ui/                    # shadcn/ui primitives
│   ├── SubjectCardRegistry.tsx # Stance card carousel
│   ├── ContextAwareToolPanel.tsx # Stance-sensitive action cards
│   ├── DashboardLayout.tsx    # Shell with sidebar + top nav
│   ├── AppSidebar.tsx         # Sidebar navigation
│   ├── RoleIndicator.tsx      # Fixed stance badge
│   └── EmergencyExit.tsx      # Quick-exit safety feature
├── hooks/
│   ├── useAuth.tsx            # Authentication
│   ├── useStance.tsx          # Global stance context
│   ├── useConsent.tsx         # Consent state
│   ├── useLanguage.tsx        # i18n
│   └── useUserRole.tsx        # Role-based access
├── pages/
│   ├── Dashboard.tsx          # Home with SubjectCardRegistry
│   ├── CheckIn.tsx            # Mood, observations, timeline
│   ├── Journal.tsx            # Journal entries
│   ├── SelfChecks.tsx         # Questionnaires
│   ├── Profile.tsx            # User settings + consent
│   └── ...
├── i18n/                      # Translation files (hu.ts, en.ts)
└── index.css                  # Design tokens (source of truth)
```

**Principle:** Pages orchestrate state; components render UI. Extract when a component exceeds ~150 lines or is reused.

---

## 14. Dark Mode Checklist

When adding new components, verify:
- [ ] All colors use CSS variable tokens (no hardcoded HSL/hex)
- [ ] `surface-card` class renders correctly on dark backgrounds
- [ ] Border contrast is sufficient (`border-border` adapts automatically)
- [ ] Destructive states remain visible in dark mode
- [ ] Bamboo background image has appropriate opacity in both modes
- [ ] Stance colors (both self and observer) maintain contrast

---

## 15. Accessibility & Safety

- **EmergencyExit:** Always-visible quick-exit button that navigates to a neutral external site
- **Consent gates:** `<ConsentGate>` wraps features that require explicit user consent
- **ARIA:** Cards acting as buttons use `aria-pressed` for active state
- **Touch feedback:** Interactive elements use `active:scale-95` for tactile response
- **Non-clinical framing:** All labels, tooltips, and AI outputs avoid diagnostic language
