
-- 1. Corrigir permissões de execução para as funções de lead
-- Garantir que tanto usuários anônimos (público) quanto autenticados (admin testando) possam executar
GRANT EXECUTE ON FUNCTION public.create_lead(text, text, text, text, text) TO anon, authenticated;

-- Corrigir a assinatura de enrich_lead (tinha 7 args no grant anterior, mas a função tem 8)
GRANT EXECUTE ON FUNCTION public.enrich_lead(uuid, text, text, text, text, text, text, text) TO anon, authenticated;

-- 2. Garantir que anon e authenticated possam inserir eventos de analytics
-- Essencial para rastreamento de pixel e conversão
GRANT INSERT ON TABLE public.analytics_events TO anon, authenticated;

-- 3. Garantir que as tabelas estão na publicação Realtime para o Dashboard
-- (Repetindo por segurança para garantir que o Dashboard atualize sozinho)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END$$;

COMMENT ON FUNCTION public.create_lead IS 'Captura inicial do lead. Permissões corrigidas para anon/authenticated.';
COMMENT ON FUNCTION public.enrich_lead IS 'Enriquecimento dos dados do veículo. Assinatura e permissões corrigidas.';
