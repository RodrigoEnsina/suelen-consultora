import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Save, Trash2, Phone, Mail, MapPin, Car, MessageSquare, Calendar, Tag } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { KANBAN_COLUMNS, STATUS_LABEL, type Lead, type LeadStatus } from "@/lib/kanban";
import { LeadContactHistory } from "./LeadContactHistory";

const leadSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120, "Máx. 120 caracteres"),
  whatsapp: z.string().trim().min(8, "WhatsApp inválido").max(20, "Máx. 20 caracteres"),
  email: z.string().trim().email("E-mail inválido").max(255).or(z.literal("")),
  cep: z.string().trim().max(12).or(z.literal("")),
  veiculo_marca: z.string().trim().max(60).or(z.literal("")),
  veiculo_modelo: z.string().trim().max(80).or(z.literal("")),
  veiculo_ano: z.string().trim().max(8).or(z.literal("")),
  veiculo_placa: z.string().trim().max(10).or(z.literal("")),
  status: z.enum(["novo", "contatado", "cotacao_enviada", "fechado", "perdido"]),
  origem: z.string().trim().min(1, "Origem obrigatória").max(40),
  observacoes: z.string().trim().max(2000).or(z.literal("")),
});

type FormState = z.infer<typeof leadSchema>;

interface Props {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (lead: Lead) => void;
  onDeleted?: (id: string) => void;
}

const ORIGENS = ["site", "indicacao", "instagram", "whatsapp", "google", "outro"];

function toForm(l: Lead): FormState {
  return {
    nome: l.nome,
    whatsapp: l.whatsapp,
    email: l.email ?? "",
    cep: l.cep ?? "",
    veiculo_marca: l.veiculo_marca ?? "",
    veiculo_modelo: l.veiculo_modelo ?? "",
    veiculo_ano: l.veiculo_ano ?? "",
    veiculo_placa: l.veiculo_placa ?? "",
    status: l.status,
    origem: l.origem,
    observacoes: l.observacoes ?? "",
  };
}

export function LeadDetailModal({ lead, open, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (lead) {
      setForm(toForm(lead));
      setErrors({});
    }
  }, [lead]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && open && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!lead || !form) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => (p ? { ...p, [key]: value } : p));
  };

  const handleSave = async () => {
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      toast.error("Verifique os campos destacados");
      return;
    }
    setErrors({});
    setSaving(true);
    const payload = {
      nome: parsed.data.nome,
      whatsapp: parsed.data.whatsapp,
      email: parsed.data.email || null,
      cep: parsed.data.cep || null,
      veiculo_marca: parsed.data.veiculo_marca || null,
      veiculo_modelo: parsed.data.veiculo_modelo || null,
      veiculo_ano: parsed.data.veiculo_ano || null,
      veiculo_placa: parsed.data.veiculo_placa || null,
      status: parsed.data.status,
      origem: parsed.data.origem,
      observacoes: parsed.data.observacoes || null,
    };
    const { data, error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", lead.id)
      .select()
      .maybeSingle();
    setSaving(false);
    if (error || !data) {
      toast.error("Falha ao salvar alterações");
      return;
    }
    toast.success("Lead atualizado");
    onSaved?.(data);
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm("Excluir este lead permanentemente?")) return;
    setDeleting(true);
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    setDeleting(false);
    if (error) {
      toast.error("Falha ao excluir");
      return;
    }
    toast.success("Lead excluído");
    onDeleted?.(lead.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-stretch justify-end sm:items-center sm:justify-center sm:p-4">
          {/* Backdrop */}
          <motion.button
            aria-label="Fechar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative flex w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl shadow-elevated sm:rounded-3xl"
            style={{ maxHeight: "92vh" }}
          >
            {/* Header */}
            <div className="relative shrink-0 border-b border-border/60 px-6 py-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    Lead · {new Date(lead.created_at).toLocaleString("pt-BR")}
                  </p>
                  <h2 id="lead-modal-title" className="mt-1 truncate font-display text-xl font-extrabold tracking-tight">
                    {form.nome || "Editar lead"}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                {/* Status + Origem */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Status" icon={Tag} error={errors.status}>
                    <select
                      value={form.status}
                      onChange={(e) => update("status", e.target.value as LeadStatus)}
                      className="input-base"
                    >
                      {KANBAN_COLUMNS.map((c) => (
                        <option key={c.id} value={c.id}>{STATUS_LABEL[c.id]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Origem" icon={Calendar} error={errors.origem}>
                    <select
                      value={form.origem}
                      onChange={(e) => update("origem", e.target.value)}
                      className="input-base"
                    >
                      {ORIGENS.map((o) => (
                        <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Section title="Contato">
                  <Field label="Nome completo" error={errors.nome}>
                    <input
                      value={form.nome}
                      maxLength={120}
                      onChange={(e) => update("nome", e.target.value)}
                      className="input-base"
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="WhatsApp" icon={Phone} error={errors.whatsapp}>
                      <input
                        value={form.whatsapp}
                        maxLength={20}
                        onChange={(e) => update("whatsapp", e.target.value)}
                        className="input-base"
                      />
                    </Field>
                    <Field label="E-mail" icon={Mail} error={errors.email}>
                      <input
                        type="email"
                        value={form.email}
                        maxLength={255}
                        onChange={(e) => update("email", e.target.value)}
                        className="input-base"
                      />
                    </Field>
                  </div>
                  <Field label="CEP" icon={MapPin} error={errors.cep}>
                    <input
                      value={form.cep}
                      maxLength={12}
                      onChange={(e) => update("cep", e.target.value)}
                      className="input-base"
                    />
                  </Field>
                </Section>

                <Section title="Veículo">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Marca" icon={Car} error={errors.veiculo_marca}>
                      <input
                        value={form.veiculo_marca}
                        maxLength={60}
                        onChange={(e) => update("veiculo_marca", e.target.value)}
                        className="input-base"
                      />
                    </Field>
                    <Field label="Modelo" error={errors.veiculo_modelo}>
                      <input
                        value={form.veiculo_modelo}
                        maxLength={80}
                        onChange={(e) => update("veiculo_modelo", e.target.value)}
                        className="input-base"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Ano" error={errors.veiculo_ano}>
                      <input
                        value={form.veiculo_ano}
                        maxLength={8}
                        onChange={(e) => update("veiculo_ano", e.target.value)}
                        className="input-base"
                      />
                    </Field>
                    <Field label="Placa" error={errors.veiculo_placa}>
                      <input
                        value={form.veiculo_placa}
                        maxLength={10}
                        onChange={(e) => update("veiculo_placa", e.target.value.toUpperCase())}
                        className="input-base uppercase"
                      />
                    </Field>
                  </div>
                </Section>

                <Section title="Anotações">
                  <Field label="Observações internas" icon={MessageSquare} error={errors.observacoes}>
                    <textarea
                      value={form.observacoes}
                      maxLength={2000}
                      rows={4}
                      onChange={(e) => update("observacoes", e.target.value)}
                      className="input-base resize-none"
                      placeholder="Histórico de contato, preferências, próximos passos…"
                    />
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">
                      {form.observacoes.length}/2000
                    </p>
                  </Field>
                </Section>

                <LeadContactHistory leadId={lead.id} leadName={form.nome || lead.nome} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-card/60 px-6 py-4 backdrop-blur">
              <button
                onClick={handleDelete}
                disabled={deleting || saving}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Excluir
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.04] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- helpers ---------- */

/* ---------- helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

interface FieldProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, icon: Icon, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-foreground">
        {Icon && <Icon className="h-3 w-3 text-foreground" />}
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] font-medium text-destructive">{error}</span>}
    </label>
  );
}
