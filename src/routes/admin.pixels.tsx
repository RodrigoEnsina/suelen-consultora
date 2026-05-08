import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Target, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";

export const Route = createFileRoute("/admin/pixels")({
  head: () => ({ meta: [{ title: "Pixels — Painel" }, { name: "robots", content: "noindex" }] }),
  component: AdminPixelsPage,
});

type Provider = "meta" | "google_ads" | "ga4" | "gtm";

interface PixelRow {
  provider: Provider;
  pixel_id: string;
  is_active: boolean;
  config: Record<string, string>;
}

const PROVIDERS: { id: Provider; label: string; help: string; placeholder: string }[] = [
  { id: "meta", label: "Meta Pixel (Facebook / Instagram Ads)", help: "ID numérico encontrado no Gerenciador de Eventos do Meta.", placeholder: "1234567890123456" },
  { id: "google_ads", label: "Google Ads", help: "ID começa com AW- (ex.: AW-1234567890). Configure rótulos de conversão abaixo se quiser otimização específica por evento.", placeholder: "AW-1234567890" },
  { id: "ga4", label: "Google Analytics 4", help: "Measurement ID que começa com G- (ex.: G-XXXXXXXXXX).", placeholder: "G-XXXXXXXXXX" },
  { id: "gtm", label: "Google Tag Manager", help: "Container ID começa com GTM- (ex.: GTM-XXXXXXX). Recomendado se você gerencia múltiplas tags.", placeholder: "GTM-XXXXXXX" },
];

const ADS_CONVERSION_EVENTS = ["lead", "cotacao_enviada", "whatsapp_click", "cta_quote_click"] as const;

function AdminPixelsPage() {
  const [rows, setRows] = useState<Record<Provider, PixelRow>>({} as never);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<Provider | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("pixel_settings").select("provider, pixel_id, is_active, config");
      if (error) { toast.error("Erro ao carregar pixels"); setLoading(false); return; }
      const map = {} as Record<Provider, PixelRow>;
      for (const p of PROVIDERS) {
        const found = data?.find((d) => d.provider === p.id);
        map[p.id] = {
          provider: p.id,
          pixel_id: found?.pixel_id ?? "",
          is_active: found?.is_active ?? false,
          config: (found?.config as Record<string, string>) ?? {},
        };
      }
      setRows(map);
      setLoading(false);
    })();
  }, []);

  const update = (provider: Provider, patch: Partial<PixelRow>) =>
    setRows((s) => ({ ...s, [provider]: { ...s[provider], ...patch } }));

  const save = async (provider: Provider) => {
    setSavingId(provider);
    const row = rows[provider];
    const { error } = await supabase
      .from("pixel_settings")
      .upsert(
        { provider, pixel_id: row.pixel_id.trim(), is_active: row.is_active, config: row.config },
        { onConflict: "provider" },
      );
    setSavingId(null);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    toast.success(`${provider.toUpperCase()} salvo`, { description: "As mudanças entram em vigor na próxima visita." });
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pixels & Tracking"
        subtitle="Conecte Meta, Google Ads, GA4 e GTM. Os IDs são públicos por design — apenas administradores podem alterá-los."
      />

      <div className="grid gap-4">
        {PROVIDERS.map((p) => {
          const row = rows[p.id];
          const isAds = p.id === "google_ads";
          return (
            <div key={p.id} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{p.label}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${row.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {row.is_active ? <><Eye className="h-3 w-3" /> Ativo</> : <><EyeOff className="h-3 w-3" /> Inativo</>}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.help}</p>
                </div>
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
                  <input type="checkbox" className="peer sr-only" checked={row.is_active} onChange={(e) => update(p.id, { is_active: e.target.checked })} />
                  <span className="relative h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-primary">
                    <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform peer-checked:translate-x-5" />
                  </span>
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">ID</label>
                  <input
                    value={row.pixel_id}
                    onChange={(e) => update(p.id, { pixel_id: e.target.value })}
                    placeholder={p.placeholder}
                    className="input-base font-mono"
                  />
                </div>
                <button
                  onClick={() => save(p.id)}
                  disabled={savingId === p.id}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {savingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </button>
              </div>

              {isAds && row.is_active && (
                <div className="mt-4 rounded-xl border border-dashed bg-muted/30 p-3">
                  <p className="text-xs font-semibold">Rótulos de conversão (opcional)</p>
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Cole o "Conversion label" de cada ação configurada no Google Ads para que conversões sejam reportadas com precisão.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ADS_CONVERSION_EVENTS.map((evt) => (
                      <label key={evt} className="block">
                        <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">{evt}</span>
                        <input
                          value={row.config[evt] ?? ""}
                          onChange={(e) => update(p.id, { config: { ...row.config, [evt]: e.target.value } })}
                          placeholder="ex.: AbCdEfGhIj-1234"
                          className="input-base font-mono text-xs"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Eventos disparados automaticamente:</strong> page_view, whatsapp_click (FAB e botões), cta_quote_click, funnel_step_view / funnel_step_complete (4 etapas), lead (etapa 1), cotacao_enviada (final).
        Todos são salvos internamente e enviados aos pixels ativos.
      </div>
    </div>
  );
}
