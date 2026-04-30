-- Create audit log table for analyst exports
CREATE TABLE public.analyst_export_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  analyst_user_id uuid NOT NULL,
  analyst_email text,
  export_format text NOT NULL DEFAULT 'json',
  consent_key_applied text NOT NULL DEFAULT 'anonymized_analytics',
  consented_user_count integer NOT NULL DEFAULT 0,
  active_user_count integer NOT NULL DEFAULT 0,
  k_anonymity_threshold integer NOT NULL DEFAULT 20,
  threshold_met boolean NOT NULL DEFAULT false,
  outcome text NOT NULL,
  journal_aggregate_count integer NOT NULL DEFAULT 0,
  questionnaire_aggregate_count integer NOT NULL DEFAULT 0,
  observation_aggregate_count integer NOT NULL DEFAULT 0,
  role_distribution_count integer NOT NULL DEFAULT 0,
  request_ip text,
  user_agent text,
  notes text
);

CREATE INDEX idx_analyst_export_audit_created_at ON public.analyst_export_audit(created_at DESC);
CREATE INDEX idx_analyst_export_audit_analyst ON public.analyst_export_audit(analyst_user_id, created_at DESC);

ALTER TABLE public.analyst_export_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit rows. Inserts/updates/deletes only via service_role (bypasses RLS).
CREATE POLICY "Admins can view export audit"
  ON public.analyst_export_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block direct inserts on export audit"
  ON public.analyst_export_audit
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (false);

CREATE POLICY "Block direct updates on export audit"
  ON public.analyst_export_audit
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "Block direct deletes on export audit"
  ON public.analyst_export_audit
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (false);