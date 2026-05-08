-- Criar função RPC para verificação segura de existência de leads pelo cliente
CREATE OR REPLACE FUNCTION public.verify_lead_exists(p_lead_id uuid)
RETURNS TABLE (
  exists boolean,
  status text,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as exists,
    l.status,
    l.created_at
  FROM public.leads l
  WHERE l.id = p_lead_id;
  
  -- Se não encontrar nada, o retorno será vazio (que o JS interpreta como array vazio)
END;
$$;

-- Garantir permissões de execução para anon e authenticated
GRANT EXECUTE ON FUNCTION public.verify_lead_exists(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_lead_exists(uuid) TO authenticated;
