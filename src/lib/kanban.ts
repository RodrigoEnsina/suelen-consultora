import type { Database } from "@/integrations/supabase/types";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];

export const KANBAN_COLUMNS: { id: LeadStatus; title: string; accent: string }[] = [
  { id: "novo", title: "Novo", accent: "from-blue-600 to-blue-500" },
  { id: "contatado", title: "Contatado", accent: "from-violet-600 to-purple-500" },
  { id: "cotacao_enviada", title: "Cotação Enviada", accent: "from-fuchsia-600 to-pink-500" },
  { id: "fechado", title: "Fechado", accent: "from-emerald-600 to-green-500" },
  { id: "perdido", title: "Perdido", accent: "from-rose-600 to-red-500" },
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  cotacao_enviada: "Cotação Enviada",
  fechado: "Fechado",
  perdido: "Perdido",
};
