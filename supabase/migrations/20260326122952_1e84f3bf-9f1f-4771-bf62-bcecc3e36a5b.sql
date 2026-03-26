ALTER TABLE public.questionnaire_responses
  ADD COLUMN subject_type public.subject_type NOT NULL DEFAULT 'self',
  ADD COLUMN subject_id uuid REFERENCES public.subjects(id) DEFAULT NULL;