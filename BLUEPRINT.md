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

**PWA & Branding finalized.** The platform is now a Progressive Web App with a "Safety First" discreet identity (Short name: "G", minimalist monogram icons). Service worker caching is operational in production with an emergency exit bypass; development preview now unregisters stale service workers to prevent mixed Vite/React chunks.

**OAuth callback routing hardened.** Social sign-in now returns through explicit `auth/callback` routes for both HU and EN flows instead of relying on the site root, reducing production-only 404 risk during the Google/Apple return leg.

## Next Priority
The project pivot to the **Clinical Entity Architecture (SNOMED CT / BNO-10)** is now the primary focus. AI Sensemaking remains suspended until this foundational structural mapping is implemented.

## Release: Beta → Live

Two Lovable projects exist:
- **Grit.hu - beta** (`f7d3d508-…`) — this repo. Develop and test here.
- **Grit.hu - live** (`b3d1ffcc-…`) — connected to GitHub `szveresb/grit.hu` `main`.

**Important:** Both Lovable projects currently share the **same Supabase backend** (`project_id = dgymkgeulpaavnqavnrw`). The `supabase/config.prod.toml` overlay is therefore a no-op today; if you ever split databases, update that file with the live Supabase ref before the next release.

### How to ship a release
1. Verify the milestone in beta preview.
2. In the **beta GitHub repo** → `Actions` tab → run **"Release Beta to Production"** (`workflow_dispatch`). It force-pushes beta `HEAD` (with the prod Supabase overlay) to `szveresb/grit.hu` `main`.
3. Lovable Live auto-syncs from `main` within seconds.
4. Open **Grit.hu - live** in Lovable → **Publish → Update** to deploy the new build.

### Prerequisites (one-time)
- Beta repo secret `PROD_REPO_TOKEN`: PAT with `repo` scope on `szveresb/grit.hu`.
- `supabase/config.prod.toml` must hold the **live** Supabase ref if/when the backends are split.
- Never commit directly to live; the workflow force-pushes and would overwrite divergent commits.

### What does NOT travel through the workflow
- Database migrations — apply to the live Supabase project separately (currently moot since DB is shared).
- Edge-function secrets — re-add in live's Cloud → Secrets if backends are ever split.
- `.env` files — managed by each Lovable project and are not committed.
