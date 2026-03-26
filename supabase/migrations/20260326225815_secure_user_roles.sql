-- Drop heavily permissive deletion policy
DROP POLICY IF EXISTS "Users can delete own roles" ON public.user_roles;

-- Drop permissive self-selection policy
DROP POLICY IF EXISTS "Users can insert own self-select roles" ON public.user_roles;

-- Create hardened self-assignment policy
CREATE POLICY "Users can insert own restricted self-select roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  role = 'affected_person'::app_role
);
