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

| Token               | HSL              | Usage                          |
|----------------------|------------------|--------------------------------|
| `--background`       | `100 20% 97%`   | Page background                |
| `--foreground`       | `150 15% 20%`   | Primary text                   |
| `--card`             | `0 0% 100%`     | Card surfaces                  |
| `--primary`          | `145 30% 42%`   | Sage green — CTAs, active states |
| `--primary-foreground`| `100 30% 97%`  | Text on primary surfaces       |
| `--secondary`        | `100 15% 92%`   | Secondary surfaces             |
| `--muted`            | `100 12% 94%`   | Subdued backgrounds            |
| `--muted-foreground` | `150 8% 48%`    | De-emphasized text             |
| `--accent`           | `145 20% 90%`   | Hover states, highlights       |
| `--destructive`      | `0 60% 55%`     | Delete actions, warnings       |
| `--border`           | `140 12% 86%`   | Borders, dividers              |

### Bamboo Palette

| Token                | HSL              | Usage                          |
|----------------------|------------------|--------------------------------|
| `--bamboo-sage`      | `145 25% 52%`   | Decorative sage accents        |
| `--bamboo-sage-light`| `145 20% 90%`   | Light sage tints               |
| `--bamboo-leaf`      | `140 30% 38%`   | Deep green accents             |
| `--bamboo-mist`      | `100 20% 97%`   | Misty background overlays      |
| `--bamboo-cream`     | `45 30% 95%`    | Warm cream tones               |

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

- **Max content width:** `max-w-2xl` for main content areas
- **Vertical rhythm:** `space-y-6` between major sections, `space-y-3` within cards
- **Grid gaps:** `gap-4` for form grids, `gap-2` for inline groups

### Container Pattern

```tsx
<DashboardLayout>
  <div className="max-w-2xl space-y-6">
    {/* Page header */}
    {/* Filters */}
    {/* Content cards */}
  </div>
</DashboardLayout>
```

---

## 5. Border Radius

The design uses extreme rounded corners to maintain softness.

| Token       | Value           | Usage                          |
|-------------|-----------------|--------------------------------|
| `--radius`  | `1.25rem` (20px)| Default component radius       |
| `rounded-2xl`| `1.5rem`       | Buttons, inputs, badges        |
| `rounded-3xl`| `2rem`         | Cards, panels, forms           |
| `rounded-4xl`| `2.5rem`       | Hero sections                  |
| `rounded-full`| `9999px`      | Impact-level circles, avatars  |

**Rule:** Cards and panels always use `rounded-3xl`. Buttons and inputs use `rounded-2xl`.

---

## 6. Surface & Depth

### Glassmorphism Cards

```tsx
className="bg-card/60 backdrop-blur border border-border rounded-3xl"
```

- Semi-transparent card (`/60` opacity)
- Backdrop blur for frosted-glass effect
- Thin border using `border-border`

### Highlighted Surfaces (e.g., Pattern Summary)

```tsx
className="bg-card/60 backdrop-blur border border-primary/20 rounded-3xl"
```

Uses `border-primary/20` for a subtle sage-green glow.

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

Small buttons use `size="sm"` with icon + text: `<Save className="h-4 w-4 mr-1" />`.

### Form Inputs

All inputs use `rounded-2xl`. Labels follow the uppercase pattern:
```tsx
<Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
  Field Name
</Label>
<Input className="rounded-2xl" />
```

### Expandable Cards (Journal Entries)

- Collapsed: title, date badge, impact badge, edit/delete actions
- Expanded: content sections + AI reflection area
- Toggle via `ChevronDown`/`ChevronUp` icons
- Destructive actions require `AlertDialog` confirmation

### AI Reflection Sections

- Header: `<Sparkles>` icon + uppercase label in `text-primary`
- Content rendered via `ReactMarkdown` with `prose prose-sm`
- States: streaming (with `Loader2` spinner), completed (Save/Dismiss), saved (New/Remove)

---

## 9. Icon Usage

All icons from `lucide-react`. Standard sizes:

| Context       | Size                  |
|---------------|-----------------------|
| Button inline | `h-4 w-4`            |
| Card actions  | `h-3.5 w-3.5`        |
| Status/header | `h-3 w-3`            |

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

---

## 12. File Architecture

```
src/
├── types/journal.ts           # Shared types & form defaults
├── lib/sse-stream.ts          # Reusable SSE stream parser
├── components/
│   ├── journal/
│   │   ├── JournalForm.tsx    # Create/edit form
│   │   ├── JournalEntryCard.tsx # Expandable entry with reflections
│   │   └── PatternSummary.tsx # AI pattern analysis display
│   ├── ui/                    # shadcn/ui primitives
│   ├── DashboardLayout.tsx    # Shell with sidebar + top nav
│   ├── AppSidebar.tsx         # Sidebar navigation
│   └── EmergencyExit.tsx      # Quick-exit safety feature
├── pages/
│   ├── Journal.tsx            # Orchestrator (state + data flow)
│   ├── Dashboard.tsx
│   └── ...
├── hooks/
│   ├── useAuth.tsx
│   └── useUserRole.tsx
└── index.css                  # Design tokens (source of truth)
```

**Principle:** Pages orchestrate state; components render UI. Extract when a component exceeds ~150 lines or is reused.

---

## 13. Dark Mode Checklist

When adding new components, verify:
- [ ] All colors use CSS variable tokens (no hardcoded HSL/hex)
- [ ] Semi-transparent surfaces (`bg-card/60`) work on dark backgrounds
- [ ] Border contrast is sufficient (`border-border` adapts automatically)
- [ ] Destructive states remain visible in dark mode
- [ ] Bamboo background image has appropriate opacity in both modes
