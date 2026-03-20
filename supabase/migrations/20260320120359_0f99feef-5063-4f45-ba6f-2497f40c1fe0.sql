
-- 1. Create consent_history_logs table
CREATE TABLE public.consent_history_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_key text NOT NULL,
  granted boolean NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  scope_snapshot jsonb
);

ALTER TABLE public.consent_history_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent history"
  ON public.consent_history_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Trigger: auto-log consent changes to history
CREATE OR REPLACE FUNCTION public.log_consent_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.consent_history_logs (user_id, consent_key, granted, changed_at, scope_snapshot)
  VALUES (
    NEW.user_id,
    NEW.consent_key,
    NEW.granted,
    now(),
    (SELECT jsonb_object_agg(consent_key, granted)
     FROM public.user_consents
     WHERE user_id = NEW.user_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_consent_history
  AFTER INSERT OR UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_consent_change();

-- 3. Update handle_new_user to also initialize consent rows
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.user_consents (user_id, consent_key, granted)
  VALUES
    (NEW.id, 'journal_storage', false),
    (NEW.id, 'mood_tracking', false),
    (NEW.id, 'free_text_ai', false),
    (NEW.id, 'pattern_detection', false),
    (NEW.id, 'questionnaire_data', false),
    (NEW.id, 'fhir_export', false),
    (NEW.id, 'anonymized_analytics', false);

  RETURN NEW;
END;
$$;

-- 4. Create DB function for analyst-export consent filtering
CREATE OR REPLACE FUNCTION public.analyst_consented_user_ids(_consent_key text)
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT user_id FROM public.user_consents
  WHERE consent_key = _consent_key AND granted = true;
$$;
