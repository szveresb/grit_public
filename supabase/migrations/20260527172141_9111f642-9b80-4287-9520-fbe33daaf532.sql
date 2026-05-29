DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'health-monitor-every-5min') THEN
    PERFORM cron.unschedule('health-monitor-every-5min');
  END IF;
END $$;

-- Also remove the retention rollup job since monitoring is off
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monitor-retention-daily') THEN
    PERFORM cron.unschedule('monitor-retention-daily');
  END IF;
END $$;

-- Remove the vault secret used by the cron job
DO $$
BEGIN
  PERFORM vault.delete_secret(
    (SELECT id FROM vault.secrets WHERE name = 'health_monitor_service_role_key' LIMIT 1)
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;