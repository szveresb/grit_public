CREATE POLICY "No direct deletes on user consents"
ON public.user_consents
FOR DELETE
TO public
USING (false);