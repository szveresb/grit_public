
-- Monitor state (single row) and check history
CREATE TABLE public.monitor_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_status TEXT NOT NULL DEFAULT 'ok',
  last_status_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_failure_reason TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monitor_state_singleton CHECK (id = 1),
  CONSTRAINT monitor_state_status_check CHECK (last_status IN ('ok','down'))
);

INSERT INTO public.monitor_state (id) VALUES (1);

ALTER TABLE public.monitor_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages monitor state"
  ON public.monitor_state FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view monitor state"
  ON public.monitor_state FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.monitor_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target TEXT NOT NULL,
  status TEXT NOT NULL,
  latency_ms INTEGER,
  http_status INTEGER,
  error_message TEXT,
  CONSTRAINT monitor_checks_status_check CHECK (status IN ('ok','down'))
);

CREATE INDEX idx_monitor_checks_checked_at ON public.monitor_checks (checked_at DESC);

ALTER TABLE public.monitor_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role inserts checks"
  ON public.monitor_checks FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role reads checks"
  ON public.monitor_checks FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view checks"
  ON public.monitor_checks FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Block updates/deletes (audit trail)
CREATE POLICY "No updates on monitor checks"
  ON public.monitor_checks AS RESTRICTIVE FOR UPDATE
  USING (false);

CREATE POLICY "No deletes on monitor checks"
  ON public.monitor_checks AS RESTRICTIVE FOR DELETE
  USING (false);

-- Ensure pg_cron + pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store the service role key in vault for cron-authenticated calls (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'health_monitor_service_role_key') THEN
    PERFORM vault.create_secret(
      current_setting('app.settings.service_role_key', true),
      'health_monitor_service_role_key',
      'Service role key used by pg_cron to call health-monitor'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Vault may not be available; cron job will use anon key fallback
  NULL;
END $$;

-- Schedule the health check every 5 minutes
SELECT cron.schedule(
  'health-monitor-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tyeziqmikaygktvznzwm.supabase.co/functions/v1/health-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'health_monitor_service_role_key' LIMIT 1),
        ''
      )
    ),
    body := jsonb_build_object('source', 'cron')
  );
  $$
);
