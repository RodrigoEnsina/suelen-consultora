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
    // Check if browser allows autoplay
    const checkAutoplay = async () => {
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        await audio.play();
        audioState.unlocked = true;
        setIsUnlocked(true);
      } catch (err) {
        // Expected if no interaction yet
        console.log("[audio] pending interaction for unlock");
      }
    };

    checkAutoplay();

    // AUTO-UNLOCK on first interaction anywhere
    const handleGlobalClick = async () => {
      if (!audioState.unlocked) {
        try {
          if (!audioState.primedAudio) {
            audioState.primedAudio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
          }
          audioState.primedAudio.volume = 0;
          await audioState.primedAudio.play();
          audioState.primedAudio.pause();
          audioState.primedAudio.volume = 0.5;
          
          audioState.unlocked = true;
          setIsUnlocked(true);
          console.log("[audio] unlocked via global interaction");
        } catch (e) {
          console.warn("[audio] silent unlock failed", e);
        }
      }
    };

    window.addEventListener("mousedown", handleGlobalClick, { once: true });
    window.addEventListener("keydown", handleGlobalClick, { once: true });
    
    return () => {
      window.removeEventListener("mousedown", handleGlobalClick);
      window.removeEventListener("keydown", handleGlobalClick);
    };
  }, []);

  return (
    <button
      onClick={() => {
        if (audioState.primedAudio) {
          audioState.primedAudio.currentTime = 0;
          audioState.primedAudio.play().catch(e => {
            toast.error("Som bloqueado", { description: "Clique na página primeiro" });
          });
        } else {
          unlockAudio();
        }
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
        isUnlocked 
          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" 
          : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
      }`}
      title={isUnlocked ? "Sons ativos (clique para testar)" : "Som pendente (clique na página)"}
    >
      {isUnlocked ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
