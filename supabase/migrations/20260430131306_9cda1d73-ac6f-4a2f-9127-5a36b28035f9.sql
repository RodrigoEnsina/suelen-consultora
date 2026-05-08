-- =========================================
-- PIXEL SETTINGS
-- =========================================
CREATE TABLE public.pixel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('meta', 'google_ads', 'ga4', 'gtm')),
  pixel_id text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (provider)
);

ALTER TABLE public.pixel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read pixel settings"
  ON public.pixel_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert pixel settings"
  ON public.pixel_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pixel settings"
  ON public.pixel_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete pixel settings"
  ON public.pixel_settings FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER pixel_settings_set_updated_at
  BEFORE UPDATE ON public.pixel_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pixel_settings (provider, pixel_id, is_active) VALUES
  ('meta', '', false),
  ('google_ads', '', false),
  ('ga4', '', false),
  ('gtm', '', false);

-- =========================================
-- ANALYTICS EVENTS
-- =========================================
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_id text,
  page_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  lead_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analytics_events_created_at_idx ON public.analytics_events (created_at DESC);
CREATE INDEX analytics_events_event_name_idx ON public.analytics_events (event_name);
CREATE INDEX analytics_events_session_idx ON public.analytics_events (session_id);
CREATE INDEX analytics_events_utm_source_idx ON public.analytics_events (utm_source);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view analytics events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete analytics events"
  ON public.analytics_events FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));