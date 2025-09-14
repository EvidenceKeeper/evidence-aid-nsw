-- Create user roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'lawyer', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'lawyer' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add user_id and scope to legal documents for user-specific documents
ALTER TABLE public.legal_documents 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'personal'));

-- Add user_id to legal_sections for user-specific content
ALTER TABLE public.legal_sections 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for legal_documents
DROP POLICY IF EXISTS "Legal documents are publicly viewable" ON public.legal_documents;
DROP POLICY IF EXISTS "Only service role can modify legal documents" ON public.legal_documents;

-- New policies for legal documents
CREATE POLICY "Global documents are viewable by all"
ON public.legal_documents
FOR SELECT
TO authenticated
USING (scope = 'global' OR user_id = auth.uid());

CREATE POLICY "Admins and lawyers can create global documents"
ON public.legal_documents
FOR INSERT
TO authenticated
WITH CHECK (
  (scope = 'global' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lawyer')))
  OR (scope = 'personal' AND user_id = auth.uid())
);

CREATE POLICY "Users can create personal documents"
ON public.legal_documents
FOR INSERT
TO authenticated
WITH CHECK (scope = 'personal' AND user_id = auth.uid());

CREATE POLICY "Document owners and admins can update"
ON public.legal_documents
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
  OR (scope = 'global' AND public.has_role(auth.uid(), 'lawyer'))
);

CREATE POLICY "Document owners and admins can delete"
ON public.legal_documents
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);

-- Update RLS policies for legal_sections
DROP POLICY IF EXISTS "Legal sections are publicly viewable" ON public.legal_sections;
DROP POLICY IF EXISTS "Only service role can modify legal sections" ON public.legal_sections;

CREATE POLICY "Sections viewable based on document access"
ON public.legal_sections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.legal_documents ld 
    WHERE ld.id = legal_sections.document_id 
    AND (ld.scope = 'global' OR ld.user_id = auth.uid())
  )
);

CREATE POLICY "Section owners and privileged users can modify"
ON public.legal_sections
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.legal_documents ld 
    WHERE ld.id = legal_sections.document_id 
    AND ld.scope = 'global' 
    AND public.has_role(auth.uid(), 'lawyer')
  )
);

-- Create function to auto-assign user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Trigger to assign default role on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();