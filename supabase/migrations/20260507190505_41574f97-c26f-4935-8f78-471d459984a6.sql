-- Adiciona a coluna de chave de deduplicação
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deduplication_key TEXT;

-- Cria um índice único para garantir atomicidade
-- Se já existir um lead com a mesma chave, a inserção falhará (ou será tratada pelo ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_deduplication_key ON public.leads (deduplication_key);

-- Atualiza a função para usar abordagem atômica
CREATE OR REPLACE FUNCTION public.create_lead(_nome text, _email text, _whatsapp text, _cidade text, _origem text DEFAULT 'site'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _clean_email text;
  _dedup_key text;
  _now_bucket bigint;
BEGIN
  _clean_email := NULLIF(LOWER(TRIM(_email)), '');
  
  -- Gera uma chave de deduplicação baseada no WhatsApp ou Email 
  -- e um bucket de tempo de 2 horas (7200 segundos)
  -- Isso garante que o mesmo usuário não crie múltiplos leads no mesmo período
  _now_bucket := floor(extract(epoch from now()) / 7200);
  _dedup_key := COALESCE(_whatsapp, _clean_email) || ':' || _now_bucket::text;

  -- Tenta inserir o lead. Se houver conflito na chave de deduplicação (race condition),
  -- ele atualiza o registro existente em vez de criar um novo.
  INSERT INTO public.leads (
    nome, 
    email, 
    whatsapp, 
    cidade, 
    origem, 
    status, 
    deduplication_key
  )
  VALUES (
    _nome,
    _clean_email,
    _whatsapp,
    NULLIF(_cidade, ''),
    COALESCE(NULLIF(_origem, ''), 'site'),
    'novo',
    _dedup_key
  )
  ON CONFLICT (deduplication_key) DO UPDATE 
  SET 
    nome = EXCLUDED.nome,
    cidade = EXCLUDED.cidade,
    origem = EXCLUDED.origem,
    updated_at = now()
  RETURNING id INTO _id;
  
  RETURN _id;
END;
$function$;
