-- Create waitlist table for beta signups
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  notes text
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Only admins can view waitlist
CREATE POLICY "Admins can view waitlist"
ON public.waitlist
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can manage waitlist
CREATE POLICY "Admins can manage waitlist"
ON public.waitlist
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Allow anonymous users to insert their email
CREATE POLICY "Anyone can sign up for waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_waitlist_email ON public.waitlist(email);
CREATE INDEX idx_waitlist_created_at ON public.waitlist(created_at DESC);