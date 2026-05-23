-- Monitor check retention: keep 30 days of detailed rows and preserve daily summaries.
CREATE TABLE IF NOT EXISTS public.monitor_checks_daily_summary (
  summary_date DATE NOT NULL,
  target TEXT NOT NULL,
  total_checks INTEGER NOT NULL DEFAULT 0,
  ok_checks INTEGER NOT NULL DEFAULT 0,
  down_checks INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms NUMERIC(10,2),
  min_latency_ms INTEGER,
  max_latency_ms INTEGER,
  first_check_at TIMESTAMPTZ,
  last_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monitor_checks_daily_summary_pkey PRIMARY KEY (summary_date, target)
);

CREATE INDEX IF NOT EXISTS idx_monitor_checks_daily_summary_date
  ON public.monitor_checks_daily_summary (summary_date DESC);

ALTER TABLE public.monitor_checks_daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages monitor summaries"
  ON public.monitor_checks_daily_summary FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view monitor summaries"
  ON public.monitor_checks_daily_summary FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.rollup_and_purge_monitor_checks(retention_days INTEGER DEFAULT 30)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff_ts TIMESTAMPTZ;
BEGIN
  cutoff_ts := now() - make_interval(days => retention_days);

  INSERT INTO public.monitor_checks_daily_summary (
    summary_date,
    target,
    total_checks,
    ok_checks,
    down_checks,
    avg_latency_ms,
    min_latency_ms,
    max_latency_ms,
    first_check_at,
    last_check_at,
    updated_at
  )
  SELECT
    (checked_at AT TIME ZONE 'UTC')::DATE AS summary_date,
    target,
    COUNT(*) AS total_checks,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_checks,
    COUNT(*) FILTER (WHERE status = 'down') AS down_checks,
    ROUND(AVG(latency_ms)::numeric, 2) AS avg_latency_ms,
    MIN(latency_ms) AS min_latency_ms,
    MAX(latency_ms) AS max_latency_ms,
    MIN(checked_at) AS first_check_at,
    MAX(checked_at) AS last_check_at,
    now() AS updated_at
  FROM public.monitor_checks
  WHERE checked_at < cutoff_ts
  GROUP BY (checked_at AT TIME ZONE 'UTC')::DATE, target
  ON CONFLICT (summary_date, target)
  DO UPDATE SET
    total_checks = EXCLUDED.total_checks,
    ok_checks = EXCLUDED.ok_checks,
    down_checks = EXCLUDED.down_checks,
    avg_latency_ms = EXCLUDED.avg_latency_ms,
    min_latency_ms = EXCLUDED.min_latency_ms,
    max_latency_ms = EXCLUDED.max_latency_ms,
    first_check_at = EXCLUDED.first_check_at,
    last_check_at = EXCLUDED.last_check_at,
    updated_at = now();

  DELETE FROM public.monitor_checks
  WHERE checked_at < cutoff_ts;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monitor-retention-daily') THEN
    PERFORM cron.unschedule('monitor-retention-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'monitor-retention-daily',
  '10 1 * * *',
  $$SELECT public.rollup_and_purge_monitor_checks(30);$$
);
