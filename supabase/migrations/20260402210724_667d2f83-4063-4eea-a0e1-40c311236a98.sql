
-- Fix double-encoded answer values: strip outer quotes from answers stored as '"3"' → '3'
UPDATE public.questionnaire_answers
SET answer = (answer#>>'{}')::jsonb
WHERE answer#>>'{}' LIKE '"%"';

-- Recalculate total_score for affected responses
WITH recalc AS (
  SELECT
    r.id AS response_id,
    SUM(
      CASE
        WHEN qa.answer#>>'{}' = '__SKIPPED__' THEN 0
        WHEN qq.question_type = 'text' THEN 0
        WHEN q.scoring_mode = 'weighted' AND qq.answer_scores IS NOT NULL AND qq.answer_scores ? (qa.answer#>>'{}')
          THEN (qq.answer_scores->>(qa.answer#>>'{}'))::INTEGER
        WHEN qq.question_type = 'scale' AND qq.answer_scores IS NOT NULL AND qq.answer_scores ? (qa.answer#>>'{}')
          THEN (qq.answer_scores->>(qa.answer#>>'{}'))::INTEGER
        WHEN qq.question_type = 'scale'
          THEN (qa.answer#>>'{}')::INTEGER
        WHEN qq.question_type = 'yes_no'
          THEN CASE WHEN qa.answer#>>'{}' = 'yes' THEN 1 ELSE 0 END
        WHEN qq.question_type = 'multiple_choice'
          THEN COALESCE(
            (SELECT ordinality FROM jsonb_array_elements_text(qq.options) WITH ORDINALITY arr(elem, ordinality) WHERE elem = qa.answer#>>'{}' LIMIT 1),
            0
          )::INTEGER
        ELSE 0
      END
    ) AS new_score
  FROM public.questionnaire_responses r
  JOIN public.questionnaire_answers qa ON qa.response_id = r.id
  JOIN public.questionnaire_questions qq ON qq.id = qa.question_id
  JOIN public.questionnaires q ON q.id = r.questionnaire_id
  WHERE q.scoring_enabled = TRUE
  GROUP BY r.id
)
UPDATE public.questionnaire_responses r
SET total_score = recalc.new_score
FROM recalc
WHERE r.id = recalc.response_id;
