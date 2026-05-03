
-- Revoke EXECUTE on trigger-only SECURITY DEFINER functions from public/anon/authenticated.
-- These are invoked exclusively by triggers (run as table owner) and should never be callable via the API.

REVOKE EXECUTE ON FUNCTION public.calculate_answer_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_consent_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_rolling_score_trend() FROM PUBLIC, anon, authenticated;
