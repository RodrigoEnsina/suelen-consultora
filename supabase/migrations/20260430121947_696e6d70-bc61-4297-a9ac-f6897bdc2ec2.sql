CREATE OR REPLACE FUNCTION public.create_lead(
  _nome text,
  _email text,
  _whatsapp text,
  _cidade text,
  _origem text DEFAULT 'site'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.leads (nome, email, whatsapp, cidade, origem, status)
  VALUES (
    _nome,
    NULLIF(_email, ''),
    _whatsapp,
    NULLIF(_cidade, ''),
    COALESCE(NULLIF(_origem, ''), 'site'),
    'novo'
  )
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_lead(text, text, text, text, text) TO anon, authenticated;