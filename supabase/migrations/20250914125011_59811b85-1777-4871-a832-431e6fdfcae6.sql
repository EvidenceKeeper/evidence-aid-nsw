-- Create case sharing functionality
CREATE TABLE public.shared_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  shared_with_id UUID NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'comment', 'edit')),
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_cases ENABLE ROW LEVEL SECURITY;

-- Create policies for shared cases
CREATE POLICY "Users can view cases shared with them"
ON public.shared_cases
FOR SELECT
USING (shared_with_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Case owners can manage sharing"
ON public.shared_cases
FOR ALL
USING (owner_id = auth.uid());

-- Create case collaboration log table
CREATE TABLE public.case_collaboration_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_owner_id UUID NOT NULL,
  collaborator_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_collaboration_log ENABLE ROW LEVEL SECURITY;

-- Create policies for collaboration log
CREATE POLICY "Case participants can view collaboration log"
ON public.case_collaboration_log
FOR SELECT
USING (
  case_owner_id = auth.uid() OR 
  collaborator_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM shared_cases sc 
    WHERE sc.owner_id = case_collaboration_log.case_owner_id 
    AND sc.shared_with_id = auth.uid() 
    AND sc.is_active = true
  )
);

CREATE POLICY "Collaborators can insert log entries"
ON public.case_collaboration_log
FOR INSERT
WITH CHECK (collaborator_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_shared_cases_updated_at
BEFORE UPDATE ON public.shared_cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate secure share tokens
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;