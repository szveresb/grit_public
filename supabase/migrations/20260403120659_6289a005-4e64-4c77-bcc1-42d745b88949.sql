
-- Add email format validation
ALTER TABLE public.waitlist_emails
ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$');

-- Add uniqueness constraint
ALTER TABLE public.waitlist_emails
ADD CONSTRAINT unique_waitlist_email UNIQUE (email);

-- Replace the overly permissive INSERT policy with one restricted to anon only
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.waitlist_emails;

CREATE POLICY "Anon users can join the waitlist"
ON public.waitlist_emails
FOR INSERT
TO anon
WITH CHECK (true);
