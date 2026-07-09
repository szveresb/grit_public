# Grit.hu Project Blueprint

## Project Overview
Grit.hu is a sensemaking platform designed for individuals in high-conflict relationships, providing a secure space for journaling, structured clinical observations (SNOMED CT/BNO-10 codes), and questionnaire-based self-checks. The application translates complex clinical data into a warm, human-centric interface to support personal growth and evidence-based reflection.

## Tech Stack
- **Frontend:** React 18, Vite, TypeScript, Bun.
- **Backend:** Supabase (Auth, PostgreSQL DB, Edge Functions).
- **Styling:** Tailwind CSS, Shadcn UI (Radix UI), Framer Motion.
- **State/API:** TanStack Query (React Query v5), Zod.
- **Design:** Custom "Freud" icon set, "Clinical Core, Human Surface" philosophy.

## Deployment Topology

| Repo | Purpose |
|------|---------|
| `grit.hu-beta` | Feature development and staging. All new code lands here first. Test/dummy data only. |
| `grit.hu` (live) | Production. Real psychometric studies and validation documents are uploaded here by survey managers. Never upload real studies to beta. |

**Promotion path:** Build and test in `grit.hu-beta` → apply migrations to live Supabase → create matching Storage bucket on live project → merge code → survey managers upload real documents in the live app.

> [!IMPORTANT]
> The `survey_studies` Storage bucket on the **live** project is the source of truth for real study content. The beta bucket is disposable test data.

## Current Task
**In progress:** Survey Study Corpus (Epic 2 of 3)
Survey managers can attach source studies (PDF upload, DOI/URL link, or manual data entry) to any survey that has interpretation enabled. The corpus will feed Epic 3's interpretation generation.

*Epic 2 sub-tasks:*
- [x] `survey_studies` table migration
- [x] Supabase Storage bucket setup (name, retention, access control, size quota)
- [x] PDF upload UI in the survey editor (visible when interpretation is enabled)
- [x] DOI/URL entry form + CrossRef Edge Function/Direct fetch for metadata auto-population
- [x] Manual entry form (`key_findings`, citation fields)
- [x] Study list view with status labels and delete/confirm flow
- [ ] Warning when deleting the last indexed study while interpretation content exists (deferred to Epic 3)

## Component Map
1.  [`src/pages/CheckIn.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/CheckIn.tsx) — Unified Emotional Hub: Hub for journals, observations, trends, and charts. Replaces legacy Dashboard/Journal pages.
2.  [`src/components/checkin/SubjectWorkspaceSection.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/components/checkin/SubjectWorkspaceSection.tsx) — The primary stance-aware container for personal and supported-person documentation.
3.  [`SYSTEM_DESCRIPTION.md`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/SYSTEM_DESCRIPTION.md) — Comprehensive architectural blueprint and source of truth.
4.  [`src/pages/Surveys.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/Surveys.tsx) — Questionnaire hub with logic-aware respondent stepper.

## State of Play
**Layout and spacing are fully refined.** Dashboard features a standardized **`space-y-6`** rhythm and a strict **Action-Result vertical hierarchy**. Dismissible pattern nudges with 30-day lookbacks and memory persistence are live.

**Feedback Review UI implemented.** Admins can now review and filter user feedback at `/manage-feedback` with context panel hidden for a cleaner view.

**Survey interpretation toggle live.** Survey managers can enable knowledge-based interpretation per survey via a boolean toggle in the editor. Interpretation display is now purely driven by `questionnaire.score_ranges` — no named profiles, no hardcoded survey references.

**PWA & Branding finalized.** The platform is now a Progressive Web App with a "Safety First" discreet identity (Short name: "G", minimalist monogram icons). Service worker caching is operational in production with an emergency exit bypass; development preview now unregisters stale service workers to prevent mixed Vite/React chunks.

**Survey interpretation foundation complete (Epic 1 — all stories done, committed).** `INTERPRETATION_REGISTRY`, `getScoreInterpretation`, and all PVS/BRCS-specific i18n keys have been removed. `ScoreResults`, `ScoreHistory`, and `QuestionnaireFiller` now source ranges purely from `questionnaire.score_ranges`. The editor profile dropdown is replaced by a boolean toggle that writes to `interpretation_profile`. Zero legacy references remain in the TypeScript build. No backfill SQL was needed.

**Questionnaire Admin & Observer Role.** The `observer` role has been completely removed from the database and frontend logic. Database RLS policies for questionnaires and their questions have been consolidated under `admin` and `editor` roles. The Admin UI now includes strict validation to prevent publishing empty questionnaires.

**Survey Study Corpus & AI Interpretations (Epic 2 & 3 — completed).** Attached study files (PDF upload, DOIs, manual entries) ground client-facing interpretations. Added an AI Edge function that triggers Gemini-grounded pre-generation of EN/HU score range descriptions mapping to study citations. Results and History screens display cited interpretations.

**Timeline mood comparison chart refactored.** The top chart on the relative timeline view now plots user's daily average mood alongside selected observed people's daily average mood using a clean multi-select component. Faded dashed states are shown for observed people with no data.

**Timeline observation intensity comparison chart implemented.** A dedicated chart compares daily intensities across selected concepts (up to 3) in both self and observed person (relative) modes. Data is displayed as dots with a light linear regression trendline. Repeated daily logs for the same concept are aggregated by highest intensity, unlogged days are represented as gaps, and the selected chips default to concepts with the most recent activity.

**Seeding observation intensity from mood pulses implemented.** Created a shared `useObservationIntensityDefault` hook to query and map logged daily mood pulses using the inverse mapping `6 - pulseLevel` to seed observation defaults for both the standalone stepper and guided entry modal flows, while preserving manual overrides.

**Multiple questionnaire subscales and question mapping implemented.** Added database migration, updated type systems, added bilingual localizations, and implemented a dual visual/JSON editor along with interactive tag pills in the admin interface for managing subscales and mapping questions to them.

**Client-side subscale scores calculation on submission implemented.** Extended database schema with `subscale_scores` JSONB column on `questionnaire_responses`. Implemented standard client-side TypeScript calculator in `QuestionnaireFiller.tsx` that maps questions to subscales (handling skipped/non-numeric values as `0` points) and supports sum and average types. Integrated calculated subscales display into the completion results view and the expanded history entry details.

**Subscale score interpretation ranges implemented.** Extended type systems in `SelfChecks.tsx`, `ScoreResults.tsx`, and `ScoreHistory.tsx` to support optional nested `score_ranges` per subscale. Built a visual Form Builder editor block and raw JSON editor validation rules inside `SelfChecks.tsx` for managing interpretation bands. Evaluated subscale scores independently on survey completion and logged history views to display matched localized labels and descriptions.

**Real-time scoring calculations preview inside editor implemented.** Created a dynamic preview calculator `getLivePreviewScores` and interpretation band matcher `renderLiveScoringPreviewPanel` inside `SelfChecks.tsx`. Added mock answer inputs to both the visual Editor Form and the questionnaire Preview Filler testing interface to allow admins to toggle choices and test calculations in real time, automatically hiding the preview for unscored questionnaires.

**Subscale results breakdown on completion page implemented.** Configured `ScoreResults.tsx` to read the calculated subscale scores and map them underneath the overall total score in a clear, well-structured visual grid hierarchy. Displays matching localized range labels and description blocks independently for each subscale, falling back to legacy single-score layouts if no subscales are configured.

**Persist and load subscale response history implemented.** Stored calculated subscale scores inside the `subscale_scores` JSONB column on the `questionnaire_responses` table during submission. Retracted and populated subscale scores inside the historical trend `chartData` array within `ScoreHistory.tsx` to display separate multi-line charts with customized colored dashed series for each active subscale, fully isolated based on the user's active stance context (self vs. relative).

**Safely deploy scoring updates & retain legacy compatibility.** Implemented robust scoping fallbacks `?? []` on all database subscale properties. Added defensive null/empty safeguards `if (entry.subscale_scores)` to all historical chart plotting and list rendering routines, preventing UI crashes on older response entries and allowing admins to edit and add subscales to legacy surveys later without breaking pre-existing response histories.

**Configure subscale groups in questionnaire editor directly.** Implemented a visual Subscale Mapping Summary Panel in [SelfChecks.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/pages/SelfChecks.tsx) rendering each subscale's mapped questions and alerting if none are mapped. Consolidated save updates inside `handleSave` to push both subscales definitions and questions' `subscale_ids` together. Enforced a publish validator blocking save with a localized error toast if an admin attempts to publish a subscale with no questions associated.

**Conditional Logic Auto-Scored Skips implemented.** Extended type systems and logic engines ([logic-engine.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/lib/logic-engine.ts), [logic-validation.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/lib/logic-validation.ts)) to support `synthetic_skipped_answers` configuration and checks. Implemented visual editor selectors, cloning remapping, target-aware pruning helpers, and pre-save validation rules in [SelfChecks.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/pages/SelfChecks.tsx). Integrated synthetic answers into the client-side calculator and subscale scorer, inserting configured scores instead of `__SKIPPED__` sentinels on questionnaire submission in [QuestionnaireFiller.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/components/checkin/QuestionnaireFiller.tsx) to match database trigger behaviors. Added 11 new Vitest unit tests in [logic.test.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/test/logic.test.ts) verifying correctness and schema validation.

**Dropped NOT NULL constraint on survey_interpretations.content.** Added migration `20260709210000_drop_content_not_null.sql` to drop the NOT NULL constraint on the legacy `content` column. Updated type definitions in `types.ts` to make `content` nullable in `Row`, `Insert`, and `Update` types.

## Next Priority
- Promoted schema changes to live database
- Configure Lovable/Supabase backend Edge Function secrets (`GEMINI_API_KEY`)
