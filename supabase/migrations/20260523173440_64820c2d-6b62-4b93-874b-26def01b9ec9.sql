-- Create news_items table
CREATE TABLE public.news_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    title_localized JSONB,
    body TEXT NOT NULL,
    body_localized JSONB,
    category TEXT NOT NULL CHECK (category IN ('feature', 'upgrade', 'fix')),
    is_published BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

-- Policies for public viewing
CREATE POLICY "Anyone can view published news items" 
ON public.news_items 
FOR SELECT 
USING (is_published = true);

-- Policies for admin management
CREATE POLICY "Admins can manage news items" 
ON public.news_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_news_items_updated_at
BEFORE UPDATE ON public.news_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();