
-- Add scoring fields to questionnaires
ALTER TABLE public.questionnaires 
  ADD COLUMN scoring_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN scoring_mode text NOT NULL DEFAULT 'sum',
  ADD COLUMN score_ranges jsonb DEFAULT '[]'::jsonb;

-- Add per-question answer scores for weighted mode
ALTER TABLE public.questionnaire_questions
  ADD COLUMN answer_scores jsonb DEFAULT '{}'::jsonb;

-- Add total_score to responses
ALTER TABLE public.questionnaire_responses
  ADD COLUMN total_score integer;
