import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VerifySchema = z.object({
  leadId: z.string().uuid().optional(),
  whatsapp: z.string().min(8).max(32).optional(),
  email: z.string().email().optional(),
}).refine((d) => d.leadId || d.whatsapp || d.email, {
  message: "Informe leadId, whatsapp ou email",
});

export type VerifyLeadResult = {
  exists: boolean;
  leadId: string | null;
  status: string | null;
  createdAt: string | null;
};

/**
 * Confirma que o lead foi persistido na tabela `leads`.
 * Busca por id (preferencial) ou, em fallback, pelos últimos 30 minutos
 * por whatsapp/email.
 *
 * NOTE: This function uses supabaseAdmin because it's called from the public
 * cotação form (unauthenticated users). It only returns existence + id,
 * never full PII. The leadId param constrains lookup to a specific row.
 */
export const verifyLeadPersisted = createServerFn({ method: "POST" })
  .inputValidator((input) => VerifySchema.parse(input))
  .handler(async ({ data }): Promise<VerifyLeadResult> => {
    try {
      if (data.leadId) {
        const { data: row, error } = await supabaseAdmin
          .from("leads")
          .select("id, status, created_at")
          .eq("id", data.leadId)
          .maybeSingle();
        if (error) {
          console.error("[verifyLeadPersisted] erro por id", error);
          return { exists: false, leadId: null, status: null, createdAt: null };
        }
        if (row) {
          return { exists: true, leadId: row.id, status: row.status, createdAt: row.created_at };
        }
      }

      // Only allow fallback lookup if leadId was provided but not found (race condition)
      // or if searching by the user's own whatsapp/email they just submitted
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min window (reduced from 30)
      let q = supabaseAdmin
        .from("leads")
        .select("id, status, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data.whatsapp) {
        const raw = data.whatsapp.trim();
        const digits = raw.replace(/\D/g, "");
        const variants = Array.from(new Set([raw, digits, digits ? `+${digits}` : ""].filter(Boolean)));
        q = q.in("whatsapp", variants);
      } else if (data.email) {
        q = q.eq("email", data.email.trim().toLowerCase());
      }

      const { data: rows, error } = await q;
      if (error) {
        console.error("[verifyLeadPersisted] erro fallback", error);
        return { exists: false, leadId: null, status: null, createdAt: null };
      }
      const row = rows?.[0];
      if (!row) return { exists: false, leadId: null, status: null, createdAt: null };
      return { exists: true, leadId: row.id, status: row.status, createdAt: row.created_at };
    } catch (err) {
      console.error("[verifyLeadPersisted] unexpected error:", err);
      return { exists: false, leadId: null, status: null, createdAt: null };
    }
  });

/**
 * Server function to fetch all leads for admin panel.
 * Uses requireSupabaseAuth to derive user identity from the JWT token,
 * then verifies admin role server-side using supabaseAdmin.
 */
export const fetchLeadsServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { userId } = context;

      // Verify caller has admin role using admin client (bypasses RLS)
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleRow) {
        return { leads: [], error: "Forbidden: admin role required" };
      }

      // Fetch all leads using admin client (bypasses REST API RLS overhead)
      const allLeads: any[] = [];
      const PAGE_SIZE = 1000;
      for (let page = 0; page < 20; page++) {
        const from = page * PAGE_SIZE;
        const { data: rows, error } = await supabaseAdmin
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) return { leads: [], error: error.message };
        if (rows) allLeads.push(...rows);
        if (!rows || rows.length < PAGE_SIZE) break;
      }

      return { leads: allLeads, error: null };
    } catch (err) {
      console.error("[fetchLeadsServer] error:", err);
      return { leads: [], error: err instanceof Error ? err.message : "Unknown error" };
    }
  });
