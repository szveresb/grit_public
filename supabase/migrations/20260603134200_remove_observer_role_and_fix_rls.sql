-- Remove observer role from existing user_roles
DELETE FROM public.user_roles WHERE role = 'observer'::app_role;

-- Drop old policies for questionnaires and questionnaire_questions
DROP POLICY IF EXISTS "Admins can manage questionnaires" ON public.questionnaires;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questionnaire_questions;

-- Create new policies for questionnaires
CREATE POLICY "Admins and editors can manage questionnaires"
  ON public.questionnaires FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]));

-- Create new policies for questionnaire_questions
CREATE POLICY "Admins and editors can manage questionnaire_questions"
  ON public.questionnaire_questions FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor'::app_role]));
