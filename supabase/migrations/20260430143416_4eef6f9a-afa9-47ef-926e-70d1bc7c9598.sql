CREATE INDEX IF NOT EXISTS idx_leads_created_at_desc ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status_created_at_desc ON public.leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON public.leads (whatsapp);
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON public.leads (lower(email));