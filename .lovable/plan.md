# Promoting Beta → Live

## Current setup (already in place)

Your **beta** project (`Grit.hu - beta`) is connected to its own GitHub repo and contains a workflow at `.github/workflows/release-to-prod.yml` titled **"Release Beta to Production"**. This workflow:

1. Checks out the current beta `HEAD`
2. Overlays `supabase/config.prod.toml` onto `supabase/config.toml` (so the live project gets its own Supabase ref, not beta's)
3. Force-pushes the result to `szveresb/grit.hu` `main`

Your **live** project (`Grit.hu - live`) is connected to `szveresb/grit.hu`, so any push to that repo's `main` is automatically pulled into Lovable and re-deployed.

This means the pipeline already exists: **Beta repo → workflow → Live repo → Lovable Live → Publish**.

## How to push changes from beta to live

### One-time prerequisites (verify these)

1. The beta GitHub repo has a secret called `PROD_REPO_TOKEN` — a GitHub Personal Access Token with `repo` (write) scope on `szveresb/grit.hu`.
2. The file `supabase/config.prod.toml` exists in beta with the **live** Supabase project ref (so promotion doesn't accidentally point live at beta's database).
3. Live (`szveresb/grit.hu`) is the repo Lovable Live is synced to.

### Routine promotion flow

1. **Develop & test in beta** (this project) until a milestone is stable.
2. **Open the beta repo on GitHub** → `Actions` tab → **"Release Beta to Production"** → `Run workflow` → branch `main` → green button.
3. The workflow force-pushes beta's code (with the prod Supabase overlay) to `szveresb/grit.hu` `main`.
4. **Lovable Live auto-syncs** the new commit within seconds.
5. **Open Grit.hu - live** in Lovable → click **Publish → Update** to push the new build to `grit-hu.lovable.app` (and any custom domain).

### Database migrations (important)

The workflow only promotes **code**. Supabase migrations are not auto-applied across projects. For each release:

- Apply the same migrations to the live Supabase project — either by running them in Lovable Live (they'll deploy on first request that needs them) or via the Supabase CLI against the live ref.
- Edge functions deploy automatically once the code lands in live and Lovable picks it up.

### Secrets & env

- Live's `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) is managed by Lovable Live and **must not** be overwritten by the workflow. The current workflow only commits `supabase/config.toml` and `vite.config.ts`, so this is safe.
- Any edge-function secrets used in beta must be re-added in live (Cloud → Secrets) — they don't travel through git.

## What I would change in this plan

Nothing in code yet — the infrastructure is correct. After your approval I would only:

- Verify `supabase/config.prod.toml` exists and has the **live** project ref.
- Confirm `PROD_REPO_TOKEN` is set in the beta repo's Actions secrets.
- Optionally add a short "How to release" section to `BLUEPRINT.md` describing steps 1–5 above so future you / future agents don't have to rediscover the workflow.

## Technical details

- Workflow trigger: `workflow_dispatch` (manual button only — no auto-deploy on every commit, which is what you want for a beta/live split).
- Push strategy: `--force`. Live's `main` is a mirror of beta `HEAD` after each release; do not commit directly to live.
- The overlay step is what keeps the two Lovable Cloud (Supabase) projects isolated. If `config.prod.toml` is missing, live would silently start pointing at beta's database — worth double-checking before the first release.

