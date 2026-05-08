import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/kanban";

/**
 * Busca todos os leads diretamente via client autenticado.
 * O admin logado já possui sessão ativa com JWT — a RLS da tabela `leads`
 * permite SELECT para quem tem role 'admin', garantindo segurança.
 *
 * Nota: Anteriormente usava `createServerFn` + `supabaseAdmin` (service role key),
 * mas como o SUPABASE_SERVICE_ROLE_KEY não está disponível no ambiente local,
 * esta abordagem direta funciona corretamente com a sessão autenticada.
 */
export async function fetchAdminLeads(): Promise<Lead[]> {
  const allLeads: Lead[] = [];
  const PAGE_SIZE = 1000;

  for (let page = 0; page < 20; page++) {
    const from = page * PAGE_SIZE;
    const { data: rows, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("[fetchAdminLeads] query error:", error.message);
      // Se é erro de permissão, retorna vazio sem tentar mais páginas
      if (error.message.includes("permission") || error.code === "42501") {
        return [];
      }
      throw error;
    }

    if (rows) allLeads.push(...(rows as Lead[]));
    if (!rows || rows.length < PAGE_SIZE) break;
  }

  return allLeads;
}
