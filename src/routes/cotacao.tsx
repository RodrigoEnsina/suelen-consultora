import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  ShieldCheck,
  Car,
  Users,
  UserCircle2,
  Sparkles,
  Clock,
  Lock,
  BadgeCheck,
  Flame,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/tracking";
import { verifyLeadPersisted } from "@/lib/leads-verify";

export const Route = createFileRoute("/cotacao")({
  head: () => ({
    meta: [
      { title: "Cotação Premium — Suelen Wab" },
      {
        name: "description",
        content:
          "Funil exclusivo de proteção veicular high-ticket. Receba sua tabela personalizada em minutos com a corretora Suelen.",
      },
      { property: "og:title", content: "Cotação Premium — Suelen Wab" },
      {
        property: "og:description",
        content: "Funil de cotação personalizado para proteção veicular premium.",
      },
    ],
  }),
  component: CotacaoPage,
});

/* ----------------------------- Validation ----------------------------- */

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const formSchema = z.object({
  // Etapa 1 — Contato (captura imediata)
  nome: z.string().trim().min(2, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(200),
  whatsapp: z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      const d = onlyDigits(v);
      if (d.length < 10) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "WhatsApp incompleto" });
        return;
      }
      const ddd = parseInt(d.slice(0, 2), 10);
      if (isNaN(ddd) || ddd < 11 || ddd > 99) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "DDD inválido (use 11–99)" });
      }
    }),
  cidade: z.string().trim().min(2, "Informe sua cidade").max(120),

  // Etapa 2 — Veículo
  veiculo_marca: z.string().trim().min(2, "Informe a marca").max(60),
  veiculo_modelo: z.string().trim().min(1, "Informe o modelo").max(80),
  veiculo_ano: z.string().trim().regex(/^\d{4}$/, "Ano inválido (4 dígitos)"),
  veiculo_fipe: z.string().trim().max(40).optional().or(z.literal("")),

  // Etapa 3 — Uso e perfil
  uso_finalidade: z.enum(["particular", "aplicativo"], {
    errorMap: () => ({ message: "Selecione a finalidade" }),
  }),
  veiculo_placa: z.string().trim().max(10).optional().or(z.literal("")),
  cep: z.string().trim().refine((v) => onlyDigits(v).length === 8, "CEP inválido"),

  // Etapa 4 — extras
  observacoes: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 0, title: "Contato", subtitle: "Vamos começar com seus dados", icon: UserCircle2, fields: ["nome", "email", "whatsapp", "cidade"] as const },
  { id: 1, title: "Veículo", subtitle: "Conte-nos sobre o seu carro", icon: Car, fields: ["veiculo_marca", "veiculo_modelo", "veiculo_ano", "veiculo_fipe"] as const },
  { id: 2, title: "Uso & Perfil", subtitle: "Como o veículo é utilizado", icon: Users, fields: ["uso_finalidade", "veiculo_placa", "cep"] as const },
  { id: 3, title: "Finalização", subtitle: "Receba sua tabela exclusiva", icon: Sparkles, fields: ["observacoes"] as const },
];

/* ------------------------------- Masks ------------------------------- */

const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length < 3) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const maskCep = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

/* --------------------------- Data --------------------------- */

const testimonials = [
  { name: "Ricardo S.", city: "São Paulo", text: "Acabei de receber minha cotação personalizada!" },
  { name: "Maria L.", city: "Curitiba", text: "A Suelen foi super rápida no atendimento." },
  { name: "João P.", city: "Belo Horizonte", text: "Excelente proteção para meu SUV, recomendo." },
  { name: "Ana Beatriz", city: "Rio de Janeiro", text: "Fiz o funil e em 5 minutos estava com a tabela." },
];

/* ----------------------------- Component ----------------------------- */

const STORAGE_KEY = "cotacao-funnel-v1";
const PENDING_SUBMIT_KEY = "cotacao-pending-v1";

function CotacaoPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [done, setDone] = useState(false);
  const [seconds, setSeconds] = useState(15 * 60); 
  const [leadId, setLeadId] = useState<string | null>(null);
  const [waUrl, setWaUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [startTime, setStartTime] = useState<number | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      nome: "",
      email: "",
      whatsapp: "",
      cidade: "",
      veiculo_marca: "",
      veiculo_modelo: "",
      veiculo_ano: "",
      veiculo_fipe: "",
      veiculo_placa: "",
      uso_finalidade: undefined as unknown as FormData["uso_finalidade"],
      cep: "",
      observacoes: "",
    },
  });

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        form.reset({ ...form.getValues(), ...data.values });
        if (typeof data.step === "number") setStep(Math.min(data.step, steps.length - 1));
        if (typeof data.leadId === "string") setLeadId(data.leadId);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist current progress
  useEffect(() => {
    const sub = form.watch((values) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ values, step, leadId }));
      } catch {}
    });
    return () => sub.unsubscribe();
  }, [form, step, leadId]);

  // Handle Online/Offline and Pending Submissions
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const pending = localStorage.getItem(PENDING_SUBMIT_KEY);
      if (pending) {
        try {
          const { url } = JSON.parse(pending);
          toast.info("Conexão restabelecida!", {
            description: "Você já pode continuar para o WhatsApp.",
            action: {
              label: "Abrir WhatsApp",
              onClick: () => {
                window.location.href = url;
                localStorage.removeItem(PENDING_SUBMIT_KEY);
              },
            },
          });
        } catch {}
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Countdown
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  // Helper: normaliza WhatsApp em E.164
  const normalizeWhatsapp = (raw: string) => {
    const d = onlyDigits(raw);
    const national = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d;
    return `+55${national}`;
  };

  const isTransientError = (err: unknown): boolean => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
    const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network error") ||
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("load failed") ||
      msg.includes("fetch") ||
      msg.includes("aborted") ||
      msg.includes("econnreset") ||
      msg.includes("etimedout")
    );
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const next = async () => {
    const fields = steps[step].fields;
    const valid = await form.trigger(fields as readonly (keyof FormData)[] as never);
    if (!valid) return;

    // Etapa 1 → captura imediata do lead no banco para não perder o contato
    if (step === 0) {
      setAdvancing(true);
      const startCapture = performance.now();
      const v = form.getValues();
      const payload = {
        _nome: v.nome.trim(),
        _email: v.email.trim().toLowerCase(),
        _whatsapp: normalizeWhatsapp(v.whatsapp),
        _cidade: v.cidade.trim(),
        _origem: "site",
      };

      console.log("[Telemetry] Iniciando captura Etapa 1:", payload._email);
      setStartTime(Date.now());

      try {
        const { data, error } = await supabase.rpc("create_lead", payload);
        
        if (error) {
          console.warn("[Telemetry] Falha na RPC, tentando upsert direto:", error.message);
          
          const nowBucket = Math.floor(Date.now() / 1000 / 7200);
          const dedupKey = (payload._whatsapp || payload._email) + ":" + nowBucket;
          
          const { data: insertData, error: insertError } = await supabase.from("leads").upsert({
            nome: payload._nome,
            email: payload._email,
            whatsapp: payload._whatsapp,
            cidade: payload._cidade,
            origem: "site",
            status: "novo",
            deduplication_key: dedupKey
          }, { 
            onConflict: 'deduplication_key',
            ignoreDuplicates: false 
          }).select('id').single();

          if (!insertError && insertData) {
            const savedId = insertData.id;
            setLeadId(savedId);
            console.log(`[Telemetry] Lead sincronizado (upsert), ID:`, savedId);
          } else if (insertError) {
            throw insertError;
          }
        } else if (data) {
          const savedId = data as string;
          setLeadId(savedId);
          console.log(`[Telemetry] Lead persistido, ID:`, savedId);
        }
      } catch (err) {
        console.error("[Telemetry] Erro crítico Etapa 1:", err);
        toast.error("Erro ao iniciar atendimento", {
          description: "Não conseguimos salvar seus dados. Por favor, verifique sua conexão.",
        });
        setAdvancing(false);
        return; 
      } finally {
        setAdvancing(false);
      }
    }

    // Enriquecimento proativo conforme avança
    if (leadId && (step === 1 || step === 2)) {
      setAdvancing(true);
      const v = form.getValues();
      console.log(`[Telemetry] Enriquecendo lead (Etapa ${step + 1})...`);
      
      try {
        await supabase.rpc("enrich_lead", {
          _lead_id: leadId,
          _veiculo_marca: step === 1 ? v.veiculo_marca.trim() : undefined,
          _veiculo_modelo: step === 1 ? v.veiculo_modelo.trim() : undefined,
          _veiculo_ano: step === 1 ? v.veiculo_ano.trim() : undefined,
          _veiculo_fipe: step === 1 ? v.veiculo_fipe?.trim() : undefined,
          _cep: step === 2 ? onlyDigits(v.cep) : undefined,
          _veiculo_placa: step === 2 ? v.veiculo_placa?.trim() : undefined,
          _observacoes: step === 2 ? `Uso: ${v.uso_finalidade}` : undefined,
        });
      } catch (err) {
        console.warn("[Telemetry] Falha silenciosa no enriquecimento parcial:", err);
        // Não bloqueamos o avanço aqui pois o contato principal já foi salvo
      } finally {
        setAdvancing(false);
      }
    }

    const nextStep = Math.min(step + 1, steps.length - 1);
    track("funnel_step_complete", { step: step + 1, name: steps[step].title });
    track("funnel_step_view", { step: nextStep + 1, name: steps[nextStep].title });
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Busca o número do WhatsApp da consultora (configurável no admin)
  const fetchConsultorWhatsapp = async (): Promise<string> => {
    const fallback = "5541998532879";
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "whatsapp_number")
        .maybeSingle();
      if (error) throw error;
      const digits = onlyDigits(data?.value ?? "");
      return digits.length >= 10 ? digits : fallback;
    } catch (err) {
      console.warn("[whatsapp_number] fallback", err);
      return fallback;
    }
  };

  const buildWhatsappMessage = (values: FormData): string => {
    const lines = [
      `Olá Suelen! Acabei de finalizar minha cotação no site. 🚗`,
      ``,
      `*Meus dados*`,
      `• Nome: ${values.nome}`,
      `• E-mail: ${values.email}`,
      `• WhatsApp: ${values.whatsapp}`,
      `• Cidade: ${values.cidade}`,
      ``,
      `*Veículo*`,
      `• ${values.veiculo_marca} ${values.veiculo_modelo} — ${values.veiculo_ano}`,
      values.veiculo_fipe ? `• FIPE: ${values.veiculo_fipe}` : null,
      values.veiculo_placa ? `• Placa: ${values.veiculo_placa}` : null,
      ``,
      `*Uso & perfil*`,
      `• Finalidade: ${values.uso_finalidade === "particular" ? "Uso Particular" : "Carro de Aplicativo"}`,
      `• CEP: ${values.cep}`,
      values.observacoes ? `\n*Observações*\n${values.observacoes}` : null,
      ``,
      `Pode me enviar a tabela personalizada, por favor? 🙌`,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const onSubmit = async (values: FormData) => {
    if (step !== steps.length - 1) {
      console.warn("[onSubmit] Tentativa de submissão fora da etapa final. Ignorando.");
      return;
    }
    
    setSubmitting(true);
    const startSubmit = performance.now();
    console.log("[Telemetry] Iniciando finalização (Etapa 4)");
    
    try {
      const observacoesEnriched = [
        values.observacoes?.trim(),
        `Uso: ${values.uso_finalidade}`,
        values.veiculo_placa ? `Placa: ${values.veiculo_placa}` : null,
      ]
        .filter(Boolean)
        .join(" • ");

      if (leadId) {
        console.log("[Telemetry] Enriquecendo lead ID:", leadId);
        const { error: rpcError } = await supabase.rpc("enrich_lead", {
          _lead_id: leadId,
          _veiculo_marca: values.veiculo_marca.trim() || undefined,
          _veiculo_modelo: values.veiculo_modelo.trim() || undefined,
          _veiculo_ano: values.veiculo_ano.trim() || undefined,
          _veiculo_fipe: values.veiculo_fipe?.trim() || undefined,
          _cep: onlyDigits(values.cep) || undefined,
          _observacoes: observacoesEnriched || undefined,
          _veiculo_placa: values.veiculo_placa?.trim() || undefined,
        });

        if (rpcError) {
          console.warn("[Telemetry] enrich_lead falhou, tentando upsert fallback", rpcError);
          
          const nowBucket = Math.floor(Date.now() / 1000 / 7200);
          const emailClean = values.email.trim().toLowerCase();
          const whatsappClean = normalizeWhatsapp(values.whatsapp);
          const dedupKey = (whatsappClean || emailClean) + ":" + nowBucket;

          const { error: insertError } = await supabase.from("leads").upsert({
            nome: values.nome.trim(),
            whatsapp: whatsappClean,
            email: emailClean,
            cidade: values.cidade.trim(),
            cep: onlyDigits(values.cep),
            veiculo_marca: values.veiculo_marca.trim(),
            veiculo_modelo: values.veiculo_modelo.trim(),
            veiculo_ano: values.veiculo_ano.trim(),
            veiculo_fipe: values.veiculo_fipe?.trim() || null,
            veiculo_placa: values.veiculo_placa?.trim() || null,
            observacoes: observacoesEnriched,
            origem: "site",
            status: "novo",
            deduplication_key: dedupKey
          }, { 
            onConflict: 'deduplication_key' 
          });
          if (insertError) throw insertError;
        }
      } else {
        console.log("[Telemetry] LeadId não encontrado, criando registro completo");
        
        const nowBucket = Math.floor(Date.now() / 1000 / 7200);
        const emailClean = values.email.trim().toLowerCase();
        const whatsappClean = normalizeWhatsapp(values.whatsapp);
        const dedupKey = (whatsappClean || emailClean) + ":" + nowBucket;

        const { error: insertError } = await supabase.from("leads").upsert({
          nome: values.nome.trim(),
          whatsapp: whatsappClean,
          email: emailClean,
          cidade: values.cidade.trim(),
          cep: onlyDigits(values.cep),
          veiculo_marca: values.veiculo_marca.trim(),
          veiculo_modelo: values.veiculo_modelo.trim(),
          veiculo_ano: values.veiculo_ano.trim(),
          veiculo_fipe: values.veiculo_fipe?.trim() || null,
          veiculo_placa: values.veiculo_placa?.trim() || null,
          observacoes: observacoesEnriched,
          origem: "site",
          status: "novo",
          deduplication_key: dedupKey
        }, { 
          onConflict: 'deduplication_key' 
        });
        if (insertError) throw insertError;
      }

      console.log("[Telemetry] Iniciando verificação de persistência...");
      const verifyStart = performance.now();
      const verifyDelays = [0, 800, 1500];
      let verified: Awaited<ReturnType<typeof verifyLeadPersisted>> | null = null;
      
      for (let i = 0; i < verifyDelays.length; i++) {
        if (verifyDelays[i] > 0) await sleep(verifyDelays[i]);
        console.log(`[Telemetry] Tentativa de verificação ${i + 1}...`);
        try {
          const result = await verifyLeadPersisted({
              leadId: leadId ?? undefined,
              whatsapp: normalizeWhatsapp(values.whatsapp),
              email: values.email.trim().toLowerCase(),
          });
          if (result.exists) {
            verified = result;
            const verifyLatency = performance.now() - verifyStart;
            console.log(`[Telemetry] Verificação concluída em ${verifyLatency.toFixed(2)}ms`);
            break;
          }
        } catch (err) {
          console.error(`[Telemetry] Falha na verificação ${i + 1}:`, err);
        }
      }

      const consultorNumber = await fetchConsultorWhatsapp();
      const message = buildWhatsappMessage(values);
      const url = `https://wa.me/${consultorNumber}?text=${encodeURIComponent(message)}`;

      const totalLatency = performance.now() - startSubmit;
      const funnelDuration = startTime ? (Date.now() - startTime) / 1000 : null;
      
      console.log(`[Telemetry] Fluxo finalizado! Latência Envio: ${totalLatency.toFixed(2)}ms, Duração Funil: ${funnelDuration?.toFixed(1)}s`);
      
      track("cotacao_enviada", { 
        veiculo: `${values.veiculo_marca} ${values.veiculo_modelo}`,
        latency_ms: totalLatency,
        funnel_duration_s: funnelDuration,
        verified: !!verified
      }, verified?.leadId ?? leadId ?? undefined);

      toast.success("Cotação enviada!", {
        description: "Redirecionando para o WhatsApp...",
      });
      
      try {
        localStorage.setItem(PENDING_SUBMIT_KEY, JSON.stringify({ url, timestamp: Date.now() }));
        localStorage.removeItem(STORAGE_KEY); 
      } catch {}
      
      setWaUrl(url);
      setDone(true);

      toast.success("Cotação finalizada!", {
        description: "Agora você pode abrir o WhatsApp abaixo.",
      });
      
      // Salva no localStorage como garantia
      try {
        localStorage.setItem(PENDING_SUBMIT_KEY, JSON.stringify({ url, timestamp: Date.now() }));
        localStorage.removeItem(STORAGE_KEY); 
      } catch {}
      
      // Removemos o redirecionamento automático (window.location.href = url) 
      // para garantir que o usuário veja a tela de conclusão e clique no botão.
    } catch (err) {
      console.error("[onSubmit] Critical failure:", err);
      
      // Se falhou mas temos a URL pronta (ex: erro de rede no tracking ou RPC mas os dados básicos foram salvos)
      const consultorNumber = await fetchConsultorWhatsapp();
      const message = buildWhatsappMessage(values);
      const url = `https://wa.me/${consultorNumber}?text=${encodeURIComponent(message)}`;
      
      try {
        localStorage.setItem(PENDING_SUBMIT_KEY, JSON.stringify({ url, timestamp: Date.now() }));
      } catch {}

      const errorCode = `ERR-${Math.random().toString(36).toUpperCase().slice(2, 7)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
      
      toast.error("Instabilidade detectada", {
        description: (
          <div className="flex flex-col gap-2">
            <p>Seus dados foram salvos localmente por segurança.</p>
            <p className="text-xs opacity-70">
              Código do erro: <code className="font-mono font-bold bg-white/10 px-1 rounded">{errorCode}</code>
            </p>
            <p className="text-xs">
              Se o problema persistir, informe este código ao suporte.
            </p>
          </div>
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="bg-background aura-bg min-h-screen pb-20 pt-8 sm:pt-20">
      <div className="container relative mx-auto px-4 sm:px-6">
        {/* Progress Bar */}
        {!done && (
          <div className="mx-auto mb-6 max-w-2xl sm:mb-12">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
                Progresso da Cotação
              </span>
              <span className="text-[10px] font-bold tabular-nums text-foreground/60">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-brand shadow-[0_0_12px_rgba(155,92,246,0.3)] transition-all duration-500"
              />
            </div>
            <div className="mt-4 flex justify-between gap-1 sm:mt-6">
              {steps.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex flex-1 flex-col items-center gap-2 transition-all duration-300 ${
                    i <= step ? "opacity-100" : "opacity-30 grayscale"
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${
                    i < step 
                      ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                      : i === step 
                        ? "bg-gradient-brand text-white shadow-glow" 
                        : "bg-white/5 text-muted-foreground"
                  } transition-all duration-500`}>
                    {i < step ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                  </div>
                  <span className={`hidden text-[10px] font-bold uppercase tracking-wider sm:block ${
                    i === step ? "text-primary" : "text-muted-foreground/60"
                  }`}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="glass rounded-3xl p-5 sm:p-10"
              >
                <div className="mb-6 sm:mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Etapa {step + 1}</span>
                  </div>
                  <h1 className="text-xl font-extrabold tracking-tight sm:text-3xl text-foreground">
                    {steps[step].title}
                  </h1>
                  <p className="mt-2 text-sm text-foreground/70">
                    {steps[step].subtitle}
                  </p>
                </div>

                <form className="space-y-4 sm:space-y-6">
                  {step === 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          Nome Completo
                        </label>
                        <input
                          {...form.register("nome")}
                          className="w-full rounded-2xl bg-white p-4 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5"
                          placeholder="Ex: João Silva"
                        />
                        {form.formState.errors.nome && (
                          <p className="text-[11px] font-bold text-rose-600 ml-1">
                            {form.formState.errors.nome.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          E-mail
                        </label>
                        <input
                          {...form.register("email")}
                          type="email"
                          className="w-full rounded-2xl bg-white p-4 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5"
                          placeholder="joao@email.com"
                        />
                        {form.formState.errors.email && (
                          <p className="text-[11px] font-bold text-rose-600 ml-1">
                            {form.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          WhatsApp
                        </label>
                        <input
                          {...form.register("whatsapp")}
                          onChange={(e) => form.setValue("whatsapp", maskPhone(e.target.value))}
                          className="w-full rounded-2xl bg-white p-4 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5"
                          placeholder="(11) 99999-9999"
                        />
                        {form.formState.errors.whatsapp && (
                          <p className="text-[11px] font-bold text-rose-600 ml-1">
                            {form.formState.errors.whatsapp.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          Cidade
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                          <input
                            {...form.register("cidade")}
                            className="w-full rounded-2xl bg-white p-4 pl-12 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5 sm:pl-12"
                            placeholder="Sua cidade atual"
                          />
                        </div>
                        {form.formState.errors.cidade && (
                          <p className="text-[11px] font-bold text-rose-600 ml-1">
                            {form.formState.errors.cidade.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          Marca
                        </label>
                        <input
                          {...form.register("veiculo_marca")}
                          className="w-full rounded-2xl bg-white p-4 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5"
                          placeholder="Ex: Toyota"
                        />
                        {form.formState.errors.veiculo_marca && (
                          <p className="text-[11px] font-bold text-rose-600 ml-1">
                            {form.formState.errors.veiculo_marca.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          Modelo
                        </label>
                        <input
                          {...form.register("veiculo_modelo")}
                          className="w-full rounded-2xl bg-white p-4 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5"
                          placeholder="Ex: Corolla"
                        />
                        {form.formState.errors.veiculo_modelo && (
                          <p className="text-[11px] font-bold text-rose-600 ml-1">
                            {form.formState.errors.veiculo_modelo.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          Ano
                        </label>
                        <input
                          {...form.register("veiculo_ano")}
                          maxLength={4}
                          className="w-full rounded-2xl bg-white p-4 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5"
                          placeholder="2024"
                        />
                        {form.formState.errors.veiculo_ano && (
                          <p className="text-[11px] font-bold text-rose-600 ml-1">
                            {form.formState.errors.veiculo_ano.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          FIPE (Opcional)
                        </label>
                        <input
                          {...form.register("veiculo_fipe")}
                          className="w-full rounded-2xl bg-white p-4 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5"
                          placeholder="R$ 0,00"
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          Finalidade de Uso
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            { id: "particular", label: "Particular", desc: "Uso diário comum" },
                            { id: "aplicativo", label: "Aplicativo", desc: "Uber, 99, etc" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => form.setValue("uso_finalidade", opt.id as any, { shouldValidate: true })}
                              className={`flex flex-col gap-1 rounded-2xl p-4 text-left transition-all ${
                                form.watch("uso_finalidade") === opt.id
                                  ? "bg-primary/20 ring-2 ring-primary shadow-glow text-foreground"
                                  : "bg-white ring-2 ring-slate-300 hover:bg-slate-50 text-foreground/70"
                              }`}
                            >
                              <span className="text-sm font-bold">{opt.label}</span>
                              <span className="text-[10px] opacity-70">{opt.desc}</span>
                            </button>
                          ))}
                        </div>
                        {form.formState.errors.uso_finalidade && (
                          <p className="text-[11px] font-bold text-rose-600 ml-1">
                            {form.formState.errors.uso_finalidade.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          CEP de Pernoite
                        </label>
                        <input
                          {...form.register("cep")}
                          onChange={(e) => form.setValue("cep", maskCep(e.target.value))}
                          className="w-full rounded-2xl bg-white p-4 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5"
                          placeholder="00000-000"
                        />
                        {form.formState.errors.cep && (
                          <p className="text-[11px] font-bold text-rose-600 ml-1">
                            {form.formState.errors.cep.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          Placa (Opcional)
                        </label>
                        <input
                          {...form.register("veiculo_placa")}
                          className="w-full rounded-2xl bg-white p-4 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5"
                          placeholder="AAA-0A00"
                        />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 ml-1">
                          Alguma observação adicional?
                        </label>
                        <textarea
                          {...form.register("observacoes")}
                          rows={4}
                          className="w-full resize-none rounded-2xl bg-white p-4 text-base font-medium text-foreground ring-2 ring-slate-300 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-primary sm:p-5"
                          placeholder="Conte-nos detalhes ou tire suas dúvidas aqui..."
                        />
                      </div>
                      
                      <div className="rounded-2xl bg-primary/10 p-5 ring-1 ring-primary/20">
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" />
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-foreground">Proteção de Dados Garantida</p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                              Seus dados estão protegidos sob nossa política de privacidade. Usamos essas informações apenas para gerar sua tabela personalizada.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </form>

                <div className="mt-8 flex flex-col-reverse gap-3 sm:mt-10 sm:flex-row sm:justify-between">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={back}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-6 py-4 text-sm font-bold text-white transition-all hover:bg-white/10 sm:px-8"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={step === steps.length - 1 ? form.handleSubmit(onSubmit) : next}
                    disabled={advancing || submitting}
                    className="group relative flex-1 overflow-hidden rounded-2xl bg-gradient-brand px-6 py-4 text-sm font-bold text-white shadow-glow transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 sm:px-10"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {submitting || advancing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {submitting ? "Processando..." : "Salvando..."}
                        </>
                      ) : (
                        <>
                          {step === steps.length - 1 ? "Solicitar Tabela Premium" : "Avançar Próxima Etapa"}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-3xl p-10 text-center sm:p-16"
              >
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-4 ring-emerald-500/5">
                  <BadgeCheck className="h-12 w-12" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                  Quase Lá! 🚀
                </h1>
                <p className="mt-4 text-base text-muted-foreground/80 sm:text-lg">
                  Sua solicitação foi processada com sucesso. Clique no botão abaixo para receber sua tabela exclusiva no WhatsApp da consultora Suelen.
                </p>

                <div className="mt-10">
                  <a
                    href={waUrl || "#"}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-8 py-5 text-lg font-bold text-white shadow-lg shadow-[#25D366]/20 transition-all hover:scale-105 active:scale-95 sm:w-auto"
                  >
                    <Phone className="h-6 w-6" />
                    Abrir Meu WhatsApp
                  </a>
                  <p className="mt-4 text-xs text-muted-foreground/60 italic">
                    Ao clicar, uma conversa será iniciada automaticamente.
                  </p>
                </div>

                <div className="mt-12 flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                  <Lock className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    Ambiente de Cotação Seguro
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Social Proof Footer */}
          {!done && (
            <div className="mt-10 text-center sm:mt-16">
              <div className="flex flex-wrap items-center justify-center gap-4 opacity-40 grayscale transition-all hover:opacity-100 hover:grayscale-0">
                <ShieldCheck className="h-6 w-6" />
                <BadgeCheck className="h-6 w-6" />
                <Sparkles className="h-6 w-6" />
                <Check className="h-6 w-6" />
              </div>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
                Trusted by 5,000+ Premium Members
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Social Proof Floating */}
      <SocialProof />

      <footer className="mt-20 border-t border-white/5 py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
            <Clock className="h-3 w-3" />
            Atendimento Humano • Suelen Wab © {new Date().getFullYear()}
          </div>
        </div>
      </footer>

      {/* Floating Urgency Tag */}
      {!done && (
        <div className="fixed bottom-6 right-6 z-40 hidden sm:block">
          <div className="glass flex items-center gap-3 rounded-full py-2.5 pl-3 pr-5 text-xs font-bold shadow-glow ring-1 ring-primary/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-orange-600">Oferta Exclusiva</span>
              <span className="text-[10px] text-muted-foreground/60">Expira em {mm}:{ss}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------- Subcomponents --------------------------- */

function SocialProof() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [activeCount] = useState(() => 32 + Math.floor(Math.random() * 12));

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 3000);
    const cycleTimer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % testimonials.length);
        setVisible(true);
      }, 500);
    }, 8000);
    return () => {
      clearTimeout(showTimer);
      clearInterval(cycleTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: -20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 left-6 z-[40] hidden max-w-[280px] rounded-2xl border border-border/50 bg-card p-4 shadow-2xl backdrop-blur-xl md:block"
        >
          <div className="flex items-start gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-lg">
              <Users className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-black bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-1.5">
                <p className="truncate text-xs font-bold text-foreground">{testimonials[index].name}</p>
                <div className="h-1 w-1 rounded-full bg-foreground/10" />
                <p className="truncate text-[10px] text-foreground/50">{testimonials[index].city}</p>
              </div>
              <p className="text-[11px] leading-relaxed text-foreground/80 italic">"{testimonials[index].text}"</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className="h-2.5 w-2.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-[9px] font-bold text-emerald-600">{activeCount} membros online</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
