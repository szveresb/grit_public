# Walkthrough: Refactor Timeline Comparison Chart to Show Mood Trends Across People

I have successfully refactored the top chart on the `/timeline` page (when in Relative mode) to display a time-series mood comparison chart that plots the daily average self mood for both the user and selected observed subjects.

## 1. Changes Made

### Hooks

#### [NEW] [useMoodComparisonData.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/hooks/useMoodComparisonData.ts)
- Custom hook that queries `mood_pulses` table.
- Pulls user's mood pulses (`subject_type = 'self'`) and selected observed subjects' mood pulses (`subject_type = 'relative'`, `subject_id` in selected IDs) over the selected time window (7, 30, or 90 days).
- Aggregates daily average mood values.
- Identifies if a subject has zero mood entries in the active window to trigger a "(no data)" / "(nincs adat)" legend state.

---

### Components

#### [NEW] [MoodComparisonChart.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/components/timeline/MoodComparisonChart.tsx)
- Replaces `CorrelationChart` in `/timeline` Relative view.
- Plots the user's daily average mood in blue (`hsl(var(--primary))`).
- Plots selected observed subjects as separate lines using a fixed, readable palette (Red, Orange, Green, Purple, Pink, Teal).
- Includes dynamic pills/checkboxes for selecting observed people:
  - Fades and labels subjects with no data as `(no data)` or `(nincs adat)` in dashed pills.
  - The user's own series is always checked/visible.
- Employs a custom tooltip and legend identifying each series by person name and listing their daily average mood score for the hovered day (or `—` if no data is logged for that day).
- Connects mood check-in dots with continuous trend lines across days without entries by setting `connectNulls={true}`.

---

### Pages

#### [MODIFY] [Timeline.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/pages/Timeline.tsx)
- Integrates `useMoodComparisonData` and `MoodComparisonChart`.
- Manages local `selectedCompareIds` state (initialized to the active relative subject).
- Places the new `MoodComparisonChart` as the top chart under the "Correlation" mode.
- Syncs the loading state to include the comparison data query spinner.

---

### Localization

#### [MODIFY] [en.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/i18n/en.ts)
#### [MODIFY] [hu.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/i18n/hu.ts)
#### [MODIFY] [types.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/i18n/types.ts)
- Added translations for comparison header, subtitle, and no-data marker in English and Hungarian.

---

## 2. Verification Results

### Compile Verification
- Executed compilation check using TypeScript compiler:
  ```powershell
  & "C:\Users\veres.sz\AppData\Local\ms-playwright-go\1.57.0\node.exe" node_modules\typescript\bin\tsc --noEmit
  ```
  - **Result**: Successfully compiled with **0 errors**.

### Manual Test Cases Handled
1. **Single Observed Person Selected**: Plots exactly two lines (User self mood + selected subject).
2. **Multiple Observed People Selected**: Plots a blue self line plus one distinct color line per selected subject with matching tooltips and legends.
3. **No-Data Treatment**: Dashed checkbox label indicator with "(no data)" next to the name, series omitted from drawing (no line rendered at all for subjects with no data in the range), and `—` in tooltip on hover.
4. **Switching Date Range**: Consistently recalculates and updates the aggregated daily averages for all selected individuals.
