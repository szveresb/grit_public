## Goal
Add an **"Advanced Settings"** section to `ConsentDashboard` whose first (and currently only) control is a **date-range filter for the Pattern Detection** category. It lets the user limit which observation logs are considered when patterns are detected and rendered.

## Scope
Frontend-only. No schema migration. Settings persist per-user in `localStorage` (key: `grit_pattern_detection_range_${user.id}`). Bilingual HU/EN.

## What gets added

### 1. Collapsible Advanced Settings panel in ConsentDashboard
- Rendered below the existing consent cards.
- Built with shadcn `Accordion` (single, collapsible). Header: gear icon + `t.consent.advancedSettings.title`, subtitle line.
- Disabled / dimmed with explanatory copy when `pattern_detection` consent is **off** — toggling it back on enables the controls.

### 2. Pattern Detection range control
Inside the panel, a card titled `t.consent.advancedSettings.patternDetection.title`:
- Three preset pill buttons: **7 days / 30 days / 90 days**.
- A fourth **"Custom"** option that reveals two shadcn `Popover` + `Calendar` date pickers (start, end) following the project's shadcn-datepicker pattern (`pointer-events-auto`, `mode="single"`).
- A footer line: `t.consent.advancedSettings.patternDetection.activeRange` showing the resolved range as `MMM d – MMM d`.
- A subtle "Reset to default (30 days)" link.

### 3. Storage hook — `src/hooks/usePatternDetectionRange.ts`
```ts
type Preset = '7d' | '30d' | '90d' | 'custom';
interface PatternRange { preset: Preset; startDate?: string; endDate?: string }
export const usePatternDetectionRange = () => { range, setRange, resolved: { start: Date; end: Date } }
```
- Reads from / writes to localStorage scoped by the authenticated user id.
- `resolved` always returns concrete dates (presets are computed from `new Date()`).
- Default: `{ preset: '30d' }`.

### 4. Wire the range into pattern detection
Two consumers of pattern data filter by the resolved range:
- `src/components/timeline/PatternChart.tsx` — accept optional `rangeStart`/`rangeEnd` props; if provided, filter `logs` on `logged_at` inside the existing `useMemo` aggregation. (No behavioural change when omitted.)
- `src/components/checkin/SubjectWorkspaceSection.tsx` — read `usePatternDetectionRange()` and pass the resolved dates into `<PatternChart>`. The `nudge` summary above also clips to the same window so the headline counts agree with the chart.

### 5. i18n (HU + EN)
Add to `consent` namespace:
- `advancedSettings.title`, `advancedSettings.subtitle`
- `advancedSettings.disabledHint` (shown when consent is off)
- `advancedSettings.patternDetection.title`, `.subtitle`
- `presets.7d`, `presets.30d`, `presets.90d`, `presets.custom`
- `range.start`, `range.end`, `range.activeRange` ("Active range: {start} – {end}"), `range.reset`

### 6. Files

**New**
- `src/hooks/usePatternDetectionRange.ts`
- `src/components/consent/AdvancedSettingsPanel.tsx` (the Accordion + the pattern detection card)

**Modified**
- `src/components/consent/ConsentDashboard.tsx` — render `<AdvancedSettingsPanel />` after the consent cards.
- `src/components/timeline/PatternChart.tsx` — optional range props + filter.
- `src/components/checkin/SubjectWorkspaceSection.tsx` — pass range into `PatternChart` and apply to the nudge summary list.
- `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/hu.ts` — new keys.

## What stays out of scope
- No DB column on `user_consents`; if the user later wants cross-device persistence we can add a `settings jsonb` column in a follow-up.
- No backend filtering in `journal-patterns` edge function (current pattern detection on this surface is client-side from `obsLogs`).
- No new "advanced settings" beyond pattern detection — the panel is built generically so we can add more controls later, but only the pattern detection control ships now.
- ConsentOnboarding flow unchanged.

## Validation
- Manual: open `/profile`, expand Advanced Settings, switch presets and a custom range; confirm `PatternChart` and the nudge list re-render with the filtered window.
- Edge cases handled: `pattern_detection` consent off → controls disabled, prior selection retained but unused; custom range with `end < start` → swapped; no logs in range → existing PatternChart empty state shows.
