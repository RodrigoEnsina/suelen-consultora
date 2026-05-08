import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK = "5541998532879";
const onlyDigits = (s: unknown) => String(s ?? "").replace(/\D/g, "");

export interface ConsultorWhatsappState {
  /** Número em formato wa.me (apenas dígitos). Sempre disponível (cai em fallback). */
  number: string;
  /** True durante a primeira busca. */
  loading: boolean;
  /** True quando uma alteração realtime está sendo aplicada. */
  updating: boolean;
  /** True se a busca falhou e o número exibido é o fallback. */
  isFallback: boolean;
}

/**
 * Lê o número de WhatsApp da consultora a partir de app_settings (key = 'whatsapp_number').
 * Mantém-se sincronizado em tempo real quando o admin altera.
 */
export function useConsultorWhatsapp(): ConsultorWhatsappState {
  const [state, setState] = useState<ConsultorWhatsappState>({
    number: FALLBACK,
    loading: true,
    updating: false,
    isFallback: true,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "whatsapp_number")
          .maybeSingle();
        if (error) throw error;
        const digits = onlyDigits(data?.value ?? "");
        if (!active) return;
        if (digits.length >= 10) {
          setState({ number: digits, loading: false, updating: false, isFallback: false });
        } else {
          setState((s) => ({ ...s, loading: false, isFallback: true }));
        }
      } catch (err) {
        console.warn("[useConsultorWhatsapp] fallback", err);
        if (active) setState((s) => ({ ...s, loading: false, isFallback: true }));
      }
    };

    load();

    const channel = supabase
      .channel(`app_settings:whatsapp_number:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.whatsapp_number" },
        (payload) => {
          if (!active) return;
          setState((s) => ({ ...s, updating: true }));
          const next = onlyDigits((payload.new as { value?: string } | null)?.value ?? "");
          if (next.length >= 10) {
            setState({ number: next, loading: false, updating: false, isFallback: false });
          } else {
            setState((s) => ({ ...s, updating: false }));
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}

export function buildWhatsappUrl(number: string | number | null | undefined, message?: string): string {
  const base = `https://wa.me/${onlyDigits(number)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
