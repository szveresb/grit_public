-- 1. Block direct writes to questionnaire_score_trends
CREATE POLICY "Block direct inserts on score trends"
ON public.questionnaire_score_trends
FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "Block direct updates on score trends"
ON public.questionnaire_score_trends
FOR UPDATE
TO public
USING (false);

CREATE POLICY "Block direct deletes on score trends"
ON public.questionnaire_score_trends
FOR DELETE
TO public
USING (false);

-- 2. Fix function search_path on check_invite_code
CREATE OR REPLACE FUNCTION public.check_invite_code(invite_code text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.invite_codes 
        WHERE code = UPPER(invite_code) 
          AND is_active = TRUE 
          AND used_by IS NULL
    );
$function$;

-- 3. Fix function search_path on redeem_invite_access
CREATE OR REPLACE FUNCTION public.redeem_invite_access(invite_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    found_code_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT id INTO found_code_id 
    FROM public.invite_codes 
    WHERE code = UPPER(invite_code) 
      AND is_active = TRUE 
      AND used_by IS NULL
    FOR UPDATE SKIP LOCKED;

    IF found_code_id IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE public.invite_codes
    SET used_by = v_user_id,
        is_active = FALSE
    WHERE id = found_code_id;

    UPDATE public.profiles
    SET beta_access = TRUE
    WHERE user_id = v_user_id;

    RETURN TRUE;
END;
$function$;

-- 4. Fix RLS always-true on waitlist_emails INSERT
DROP POLICY IF EXISTS "Anon users can join the waitlist" ON public.waitlist_emails;
CREATE POLICY "Anon users can join the waitlist"
ON public.waitlist_emails
FOR INSERT
TO anon
WITH CHECK (
  email IS NOT NULL 
  AND length(email) <= 320 
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);