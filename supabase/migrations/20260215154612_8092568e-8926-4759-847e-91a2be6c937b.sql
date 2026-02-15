
-- Add external URL field to library_articles
ALTER TABLE public.library_articles ADD COLUMN url TEXT DEFAULT NULL;

-- Add self-anchor field to journal_entries
ALTER TABLE public.journal_entries ADD COLUMN self_anchor TEXT DEFAULT NULL;
