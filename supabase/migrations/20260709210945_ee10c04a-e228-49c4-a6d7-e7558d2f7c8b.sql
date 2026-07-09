ALTER TABLE public.survey_interpretations ALTER COLUMN content DROP NOT NULL;
UPDATE public.survey_interpretations SET content = COALESCE(content, body_hu, body_en, '') WHERE content IS NULL;