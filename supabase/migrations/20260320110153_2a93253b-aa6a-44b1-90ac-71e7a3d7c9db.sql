
-- 1. Add snomed_code column to questionnaires for FHIR interoperability
ALTER TABLE public.questionnaires ADD COLUMN IF NOT EXISTS snomed_code text DEFAULT NULL;

-- 2. Performance indexes for rapid trend calculation
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_quest
  ON public.questionnaire_responses (user_id, questionnaire_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_response
  ON public.questionnaire_answers (response_id);

CREATE INDEX IF NOT EXISTS idx_observation_logs_user_date
  ON public.observation_logs (user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_mood_pulses_user_date
  ON public.mood_pulses (user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date
  ON public.journal_entries (user_id, entry_date DESC);
