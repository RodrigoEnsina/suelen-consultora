/**
 * Sistema unificado de tracking de pixels.
 * - Lê configurações da tabela `pixel_settings` (Meta, Google Ads, GA4, GTM).
 * - Carrega cada script dinamicamente quando ativo.
 * - Persiste todo evento em `analytics_events` (Supabase) para KPIs internos.
 * - Mantém um session_id por aba e captura UTMs uma única vez.
 */

import { supabase } from "@/integrations/supabase/client";

type Provider = "meta" | "google_ads" | "ga4" | "gtm";

interface PixelConfig {
  provider: Provider;
  pixel_id: string;
  is_active: boolean;
  config: Record<string, unknown>;
}

interface UTMs {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}

type AnyFn = (...args: unknown[]) => void;
declare global {
  interface Window {
    fbq?: AnyFn;
    _fbq?: unknown;
    gtag?: AnyFn;
    dataLayer?: unknown[];
  }
}

const STORAGE_SESSION = "tracking-session-id";
const STORAGE_UTMS = "tracking-utms";

let pixelsLoaded = false;
let activePixels: PixelConfig[] = [];
let loadingPromise: Promise<void> | null = null;

/* ------------------------- Sessão & UTMs ------------------------- */

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(STORAGE_SESSION);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(STORAGE_SESSION, id);
  }
  return id;
}

function captureUTMs(): UTMs {
  if (typeof window === "undefined") return {};
  // Persistente: mantém UTMs da primeira visita até trocar de aba.
  const existing = sessionStorage.getItem(STORAGE_UTMS);
  const url = new URL(window.location.href);
  const fresh: UTMs = {
    utm_source: url.searchParams.get("utm_source"),
    utm_medium: url.searchParams.get("utm_medium"),
    utm_campaign: url.searchParams.get("utm_campaign"),
    utm_content: url.searchParams.get("utm_content"),
    utm_term: url.searchParams.get("utm_term"),
  };
  const hasFresh = Object.values(fresh).some(Boolean);
  if (hasFresh) {
    sessionStorage.setItem(STORAGE_UTMS, JSON.stringify(fresh));
    return fresh;
  }
  if (existing) {
    try { return JSON.parse(existing) as UTMs; } catch { /* noop */ }
  }
  return {};
}

/* ------------------------- Loaders por provedor ------------------------- */

function loadMeta(pixelId: string) {
  if (!pixelId || window.fbq) return;
  /* eslint-disable */
  // @ts-ignore
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  (window.fbq as AnyFn | undefined)?.("init", pixelId);
  (window.fbq as AnyFn | undefined)?.("track", "PageView");
}

function loadGtag(tagId: string) {
  if (!tagId) return;
  if (!document.getElementById(`gtag-src-${tagId}`)) {
    const s = document.createElement("script");
    s.id = `gtag-src-${tagId}`;
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${tagId}`;
    document.head.appendChild(s);
  }
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) { (window.dataLayer as unknown[]).push(args); };
  }
  (window.gtag as AnyFn)("js", new Date());
  (window.gtag as AnyFn)("config", tagId);
}

function loadGTM(containerId: string) {
  if (!containerId || document.getElementById("gtm-script")) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.id = "gtm-script";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  document.head.appendChild(s);
}

/* ------------------------- Init ------------------------- */

export async function initTracking(): Promise<void> {
  if (typeof window === "undefined") return;
  if (pixelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("pixel_settings")
        .select("provider, pixel_id, is_active, config")
        .eq("is_active", true);
      if (error) throw error;

      activePixels = (data ?? []).filter((p) => p.pixel_id && p.pixel_id.trim().length > 0) as PixelConfig[];

      for (const pixel of activePixels) {
        try {
          if (pixel.provider === "meta") loadMeta(pixel.pixel_id);
          else if (pixel.provider === "ga4") loadGtag(pixel.pixel_id);
          else if (pixel.provider === "google_ads") loadGtag(pixel.pixel_id);
          else if (pixel.provider === "gtm") loadGTM(pixel.pixel_id);
        } catch (err) {
          console.warn(`[tracking] failed loading ${pixel.provider}`, err);
        }
      }
      pixelsLoaded = true;
    } catch (err) {
      console.warn("[tracking] init failed", err);
    }
  })();

  return loadingPromise;
}

/* ------------------------- Mapeamento de eventos ------------------------- */

const META_EVENT_MAP: Record<string, string> = {
  page_view: "PageView",
  whatsapp_click: "Contact",
  cta_quote_click: "InitiateCheckout",
  funnel_step_view: "ViewContent",
  funnel_step_complete: "AddToCart",
  lead: "Lead",
  cotacao_enviada: "CompleteRegistration",
};

/* ------------------------- API pública ------------------------- */

export interface TrackProps {
  /** Propriedades extras do evento (ex.: { source: 'fab', step: 2 }) */
  [key: string]: unknown;
}

/**
 * Dispara um evento em todos os pixels ativos + persiste no banco.
 * Não bloqueia a UI (fire-and-forget).
 */
export function track(eventName: string, props: TrackProps = {}, leadId?: string): void {
  if (typeof window === "undefined") return;

  // Garante init (no-op se já carregado)
  void initTracking();

  // 1) Pixels externos
  try {
    const metaName = META_EVENT_MAP[eventName] ?? "CustomEvent";
    if (window.fbq) window.fbq("track", metaName, props);

    if (window.gtag) {
      window.gtag("event", eventName, props);
      // Google Ads conversions: dispara apenas se configurado para esse evento
      const adsPixel = activePixels.find((p) => p.provider === "google_ads");
      const conversionMap = (adsPixel?.config as Record<string, string> | undefined) ?? {};
      const conversionLabel = conversionMap[eventName];
      if (adsPixel?.pixel_id && conversionLabel) {
        window.gtag("event", "conversion", {
          send_to: `${adsPixel.pixel_id}/${conversionLabel}`,
          ...props,
        });
      }
    }

    if (window.dataLayer) {
      window.dataLayer.push({ event: eventName, ...props });
    }
  } catch (err) {
    console.warn("[tracking] external dispatch failed", err);
  }

  // 2) Persistência interna
  void persistEvent(eventName, props, leadId);
}

async function persistEvent(eventName: string, props: TrackProps, leadId?: string) {
  try {
    const utms = captureUTMs();
    await supabase.from("analytics_events").insert({
      event_name: eventName,
      properties: props as never,
      session_id: getSessionId(),
      page_path: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      utm_source: utms.utm_source ?? null,
      utm_medium: utms.utm_medium ?? null,
      utm_campaign: utms.utm_campaign ?? null,
      utm_content: utms.utm_content ?? null,
      utm_term: utms.utm_term ?? null,
      lead_id: leadId ?? null,
    });
  } catch (err) {
    console.warn("[tracking] persist failed", err);
  }
}

export function trackPageView(path?: string) {
  track("page_view", { path: path ?? window.location.pathname });
}
