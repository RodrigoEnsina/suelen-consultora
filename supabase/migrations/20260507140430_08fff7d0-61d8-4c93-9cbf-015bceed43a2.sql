-- Remove a versão sobrecarregada da função para evitar ambiguidade no PostgREST
DROP FUNCTION IF EXISTS public.enrich_lead(uuid, text, text, text, text, text, text);

-- Garante que a versão correta (8 argumentos) tenha as permissões necessárias
GRANT EXECUTE ON FUNCTION public.enrich_lead(uuid, text, text, text, text, text, text, text) TO anon, authenticated;

-- Garante permissão para create_lead também
GRANT EXECUTE ON FUNCTION public.create_lead(text, text, text, text, text) TO anon, authenticated;

-- Garante que a tabela leads aceite inserções do role anon (fallback caso o RPC falhe)
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead" ON public.leads
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Garante que o role anon possa ver a tabela (necessário para alguns tipos de verificação se não usar admin)
-- No entanto, verifyLeadPersisted já usa admin, então não deve ser o problema.
