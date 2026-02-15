
-- 1. observation_categories
CREATE TABLE public.observation_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hu text NOT NULL,
  name_en text NOT NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.observation_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active categories"
  ON public.observation_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Editors can manage categories"
  ON public.observation_categories FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]));

-- 2. observation_concepts
CREATE TABLE public.observation_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.observation_categories(id) ON DELETE CASCADE,
  concept_code text UNIQUE NOT NULL,
  name_hu text NOT NULL,
  name_en text NOT NULL,
  description_hu text,
  description_en text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.observation_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active concepts"
  ON public.observation_concepts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Editors can manage concepts"
  ON public.observation_concepts FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]));

-- 3. observation_logs
CREATE TABLE public.observation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concept_id uuid NOT NULL REFERENCES public.observation_concepts(id) ON DELETE CASCADE,
  intensity integer NOT NULL DEFAULT 3,
  frequency text,
  context_modifier text,
  user_narrative text,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.observation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own observation logs"
  ON public.observation_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Intensity validation trigger
CREATE OR REPLACE FUNCTION public.validate_observation_intensity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.intensity < 1 OR NEW.intensity > 5 THEN
    RAISE EXCEPTION 'Intensity must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_observation_intensity
  BEFORE INSERT OR UPDATE ON public.observation_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_observation_intensity();

-- Index for user queries
CREATE INDEX idx_observation_logs_user_date ON public.observation_logs(user_id, logged_at DESC);
CREATE INDEX idx_observation_concepts_category ON public.observation_concepts(category_id);

-- Seed categories
INSERT INTO public.observation_categories (name_hu, name_en, icon, sort_order) VALUES
  ('Érzelmi állapot', 'Emotional State', 'heart', 0),
  ('Kommunikációs minták', 'Communication Patterns', 'message-circle', 1),
  ('Határok', 'Boundaries', 'shield', 2);

-- Seed concepts
WITH cats AS (
  SELECT id, name_en FROM public.observation_categories
)
INSERT INTO public.observation_concepts (category_id, concept_code, name_hu, name_en, description_hu, description_en, sort_order) VALUES
  ((SELECT id FROM cats WHERE name_en = 'Emotional State'), 'emotional_feeling_unheard', 'Megértetlenség érzése', 'Feeling unheard', 'Amikor úgy érzed, a mondanivalódat figyelmen kívül hagyják vagy elutasítják.', 'When you feel your words are being dismissed or ignored.', 0),
  ((SELECT id FROM cats WHERE name_en = 'Emotional State'), 'emotional_narrative_distortion', 'Tünetes elbeszélés', 'Narrative distortion', 'Amikor az eseményeket másképp mesélik el, mint ahogy megtörténtek.', 'When events are retold differently from how they occurred.', 1),
  ((SELECT id FROM cats WHERE name_en = 'Emotional State'), 'emotional_withdrawal', 'Érzelmi elzárás', 'Emotional withdrawal', 'Amikor valaki érzelmileg visszahúzódik vagy elérhetetlenné válik.', 'When someone becomes emotionally unavailable or retreats.', 2),
  ((SELECT id FROM cats WHERE name_en = 'Communication Patterns'), 'comm_circular_arguing', 'Körkörös érvelés', 'Circular arguing', 'Ismétlődő viták, amelyek nem vezetnek megoldáshoz.', 'Repetitive arguments that never reach resolution.', 0),
  ((SELECT id FROM cats WHERE name_en = 'Communication Patterns'), 'comm_stonewalling', 'Csendfal', 'Stonewalling', 'Amikor valaki megtagadja a kommunikációt vagy elzárkózik.', 'When someone refuses to communicate or shuts down.', 1),
  ((SELECT id FROM cats WHERE name_en = 'Communication Patterns'), 'comm_positioned_aggressor', 'Támadóként való beállítás', 'Being positioned as the aggressor', 'Amikor téged állítanak be agresszornak a helyzetben.', 'When you are framed as the aggressor in a situation.', 2),
  ((SELECT id FROM cats WHERE name_en = 'Boundaries'), 'boundary_crossing', 'Határátlépés', 'Boundary crossing', 'Amikor a személyes határaidat nem tartják tiszteletben.', 'When your personal boundaries are not respected.', 0),
  ((SELECT id FROM cats WHERE name_en = 'Boundaries'), 'boundary_controlling', 'Kontrollálás', 'Controlling behavior', 'Kísérlet a döntéseid vagy viselkedésed feletti kontrollra.', 'Attempts to control your decisions or behavior.', 1),
  ((SELECT id FROM cats WHERE name_en = 'Boundaries'), 'boundary_privacy_violation', 'Magánélet megsértése', 'Privacy violation', 'A személyes tered vagy privát információid megsértése.', 'Intrusion into your personal space or private information.', 2);
