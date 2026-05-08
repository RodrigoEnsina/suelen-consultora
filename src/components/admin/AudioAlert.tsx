import { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

// Singleton to share audio state across hooks
export const audioState = {
  unlocked: false,
  primedAudio: null as HTMLAudioElement | null,
};

const AUDIO_SRC = "/notification.mp3";

export function AudioAlert() {
  const [isUnlocked, setIsUnlocked] = useState(audioState.unlocked);

  const unlockAudio = useCallback(async () => {
    try {
      if (!audioState.primedAudio) {
        audioState.primedAudio = new Audio(AUDIO_SRC);
      }
      
      audioState.primedAudio.volume = 0;
      await audioState.primedAudio.play();
      audioState.primedAudio.pause();
      audioState.primedAudio.currentTime = 0;
      audioState.primedAudio.volume = 0.5;
      
      audioState.unlocked = true;
      setIsUnlocked(true);
      
      toast.success("Alertas sonoros ativados!", {
        description: "Você será avisado sempre que chegar um novo lead.",
        icon: "🔔",
      });
    } catch (err) {
      console.warn("[audio] Unlock failed", err);
    }
  }, []);

  useEffect(() => {
    const attemptUnlock = async () => {
      if (audioState.unlocked) return;
      
      const testAudio = new Audio(AUDIO_SRC);
      testAudio.volume = 0;
      try {
        await testAudio.play();
        // If we reach here, autoplay is allowed or already unlocked
        audioState.unlocked = true;
        setIsUnlocked(true);
        audioState.primedAudio = testAudio;
        console.log("[audio] background unlock success");
      } catch (err) {
        console.log("[audio] interaction required for unlock");
      }
    };

    attemptUnlock();

    const handleGlobalInteraction = () => {
      if (!audioState.unlocked) {
        unlockAudio();
      }
    };

    // We keep these to catch the very first click anywhere
    window.addEventListener("click", handleGlobalInteraction, { once: true });
    window.addEventListener("touchstart", handleGlobalInteraction, { once: true });
    window.addEventListener("keydown", handleGlobalInteraction, { once: true });
    
    return () => {
      window.removeEventListener("click", handleGlobalInteraction);
      window.removeEventListener("touchstart", handleGlobalInteraction);
      window.removeEventListener("keydown", handleGlobalInteraction);
    };
  }, [unlockAudio]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (isUnlocked && audioState.primedAudio) {
          audioState.primedAudio.currentTime = 0;
          audioState.primedAudio.volume = 0.5;
          audioState.primedAudio.play().catch(() => {
            setIsUnlocked(false);
            audioState.unlocked = false;
            unlockAudio();
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
      title={isUnlocked ? "Sons ativos (clique para testar)" : "Som bloqueado (clique para ativar)"}
    >
      {isUnlocked ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
