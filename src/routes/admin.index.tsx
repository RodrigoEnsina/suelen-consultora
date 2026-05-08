import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ArrowRight,
  Loader2,
  RefreshCw,
  Activity,
  Sparkles,
  Bug,
  Code,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminLeads, useAdminLeadsRealtime } from "@/hooks/useAdminLeads";
import { KANBAN_COLUMNS, STATUS_LABEL, type LeadStatus } from "@/lib/kanban";
import { PageHeader } from "@/components/admin/PageHeader";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nexus CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardPage,
});

function trendPct(current: number, previous: number): { value: number; up: boolean } {
  if (previous === 0) {
    if (current === 0) return { value: 0, up: true };
    return { value: 100, up: true };
  }
  const v = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(v), up: v >= 0 };
}

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const leadsEnabled = !authLoading && !!user;
  const { leads, loading, syncing, refresh } = useAdminLeads({ enabled: leadsEnabled });
  useAdminLeadsRealtime(leadsEnabled);
  const [showDebug, setShowDebug] = useState(false);

  const fetchLeads = (showToast = false) =>
    refresh({ showToast, successMessage: "Dashboard atualizado", errorMessage: "Erro ao carregar dados" });

  const stats = useMemo(() => {
    const total = leads.length;
    const fechado = leads.filter((l) => l.status === "fechado").length;
    const ativos = leads.filter((l) => !["fechado", "perdido"].includes(l.status)).length;
    const conversao = total > 0 ? Math.round((fechado / total) * 100) : 0;

    const now = Date.now();
    const day = 86400000;
    const last7 = leads.filter((l) => now - new Date(l.created_at).getTime() < 7 * day).length;
    const prev7 = leads.filter((l) => {
      const t = now - new Date(l.created_at).getTime();
      return t >= 7 * day && t < 14 * day;
    }).length;
    const fechado7 = leads.filter(
      (l) => l.status === "fechado" && now - new Date(l.created_at).getTime() < 7 * day,
    ).length;
    const fechadoPrev7 = leads.filter(
      (l) =>
        l.status === "fechado" &&
        now - new Date(l.created_at).getTime() >= 7 * day &&
        now - new Date(l.created_at).getTime() < 14 * day,
    ).length;
    const ativos7 = leads.filter(
      (l) =>
        !["fechado", "perdido"].includes(l.status) &&
        now - new Date(l.created_at).getTime() < 7 * day,
    ).length;
    const ativosPrev7 = leads.filter(
      (l) =>
        !["fechado", "perdido"].includes(l.status) &&
        now - new Date(l.created_at).getTime() >= 7 * day &&
        now - new Date(l.created_at).getTime() < 14 * day,
    ).length;

    const byStatus: Record<LeadStatus, number> = {
      novo: 0,
      contatado: 0,
      cotacao_enviada: 0,
      fechado: 0,
      perdido: 0,
    };
    for (const l of leads) byStatus[l.status]++;

    // Origem
    const byOrigem = leads.reduce<Record<string, number>>((acc, l) => {
      const k = l.origem || "—";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

    // Daily trend (14 dias)
    const trend: { day: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const start = now - (i + 1) * day;
      const end = now - i * day;
      const count = leads.filter((l) => {
        const t = new Date(l.created_at).getTime();
        return t >= start && t < end;
      }).length;
      trend.push({
        day: new Date(end).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        count,
      });
    }

    return {
      total,
      fechado,
      ativos,
      conversao,
      last7,
      prev7,
      fechado7,
      fechadoPrev7,
      ativos7,
      ativosPrev7,
      byStatus,
      byOrigem,
      trend,
    };
  }, [leads]);

  const cards = [
    {
      label: "Total de leads",
      value: stats.total,
      icon: Users,
      accent: "from-blue-500 to-cyan-400",
      trend: trendPct(stats.last7, stats.prev7),
      hint: "vs. semana anterior",
    },
    {
      label: "Em pipeline",
      value: stats.ativos,
      icon: Activity,
      accent: "from-violet-500 to-purple-400",
      trend: trendPct(stats.ativos7, stats.ativosPrev7),
      hint: "ativos esta semana",
    },
    {
      label: "Fechados",
      value: stats.fechado,
      icon: CheckCircle2,
      accent: "from-emerald-500 to-teal-400",
      trend: trendPct(stats.fechado7, stats.fechadoPrev7),
      hint: "fechados em 7 dias",
    },
    {
      label: "Taxa de conversão",
      value: `${stats.conversao}%`,
      icon: TrendingUp,
      accent: "from-fuchsia-500 to-pink-400",
      trend: { value: stats.conversao, up: stats.conversao > 0 },
      hint: "fechados / total",
    },
  ];

  const maxByStatus = Math.max(1, ...Object.values(stats.byStatus));
  const recent = leads.slice(0, 6);
  const maxTrend = Math.max(1, ...stats.trend.map((d) => d.count));
  const origemEntries = Object.entries(stats.byOrigem).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxOrigem = Math.max(1, ...origemEntries.map(([, v]) => v));

  return (
    <div className="bg-background relative min-h-screen">
      <div className="aura-bg pointer-events-none absolute inset-0 opacity-30" />

      <PageHeader
        title="Olá,"
        highlight="Suelen"
        emoji="👋"
        subtitle={`${stats.last7} novos leads nos últimos 7 dias · ${stats.ativos} no pipeline`}
        breadcrumbs={[{ label: "Painel" }, { label: "Dashboard" }]}
        actions={
          <>
            <Link
              to="/admin/kanban"
              className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors hover:bg-accent"
            >
              Abrir funil
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={() => fetchLeads(true)}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.04] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="relative px-4 py-6 sm:px-6 md:px-8">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {cards.map((c, i) => {
              const TrendIcon = c.trend.up ? TrendingUp : TrendingDown;
              return (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="glass group relative overflow-hidden rounded-2xl p-4 sm:p-5"
                >
                  <div
                    className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${c.accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`}
                  />
                  <div className="relative flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                        {c.label}
                      </p>
                      <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                        {c.value}
                      </p>
                    </div>
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent} text-white shadow-lg shadow-black/20`}
                    >
                      <c.icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="relative mt-4 flex items-center gap-2 text-[10px]">
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-bold ${
                        c.trend.up
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      <TrendIcon className="h-3 w-3" />
                      {c.trend.value}%
                    </span>
                    <span className="truncate text-foreground/70">{c.hint}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Trend chart + Distribution */}
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            {/* Trend (sparkline-bars) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
              className="glass rounded-2xl p-5 lg:col-span-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold tracking-tight">
                    Captação dos últimos 14 dias
                  </h2>
                  <p className="text-[10px] text-muted-foreground/80">
                    Total no período: {stats.trend.reduce((a, b) => a + b.count, 0)} leads
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold text-primary shadow-sm ring-1 ring-primary/20 backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
                  </span>
                  realtime
                </span>
              </div>
              <div className="mt-7 flex h-44 items-end gap-1.5 sm:gap-2">
                {stats.trend.map((d, i) => {
                  const h = Math.max(4, (d.count / maxTrend) * 100);
                  return (
                    <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
                      <div className="absolute -top-6 hidden scale-90 rounded-md bg-foreground px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-background transition-all group-hover:block">
                        {d.count}
                      </div>
                      <motion.span
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.02, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full rounded-t-lg bg-gradient-to-t from-primary/30 via-primary/80 to-primary transition-all duration-300 group-hover:from-primary group-hover:to-[oklch(0.85_0.15_290)] group-hover:shadow-[0_0_12px_rgba(155,92,246,0.4)]"
                        style={{ minHeight: 4 }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between px-1 text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                <span>{stats.trend[0]?.day}</span>
                <span>{stats.trend[Math.floor(stats.trend.length / 2)]?.day}</span>
                <span>{stats.trend[stats.trend.length - 1]?.day}</span>
              </div>
            </motion.div>

            {/* Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.4 }}
              className="glass rounded-2xl p-5 lg:col-span-2"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold tracking-tight">Por estágio</h2>
                <Link to="/admin/kanban" className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:opacity-80 transition-opacity">
                  Funil <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-5 space-y-4">
                {KANBAN_COLUMNS.map((col) => {
                  const value = stats.byStatus[col.id];
                  const pct = (value / maxByStatus) * 100;
                  return (
                    <div key={col.id} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-foreground/80">
                          <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${col.accent} shadow-sm ring-1 ring-white/10`} />
                          {col.title}
                        </span>
                        <span className="text-[11px] font-bold tabular-nums text-foreground">{value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/50 ring-1 ring-slate-300/30">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          className={`h-full rounded-full bg-gradient-to-r ${col.accent} shadow-[0_0_10px_rgba(0,0,0,0.15)] group-hover:brightness-110 transition-all`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Origem + Recentes */}
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.4 }}
              className="glass rounded-2xl p-5 lg:col-span-2"
            >
              <h2 className="font-display text-base font-bold tracking-tight">Origem dos leads</h2>
              <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mt-0.5">Top canais de captação</p>
              <div className="mt-5 space-y-4">
                {origemEntries.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-[11px] text-muted-foreground/60 italic">
                    Sem dados de origem para exibir.
                  </div>
                )}
                {origemEntries.map(([origem, count]) => {
                  const pct = (count / maxOrigem) * 100;
                  return (
                    <div key={origem} className="group">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold capitalize text-foreground/90">{origem}</span>
                        <span className="tabular-nums font-bold text-muted-foreground/80">{count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-gradient-brand shadow-sm group-hover:brightness-110 transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="glass rounded-2xl p-5 lg:col-span-3"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-bold tracking-tight">Leads recentes</h2>
                <Link
                  to="/admin/leads"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:opacity-80 transition-opacity"
                >
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <ul className="space-y-1">
                {recent.length === 0 && (
                  <li className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-[11px] text-muted-foreground/60 italic">
                    Nenhum lead capturado recentemente.
                  </li>
                )}
                {recent.map((l) => (
                  <li
                    key={l.id}
                    className="group flex items-center justify-between gap-3 rounded-xl p-2.5 transition-all hover:bg-slate-100/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-primary-foreground shadow-sm group-hover:scale-110 transition-transform">
                        {l.nome
                          .split(" ")
                          .map((p) => p[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground/90">{l.nome}</p>
                        <p className="truncate text-[11px] text-muted-foreground/70">
                          {[l.veiculo_marca, l.veiculo_modelo].filter(Boolean).join(" ") || l.whatsapp}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="hidden text-[10px] font-medium tabular-nums text-muted-foreground/50 sm:inline">
                        {new Date(l.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-foreground/70 group-hover:border-primary/30 group-hover:text-primary transition-colors">
                        {STATUS_LABEL[l.status]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>


          {/* Painel de Debug */}
          <div className="mt-8 mb-12">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              <Bug className="h-3 w-3" />
              {showDebug ? "Ocultar Debug" : "Mostrar Debug das Métricas"}
              <ChevronDown className={`h-3 w-3 transition-transform ${showDebug ? "rotate-180" : ""}`} />
            </button>

            {showDebug && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 overflow-hidden rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-6"
              >
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <Code className="h-4 w-4" />
                  <h3 className="text-sm font-bold">Raw Analytics Data</h3>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Volume Geral</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span>Leads no Banco:</span> <span className="font-mono font-bold text-primary">{leads.length}</span></div>
                      <div className="flex justify-between"><span>Stats Total:</span> <span className="font-mono font-bold text-primary">{stats.total}</span></div>
                      <div className="flex justify-between"><span>Fechados (Total):</span> <span className="font-mono font-bold text-primary">{stats.fechado}</span></div>
                      <div className="flex justify-between"><span>Ativos (Pipeline):</span> <span className="font-mono font-bold text-primary">{stats.ativos}</span></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Janelas de Tempo (7d)</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span>Atual (Últimos 7d):</span> <span className="font-mono font-bold text-primary">{stats.last7}</span></div>
                      <div className="flex justify-between"><span>Anterior (8d - 14d):</span> <span className="font-mono font-bold text-primary">{stats.prev7}</span></div>
                      <div className="flex justify-between"><span>Conversões Atual:</span> <span className="font-mono font-bold text-primary">{stats.fechado7}</span></div>
                      <div className="flex justify-between"><span>Ativos Atual:</span> <span className="font-mono font-bold text-primary">{stats.ativos7}</span></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Status Distribution</p>
                    <div className="space-y-1 text-xs font-mono">
                      {Object.entries(stats.byStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between">
                          <span className="capitalize">{status}:</span>
                          <span className="font-bold text-primary">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-primary/10">
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="text-muted-foreground">Cálculo de Conversão:</span>
                    <span className="font-mono bg-primary/10 px-2 py-1 rounded">
                      ({stats.fechado} fechados / {stats.total} total) * 100 = {stats.conversao}%
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
