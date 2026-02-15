
CREATE TABLE public.library_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  source TEXT,
  category TEXT NOT NULL DEFAULT 'Article',
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.library_articles ENABLE ROW LEVEL SECURITY;

-- Public read access for published articles
CREATE POLICY "Anyone can view published articles"
  ON public.library_articles
  FOR SELECT
  USING (published = true);

-- Observers can manage articles
CREATE POLICY "Observers can manage articles"
  ON public.library_articles
  FOR ALL
  USING (public.has_role(auth.uid(), 'observer'))
  WITH CHECK (public.has_role(auth.uid(), 'observer'));

CREATE TRIGGER update_library_articles_updated_at
  BEFORE UPDATE ON public.library_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
