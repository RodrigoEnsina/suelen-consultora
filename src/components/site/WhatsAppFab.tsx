import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Loader2, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";
import { useConsultorWhatsapp, buildWhatsappUrl } from "@/hooks/useConsultorWhatsapp";
import { track } from "@/lib/tracking";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DEFAULT_MESSAGE =
  "Olá Suelen! Vim pelo site e gostaria de fazer uma cotação de proteção veicular. 🚗";

interface WhatsAppFabProps {
  message?: string;
}

export function WhatsAppFab({ message = DEFAULT_MESSAGE }: WhatsAppFabProps) {
  const { number, loading, updating } = useConsultorWhatsapp();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  const href = buildWhatsappUrl(number, message);
  const busy = loading || updating;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Mensagem copiada!", {
        description: "Agora você pode colá-la diretamente no WhatsApp.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar", {
        description: "Não foi possível copiar a mensagem.",
      });
    }
  };

  const handleLinkClick = () => {
    track("whatsapp_click", { source: "fab_popover", path: location.pathname });
  };

  const MainButton = (
    <button
      type="button"
      className={`fixed right-3 z-50 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 py-2.5 text-xs font-semibold text-white shadow-[0_10px_30px_-5px_rgba(37,211,102,0.55)] outline-none ring-offset-background transition-all duration-300 hover:scale-105 hover:bg-[#1faa55] focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:px-4 sm:py-3 sm:text-sm ${
        loading ? "cursor-progress opacity-80" : "cursor-pointer"
      } ${mounted ? "translate-y-0 opacity-100" : "translate-y-[12px] opacity-0"}`}
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      aria-label={
        loading
          ? "Carregando contato da Suelen no WhatsApp"
          : updating
            ? "Atualizando número do WhatsApp"
            : "Falar com a Suelen no WhatsApp"
      }
      aria-busy={busy}
      disabled={busy}
    >
      <span className="relative flex h-4 w-4 items-center justify-center sm:h-5 sm:w-5">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" aria-hidden="true" />
        ) : (
          <>
            <span
              className={`absolute inset-0 rounded-full bg-white/40 ${updating ? "animate-pulse" : "animate-ping"}`}
              aria-hidden="true"
            />
            <MessageCircle className="relative h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" strokeWidth={0} />
          </>
        )}
      </span>
      <span className="hidden xs:inline sm:inline">
        {loading ? "Carregando..." : updating ? "Atualizando..." : "WhatsApp"}
      </span>
    </button>
  );

  if (loading) return MainButton;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {MainButton}
      </PopoverTrigger>
      <PopoverContent 
        className="z-[60] mb-2 mr-3 w-72 rounded-2xl border-none bg-zinc-900/95 p-4 text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/10"
        side="top"
        align="end"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold leading-none">Falar com a Suelen</h4>
            <p className="text-xs text-zinc-400">
              Caso o link direto não funcione, você pode copiar a mensagem abaixo.
            </p>
          </div>
          
          <div className="relative rounded-lg bg-white/5 p-3">
            <p className="pr-8 text-xs italic leading-relaxed text-zinc-300">
              "{message}"
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7 text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0"
              onClick={handleCopy}
              aria-label={copied ? "Mensagem copiada" : "Copiar mensagem"}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              asChild
              className="w-full bg-[#25D366] text-white hover:bg-[#1faa55]"
            >
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleLinkClick}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ir para o WhatsApp
              </a>
            </Button>
            <p className="text-center text-[10px] text-zinc-500">
              Número: {number}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
