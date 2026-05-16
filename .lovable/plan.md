## Goal

Refine the app's spacing rhythm so top sections feel tighter, section boundaries read clearly, and whitespace anchors content rather than drifting. Keep the calm Soft‑UI Bamboo aesthetic — no color, font, or layout overhaul.

## Scope

Frontend / presentation only. No business logic, no i18n keys, no data changes.

Pages and shared chrome touched:
- `src/components/DashboardLayout.tsx` (header + content frame, breadcrumb gap)
- `src/pages/Journal.tsx`
- `src/pages/CheckIn.tsx`
- `src/pages/Surveys.tsx`
- `src/pages/Library.tsx`
- `src/pages/Timeline.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Export.tsx`
- Section header pattern used inside `SubjectWorkspaceSection`, `QuestionnaireFiller`, `JournalCalendar` headers (heading + thin divider treatment, no content change)

## Spacing rhythm (the rules)

Establish one consistent vertical scale per page:

```text
page top padding   py-6 md:py-8   →  py-5 md:py-6
breadcrumb → title mb-6           →  mb-4
title block (h1 + subtitle)       →  space-y-1 (already), but
title block → first section       →  mt-5 (was implicit space-y-6/8)
section → section (major)         →  space-y-6  (was 6–8 mixed)
section → section (minor inside)  →  space-y-3
card inner padding                 →  p-5 sm:p-6 (was p-6 / p-8 mix)
```

Result: top of every page sits ~12–16px higher, and inner cards stop competing with page padding.

## Section boundary pattern

Introduce a single, reusable visual rhythm for section headings within a page (no new component required — just consistent markup):

```tsx
<header className="flex items-end justify-between gap-3 pb-2 border-b border-border/60">
  <div>
    <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </h2>
    <p className="text-sm text-foreground/80 mt-0.5">{hint}</p>
  </div>
  {actions}
</header>
```

- Replaces ad-hoc `<h3 class="text-xs uppercase…">` headers that float without an anchor.
- The hairline `border-b border-border/60` is the "intentional emptiness" anchor — calm, not loud.
- Where a card already has a border, use the same pattern *inside* the card with `border-b border-border/50 pb-3 mb-4` instead of full margins.

Apply this pattern to:
- Journal: "Filters", "AI Reflections" (existing PatternSummary header), "Entries"
- CheckIn: "Workspace header" already exists — only adjust spacing (`space-y-8` → `space-y-6`, header gap-6 → gap-4)
- Surveys: each `<section class="surface-card">` gets the inner-header treatment (replacing nested `space-y-1` blocks that have no divider)
- Library: "Featured" and "Articles" get the divider header; collapse `mb-8` → `mb-5`
- Timeline: range chip row gets `pt-3 border-t border-border/50` so it reads as a control band, not a floating row
- Profile: each `surface-card` section already has its own heading — add the hairline + tighten `p-6 space-y-6` → `p-5 sm:p-6 space-y-5`

## DashboardLayout adjustments

- `header h-14` stays (chrome height).
- Content wrapper `px-4 md:px-8 py-6 md:py-8 pb-20` → `px-4 md:px-8 pt-5 md:pt-6 pb-16`.
- Breadcrumb `mb-6` → `mb-4`, and add a subtle `pb-3 border-b border-border/40` so the breadcrumb anchors the top of the work area on every page (this is the single biggest "anchoring" win and is shared across all pages).

## What stays untouched

- Color tokens, typography scale, radius (`rounded-3xl`), shadows.
- All component logic, props, i18n strings.
- Sidebar, EmergencyExit, FeedbackSheet, modals.
- Mobile breakpoints — only spacing values change, not breakpoint structure.

## Verification

After edits:
1. Visually inspect `/journal`, `/checkin`, `/surveys`, `/library`, `/timeline`, `/profile` at 1280 and at mobile width.
2. Confirm: top of page feels ~1 line tighter; every major section has either a hairline divider or sits inside a `surface-card` with an internal hairline header; no cramped pairs (icon+title still has breathing room).
3. Run typecheck (auto by harness).

## Out of scope

- No new design tokens, no animation changes, no new layout primitives, no copy changes.
- Public landing (`Index.tsx`) is not touched — request is about the app surface.
