-- Add restrictive UPDATE policy to prevent any role self-modification
CREATE POLICY "No updates on user roles"
  ON public.user_roles
  FOR UPDATE
  TO public
  USING (false);