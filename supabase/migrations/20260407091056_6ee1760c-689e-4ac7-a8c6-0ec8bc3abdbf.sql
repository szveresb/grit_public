
CREATE TABLE public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  summary text NOT NULL,
  message text,
  urgency text DEFAULT 'medium',
  page_path text,
  subject_type text,
  subject_id uuid,
  locale text,
  viewport text,
  context_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
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
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "No updates on feedback"
  ON public.user_feedback
  FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "No deletes on feedback"
  ON public.user_feedback
  FOR DELETE
  TO public
  USING (false);
