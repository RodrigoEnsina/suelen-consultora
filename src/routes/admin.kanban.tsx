import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminLeads, useAdminLeadsRealtime } from "@/hooks/useAdminLeads";
import { KANBAN_COLUMNS, STATUS_LABEL, type Lead, type LeadStatus } from "@/lib/kanban";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { LeadCard } from "@/components/kanban/LeadCard";
import { LeadDetailModal } from "@/components/leads/LeadDetailModal";
import { PageHeader } from "@/components/admin/PageHeader";

export const Route = createFileRoute("/admin/kanban")({
  head: () => ({
    meta: [
      { title: "Funil Kanban — Nexus CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: KanbanPage,
});

function KanbanPage() {
  const { user, loading: authLoading } = useAuth();
  const leadsEnabled = !authLoading && !!user;
  const { leads, loading, syncing, refresh, setLeads } = useAdminLeads({ enabled: leadsEnabled });
  useAdminLeadsRealtime(leadsEnabled);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const fetchLeads = (showToast = false) =>
    refresh({ showToast, successMessage: "Leads atualizados", errorMessage: "Erro ao carregar leads" });

  const grouped = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = {
      novo: [], contatado: [], cotacao_enviada: [], fechado: [], perdido: [],
    };
    for (const lead of leads) map[lead.status].push(lead);
    return map;
  }, [leads]);

  const handleDragStart = (e: DragStartEvent) => {
    const lead = leads.find((l) => l.id === e.active.id);
    setActiveLead(lead ?? null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = e;
    if (!over) return;

    const lead = leads.find((l) => l.id === active.id);
    if (!lead) return;

    const newStatus = over.id as LeadStatus;
    if (!KANBAN_COLUMNS.find((c) => c.id === newStatus)) return;
    if (lead.status === newStatus) return;

    // Optimistic update
    const previous = leads;
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: newStatus } : l)),
    );

    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", lead.id);

    if (error) {
      setLeads(previous);
      toast.error("Falha ao atualizar status");
    } else {
      toast.success(`${lead.nome} → ${STATUS_LABEL[newStatus]}`);
    }
  };

  return (
    <div className="relative min-h-screen">
      <PageHeader
        title="Funil de"
        highlight="Vendas"
        subtitle={`${leads.length} ${leads.length === 1 ? "lead" : "leads"} no pipeline · arraste cards entre colunas`}
        breadcrumbs={[{ label: "Painel" }, { label: "Gestão" }, { label: "Funil Kanban" }]}
        actions={
          <button
            onClick={() => fetchLeads(true)}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.04] disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Desktop: horizontal scroll. Mobile: vertical stack */}
          <div className="px-4 py-6 sm:px-6">
            <div className="scrollbar-thin flex flex-col gap-6 md:flex-row md:gap-5 md:overflow-x-auto md:pb-4">
              {KANBAN_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  accent={col.accent}
                  leads={grouped[col.id]}
                  onOpenLead={setSelected}
                />
              ))}
            </div>
          </div>

          <DragOverlay
            dropAnimation={{
              duration: 250,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <LeadDetailModal
        lead={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSaved={(updated) =>
          setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
        }
        onDeleted={(id) => setLeads((prev) => prev.filter((l) => l.id !== id))}
      />
    </div>
  );
}
