
-- 1. Create subject_type enum
CREATE TYPE public.subject_type AS ENUM ('self', 'relative');

-- 2. Create relationship_type enum
CREATE TYPE public.relationship_type AS ENUM ('child', 'spouse', 'parent', 'sibling', 'other');

-- 3. Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship_type public.relationship_type NOT NULL DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subjects" ON public.subjects
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Add subject_type and subject_id to observation_logs
ALTER TABLE public.observation_logs
  ADD COLUMN subject_type public.subject_type NOT NULL DEFAULT 'self',
  ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- 5. Add premium flag to profiles (everyone gets it for now)
ALTER TABLE public.profiles
  ADD COLUMN premium BOOLEAN NOT NULL DEFAULT true;
