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
**Suspended:** AI Sensemaking Integration
This task has been **paused** because the underlying SNOMED CT logic and clinical entity structure must be fully implemented first. AI pattern detection cannot reliably function without the explicit classification architecture to map unstructured reflections into standardized BNO-10 / SNOMED endpoints.

*Suspended Sub-tasks:*
- [ ] Implement foundational SNOMED CT concept structure (Prerequisite)
- [ ] Port `journal-patterns` Edge Function trigger
- [ ] Port `journal-reflect` Edge Function
- [ ] Implement `readSSEStream` 

## Component Map
1.  [`src/pages/CheckIn.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/CheckIn.tsx) — Unified Emotional Hub: Hub for journals, observations, trends, and charts. Replaces legacy Dashboard/Journal pages.
2.  [`src/components/checkin/SubjectWorkspaceSection.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/components/checkin/SubjectWorkspaceSection.tsx) — The primary stance-aware container for personal and supported-person documentation.
3.  [`SYSTEM_DESCRIPTION.md`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/SYSTEM_DESCRIPTION.md) — Comprehensive architectural blueprint and source of truth.
4.  [`src/pages/Surveys.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/Surveys.tsx) — Questionnaire hub with logic-aware respondent stepper.

## State of Play
**Layout and spacing are fully refined.** Dashboard features a standardized **`space-y-6`** rhythm and a strict **Action-Result vertical hierarchy**. Dismissible pattern nudges with 30-day lookbacks and memory persistence are live.

**Feedback Review UI implemented.** Admins can now review and filter user feedback at `/manage-feedback` with context panel hidden for a cleaner view.

**PWA & Branding finalized.** The platform is now a Progressive Web App with a "Safety First" discreet identity (Short name: "G", minimalist monogram icons). Service worker caching is operational in production with an emergency exit bypass; development preview now unregisters stale service workers to prevent mixed Vite/React chunks.

## Next Priority
The project pivot to the **Clinical Entity Architecture (SNOMED CT / BNO-10)** is now the primary focus. AI Sensemaking remains suspended until this foundational structural mapping is implemented.
