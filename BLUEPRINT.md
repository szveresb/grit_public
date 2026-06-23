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
**In progress:** Survey Study Corpus (Epic 2 of 3)
Survey managers can attach source studies (PDF upload, DOI/URL link, or manual data entry) to any survey that has interpretation enabled. The corpus will feed Epic 3's interpretation generation.

*Epic 2 sub-tasks:*
- [ ] `survey_studies` table migration
- [ ] Supabase Storage bucket setup (name, retention, access control, size quota)
- [ ] PDF upload UI in the survey editor (visible when interpretation is enabled)
- [ ] DOI/URL entry form + CrossRef Edge Function for metadata auto-population
- [ ] Manual entry form (`key_findings`, citation fields)
- [ ] Study list view with status labels and delete/confirm flow
- [ ] Warning when deleting the last indexed study while interpretation content exists

## Component Map
1.  [`src/pages/CheckIn.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/CheckIn.tsx) — Unified Emotional Hub: Hub for journals, observations, trends, and charts. Replaces legacy Dashboard/Journal pages.
2.  [`src/components/checkin/SubjectWorkspaceSection.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/components/checkin/SubjectWorkspaceSection.tsx) — The primary stance-aware container for personal and supported-person documentation.
3.  [`SYSTEM_DESCRIPTION.md`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/SYSTEM_DESCRIPTION.md) — Comprehensive architectural blueprint and source of truth.
4.  [`src/pages/Surveys.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/Surveys.tsx) — Questionnaire hub with logic-aware respondent stepper.

## State of Play
**Layout and spacing are fully refined.** Dashboard features a standardized **`space-y-6`** rhythm and a strict **Action-Result vertical hierarchy**. Dismissible pattern nudges with 30-day lookbacks and memory persistence are live.

**Feedback Review UI implemented.** Admins can now review and filter user feedback at `/manage-feedback` with context panel hidden for a cleaner view.

**Survey interpretation layer extended.** Questionnaire results now support built-in literature-backed interpretation profiles for the Psychological Vulnerability Scale and the Brief Resilient Coping Scale. PVS remains directional only because the source literature does not define validated clinical cutoffs.

**PWA & Branding finalized.** The platform is now a Progressive Web App with a "Safety First" discreet identity (Short name: "G", minimalist monogram icons). Service worker caching is operational in production with an emergency exit bypass; development preview now unregisters stale service workers to prevent mixed Vite/React chunks.

**Survey interpretation foundation complete (Epic 1).** The title-matching heuristic and `INTERPRETATION_PROFILES` constant have been replaced with a survey-owned `interpretation_profile` key. All callers (`ScoreResults`, `ScoreHistory`, `QuestionnaireFiller`) read from the survey record directly. No backfill was needed — zero production rows matched the old regex. The system is now fully survey-agnostic.

**Questionnaire Admin & Observer Role.** The `observer` role has been completely removed from the database and frontend logic. Database RLS policies for questionnaires and their questions have been consolidated under `admin` and `editor` roles. The Admin UI now includes strict validation to prevent publishing empty questionnaires.

## Next Priority
**Epic 3 — Interpretation Content:** Use the study corpus to generate score-specific, cited interpretation text. Two paths: pre-generated (admin-triggered, stored) and on-demand (fired at result time). Requires AI/Edge Function infrastructure to be decided before execution.
