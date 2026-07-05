# Refactor Timeline Comparison Chart to Show Mood Trends Across People

Refactor the top chart on `/timeline` (when in Relative mode) to display a time-series mood comparison chart showing daily average self mood for both the user and one or more selected observed people, instead of comparing mood to observation intensity.

## User Review Required

> [!IMPORTANT]
> - **Multi-Person Selection**: Since there is currently no global multi-subject selection state, we will implement multi-subject selection locally on the `/timeline` page using toggleable checkboxes. The user (`Self`) will always be checked and displayed in blue, while the observed people (`subjects`) can be toggled on/off. The stance's active observer subject will be selected by default.
> - **Lower Analytics**: The lower analytics components (`DualPerspectiveInsights`, `CorrelationScatter`, `ConceptCorrelationList`) are out of scope and will remain intact under the "Correlation" tab, but they will continue to show the existing single-person correlation stats.
> - **Repository Confirmation**: As per our workspace rules, please confirm which repository (`grit.hu` or `grit.hu-beta`) we should proceed in.

## Proposed Changes

### Hooks Layer

#### [NEW] [useMoodComparisonData.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/hooks/useMoodComparisonData.ts)
- Implement a custom hook to query `mood_pulses` from Supabase.
- Fetch user's mood pulses (`subject_type = 'self'`) and selected observed subjects' mood pulses (`subject_type = 'relative'`, `subject_id` in selected IDs).
- Aggregate daily average mood values for each series over the active window (7, 30, or 90 days).
- Detect if any selected subject has zero data points in the window, to handle the empty state for that series.

---

### Components Layer

#### [NEW] [MoodComparisonChart.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/components/timeline/MoodComparisonChart.tsx)
- Create a time-series comparison chart using Recharts (`LineChart`).
- Plot a blue line for the user's daily average mood.
- Plot distinct colored lines for each selected observed subject using a fixed palette (red, orange, green, purple, pink, teal).
- Implement toggleable checkboxes inside the card for selecting observed people.
- Render a legend showing subject names, color codes, and "(No data)" / "(Nincs adat)" markers if a selected subject has no data in the active window.
- Customize the tooltip to display the name and daily average mood level for each visible series on the hovered day.

---

### Pages Layer

#### [MODIFY] [Timeline.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/pages/Timeline.tsx)
- Import `useMoodComparisonData` and `MoodComparisonChart`.
- Keep track of local `selectedCompareIds` state (initialized to the active relative subject from `useStance()`).
- Call `useMoodComparisonData` with the selected IDs and `windowDays`.
- Replace the `CorrelationChart` call with `MoodComparisonChart`.

---

### Localization Layer

#### [MODIFY] [en.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/i18n/en.ts)
#### [MODIFY] [hu.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/i18n/hu.ts)
#### [MODIFY] [types.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/i18n/types.ts)
- Add new translations:
  - `t.timeline.compareSubjectsTitle`: "Compare Mood Trends" / "Hangulati trendek összehasonlítása"
  - `t.timeline.noDataMarker`: "(no data)" / "(nincs adat)"

## Verification Plan

### Manual Verification
1. **Single Subject Selection**: Toggle a single subject. Verify the chart renders exactly two lines (blue for self, another color for the subject).
2. **Multi-Subject Selection**: Toggle multiple subjects. Verify that each line has a distinct color and is clearly labeled in the legend and tooltip.
3. **No Data Handling**: Select a subject with no mood data in the selected range. Verify they are labeled with "(no data)" and no fake line continuity or rendering occurs.
4. **Range Changes**: Toggle between 7, 30, and 90 days. Verify the chart and series update consistently.
