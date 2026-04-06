-- Fix: Change the user_consents DELETE policy from PERMISSIVE to RESTRICTIVE
DROP POLICY "No direct deletes on user consents" ON public.user_consents;
CREATE POLICY "No direct deletes on user consents"
ON public.user_consents
AS RESTRICTIVE
FOR DELETE TO public
USING (false);