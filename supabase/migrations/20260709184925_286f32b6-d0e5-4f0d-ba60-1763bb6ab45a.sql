ALTER TABLE public.questionnaires ADD COLUMN IF NOT EXISTS subscales jsonb;
ALTER TABLE public.questionnaire_questions ADD COLUMN IF NOT EXISTS subscale_ids text[] DEFAULT '{}'::text[];