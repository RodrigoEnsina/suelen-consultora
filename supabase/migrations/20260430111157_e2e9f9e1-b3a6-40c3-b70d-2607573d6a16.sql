-- Create table for lead contact history entries
CREATE TABLE public.lead_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  kind TEXT NOT NULL DEFAULT 'nota',
  message TEXT NOT NULL,
  next_step TEXT,
  next_step_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_contacts_lead_id ON public.lead_contacts(lead_id, created_at DESC);

ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write the history
CREATE POLICY "Admins can view lead contacts"
ON public.lead_contacts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert lead contacts"
ON public.lead_contacts FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND author_id = auth.uid()
);

CREATE POLICY "Admins can update own lead contacts"
ON public.lead_contacts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND author_id = auth.uid());

CREATE POLICY "Admins can delete lead contacts"
ON public.lead_contacts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER TABLE public.lead_contacts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_contacts;