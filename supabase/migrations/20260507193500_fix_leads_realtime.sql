
-- 1. Restaurar tabelas na publicação Realtime
-- Isso garante que o Dashboard receba notificações de novos registros instantaneamente
DO $$
BEGIN
  -- Adiciona leads se não estiver na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;

  -- Adiciona lead_contacts se não estiver na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'lead_contacts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_contacts;
  END IF;
END$$;

-- 2. Configurar Identidade de Réplica
-- Garante que o payload do Realtime contenha todos os dados da linha em caso de UPDATE
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.lead_contacts REPLICA IDENTITY FULL;

-- 3. Restaurar permissões de execução para usuários anônimos
-- O funil é público, portanto a role 'anon' precisa conseguir chamar a função de criação
GRANT EXECUTE ON FUNCTION public.create_lead(text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.enrich_lead(uuid, text, text, text, text, text, text) TO anon;

-- 4. Garantir permissão de INSERT para analytics
-- Essencial para rastreamento de pixels e conversão
GRANT INSERT ON TABLE public.analytics_events TO anon;

COMMENT ON TABLE public.leads IS 'Tabela de leads com Realtime restaurado para o Dashboard.';
