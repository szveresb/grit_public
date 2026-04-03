-- 1. Add beta_access flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_access BOOLEAN DEFAULT FALSE;

-- 2. Grandfather in all existing users so you aren't locked out of your own platform
UPDATE public.profiles SET beta_access = TRUE WHERE beta_access = FALSE;

-- 3. Create the invite codes table
CREATE TABLE IF NOT EXISTS public.invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    used_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Note: RLS policies for invite_codes
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Admins can manage all codes (assuming 'admin' or 'innovator_admin' logic from user_roles exists, 
-- but a simpler policy is to allow authenticated users who created the code to see it, and anyone to check it via RPC)
CREATE POLICY "Admins can view and generate codes"
ON public.invite_codes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin')
  )
);

-- 4. RPC Function to redeem code securely
CREATE OR REPLACE FUNCTION public.redeem_invite_access(invite_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as elevated privileges so the user can consume the code without direct row update access
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
    WHERE code = invite_code 
      AND is_active = TRUE 
      AND used_by IS NULL
    FOR UPDATE SKIP LOCKED;

    IF found_code_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Mark code as used
    UPDATE public.invite_codes
    SET used_by = v_user_id,
        is_active = FALSE
    WHERE id = found_code_id;

    -- Grant beta access to user
    UPDATE public.profiles
    SET beta_access = TRUE
    WHERE id = v_user_id;

    RETURN TRUE;
END;
$$;
