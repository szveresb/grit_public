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
No active task. The system is in a clean, stable state. Previous work sessions completed:
- **Layout alignment** — `/journal` and `/surveys` pages now share `max-w-2xl mx-auto w-full` containers.
- **Mood heatmap** — Calendar cells on the `/journal` page display color-coded backgrounds based on daily average `impact_level` from journal entries (emerald → red, 5-point scale).

## Component Map
1.  [`src/pages/CheckIn.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/CheckIn.tsx) — Primary unified "Journal" page: Quick Pulse, ObservationStepper, calendar feed, mood trends, pattern charts.
2.  [`src/pages/Surveys.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/Surveys.tsx) — Questionnaire filler + score history with trend charts.
3.  [`SYSTEM_DESCRIPTION.md`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/SYSTEM_DESCRIPTION.md) — Comprehensive architectural blueprint and source of truth for the entire system.
4.  [`src/hooks/useStance.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/hooks/useStance.tsx) — Global state for "Self" vs "Observer" (relative) perspectives.
5.  [`src/components/checkin/FeedCalendar.tsx`](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/components/checkin/FeedCalendar.tsx) — Calendar grid with mood heatmap overlay, moon phases, and day-detail drill-downs.

## State of Play
**All previous agent work is complete.** Layout alignment between `/journal` and `/surveys` is done (both use `max-w-2xl mx-auto w-full`). The mood heatmap was implemented end-to-end: `useCalendarFeedData` extracts `impact_level` from `journal_entries`, passes it through `CalendarFeedItem.impactLevel`, and `FeedCalendar.getHeatmapColor()` maps the daily average to Tailwind color classes. No in-progress work or broken state was inherited.
