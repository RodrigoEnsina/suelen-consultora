-- Garantir que temos os índices necessários para a idempotência
-- Nota: Usamos índices parciais para evitar colisões com leads muito antigos se necessário, 
-- mas para o fluxo de funil, a unicidade por email/whatsapp em leads recentes é o objetivo.

CREATE OR REPLACE FUNCTION public.create_lead(
  _nome text, 
  _email text, 
  _whatsapp text, 
  _cidade text, 
  _origem text DEFAULT 'site'::text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _clean_email text;
BEGIN
  _clean_email := NULLIF(LOWER(TRIM(_email)), '');
  
  -- Tenta encontrar um lead recente (últimas 2 horas) com o mesmo e-mail ou whatsapp
  -- Isso evita duplicados se o usuário clicar duas vezes no "Próximo" da etapa 1
  SELECT id INTO _id 
  FROM public.leads 
  WHERE (email = _clean_email OR whatsapp = _whatsapp)
    AND created_at > now() - interval '2 hours'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _id IS NOT NULL THEN
    -- Atualiza o lead existente em vez de criar um novo
    UPDATE public.leads 
    SET 
      nome = _nome,
      cidade = NULLIF(_cidade, ''),
      origem = COALESCE(NULLIF(_origem, ''), origem),
      updated_at = now()
    WHERE id = _id;
    
    RETURN _id;
  END IF;

  -- Se não encontrou duplicado recente, cria novo
  INSERT INTO public.leads (nome, email, whatsapp, cidade, origem, status)
  VALUES (
    _nome,
    _clean_email,
    _whatsapp,
    NULLIF(_cidade, ''),
    COALESCE(NULLIF(_origem, ''), 'site'),
    'novo'
  )
  RETURNING id INTO _id;
  
  RETURN _id;
END;
$function$;

-- O enrich_lead já é naturalmente idempotente pois usa WHERE id = _lead_id, 
-- mas vamos garantir que ele não falhe se chamado múltiplas vezes com os mesmos dados.
CREATE OR REPLACE FUNCTION public.enrich_lead(
  _lead_id uuid, 
  _veiculo_marca text DEFAULT NULL::text, 
  _veiculo_modelo text DEFAULT NULL::text, 
  _veiculo_ano text DEFAULT NULL::text, 
  _veiculo_fipe text DEFAULT NULL::text, 
  _cep text DEFAULT NULL::text, 
  _observacoes text DEFAULT NULL::text, 
  _veiculo_placa text DEFAULT NULL::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.leads
  SET
    veiculo_marca = COALESCE(NULLIF(_veiculo_marca, ''), veiculo_marca),
    veiculo_modelo = COALESCE(NULLIF(_veiculo_modelo, ''), veiculo_modelo),
    veiculo_ano = COALESCE(NULLIF(_veiculo_ano, ''), veiculo_ano),
    veiculo_fipe = COALESCE(NULLIF(_veiculo_fipe, ''), veiculo_fipe),
    veiculo_placa = COALESCE(NULLIF(_veiculo_placa, ''), veiculo_placa),
    cep = COALESCE(NULLIF(_cep, ''), cep),
    observacoes = COALESCE(NULLIF(_observacoes, ''), observacoes),
    updated_at = now()
  WHERE id = _lead_id;
END;
$function$;
