
DROP POLICY "Users can insert own restricted self-select roles" ON public.user_roles;

CREATE POLICY "Users can insert own restricted self-select roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND (role = 'affected_person'::app_role));
