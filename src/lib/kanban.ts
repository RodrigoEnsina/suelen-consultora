import type { Database } from "@/integrations/supabase/types";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];

export const KANBAN_COLUMNS: { id: LeadStatus; title: string; accent: string }[] = [
  { id: "novo", title: "Novo", accent: "from-blue-500 to-blue-400" },
  { id: "contatado", title: "Contatado", accent: "from-violet-500 to-purple-400" },
  { id: "cotacao_enviada", title: "Cotação Enviada", accent: "from-fuchsia-500 to-pink-400" },
  { id: "fechado", title: "Fechado", accent: "from-emerald-500 to-green-400" },
  { id: "perdido", title: "Perdido", accent: "from-rose-500 to-red-400" },
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  cotacao_enviada: "Cotação Enviada",
  fechado: "Fechado",
  perdido: "Perdido",
};
