-- 1. Prevent non-admin users from deleting roles (close tampering vector)
-- Currently only admins have DELETE; but there's no explicit deny for non-admins.
-- With RLS enabled and no permissive DELETE policy for regular users, they already can't delete.
-- However, let's add a RESTRICTIVE policy as defense-in-depth.

-- Drop existing admin delete policy and recreate to be explicit
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Consent history logs: explicitly deny all client-side writes
-- RLS is enabled, and with no INSERT/UPDATE/DELETE policies, Postgres already denies these.
-- But let's add explicit restrictive policies for clarity and defense-in-depth.

-- Deny all direct INSERT (only the trigger should insert)
CREATE POLICY "No direct inserts to consent history"
  ON public.consent_history_logs
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (false);

-- Deny all direct UPDATE
CREATE POLICY "No direct updates to consent history"
  ON public.consent_history_logs
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (false);

-- Deny all direct DELETE
CREATE POLICY "No direct deletes from consent history"
  ON public.consent_history_logs
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (false);