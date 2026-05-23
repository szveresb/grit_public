
CREATE TABLE public.news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  title_localized jsonb NOT NULL DEFAULT '{}'::jsonb,
  body text NOT NULL DEFAULT '',
  body_localized jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'feature',
  published_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT news_items_category_check CHECK (category IN ('feature','upgrade','fix'))
);

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published news"
  ON public.news_items FOR SELECT
  USING (is_published = true);

CREATE POLICY "Editors can manage news"
  ON public.news_items FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]));

CREATE TRIGGER update_news_items_updated_at
  BEFORE UPDATE ON public.news_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_news_items_pub ON public.news_items (is_published, sort_order DESC, published_at DESC);
