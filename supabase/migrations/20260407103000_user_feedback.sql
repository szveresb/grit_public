CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('bug', 'unclear', 'idea', 'praise', 'question')),
  summary TEXT NOT NULL,
  message TEXT,
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')),
  page_path TEXT NOT NULL,
  subject_type public.subject_type NOT NULL DEFAULT 'self',
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  locale TEXT NOT NULL CHECK (locale IN ('hu', 'en')),
  viewport TEXT NOT NULL CHECK (viewport IN ('mobile', 'tablet', 'desktop')),
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
ON public.user_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
ON public.user_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
ON public.user_feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

CREATE POLICY "Admins can update feedback status"
ON public.user_feedback
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_created_at
ON public.user_feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feedback_status_created_at
ON public.user_feedback (status, created_at DESC);
