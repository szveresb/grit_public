
DROP POLICY "Users can insert own roles" ON public.user_roles;

CREATE POLICY "Users can insert own self-select roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  role = ANY(ARRAY['affected_person','observer']::app_role[])
);
