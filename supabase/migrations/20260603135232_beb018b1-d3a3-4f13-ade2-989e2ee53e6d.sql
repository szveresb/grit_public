
DELETE FROM public.user_roles WHERE role = 'observer';

DROP POLICY IF EXISTS "Authenticated users can view questions of published questionnai" ON public.questionnaire_questions;

CREATE POLICY "Authenticated users can view questions of published questionnai"
ON public.questionnaire_questions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.questionnaires q
    WHERE q.id = questionnaire_questions.questionnaire_id
      AND q.is_published = true
  )
);
