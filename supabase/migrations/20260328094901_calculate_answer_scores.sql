-- Questionnaire Indexing & Performance Trigger Migration
-- Automates O(1) total_score increments synchronously during raw answers insertion.

CREATE OR REPLACE FUNCTION public.calculate_answer_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_type TEXT;
  v_answer_scores JSONB;
  v_options JSONB;
  v_answer_val TEXT;
  v_idx INTEGER;
  v_scoring_enabled BOOLEAN;
  v_scoring_mode TEXT;
BEGIN
  -- 1. Get question details
  SELECT question_type, answer_scores, options
  INTO v_type, v_answer_scores, v_options
  FROM public.questionnaire_questions
  WHERE id = NEW.question_id;

  -- 2. Get questionnaire enablement
  SELECT q.scoring_enabled, q.scoring_mode
  INTO v_scoring_enabled, v_scoring_mode
  FROM public.questionnaires q
  JOIN public.questionnaire_responses r ON r.questionnaire_id = q.id
  WHERE r.id = NEW.response_id;

  -- Only calculate if active
  IF NOT v_scoring_enabled THEN
    RETURN NEW;
  END IF;

  -- Extract the raw text answer without JSON string quotes
  v_answer_val := NEW.answer#>>'{}';

  -- 3. Calculate score per native UI logic
  IF v_type = 'text' THEN
    v_score := 0;
  ELSIF v_scoring_mode = 'weighted' AND v_answer_scores IS NOT NULL AND v_answer_scores ? v_answer_val THEN
    v_score := (v_answer_scores->>v_answer_val)::INTEGER;
  ELSE
    IF v_type = 'scale' THEN
      IF (v_answer_scores IS NOT NULL AND v_answer_scores ? v_answer_val) THEN
        v_score := (v_answer_scores->>v_answer_val)::INTEGER;
      ELSE
        BEGIN
          v_score := v_answer_val::INTEGER;
        EXCEPTION WHEN invalid_text_representation THEN
          v_score := 0;
        END;
      END IF;
    ELSIF v_type = 'yes_no' THEN
      v_score := CASE WHEN v_answer_val = 'yes' THEN 1 ELSE 0 END;
    ELSIF v_type = 'multiple_choice' THEN
      SELECT ordinality - 1 INTO v_idx
      FROM jsonb_array_elements_text(v_options) WITH ORDINALITY arr(elem, ordinality)
      WHERE elem = v_answer_val LIMIT 1;
      
      v_score := COALESCE(v_idx + 1, 0);
    END IF;
  END IF;

  -- 4. Automatically index total_score on the parent response object
  UPDATE public.questionnaire_responses
  SET total_score = COALESCE(total_score, 0) + v_score
  WHERE id = NEW.response_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_answer_score ON public.questionnaire_answers;

CREATE TRIGGER trg_calculate_answer_score
  AFTER INSERT ON public.questionnaire_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_answer_score();
