ALTER TABLE public.waitlist_emails
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'hu' CHECK (locale IN ('hu', 'en')),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited')),
  ADD COLUMN IF NOT EXISTS invited_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS invite_code_id uuid REFERENCES public.invite_codes(id) ON DELETE SET NULL;

-- Allow admins to update waitlist entries (mark as invited)
CREATE POLICY "Admins can update waitlist"
ON public.waitlist_emails
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));