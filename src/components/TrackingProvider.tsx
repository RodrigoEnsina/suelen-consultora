import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { initTracking, trackPageView } from "@/lib/tracking";

/**
 * Bootstrap único de tracking: carrega pixels ativos e dispara PageView
 * a cada mudança de rota TanStack.
 */
export function TrackingProvider() {
  const location = useLocation();

  useEffect(() => {
    void initTracking();
  }, []);

  useEffect(() => {
    // PageView por rota (SPA)
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}
