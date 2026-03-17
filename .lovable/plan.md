

## Timeline Pattern Visualizations

**Goal**: Enhance the existing `/timeline` page with a visual frequency chart showing observation concepts that repeat 3+ times per week, plotted over multiple weeks.

### Current State
- `/timeline` already exists with a calendar, per-day detail, all-activity list, and text-based pattern nudge banners (current week only)
- Pattern nudges detect concepts with 3+ occurrences in the current week but only show a text line
- No `FTimeline` icon exists yet in FreudIcons

### Changes

**1. Create `FTimeline` icon** in `src/components/icons/FreudIcons.tsx`
- A timeline/chart-style icon (vertical bars with connecting line) following the existing `icon()` helper pattern

**2. New component: `PatternChart.tsx`** (`src/components/timeline/PatternChart.tsx`)
- Receives all `observation_logs` for the user
- Groups by ISO week (last 8 weeks), counts per concept per week
- Filters to only concepts that hit the 3+ threshold in at least one week
- Renders a simple bar/sparkline chart per flagged concept:
  - Each row: concept name + horizontal bar chart (8 week columns)
  - Bars colored by intensity (primary color, opacity scales with count)
  - Weeks where count >= 3 get a highlighted accent ring
- Uses the `FTimeline` icon in the section header
- Pure client-side computation — no new DB queries needed (reuses the observation data already fetched)

**3. Enhance `Timeline.tsx`**
- Extract the week-based pattern detection into a reusable function that computes patterns across the last 8 weeks (not just current week)
- Render `PatternChart` between the nudge banners and the calendar
- Keep existing nudge banners for the current-week summary

**4. i18n strings** (types/en/hu)
- `timeline.patternChartTitle` — "Pattern Frequency" / "Mintázat gyakoriság"
- `timeline.patternChartSubtitle` — "Concepts appearing 3+ times in a week" / "Heti 3+ alkalommal megfigyelt fogalmak"
- `timeline.weekLabel` — "W{n}" / "{n}. hét"
- `timeline.timesPerWeek` — "{count} times" / "{count} alkalom"

### Files
- **Edit** `src/components/icons/FreudIcons.tsx` — add `FTimeline`
- **Create** `src/components/timeline/PatternChart.tsx` — frequency visualization
- **Edit** `src/pages/Timeline.tsx` — integrate chart, extend data computation to 8 weeks
- **Edit** `src/i18n/types.ts`, `en.ts`, `hu.ts` — new strings

