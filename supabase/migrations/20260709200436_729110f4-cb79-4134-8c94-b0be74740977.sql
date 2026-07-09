
ALTER TABLE public.survey_interpretations
  ADD COLUMN IF NOT EXISTS score_min INTEGER,
  ADD COLUMN IF NOT EXISTS score_max INTEGER,
  ADD COLUMN IF NOT EXISTS body_en TEXT,
  ADD COLUMN IF NOT EXISTS body_hu TEXT,
  ADD COLUMN IF NOT EXISTS citations UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS generated_by TEXT NOT NULL DEFAULT 'manual';

-- Backfill body_en/body_hu from legacy content columns if present
UPDATE public.survey_interpretations
  SET body_en = COALESCE(body_en, content_en, content),
      body_hu = COALESCE(body_hu, content)
  WHERE body_en IS NULL OR body_hu IS NULL;
