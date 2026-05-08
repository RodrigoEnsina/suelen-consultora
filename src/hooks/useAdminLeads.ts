import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/kanban";
import { fetchAdminLeads } from "@/lib/leads";
import { audioState } from "@/components/admin/AudioAlert";

export const ADMIN_LEADS_QUERY_KEY = ["admin", "leads"] as const;
export { fetchAdminLeads };

type LeadUpdater = Lead[] | ((previous: Lead[]) => Lead[]);

export function useAdminLeads({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const query = useQuery({
    queryKey: ADMIN_LEADS_QUERY_KEY,
    queryFn: () => fetchAdminLeads(),
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const setLeads = useCallback(
    (updater: LeadUpdater) => {
      queryClient.setQueryData<Lead[]>(ADMIN_LEADS_QUERY_KEY, (current = []) =>
        typeof updater === "function" ? updater(current) : updater,
      );
    },
    [queryClient],
  );

  const refresh = useCallback(
    async ({
      showToast = false,
      successMessage = "Leads atualizados",
      errorMessage = "Erro ao carregar leads",
    }: { showToast?: boolean; successMessage?: string; errorMessage?: string } = {}) => {
      if (showToast) setSyncing(true);
      try {
        const result = await query.refetch({ throwOnError: true });
        if (result.error) throw result.error;
        if (showToast) toast.success(successMessage);
      } catch (error) {
        console.error("[admin-leads] fetch failed", error);
        if (showToast || !query.data?.length) toast.error(errorMessage);
      } finally {
        if (showToast) setSyncing(false);
      }
    },
    [query],
  );

  return {
    leads: query.data ?? [],
    loading: enabled && query.isLoading,
    fetching: query.isFetching,
    syncing,
    error: query.error,
    refresh,
    setLeads,
  };
}

export function useAdminLeadsRealtime(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const playNotification = () => {
      try {
        if (audioState.unlocked && audioState.primedAudio) {
          audioState.primedAudio.currentTime = 0;
          audioState.primedAudio.play().catch(err => {
            console.warn("[audio] play failed even after unlock", err);
          });
        } else {
          // Fallback if not unlocked yet
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
          audio.volume = 0.5;
          audio.play().catch(err => {
            console.warn("[audio] notification blocked by browser", err);
            toast.warning("Novo Lead (Som Bloqueado)", {
              description: "Clique no ícone de som no topo para ativar os alertas.",
              duration: 10000,
            });
          });
        }
      } catch (err) {
        console.warn("[audio] could not play notification", err);
      }
    };

    const channelId = `admin-leads-realtime-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, (payload) => {
        if (payload.eventType === "INSERT") {
          playNotification();
          toast.info("Novo lead recebido!", {
            description: (payload.new as Lead).nome,
            duration: 8000,
            icon: "🔔",
          });
        }

        queryClient.setQueryData<Lead[]>(ADMIN_LEADS_QUERY_KEY, (current = []) => {
          if (payload.eventType === "INSERT") {
            const next = payload.new as Lead;
            return [next, ...current.filter((lead) => lead.id !== next.id)].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            );
          }

          if (payload.eventType === "UPDATE") {
            const next = payload.new as Lead;
            return current.map((lead) => (lead.id === next.id ? next : lead));
          }

          if (payload.eventType === "DELETE") {
            const previous = payload.old as Partial<Lead>;
            return current.filter((lead) => lead.id !== previous.id);
          }

          return current;
        });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          queryClient.invalidateQueries({ queryKey: ADMIN_LEADS_QUERY_KEY });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
