
-- Drop the existing policy that allows observers to see unpublished questions
DROP POLICY IF EXISTS "Authenticated users can view questions of published questionnai" ON public.questionnaire_questions;

-- Recreate: authenticated users see published questions; only admin/editor see unpublished
CREATE POLICY "Authenticated users can view questions of published questionnaires"
ON public.questionnaire_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.questionnaires q
    WHERE q.id = questionnaire_questions.questionnaire_id
      AND q.is_published = true
  )
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role])
);
