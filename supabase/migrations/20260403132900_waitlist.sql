CREATE TABLE IF NOT EXISTS public.waitlist_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.waitlist_emails ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert into the waitlist
CREATE POLICY "Anyone can join the waitlist"
ON public.waitlist_emails
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read the waitlist
CREATE POLICY "Admins can view waitlist"
ON public.waitlist_emails
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin')
  )
);
