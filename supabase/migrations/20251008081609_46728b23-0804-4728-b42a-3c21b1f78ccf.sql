-- Fix RLS on audit_log table
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Allow service role and admins to manage audit logs
CREATE POLICY "Service role can manage audit logs"
ON public.audit_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Allow system to insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);