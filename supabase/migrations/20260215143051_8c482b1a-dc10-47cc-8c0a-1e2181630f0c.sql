
-- Anonymised journal aggregates: counts and averages per date, no user IDs
CREATE OR REPLACE FUNCTION public.analyst_journal_aggregates()
RETURNS TABLE(
  entry_date date,
  entry_count bigint,
  avg_impact_level numeric,
  emotional_states jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    je.entry_date,
    COUNT(*)::bigint AS entry_count,
    ROUND(AVG(je.impact_level)::numeric, 2) AS avg_impact_level,
    jsonb_agg(je.emotional_state) FILTER (WHERE je.emotional_state IS NOT NULL) AS emotional_states
  FROM journal_entries je
  GROUP BY je.entry_date
  ORDER BY je.entry_date DESC;
$$;

-- Anonymised questionnaire aggregates: per questionnaire, answer distributions
CREATE OR REPLACE FUNCTION public.analyst_questionnaire_aggregates()
RETURNS TABLE(
  questionnaire_title text,
  question_text text,
  response_count bigint,
  answer_distribution jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    q.title AS questionnaire_title,
    qq.question_text,
    COUNT(DISTINCT qa.response_id)::bigint AS response_count,
    jsonb_agg(qa.answer) AS answer_distribution
  FROM questionnaire_answers qa
  JOIN questionnaire_questions qq ON qq.id = qa.question_id
  JOIN questionnaires q ON q.id = qq.questionnaire_id
  GROUP BY q.title, qq.question_text
  ORDER BY q.title, qq.question_text;
$$;

-- Role distribution: count per role, no user IDs
CREATE OR REPLACE FUNCTION public.analyst_role_distribution()
RETURNS TABLE(
  role text,
  user_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text, COUNT(*)::bigint AS user_count
  FROM user_roles
  GROUP BY role
  ORDER BY user_count DESC;
$$;
