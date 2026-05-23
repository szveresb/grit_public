## Uptime monitoring via email alerts (Option C)

Use the existing Lovable email infrastructure to send alerts when the site goes down or build/health checks fail. Runs entirely inside Lovable Cloud, no external services.

### What gets built

**1. New edge function: `health-monitor`**
- Path: `supabase/functions/health-monitor/index.ts`
- `verify_jwt = false` (called by cron, gated by a shared secret in the request body)
- Checks performed on each run:
  - `HEAD https://grit.hu` → expect 200, measure latency
  - `HEAD https://www.grit.hu` → expect 200
  - `HEAD https://grit-hu.lovable.app` → expect 200
  - Lightweight DB ping: `SELECT 1` via service-role client
  - Optional: check `email_send_log` for a spike in `failed` / `dlq` in the last hour
- On failure: enqueue an admin alert email via `send-transactional-email` (template `uptime-alert`) to `szveresb@gmail.com`
- Debounce: write last-status to a new single-row table `monitor_state` so we only alert on state transitions (OK→DOWN and DOWN→OK), not every 5 minutes while still down
- Always log the check result to a new `monitor_checks` table for history

**2. New table: `monitor_state`** (single row)
- `last_status` (`ok` | `down`), `last_status_at`, `last_failure_reason`, `consecutive_failures`
- Service-role only RLS

**3. New table: `monitor_checks`** (history, append-only)
- `id`, `checked_at`, `target`, `status`, `latency_ms`, `error_message`
- Service-role insert; admin read

**4. New email templates**
- `uptime-alert.tsx` — "🚨 grit.hu is DOWN" with target, error, timestamp
- `uptime-recovered.tsx` — "✅ grit.hu is back up" with downtime duration
- Registered in `registry.ts`

**5. Cron schedule**
- `pg_cron` job runs `health-monitor` every 5 minutes
- Uses `pg_net` to POST to the function with a shared secret in the body
- Secret stored in Supabase Vault as `health_monitor_secret` (created during setup, similar to existing `email_queue_service_role_key` pattern)

**6. Admin UI page (optional, minimal): `/admin/monitoring`**
- Shows last 100 checks from `monitor_checks`
- Current status badge from `monitor_state`
- Admin-only via `ProtectedRoute` + `has_role('admin')`

### Technical notes

- All emails go through the existing queue (`auth_emails` priority not used; use `transactional_emails`) — inherits retry/DLQ safety
- Alerts are idempotent via `idempotencyKey: monitor-${status}-${last_status_at}` so transient cron double-fires don't double-send
- If `health-monitor` itself fails (e.g., DB unreachable), cron logs the error in `cron.job_run_details` — we can't email about email failures, but the next successful run will detect recovery
- 5-minute interval = ~8,640 checks/month, well under any quota
- Total cost: $0 (no third-party services)

### What this catches
- Site down (5xx, timeout, DNS failure)
- Database unreachable
- Optional: email pipeline degradation (failed/dlq spike)

### What this does NOT catch
- Visual regressions or broken interactive flows (would need Playwright — that's Option D)
- Sub-5-minute outages
- Issues only visible to logged-in users behind auth

### Files to create
- `supabase/functions/health-monitor/index.ts`
- `supabase/functions/_shared/transactional-email-templates/uptime-alert.tsx`
- `supabase/functions/_shared/transactional-email-templates/uptime-recovered.tsx`
- 1 migration: tables `monitor_state` + `monitor_checks`, RLS policies, vault secret, cron job
- Update `supabase/functions/_shared/transactional-email-templates/registry.ts`
- Update `supabase/config.toml` to add `[functions.health-monitor]` with `verify_jwt = false`
- (Optional) `src/pages/admin/Monitoring.tsx` + route in `App.tsx`

Should I include the admin UI page, or skip it and just rely on emails + querying the table directly?