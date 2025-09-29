-- Create security definer function for getting user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create RLS policy for question approval updates
CREATE POLICY "allow_question_approval_updates" 
ON public.questions 
FOR UPDATE 
USING (
  -- Allow if user is admin or teacher who created the question
  public.get_current_user_role() = 'admin' OR 
  (public.get_current_user_role() = 'teacher' AND created_by = auth.uid()::text)
);

-- Also allow admins to approve any question regardless of creator
CREATE POLICY "admins_can_approve_any_question"
ON public.questions
FOR UPDATE
USING (public.get_current_user_role() = 'admin');