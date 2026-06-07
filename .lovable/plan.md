# Review: `release-to-prod.yml` — Risk to Live Grit.hu Content

## TL;DR — User Data is Safe From This Workflow

This workflow only syncs **source code** (a git rsync between two repos). It does **not** touch the Supabase database, storage, or auth tables. Therefore:

- ✅ **Surveys / questionnaires** (DB rows) — untouched
- ✅ **Journal entries, observations, mood pulses** — untouched
- ✅ **Profiles, consents, user_roles** — untouched
- ✅ **Library articles, news, landing sections** (DB content) — untouched
- ✅ **Email queues / logs** — untouched

The workflow cannot directly delete or overwrite any row in the database.

---

## Critical Architectural Note

Both `supabase/config.toml` (beta) and `supabase/config.prod.toml` (live) reference the **same** project ID: `dgymkgeulpaavnqavnrw`. **Beta and Prod share one Supabase backend.** That means:

- Any migration merged on beta has already run against the live database before this workflow ever runs.
- Any destructive SQL on beta (DROP TABLE, DELETE, ALTER) already affected live users.
- This workflow is a **code-only promotion**; data safety is enforced upstream in the migration process, not here.

If true isolation between beta/prod data is ever required, that's a separate architectural change.

---

## Risks the Workflow Itself Introduces

### 1. `rsync --delete` removes any live-only file not in `protected_paths`
Current protected list covers email infra functions, `health-monitor`, `AuthCallback.tsx`, both `config.toml`s, and ONE migration file (`20260523145328_…sql`).

**Anything else that exists only on live will be deleted from the prod repo on push.** If live ever accumulates files that beta lacks (hotfix migrations, extra edge functions, deploy scripts), they vanish silently.

**Recommendation:** add a wildcard for all migrations to prevent prod-only migration files from being deleted:
```
"supabase/migrations/*"
```
Live migrations are append-only; losing the file from the repo causes drift between the DB and source-of-truth.

### 2. `supabase/config.prod.toml` is not protected
It currently lives only in prod (not visible in beta workspace). If a future beta edit ever touches it, rsync overwrites the prod version. Add it to `protected_paths` defensively.

### 3. Edge function code is overwritten wholesale
Functions like `process-email-queue`, `analyst-export`, `journal-reflect`, `journal-patterns` are pushed from beta as-is. A bug merged to beta = same bug live the next deploy. The protected list only shields the email transactional/auth functions.

**Note:** the push is to `main`; whether functions auto-deploy depends on a separate Supabase deploy step (not in this workflow). Confirm whether prod auto-deploys on push.

### 4. The "safety check" diff is narrow
`git diff --name-only -- "${protected_paths[@]}"` only checks the protected files. It does not warn about large deletions elsewhere. Consider adding a guard like "abort if rsync would delete more than N files" to catch accidental wipes.

### 5. Lockfile / build config drift
`package.json`, `bun.lockb`, `vite.config.ts`, `tailwind.config.ts` are all freely overwritten. A beta dependency change ships immediately. Acceptable, but worth noting.

### 6. `.env` / secrets
`.env` is in the repo (visible in file listing). If beta's `.env` ever differs from live's, it gets overwritten. Verify `.env` contains only public `VITE_SUPABASE_URL` / publishable key (which are identical across envs since the project is shared) — if so, no risk. Confirm no real secrets live in `.env`.

---

## Suggested Hardening (Optional, Non-Destructive)

Add to `protected_paths`:
```
"supabase/config.prod.toml"
"supabase/migrations/*"
".env"
```

And consider a deletion-count guard before push:
```bash
deleted=$(git -C ../live-main status --porcelain | grep -c '^ D')
if [ "$deleted" -gt 20 ]; then
  echo "BLOCKED: refusing to delete $deleted files in one release."
  exit 1
fi
```

---

## Verdict

The workflow **cannot** harm user-generated content (surveys answered, journal entries, profiles, library DB rows). The real risks are:

1. **Shared DB** — destructive migrations affect live the moment they're merged, regardless of this workflow.
2. **rsync --delete** — could quietly drop prod-only migration files or future prod-only assets.
3. **Edge function overwrite** — beta bugs propagate.

I recommend the protected-path additions above before the next release. Want me to apply them?
