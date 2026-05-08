-- Tabela de configurações gerais do app (chave/valor)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública (necessário para o funil de cotação obter o WhatsApp de destino)
CREATE POLICY "Public can read app settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Apenas admins podem inserir
CREATE POLICY "Admins can insert app settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem atualizar
CREATE POLICY "Admins can update app settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed do WhatsApp da consultora
INSERT INTO public.app_settings (key, value)
VALUES ('whatsapp_number', '5541998532879')
ON CONFLICT (key) DO NOTHING;

-- Habilita realtime para que mudanças apareçam em tempo real no funil
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;