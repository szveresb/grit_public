
-- Table for admin-managed landing page sections (starting with mood_preview)
CREATE TABLE public.landing_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  title_localized jsonb DEFAULT '{}'::jsonb,
  subtitle text DEFAULT '',
  subtitle_localized jsonb DEFAULT '{}'::jsonb,
  cta_text text DEFAULT '',
  cta_text_localized jsonb DEFAULT '{}'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can read active sections (public landing page)
CREATE POLICY "Anyone can view active landing sections"
  ON public.landing_sections FOR SELECT
  USING (is_active = true);

-- Editors/admins can manage
CREATE POLICY "Editors can manage landing sections"
  ON public.landing_sections FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]));

-- Timestamp trigger
CREATE TRIGGER update_landing_sections_updated_at
  BEFORE UPDATE ON public.landing_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the mood preview section
INSERT INTO public.landing_sections (section_key, title, title_localized, subtitle, subtitle_localized, cta_text, cta_text_localized, config)
VALUES (
  'mood_preview',
  'Hogy érzed magad ma?',
  '{"en": "How are you feeling today?"}'::jsonb,
  'Kövesd nyomon a hangulatodat és fedezd fel a mintákat. Regisztrálj az induláshoz.',
  '{"en": "Track your mood and discover patterns. Sign up to get started."}'::jsonb,
  'Regisztrálj és kezdd el',
  '{"en": "Sign up to start"}'::jsonb,
  '{"mood_labels": ["Küzdök", "Nyugtalan", "Rendben", "Jól", "Erős"], "mood_labels_en": ["Struggling", "Uneasy", "Okay", "Good", "Strong"]}'::jsonb
);
