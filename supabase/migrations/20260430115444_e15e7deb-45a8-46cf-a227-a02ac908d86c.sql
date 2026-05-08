CREATE OR REPLACE FUNCTION public.enrich_lead(
  _lead_id uuid,
  _veiculo_marca text DEFAULT NULL,
  _veiculo_modelo text DEFAULT NULL,
  _veiculo_ano text DEFAULT NULL,
  _veiculo_fipe text DEFAULT NULL,
  _cep text DEFAULT NULL,
  _observacoes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
  SET
    veiculo_marca = COALESCE(NULLIF(_veiculo_marca, ''), veiculo_marca),
    veiculo_modelo = COALESCE(NULLIF(_veiculo_modelo, ''), veiculo_modelo),
    veiculo_ano = COALESCE(NULLIF(_veiculo_ano, ''), veiculo_ano),
    veiculo_fipe = COALESCE(NULLIF(_veiculo_fipe, ''), veiculo_fipe),
    cep = COALESCE(NULLIF(_cep, ''), cep),
    observacoes = COALESCE(NULLIF(_observacoes, ''), observacoes),
    updated_at = now()
  WHERE id = _lead_id
    AND created_at > now() - interval '24 hours';
END;
$$;

GRANT EXECUTE ON FUNCTION public.enrich_lead(uuid, text, text, text, text, text, text) TO anon, authenticated;