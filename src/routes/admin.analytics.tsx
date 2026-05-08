import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, BarChart3, TrendingUp, TrendingDown, Users, MessageCircle, Target, FileCheck2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/admin/PageHeader";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Painel" }, { name: "robots", content: "noindex" }] }),
  component: AdminAnalyticsPage,
});

type Range = 7 | 30 | 90;

interface EventRow {
  event_name: string;
  properties: Record<string, unknown> | null;
  session_id: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
}

const FUNNEL_STEPS = [
  { n: 1, label: "Contato" },
  { n: 2, label: "Veículo" },
  { n: 3, label: "Uso & Perfil" },
  { n: 4, label: "Finalização" },
];

function pct(n: number, d: number) { return d === 0 ? 0 : Math.round((n / d) * 100); }
function delta(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function AdminAnalyticsPage() {
  const [range, setRange] = useState<Range>(30);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [prevEvents, setPrevEvents] = useState<EventRow[]>([]);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      setLoading(true);
      const now = new Date();
      const start = new Date(now.getTime() - range * 86400000);
      const prevStart = new Date(start.getTime() - range * 86400000);

      const [curr, prev] = await Promise.all([
        supabase.from("analytics_events").select("event_name, properties, session_id, utm_source, utm_campaign, created_at")
          .gte("created_at", start.toISOString()).order("created_at", { ascending: false }).limit(10000),
        supabase.from("analytics_events").select("event_name, properties, session_id, utm_source, utm_campaign, created_at")
          .gte("created_at", prevStart.toISOString()).lt("created_at", start.toISOString()).limit(10000),
      ]);
      setEvents((curr.data ?? []) as EventRow[]);
      setPrevEvents((prev.data ?? []) as EventRow[]);
      setLoading(false);
    })();
  }, [range, authLoading, user]);

  const k = useMemo(() => computeKpis(events), [events]);
  const kPrev = useMemo(() => computeKpis(prevEvents), [prevEvents]);
  const funnel = useMemo(() => computeFunnel(events), [events]);
  const waBySource = useMemo(() => groupBy(events.filter((e) => e.event_name === "whatsapp_click"), (e) => String((e.properties as Record<string, unknown> | null)?.source ?? "outros")), [events]);
  const utms = useMemo(() => {
    const leads = events.filter((e) => e.event_name === "lead");
    return groupBy(leads, (e) => e.utm_source || "(direto)");
  }, [events]);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Métricas do funil em tempo real, calculadas a partir dos eventos rastreados no site." />

      <div className="flex gap-2">
        {([7, 30, 90] as Range[]).map((r) => (
          <button key={r} onClick={() => setRange(r)} className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${range === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
            {r} dias
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Users} label="Visitantes únicos" value={k.uniqueSessions} delta={delta(k.uniqueSessions, kPrev.uniqueSessions)} />
            <Kpi icon={Target} label="CTAs de cotação" value={k.ctaClicks} delta={delta(k.ctaClicks, kPrev.ctaClicks)} />
            <Kpi icon={MessageCircle} label="Cliques WhatsApp" value={k.waClicks} delta={delta(k.waClicks, kPrev.waClicks)} />
            <Kpi icon={FileCheck2} label="Cotações finalizadas" value={k.cotacoes} delta={delta(k.cotacoes, kPrev.cotacoes)} />
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h3 className="mb-1 text-base font-semibold">Funil de conversão</h3>
            <p className="mb-4 text-xs text-muted-foreground">Taxa de conclusão por etapa — identifica onde os usuários abandonam.</p>
            <div className="space-y-3">
              {FUNNEL_STEPS.map((s) => {
                const views = funnel.views[s.n] ?? 0;
                const completes = funnel.completes[s.n] ?? 0;
                const rate = pct(completes, views);
                const widthPct = funnel.views[1] ? Math.max(8, Math.round((views / funnel.views[1]) * 100)) : 8;
                return (
                  <div key={s.n}>
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/80 sm:text-[10px]">Etapa {s.n} · {s.label}</span>
                      <span className="text-[9px] font-medium tabular-nums text-muted-foreground sm:text-[10px]">{views} entradas · {completes} concluíram ({rate}%)</span>
                    </div>
                    <div className="h-7 overflow-hidden rounded-lg bg-muted">
                      <div className="h-full bg-gradient-brand" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 rounded-xl bg-muted/50 p-2.5 text-[10px] font-medium leading-relaxed text-muted-foreground ring-1 ring-border/20 sm:p-3 sm:text-[11px]">
                <span className="font-bold text-foreground">Conversão geral:</span> {pct(k.cotacoes, k.uniqueSessions)}% (cotações finalizadas / visitantes)
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <h3 className="mb-3 text-base font-semibold">Cliques no WhatsApp por origem</h3>
              {waBySource.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem cliques no período.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {waBySource.map((g) => (
                    <li key={g.key} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="font-mono text-xs">{g.key}</span>
                      <span className="font-semibold">{g.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <h3 className="mb-3 text-base font-semibold">Top fontes de leads (UTM source)</h3>
              {utms.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem leads no período.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {utms.slice(0, 8).map((g) => (
                    <li key={g.key} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="font-mono text-xs">{g.key}</span>
                      <span className="font-semibold">{g.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, delta: d }: { icon: typeof Users; label: string; value: number; delta: number }) {
  const positive = d >= 0;
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold">{value.toLocaleString("pt-BR")}</span>
        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : ""}{d}%
        </span>
      </div>
    </div>
  );
}

function computeKpis(rows: EventRow[]) {
  const uniqueSessions = new Set(rows.map((r) => r.session_id).filter(Boolean)).size;
  const ctaClicks = rows.filter((r) => r.event_name === "cta_quote_click").length;
  const waClicks = rows.filter((r) => r.event_name === "whatsapp_click").length;
  const leads = rows.filter((r) => r.event_name === "lead").length;
  const cotacoes = rows.filter((r) => r.event_name === "cotacao_enviada").length;
  return { uniqueSessions, ctaClicks, waClicks, leads, cotacoes };
}

function computeFunnel(rows: EventRow[]) {
  const views: Record<number, number> = {};
  const completes: Record<number, number> = {};
  // Etapa 1 = visitas únicas que chegaram em /cotacao
  views[1] = new Set(rows.filter((r) => r.event_name === "page_view" && (r.properties as Record<string, unknown> | null)?.path === "/cotacao").map((r) => r.session_id)).size;
  for (const r of rows) {
    const step = Number((r.properties as Record<string, unknown> | null)?.step ?? 0);
    if (!step) continue;
    if (r.event_name === "funnel_step_view") views[step] = (views[step] ?? 0) + 1;
    if (r.event_name === "funnel_step_complete") completes[step] = (completes[step] ?? 0) + 1;
  }
  // Etapa 1 não tem funnel_step_view emitido (entrada implícita), usa visits
  completes[1] = completes[1] ?? rows.filter((r) => r.event_name === "lead").length;
  return { views, completes };
}

function groupBy<T>(rows: T[], key: (r: T) => string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}
