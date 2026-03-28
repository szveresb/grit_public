# Grit.hu Project Blueprint

## Project Overview
Grit.hu is a sensemaking platform designed for individuals in high-conflict relationships, providing a secure space for journaling, structured clinical observations (SNOMED CT/BNO-10 codes), and questionnaire-based self-checks. The application translates complex clinical data into a warm, human-centric interface to support personal growth and evidence-based reflection.

## Tech Stack
- **Frontend:** React 18, Vite, TypeScript, Bun.
- **Backend:** Supabase (Auth, PostgreSQL DB, Edge Functions).
- **Styling:** Tailwind CSS, Shadcn UI (Radix UI), Framer Motion.
- **State/API:** TanStack Query (React Query v5), Zod.
- **Design:** Custom "Freud" icon set, "Clinical Core, Human Surface" philosophy.

## Current Task
**Dynamic Pathing via Conditional Logic** — implementing logic jumps in the questionnaire system. Status:
- ✅ Data layer: `logic_rules` JSONB column + `__SKIPPED__` trigger guard (migration created, awaiting deployment)
- ✅ Logic engine: `src/lib/logic-engine.ts` (runtime evaluation) + `src/lib/logic-validation.ts` (editor-time validation)
- ✅ Editor UI: Per-question logic rule configuration with inline badges and forward-only target selection in `SelfChecks.tsx`
- ✅ Respondent stepper: Auto-detected branching mode with one-question-at-a-time rendering, progress bar, and `__SKIPPED__` sentinel insertion in `QuestionnaireFiller.tsx`
- ✅ Display: Skipped question badge in `ScoreResults.tsx`
- ✅ i18n: 17 new bilingual keys for logic jump UI
- ⏳ Migration deployment: Requires user presence per project safety rules

## Component Map
1.  [`src/pages/CheckIn.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/CheckIn.tsx) — Primary unified "Journal" page: Quick Pulse, ObservationStepper, calendar feed, mood trends, pattern charts.
2.  [`src/pages/Surveys.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/Surveys.tsx) — Questionnaire filler + score history with trend charts.
3.  [`SYSTEM_DESCRIPTION.md`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/SYSTEM_DESCRIPTION.md) — Comprehensive architectural blueprint and source of truth for the entire system.
4.  [`src/hooks/useStance.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/hooks/useStance.tsx) — Global state for "Self" vs "Observer" (relative) perspectives.
5.  [`src/components/checkin/FeedCalendar.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/components/checkin/FeedCalendar.tsx) — Calendar grid with mood heatmap overlay, moon phases, and day-detail drill-downs.
6.  [`src/lib/logic-engine.ts`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/lib/logic-engine.ts) — Logic jump rule evaluation, path computation, skip detection.
7.  [`src/lib/logic-validation.ts`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/lib/logic-validation.ts) — Forward-only validation and reachability analysis.

## State of Play
**Dynamic Pathing feature is code-complete.** All frontend changes (editor UI, stepper mode, skip handling, i18n) are committed. The database migration (`20260328205500_add_logic_rules_and_skipped_guard.sql`) is ready but awaiting deployment with user oversight.
