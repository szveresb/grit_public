
CREATE TABLE IF NOT EXISTS public.survey_studies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'manual',
  title TEXT NOT NULL,
  authors TEXT,
  year INTEGER,
  citation_string TEXT,
  storage_path TEXT,
  doi TEXT,
  url TEXT,
  key_findings TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_studies TO authenticated;
GRANT ALL ON public.survey_studies TO service_role;

ALTER TABLE public.survey_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read survey_studies"
  ON public.survey_studies FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage survey_studies"
  ON public.survey_studies FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER survey_studies_updated_at
  BEFORE UPDATE ON public.survey_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_survey_studies_survey_id ON public.survey_studies(survey_id);

CREATE TABLE IF NOT EXISTS public.survey_interpretations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  score_band TEXT,
  content TEXT NOT NULL,
  content_en TEXT,
  model TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_interpretations TO authenticated;
GRANT ALL ON public.survey_interpretations TO service_role;

ALTER TABLE public.survey_interpretations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read survey_interpretations"
  ON public.survey_interpretations FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage survey_interpretations"
  ON public.survey_interpretations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER survey_interpretations_updated_at
  BEFORE UPDATE ON public.survey_interpretations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_survey_interpretations_survey_id ON public.survey_interpretations(survey_id);
