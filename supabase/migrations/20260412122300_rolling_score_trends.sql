-- 1. Create questionnaire_score_trends table
CREATE TABLE IF NOT EXISTS public.questionnaire_score_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  subject_type public.subject_type NOT NULL DEFAULT 'self',
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  latest_response_id UUID NOT NULL REFERENCES public.questionnaire_responses(id) ON DELETE CASCADE,
  latest_score INTEGER NOT NULL DEFAULT 0,
  previous_score INTEGER,
  trend_delta INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, questionnaire_id, subject_id, subject_type)
);

-- 2. Enable RLS
ALTER TABLE public.questionnaire_score_trends ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view own questionnaire trends"
  ON public.questionnaire_score_trends
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Trigger function for trend calculation
CREATE OR REPLACE FUNCTION public.update_rolling_score_trend()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_score INTEGER;
  v_delta INTEGER;
BEGIN
  -- Only proceed if total_score has changed and is not null
  IF (TG_OP = 'UPDATE' AND (OLD.total_score IS DISTINCT FROM NEW.total_score) AND NEW.total_score IS NOT NULL) OR
     (TG_OP = 'INSERT' AND NEW.total_score IS NOT NULL) THEN
    
    -- Find the previous score for the same context
    SELECT total_score INTO v_prev_score
    FROM public.questionnaire_responses
    WHERE user_id = NEW.user_id
      AND questionnaire_id = NEW.questionnaire_id
      AND subject_type = NEW.subject_type
      AND (subject_id = NEW.subject_id OR (subject_id IS NULL AND NEW.subject_id IS NULL))
      AND id != NEW.id
      AND completed_at < NEW.completed_at
    ORDER BY completed_at DESC
    LIMIT 1;

    -- Calculate delta
    v_delta := NEW.total_score - COALESCE(v_prev_score, 0);

    -- Upsert info into trends table
    INSERT INTO public.questionnaire_score_trends (
      user_id,
      questionnaire_id,
      subject_type,
      subject_id,
      latest_response_id,
      latest_score,
      previous_score,
      trend_delta,
      last_updated_at
    )
    VALUES (
      NEW.user_id,
      NEW.questionnaire_id,
      NEW.subject_type,
      NEW.subject_id,
      NEW.id,
      NEW.total_score,
      v_prev_score,
      v_delta,
      now()
    )
    ON CONFLICT (user_id, questionnaire_id, subject_id, subject_type)
    DO UPDATE SET
      latest_response_id = EXCLUDED.latest_response_id,
      latest_score = EXCLUDED.latest_score,
      previous_score = EXCLUDED.previous_score,
      trend_delta = EXCLUDED.trend_delta,
      last_updated_at = EXCLUDED.last_updated_at;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Add trigger to questionnaire_responses
DROP TRIGGER IF EXISTS trg_update_rolling_score_trend ON public.questionnaire_responses;
CREATE TRIGGER trg_update_rolling_score_trend
  AFTER INSERT OR UPDATE OF total_score ON public.questionnaire_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rolling_score_trend();

-- 6. Back-fill trend table from existing responses
DO $$
BEGIN
  INSERT INTO public.questionnaire_score_trends (
    user_id,
    questionnaire_id,
    subject_type,
    subject_id,
    latest_response_id,
    latest_score,
    previous_score,
    trend_delta,
    last_updated_at
  )
  SELECT DISTINCT ON (user_id, questionnaire_id, subject_id, subject_type)
    r.user_id,
    r.questionnaire_id,
    r.subject_type,
    r.subject_id,
    r.id,
    r.total_score,
    prev.total_score as previous_score,
    (r.total_score - COALESCE(prev.total_score, 0)) as trend_delta,
    r.completed_at
  FROM public.questionnaire_responses r
  LEFT JOIN LATERAL (
    SELECT total_score
    FROM public.questionnaire_responses p
    WHERE p.user_id = r.user_id
      AND p.questionnaire_id = r.questionnaire_id
      AND p.subject_type = r.subject_type
      AND (p.subject_id = r.subject_id OR (p.subject_id IS NULL AND r.subject_id IS NULL))
      AND p.id != r.id
      AND p.completed_at < r.completed_at
      AND p.total_score IS NOT NULL
    ORDER BY p.completed_at DESC
    LIMIT 1
  ) prev ON TRUE
  WHERE r.total_score IS NOT NULL
  ORDER BY user_id, questionnaire_id, subject_id, subject_type, r.completed_at DESC
  ON CONFLICT DO NOTHING;
END;
$$;
