import { supabase } from "@/integrations/supabase/client";

export type VerifyLeadResult = {
  exists: boolean;
  leadId: string | null;
  status: string | null;
  createdAt: string | null;
};

/**
 * Confirma que o lead foi persistido na tabela `leads`.
 * Utiliza a RPC `verify_lead_exists` para segurança e portabilidade.
 * Esta função é totalmente segura para execução no cliente.
 */
export async function verifyLeadPersisted(data: { leadId?: string; whatsapp?: string; email?: string }): Promise<VerifyLeadResult> {
  const { leadId } = data;
  if (!leadId) {
    return { exists: false, leadId: null, status: null, createdAt: null };
  }

  try {
    const { data: result, error } = await (supabase.rpc as any)('verify_lead_exists', {
      p_lead_id: leadId
    });

    if (error) {
      console.error("[verifyLeadPersisted] RPC error:", error);
      return { exists: false, leadId: null, status: null, createdAt: null };
    }

    const row = (result as any)?.[0];
    if (row && row.exists) {
      return {
        exists: true,
        leadId: leadId,
        status: row.status,
        createdAt: row.created_at
      };
    }

    return { exists: false, leadId: null, status: null, createdAt: null };
  } catch (err) {
    console.error("[verifyLeadPersisted] unexpected error:", err);
    return { exists: false, leadId: null, status: null, createdAt: null };
  }
}
