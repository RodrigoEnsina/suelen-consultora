import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Car, Calendar, Sparkles, Phone, CheckCircle2, XCircle, Send } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/kanban";

const statusIcon: Record<LeadStatus, typeof Sparkles> = {
  novo: Sparkles,
  contatado: Phone,
  cotacao_enviada: Send,
  fechado: CheckCircle2,
  perdido: XCircle,
};

const statusColor: Record<LeadStatus, string> = {
  novo: "text-blue-500",
  contatado: "text-violet-500",
  cotacao_enviada: "text-fuchsia-500",
  fechado: "text-emerald-500",
  perdido: "text-rose-500",
};

interface Props {
  lead: Lead;
  isOverlay?: boolean;
  onOpen?: (lead: Lead) => void;
}

export function LeadCard({ lead, isOverlay, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
    disabled: isOverlay,
  });

  const Icon = statusIcon[lead.status];
  const color = statusColor[lead.status];

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging && !isOverlay ? 0 : 1,
  };

  const veiculo = [lead.veiculo_marca, lead.veiculo_modelo].filter(Boolean).join(" ") || "Veículo não informado";

  const date = new Date(lead.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`glass group relative cursor-grab touch-none rounded-2xl border border-border/60 bg-card/80 p-4 shadow-card transition-shadow hover:shadow-elevated active:cursor-grabbing ${
        isOverlay ? "rotate-3 scale-105 shadow-elevated ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="truncate text-sm font-semibold tracking-tight">{lead.nome}</h4>
        <span className={`shrink-0 ${color}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-foreground/90">
        <Car className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
        <span className="truncate font-medium">
          {veiculo}
          {lead.veiculo_ano ? ` · ${lead.veiculo_ano}` : ""}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/80 font-medium">
          <Calendar className="h-3 w-3 text-foreground/60" />
          {date}
        </div>
        {lead.whatsapp && (
          <span className="truncate text-[11px] font-bold text-foreground">{lead.whatsapp}</span>
        )}
      </div>

      {onOpen && !isOverlay && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(lead);
          }}
          className="absolute inset-x-0 bottom-0 rounded-b-2xl border-t border-border/40 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 py-1.5 text-[10px] font-semibold text-primary opacity-0 transition-opacity hover:from-primary/10 hover:to-primary/10 group-hover:opacity-100"
        >
          Ver detalhes
        </button>
      )}
    </article>
  );
}
