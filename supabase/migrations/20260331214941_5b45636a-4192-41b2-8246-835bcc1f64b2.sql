-- Allow admins to audit all consent history logs
CREATE POLICY "Admins can view all consent history"
ON public.consent_history_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));