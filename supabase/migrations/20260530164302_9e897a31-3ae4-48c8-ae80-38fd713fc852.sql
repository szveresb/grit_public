CREATE POLICY "Anon users can view published questionnaires"
ON public.questionnaires
FOR SELECT
TO anon
USING (is_published = true);

CREATE POLICY "Anon users can view questions of published questionnaires"
ON public.questionnaire_questions
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.questionnaires q
    WHERE q.id = questionnaire_questions.questionnaire_id
      AND q.is_published = true
  )
);