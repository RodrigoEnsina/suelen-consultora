import { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX, BellRing } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Singleton to share audio state across hooks
export const audioState = {
  unlocked: false,
  primedAudio: null as HTMLAudioElement | null,
};

export function AudioAlert() {
  const [isUnlocked, setIsUnlocked] = useState(audioState.unlocked);
  const [showPrompt, setShowPrompt] = useState(false);

  const unlockAudio = useCallback(async () => {
    try {
      if (!audioState.primedAudio) {
        audioState.primedAudio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audioState.primedAudio.volume = 0; // Silent first play
      }
      
      await audioState.primedAudio.play();
      audioState.primedAudio.pause();
      audioState.primedAudio.volume = 0.5;
      
      audioState.unlocked = true;
      setIsUnlocked(true);
      setShowPrompt(false);
      toast.success("Alertas sonoros ativados!", {
        description: "Você será avisado sempre que chegar um novo lead.",
        icon: "🔔",
      });
    } catch (err) {
      console.error("[audio] Failed to unlock", err);
      toast.error("Erro ao ativar som. Clique novamente.");
    }
  }, []);

  useEffect(() => {
    // Check if browser allows autoplay (it usually doesn't without interaction)
    const checkAutoplay = async () => {
      try {
        const audio = new Audio();
        audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
        await audio.play();
        audioState.unlocked = true;
        setIsUnlocked(true);
      } catch (err) {
        setShowPrompt(true);
      }
    };

    checkAutoplay();

    // Also listen for first interaction to auto-unlock if possible
    const handleFirstInteraction = () => {
      if (!audioState.unlocked) {
        // We don't unlock here automatically because play() must be direct result of interaction
        // but we can show the prompt more prominently
      }
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    return () => window.removeEventListener("click", handleFirstInteraction);
  }, []);

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[60]"
        >
          <button
            onClick={unlockAudio}
            className="flex items-center gap-3 rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground shadow-glow ring-4 ring-primary/20 transition-transform hover:scale-105 active:scale-95"
          >
            <BellRing className="h-5 w-5 animate-bounce" />
            Ativar som de notificações
          </button>
        </motion.div>
      )}

      {!showPrompt && (
        <button
          onClick={() => {
            // Test sound
            if (audioState.primedAudio) {
              audioState.primedAudio.currentTime = 0;
              audioState.primedAudio.play();
            } else {
              unlockAudio();
            }
          }}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
            isUnlocked 
              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" 
              : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
          }`}
          title={isUnlocked ? "Sons ativos (clique para testar)" : "Som bloqueado"}
        >
          {isUnlocked ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      )}
    </AnimatePresence>
  );
}
