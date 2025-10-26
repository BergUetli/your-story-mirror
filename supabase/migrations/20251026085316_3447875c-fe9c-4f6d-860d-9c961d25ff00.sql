-- Allow admins to view all user profiles
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
