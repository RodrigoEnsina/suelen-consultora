import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2, Send, Trash2, Phone, MessageCircle, Mail, StickyNote,
  CalendarClock, User, AlertCircle, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

export type LeadContact = Database["public"]["Tables"]["lead_contacts"]["Row"];
type Kind = "nota" | "ligacao" | "whatsapp" | "email" | "reuniao";

const KINDS: { id: Kind; label: string; icon: typeof StickyNote; tone: string }[] = [
  { id: "nota", label: "Nota", icon: StickyNote, tone: "text-violet-500" },
  { id: "ligacao", label: "Ligação", icon: Phone, tone: "text-blue-500" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, tone: "text-emerald-500" },
  { id: "email", label: "E-mail", icon: Mail, tone: "text-fuchsia-500" },
  { id: "reuniao", label: "Reunião", icon: CalendarClock, tone: "text-amber-500" },
];

const entrySchema = z.object({
  kind: z.enum(["nota", "ligacao", "whatsapp", "email", "reuniao"]),
  message: z.string().trim().min(1, "Escreva algo").max(2000, "Máx. 2000 caracteres"),
  next_step: z.string().trim().max(280).or(z.literal("")),
  next_step_at: z.string().trim().max(40).or(z.literal("")),
});

interface Props {
  leadId: string;
  leadName?: string;
}

export function LeadContactHistory({ leadId, leadName }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<LeadContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [kind, setKind] = useState<Kind>("nota");
  const [message, setMessage] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [nextStepAt, setNextStepAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("lead_contacts")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar histórico");
    else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchItems();
    const channel = supabase
      .channel(`lead-contacts-${leadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_contacts", filter: `lead_id=eq.${leadId}` },
        () => fetchItems(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const reset = () => {
    setMessage("");
    setNextStep("");
    setNextStepAt("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Sessão expirada");
      return;
    }
    const parsed = entrySchema.safeParse({ kind, message, next_step: nextStep, next_step_at: nextStepAt });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);

    const authorName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email ||
      "Equipe";

    const { error: insertError } = await supabase.from("lead_contacts").insert({
      lead_id: leadId,
      author_id: user.id,
      author_name: authorName,
      kind: parsed.data.kind,
      message: parsed.data.message,
      next_step: parsed.data.next_step || null,
      next_step_at: parsed.data.next_step_at ? new Date(parsed.data.next_step_at).toISOString() : null,
    });

    setSubmitting(false);
    if (insertError) {
      toast.error("Falha ao registrar interação");
      return;
    }
    toast.success("Interação registrada");
    reset();
  };

  const handleDelete = async (id: string) => {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from("lead_contacts").delete().eq("id", id);
    if (error) {
      setItems(previous);
      toast.error("Falha ao remover");
    } else toast.success("Removido");
  };

  const handleExport = () => {
    if (items.length === 0) {
      toast.error("Nada para exportar");
      return;
    }
    const headers = ["Data", "Tipo", "Autor", "Mensagem", "Próximo passo", "Próximo passo em"];
    const labelByKind: Record<Kind, string> = {
      nota: "Nota", ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail", reuniao: "Reunião",
    };
    // Chronological order (oldest first) for readability
    const rows = [...items].reverse().map((i) => [
      new Date(i.created_at).toLocaleString("pt-BR"),
      labelByKind[i.kind as Kind] ?? i.kind,
      i.author_name ?? "",
      i.message ?? "",
      i.next_step ?? "",
      i.next_step_at ? new Date(i.next_step_at).toLocaleString("pt-BR") : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = (leadName ?? "lead").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "lead";
    a.href = url;
    a.download = `historico-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Histórico exportado");
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Histórico de contatos
        </h3>
        <button
          type="button"
          onClick={handleExport}
          disabled={items.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-foreground/80 transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Download className="h-3 w-3" />
          Exportar CSV
        </button>
      </div>

      {/* New entry */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
        {/* Kind picker */}
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => {
            const active = kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-gradient-brand text-primary-foreground shadow-glow"
                    : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <k.icon className="h-3 w-3" />
                {k.label}
              </button>
            );
          })}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Resumo da conversa, retorno do cliente, objeções…"
          className="input-base mt-3 resize-none"
        />

        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={nextStep}
            maxLength={280}
            onChange={(e) => setNextStep(e.target.value)}
            placeholder="Próximo passo (opcional)"
            className="input-base"
          />
          <input
            type="datetime-local"
            value={nextStepAt}
            onChange={(e) => setNextStepAt(e.target.value)}
            className="input-base sm:w-[200px]"
          />
        </div>

        {error && (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{message.length}/2000</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.04] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Registrar
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            Nenhuma interação registrada ainda.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const meta = KINDS.find((k) => k.id === item.kind) ?? KINDS[0];
              const Icon = meta.icon;
              const canDelete = !!user && user.id === item.author_id;
              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="group relative rounded-2xl border border-border/60 bg-card/70 p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span className="font-semibold">{meta.label}</span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <User className="h-2.5 w-2.5" />
                          {item.author_name ?? "—"}
                        </span>
                        <span className="text-muted-foreground">
                          · {new Date(item.created_at).toLocaleString("pt-BR", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>

                      {(item.next_step || item.next_step_at) && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/15">
                          <CalendarClock className="h-3 w-3" />
                          {item.next_step || "Próximo passo"}
                          {item.next_step_at && (
                            <span className="text-primary/70">
                              · {new Date(item.next_step_at).toLocaleString("pt-BR", {
                                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
