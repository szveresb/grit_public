# Walkthrough — Making `/timeline` a True Analytics Page

We have updated `/timeline` to function as a true analytics page for both self and relative stances.

## Changes Made

### 1. Translation Additions (Bilingual Parity)
- Added new keys in `src/i18n/types.ts` for self-analytics features, empty states, and labels.
- Added English translations in `src/i18n/en.ts`.
- Added Hungarian translations in `src/i18n/hu.ts`.

### 2. Export Correlation Strength Logic
- Exported `strengthBand` from `src/components/timeline/DualPerspectiveInsights.tsx` so we can label correlation strengths consistently for self-perspective analytics.

### 3. New Hook: `useSelfAnalyticsData`
- Created `src/hooks/useSelfAnalyticsData.ts` to aggregate daily self-perspective data over 7d, 30d, and 90d ranges.
- Aggregates daily self mood average from `mood_pulses` where `subject_type = 'self'`.
- Aggregates daily average self-observation intensity and counts from `observation_logs` where `subject_type = 'self'`.
- Fetches questionnaire trends from `questionnaire_score_trends` where `subject_type = 'self'`.
- Computes overall Pearson correlation `r` and linear regression between self mood and self observations for overlapping days.
- Computes per-concept correlations against self mood.

### 4. Consolidated Stance-Aware Timeline Page
- Refactored `src/pages/Timeline.tsx` to display stance-specific analytics:
  - **Self Stance**:
    - Renders a time window range selector (7d/30d/90d).
    - Renders `MoodTrendChart` for self mood pulses.
    - Renders `PatternPulseChart` for recurring self-observations. Shows `selfEmptyObservations` if empty.
    - Renders Pearson correlation and co-occurrence percentage grid. If overlap is < 5 days, renders the `selfNotEnoughOverlap` state.
    - Lists top concept correlations against mood.
    - Renders Questionnaire Trends showing latest score, previous score, and a color-coded trend delta badge.
  - **Relative Stance**:
    - Keeps the existing dual-perspective toggle-based analytics stack exactly as is.

---

## Verification Results

### TypeScript Type-Checking
- Ran `tsc --noEmit` inside Docker:
  - Result: **Passed** with 0 errors.

### Production Build
- Ran `npm run build` inside Docker:
  - Result: **Passed** successfully in 55.57s.
