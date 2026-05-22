-- Prevent users from self-elevating premium/beta_access/consent_completed via direct profile UPDATE.
-- Service role bypasses RLS and triggers running as SECURITY DEFINER (e.g. redeem_invite_access) are unaffected.

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to change anything
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Block changes to privileged columns by regular users
  IF NEW.premium IS DISTINCT FROM OLD.premium THEN
    RAISE EXCEPTION 'Not allowed to modify premium flag' USING ERRCODE = '42501';
  END IF;
  IF NEW.beta_access IS DISTINCT FROM OLD.beta_access THEN
    RAISE EXCEPTION 'Not allowed to modify beta_access flag' USING ERRCODE = '42501';
  END IF;
  IF NEW.consent_completed IS DISTINCT FROM OLD.consent_completed THEN
    RAISE EXCEPTION 'Not allowed to modify consent_completed flag' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;

CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- Tighten the UPDATE policy with an explicit WITH CHECK so the new row must still belong to the caller.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);