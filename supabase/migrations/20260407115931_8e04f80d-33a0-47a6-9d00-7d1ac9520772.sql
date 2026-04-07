-- 1. Fix privilege escalation: Add RESTRICTIVE policy blocking non-admins from inserting privileged roles
CREATE POLICY "Block non-admin privileged role insertion"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR role = 'affected_person'::app_role
);

-- 2. Fix questionnaire_answers policy scope: drop and recreate with {authenticated}
DROP POLICY IF EXISTS "Users can manage own answers" ON public.questionnaire_answers;

CREATE POLICY "Users can manage own answers"
ON public.questionnaire_answers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM questionnaire_responses r
    WHERE r.id = questionnaire_answers.response_id AND r.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM questionnaire_responses r
    WHERE r.id = questionnaire_answers.response_id AND r.user_id = auth.uid()
  )
);

-- 3. Fix waitlist email validation
ALTER TABLE public.waitlist_emails
  ADD CONSTRAINT chk_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$');

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_waitlist_email'
  ) THEN
    ALTER TABLE public.waitlist_emails ADD CONSTRAINT uq_waitlist_email UNIQUE (email);
  END IF;
END $$;