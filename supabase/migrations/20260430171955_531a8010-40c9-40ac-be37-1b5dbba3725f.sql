
-- Re-grant anon on create_lead and enrich_lead (needed for public form)
GRANT EXECUTE ON FUNCTION public.create_lead(text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.enrich_lead(uuid, text, text, text, text, text, text) TO anon;
