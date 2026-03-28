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
Standardizing and aligning UI layouts across the portal, specifically focusing on making the `/journal` (CheckIn) page cards and components match the width constraints and centering of the `/surveys` page.

## Component Map
1.  [`src/pages/CheckIn.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/CheckIn.tsx) - The primary unified "Journal" page housing the calendar, mood pulses, and observations.
2.  [`src/pages/Surveys.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/Surveys.tsx) - The central hub for filling out questionnaires and viewing historical scores.
3.  [`SYSTEM_DESCRIPTION.md`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/SYSTEM_DESCRIPTION.md) - The comprehensive architectural blueprint and source of truth for the entire system.
4.  [`src/hooks/useStance.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/hooks/useStance.tsx) - Manages the global state for "Self" vs "Observer" (relative) perspectives.
5.  [`supabase/migrations/`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/supabase/migrations/) - The source of truth for the database schema, RLS policies, and clinical triggers.

## State of Play
The previous agent was interrupted while harmonizing the layout between the Journal and Survey pages. Container widths were being updated and restrictive `max-width` settings were being removed from the journal workspace components (e.g., `SubjectWorkspaceSection.tsx`) to ensure a consistent, centered, and responsive experience across all primary dashboard modules.
