import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import type { Lead, LeadStatus } from "@/lib/kanban";
import { LeadCard } from "./LeadCard";

interface Props {
  id: LeadStatus;
  title: string;
  accent: string;
  leads: Lead[];
  onOpenLead?: (lead: Lead) => void;
}

export function KanbanColumn({ id, title, accent, leads, onOpenLead }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col md:w-[320px]">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${accent}`} />
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        <span className="glass inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums text-foreground">
          {leads.length}
        </span>
      </div>

      {/* Drop area */}
      <div
        ref={setNodeRef}
        className={`glass relative flex flex-1 flex-col gap-2.5 overflow-y-auto rounded-2xl p-2.5 transition-colors ${
          isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""
        }`}
        style={{ minHeight: 200, maxHeight: "calc(100vh - 220px)" }}
      >
        <AnimatePresence initial={false}>
          {leads.map((lead) => (
            <motion.div
              key={lead.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <LeadCard lead={lead} onOpen={onOpenLead} />
            </motion.div>
          ))}
        </AnimatePresence>

        {leads.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/80 p-6 text-center">
            <p className="text-xs font-medium text-foreground/60">Sem leads aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}
