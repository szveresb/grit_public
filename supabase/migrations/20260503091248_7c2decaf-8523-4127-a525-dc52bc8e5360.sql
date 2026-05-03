-- 1. Restrict analyst SECURITY DEFINER functions to service_role only
REVOKE EXECUTE ON FUNCTION public.analyst_questionnaire_aggregates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.analyst_journal_aggregates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.analyst_role_distribution() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.analyst_observation_aggregates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.analyst_consented_user_ids(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.analyst_questionnaire_aggregates() TO service_role;
GRANT EXECUTE ON FUNCTION public.analyst_journal_aggregates() TO service_role;
GRANT EXECUTE ON FUNCTION public.analyst_role_distribution() TO service_role;
GRANT EXECUTE ON FUNCTION public.analyst_observation_aggregates() TO service_role;
GRANT EXECUTE ON FUNCTION public.analyst_consented_user_ids(text) TO service_role;

-- 2. Add RESTRICTIVE policy preventing non-admins from inserting privileged roles
CREATE POLICY "Restrict self-insert to affected_person only"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = user_id AND role = 'affected_person'::app_role)
);