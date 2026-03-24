ALTER TABLE public.questionnaire_responses
  ADD COLUMN IF NOT EXISTS subject_type public.subject_type NOT NULL DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.enforce_questionnaire_response_subject_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.subject_type = 'relative' AND NEW.subject_id IS NULL THEN
    RAISE EXCEPTION 'A valid subject must be selected for supported-person questionnaire responses';
  END IF;

  IF NEW.subject_type = 'self' THEN
    NEW.subject_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS questionnaire_responses_subject_consistency ON public.questionnaire_responses;

CREATE TRIGGER questionnaire_responses_subject_consistency
  BEFORE INSERT OR UPDATE ON public.questionnaire_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_questionnaire_response_subject_consistency();

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_subject_context
  ON public.questionnaire_responses (user_id, subject_type, subject_id, completed_at DESC);
