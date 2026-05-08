-- Função para gerar a chave de deduplicação automaticamente
CREATE OR REPLACE FUNCTION public.generate_lead_deduplication_key()
RETURNS TRIGGER AS $$
BEGIN
  -- Só gera se não foi fornecida manualmente
  IF NEW.deduplication_key IS NULL THEN
    -- Usa WhatsApp (preferencial) ou Email, com um bucket de 2 horas
    NEW.deduplication_key := COALESCE(NEW.whatsapp, NEW.email) || ':' || (floor(extract(epoch from now()) / 7200))::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para garantir que toda inserção tenha uma chave de deduplicação
DROP TRIGGER IF EXISTS tr_leads_deduplication_key ON public.leads;
CREATE TRIGGER tr_leads_deduplication_key
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.generate_lead_deduplication_key();

-- Garante que o índice único existe (já criado na anterior, mas reforçando)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_deduplication_key ON public.leads (deduplication_key);
