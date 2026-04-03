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
**AI Sensemaking Integration** — porting AI-powered pattern analysis and reflections from legacy pages into the new unified `CheckIn.tsx` workspace. Status:
- [ ] Port `journal-patterns` Edge Function trigger to the `SubjectWorkspaceSection`
- [ ] Port `journal-reflect` Edge Function to the upgraded `EntryReflectDialog`
- [ ] Implement `readSSEStream` for real-time AI response "typing" effect
- [x] Global Identity Personalization (Name/Email in Header, Sidebar, Cards)

## Component Map
1.  [`src/pages/CheckIn.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/CheckIn.tsx) — Unified Emotional Hub: Hub for journals, observations, trends, and charts. Replaces legacy Dashboard/Journal pages.
2.  [`src/components/checkin/SubjectWorkspaceSection.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/components/checkin/SubjectWorkspaceSection.tsx) — The primary stance-aware container for personal and supported-person documentation.
3.  [`SYSTEM_DESCRIPTION.md`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/SYSTEM_DESCRIPTION.md) — Comprehensive architectural blueprint and source of truth.
4.  [`src/pages/Surveys.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/Surveys.tsx) — Questionnaire hub with logic-aware respondent stepper.

## State of Play
**Layout and spacing have been fully refined.** The dashboard and all main pages now follow a standardized **`space-y-6`** (24px) vertical rhythm, achieving a "calm and professional" density. The `SubjectWorkspaceSection` implements a strict **Action-Result vertical hierarchy** (QuickPulse Entry above the Mood Chart) in both Focus and Parallel modes, with a `col-span-12` fix for vertical focus. The system is now ready for restored AI-powered sensemaking features.
