## Goal
Deepen the existing Dual Perspective view so caregivers can see **measurable correlations and patterns** between their own self-observations (mood pulses, journal impact) and the supported person's logged observations.

The current `/timeline` "Correlation" mode already shows a paired line chart. We extend it with statistics, scatter, per-concept ranking, lag analysis, and friendly insight cards. Pure client-side math — no schema changes, no new dependencies.

## What gets added

### 1. Insight summary cards (top of correlation view)
Three small cards rendered from the same dual-perspective dataset:
- **Overall correlation** — Pearson `r` between daily self-mood (or self-impact) and daily mean relative intensity, plus a friendly band ("strong inverse", "weak", "no signal").
- **Best lead/lag** — same `r` recomputed at lags −3…+3 days; highlights whichever day-shift maximises |r| (e.g. "Your mood tends to dip 1 day after high intensity in {name}").
- **Co-occurrence** — % of days in the window with logs from both perspectives, plus the count of overlapping days. Acts as a confidence signal for the other two cards.

If there are < 5 overlapping days, all three cards collapse into a single "Not enough overlap yet" card with guidance.

### 2. Self ↔ Supported person scatter (`CorrelationScatter`)
Recharts scatter: x = self-mood (1–5), y = relative mean intensity (1–5), one dot per overlapping day, dot size = number of relative observations that day. Diagonal reference line + regression line (computed in the hook). Hover reveals the date.

### 3. Concept-level correlation list (`ConceptCorrelationList`)
For each observation concept logged for the selected supported person in the window:
- Compute Pearson `r` between (daily mean intensity for that concept) and (daily self-mood).
- Show top 5 by |r| with: localized concept name, sample size (n days), `r`, direction arrow, and a small inline sparkline of paired values.
- Concepts with n < 4 are filtered out.

### 4. Window selector
Pill toggle above the dual view: 7d / 30d / 90d. Drives `days` prop on the hook. Stored in component state, default 30.

### 5. Wire into Timeline page
Replace the single `<CorrelationChart>` render with a vertical stack inside the existing correlation branch:
1. Window selector
2. Insight summary cards
3. Existing `<CorrelationChart>` (line chart)
4. `<CorrelationScatter>`
5. `<ConceptCorrelationList>`

Each section uses the existing `surface-card` token and animates in.

## Technical details

### Hook changes — `src/hooks/useDualPerspectiveData.ts`
Extend the existing hook (keep the `CorrelationPoint[]` return for back-compat) and add:

```ts
interface ConceptCorrelation {
  conceptId: string;
  nameHu: string;
  nameEn: string;
  n: number;            // overlapping days
  r: number;            // Pearson
  series: Array<{ date: string; selfMood: number; intensity: number }>;
}

interface DualStats {
  overallR: number | null;
  overlapDays: number;
  totalDays: number;
  bestLag: { lag: number; r: number } | null;   // -3..+3
  regression: { slope: number; intercept: number } | null;
  conceptCorrelations: ConceptCorrelation[];
}
```

Computation:
- Fetch joins concept rows: extend the `observation_logs` query to also `select('concept_id, intensity, logged_at')` and a second small fetch of `observation_concepts(id, name_hu, name_en)` filtered by the concept ids returned (one round-trip).
- Pearson helper in `src/lib/correlation.ts` (new) — also exports `pearson(xs, ys)`, `linearRegression(xs, ys)`, `pearsonAtLag(self, rel, lag)`. Trivial pure functions, fully unit-testable.
- All computation runs in `useMemo` from the already-fetched rows; no extra database calls beyond the concept name lookup.

### New files
- `src/lib/correlation.ts` — Pearson + regression helpers.
- `src/components/timeline/DualPerspectiveInsights.tsx` — three summary cards.
- `src/components/timeline/CorrelationScatter.tsx` — scatter + regression line.
- `src/components/timeline/ConceptCorrelationList.tsx` — ranked list with sparklines.

### Modified files
- `src/hooks/useDualPerspectiveData.ts` — return `{ data, stats, loading }`.
- `src/components/timeline/CorrelationChart.tsx` — unchanged behaviour, still reads `data`.
- `src/pages/Timeline.tsx` — window selector + new layout in the correlation branch.
- `src/i18n/{types,en,hu}.ts` — add `timeline.dual.*` namespace: window labels (`7d`, `30d`, `90d`), `overallCorrelation`, `strengthBands` (`strongInverse`, `moderateInverse`, `weak`, `moderate`, `strong`), `leadLag`, `leadLagPositive`, `leadLagNegative`, `leadLagNone`, `coOccurrence`, `notEnoughOverlap`, `scatterTitle`, `scatterSubtitle`, `conceptListTitle`, `conceptListSubtitle`, `nDays`, `noPairedConcepts`, plus a one-line disclaimer "Correlation is not causation — for sense-making only" (must carry the project's non-diagnostic framing).

### What stays out of scope
- No edge function / AI narrative — pattern detection here is purely statistical to keep the latency local and the view deterministic. (Can be layered later with `journal-patterns`.)
- No new database tables, RLS changes, or migrations.
- Stance gating, premium gating, and existing "no observer subjects" empty states remain as-is.
- Public/landing preview unchanged.

## Validation
- Manual: select a supported person on `/timeline`, switch to Correlation mode, change the 7/30/90 toggle and verify cards/scatter/list re-render.
- Edge cases handled in code: 0 self pulses, 0 relative observations, all-equal series (r undefined → "no signal"), single overlapping day.
- A small Vitest suite for `src/lib/correlation.ts` (Pearson against known fixtures, lag boundary).
