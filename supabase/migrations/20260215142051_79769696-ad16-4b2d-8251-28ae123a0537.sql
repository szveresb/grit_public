
-- Create a helper function to check if user has ANY of a set of roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Update library_articles RLS: editors, guest_editors, and admins can manage
DROP POLICY IF EXISTS "Observers can manage articles" ON public.library_articles;
CREATE POLICY "Editors can manage articles"
ON public.library_articles
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin', 'editor', 'guest_editor']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'editor', 'guest_editor']::app_role[]));

-- Update questionnaires RLS: editors and admins can manage
DROP POLICY IF EXISTS "Admins can manage questionnaires" ON public.questionnaires;
CREATE POLICY "Editors can manage questionnaires"
ON public.questionnaires
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin', 'editor']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'editor']::app_role[]));

-- Update questionnaire_questions RLS: editors and admins can manage
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questionnaire_questions;
CREATE POLICY "Editors can manage questions"
ON public.questionnaire_questions
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin', 'editor']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'editor']::app_role[]));

-- Admin policy: admins can view all user_roles (for management)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policy: admins can insert roles for any user
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin policy: admins can delete roles for any user
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all profiles (for user management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
