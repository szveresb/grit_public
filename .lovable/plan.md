

## Mood Trend Chart — QuickPulse Visualization

**Goal**: Add a mood trend line chart to the Timeline page that plots `impact_level` (1–5) from journal entries over time, using the botanical mood icons as Y-axis markers and colored in the sage-green palette.

### Data Source
- `journal_entries.impact_level` (1–5) + `entry_date` — already fetched on the Timeline page
- No new database tables or queries needed; just extract mood data from the existing `journalRes` fetch

### New Component: `src/components/timeline/MoodTrendChart.tsx`
- **Recharts area/line chart** using the existing `ChartContainer` from `src/components/ui/chart.tsx`
- X-axis: dates (formatted with locale)
- Y-axis: 1–5 scale, with custom tick renderer showing the 5 botanical mood icons (`FMoodStruggling` → `FMoodStrong`) at each level
- Line/area fill in sage-green (`hsl(var(--primary))`) with gradient opacity
- Dots on each data point; hovering shows date + mood label via `ChartTooltipContent`
- If fewer than 2 data points, show a gentle empty-state message

### Integration in Timeline page (`src/pages/Timeline.tsx`)
- Pass journal entries with `impact_level` to `MoodTrendChart` (filter out entries where `impact_level` is null)
- Place the chart between the pattern nudges section and the PatternChart (observation frequency), giving a clear emotional-trend → observation-pattern visual flow

### i18n
- Add keys to both `en.ts` and `hu.ts` under `timeline`: `moodTrendTitle`, `moodTrendSubtitle`, `moodTrendEmpty`

### Files to change
1. **Create** `src/components/timeline/MoodTrendChart.tsx` — Recharts area chart with mood icon Y-axis ticks
2. **Edit** `src/pages/Timeline.tsx` — extract mood data from journal fetch, render `MoodTrendChart`
3. **Edit** `src/i18n/en.ts` + `src/i18n/hu.ts` — add 3 new keys
4. **Edit** `src/i18n/types.ts` — add the new keys to the `timeline` type (if strictly typed)

