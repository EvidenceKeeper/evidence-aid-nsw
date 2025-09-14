-- Create lawyer consultation system
CREATE TABLE public.lawyer_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lawyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    case_summary TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, lawyer_id, status) -- Prevent duplicate active consultations
);

-- Enable RLS
ALTER TABLE public.lawyer_consultations ENABLE ROW LEVEL SECURITY;

-- Create consultation messages table for lawyer-user communication
CREATE TABLE public.consultation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES public.lawyer_consultations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'legal_analysis', 'citation', 'recommendation')),
    citations JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for lawyer consultations
CREATE POLICY "Users can view their own consultations"
ON public.lawyer_consultations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = lawyer_id);

CREATE POLICY "Users can create consultation requests"
ON public.lawyer_consultations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Lawyers can update consultation status"
ON public.lawyer_consultations
FOR UPDATE
TO authenticated
USING (auth.uid() = lawyer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all consultations"
ON public.lawyer_consultations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for consultation messages
CREATE POLICY "Consultation participants can view messages"
ON public.consultation_messages
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.lawyer_consultations lc 
        WHERE lc.id = consultation_messages.consultation_id 
        AND (lc.user_id = auth.uid() OR lc.lawyer_id = auth.uid())
    )
);

CREATE POLICY "Consultation participants can send messages"
ON public.consultation_messages
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id 
    AND EXISTS (
        SELECT 1 FROM public.lawyer_consultations lc 
        WHERE lc.id = consultation_messages.consultation_id 
        AND (lc.user_id = auth.uid() OR lc.lawyer_id = auth.uid())
    )
);

-- Add trigger for updated_at on consultations
CREATE TRIGGER update_lawyer_consultations_updated_at
BEFORE UPDATE ON public.lawyer_consultations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();