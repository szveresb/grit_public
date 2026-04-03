-- 1. Drop the problematic foreign keys and recreated the invite_codes table correctly
-- We'll just recreate the logic to ensure absolute accuracy.

-- Drop any existing RPC to ensure update
DROP FUNCTION IF EXISTS public.redeem_invite_access(TEXT);

-- Recreate the invite_codes table referencing auth.users(id) instead of profiles(id)
-- Note: Doing this cleanly to avoid data mismatch issues during beta.
DROP TABLE IF EXISTS public.invite_codes;

CREATE TABLE public.invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL, -- Direct reference to auth user
    used_by UUID REFERENCES auth.users(id),            -- Direct reference to auth user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- RLS policies for invite_codes
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view and generate codes"
ON public.invite_codes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin')
  )
);

-- 2. Corrected RPC Function to redeem code securely using auth.uid() vs profile table user_id
CREATE OR REPLACE FUNCTION public.redeem_invite_access(invite_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
    found_code_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Look for a matching, active, unused code
    SELECT id INTO found_code_id 
    FROM public.invite_codes 
    WHERE code = UPPER(invite_code) 
      AND is_active = TRUE 
      AND used_by IS NULL
    FOR UPDATE SKIP LOCKED;

    IF found_code_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Mark code as used by the auth user
    UPDATE public.invite_codes
    SET used_by = v_user_id,
        is_active = FALSE
    WHERE id = found_code_id;

    -- Grant beta access to user in profiles
    UPDATE public.profiles
    SET beta_access = TRUE
    WHERE user_id = v_user_id; -- CORRECTED: use user_id column which maps to auth.uid()

    RETURN TRUE;
END;
$$;
