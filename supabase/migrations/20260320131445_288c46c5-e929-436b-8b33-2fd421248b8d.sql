ALTER TABLE public.mood_pulses
  ADD COLUMN subject_type public.subject_type NOT NULL DEFAULT 'self',
  ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;