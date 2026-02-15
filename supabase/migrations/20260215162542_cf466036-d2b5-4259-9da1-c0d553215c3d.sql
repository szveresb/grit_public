
-- Add JSONB localized fields to library_articles
ALTER TABLE public.library_articles
  ADD COLUMN title_localized jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN excerpt_localized jsonb DEFAULT '{}'::jsonb;

-- Backfill existing data: copy current title/excerpt into the "hu" key
UPDATE public.library_articles
SET title_localized = jsonb_build_object('hu', title),
    excerpt_localized = CASE WHEN excerpt IS NOT NULL THEN jsonb_build_object('hu', excerpt) ELSE '{}'::jsonb END;

-- Add JSONB localized fields to questionnaires
ALTER TABLE public.questionnaires
  ADD COLUMN title_localized jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN description_localized jsonb DEFAULT '{}'::jsonb;

UPDATE public.questionnaires
SET title_localized = jsonb_build_object('hu', title),
    description_localized = CASE WHEN description IS NOT NULL THEN jsonb_build_object('hu', description) ELSE '{}'::jsonb END;

-- Add JSONB localized fields to questionnaire_questions
ALTER TABLE public.questionnaire_questions
  ADD COLUMN question_text_localized jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN options_localized jsonb DEFAULT '{}'::jsonb;

UPDATE public.questionnaire_questions
SET question_text_localized = jsonb_build_object('hu', question_text),
    options_localized = CASE WHEN options IS NOT NULL THEN jsonb_build_object('hu', options) ELSE '{}'::jsonb END;
