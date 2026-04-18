REVOKE EXECUTE ON FUNCTION public.analyst_questionnaire_aggregates() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.analyst_role_distribution() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.analyst_journal_aggregates() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.analyst_observation_aggregates() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.analyst_consented_user_ids(text) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.analyst_questionnaire_aggregates() TO service_role;
GRANT EXECUTE ON FUNCTION public.analyst_role_distribution() TO service_role;
GRANT EXECUTE ON FUNCTION public.analyst_journal_aggregates() TO service_role;
GRANT EXECUTE ON FUNCTION public.analyst_observation_aggregates() TO service_role;
GRANT EXECUTE ON FUNCTION public.analyst_consented_user_ids(text) TO service_role;