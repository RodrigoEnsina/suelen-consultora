import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  KanbanSquare,
  LogOut,
  Loader2,
  Menu,
  X,
  LayoutDashboard,
  Users,
  ChevronLeft,
  Settings,
  BarChart3,
  Target,
  Contrast,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLeads, useAdminLeadsRealtime } from "@/hooks/useAdminLeads";
import logo from "@/assets/nexus-logo.png";
import { toast } from "sonner";
import { AudioAlert } from "@/components/admin/AudioAlert";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel — Nexus CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

const navSections = [
  {
    label: "Visão geral",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Gestão de leads",
    items: [
      { to: "/admin/kanban", label: "Funil Kanban", icon: KanbanSquare, exact: false },
      { to: "/admin/leads", label: "Leads", icon: Users, exact: false },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
      { to: "/admin/pixels", label: "Pixels", icon: Target, exact: false },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/settings", label: "Configurações", icon: Settings, exact: false },
    ],
  },
] as const;

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("high-contrast") === "true";
    if (saved) {
      setHighContrast(true);
      document.documentElement.classList.add("high-contrast");
    }
  }, []);

  const toggleHighContrast = () => {
    const newVal = !highContrast;
    setHighContrast(newVal);
    localStorage.setItem("high-contrast", String(newVal));
    if (newVal) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  };
  const leadsEnabled = !loading && !!user;
  const { leads } = useAdminLeads({ enabled: leadsEnabled });
  useAdminLeadsRealtime(leadsEnabled);
  const counts = useMemo(
    () => ({ total: leads.length, novos: leads.filter((lead) => lead.status === "novo").length }),
    [leads],
  );

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/login" });
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials =
    (user.email ?? "?")
      .split("@")[0]
      .split(/[._-]/)
      .map((p) => p[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "U";

  const sidebarWidth = collapsed ? "md:w-[72px]" : "md:w-[260px]";

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar text-sidebar-foreground shadow-elevated md:hidden"
        aria-label="Menu"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] shrink-0 transform border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${sidebarWidth} ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            <Link to="/admin" className="flex items-center gap-2.5 overflow-hidden">
              <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center">
                <span className="absolute inset-0 rounded-xl bg-gradient-brand opacity-70 blur-md" />
                <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-accent ring-1 ring-white/10">
                  <img src={logo} alt="" className="h-5 w-5 object-contain" />
                </span>
              </span>
              {!collapsed && (
                <span className="truncate text-base font-semibold tracking-tight">
                  Nexus<span className="text-gradient-brand"> CRM</span>
                </span>
              )}
            </Link>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden h-7 w-7 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground md:inline-flex"
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              title={collapsed ? "Expandir" : "Recolher"}
            >
              <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Workspace meta */}
          {!collapsed && (
            <div className="mx-4 mt-4 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Workspace
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold">Coonecta · Suelen</p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-sidebar-foreground/70">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {counts.total} leads
                </span>
                {counts.novos > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 font-semibold text-primary">
                    {counts.novos} novos
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="mt-5 flex-1 overflow-y-auto px-3">
            {navSections.map((section) => (
              <div key={section.label} className="mb-5">
                {!collapsed && (
                  <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                    {section.label}
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const active = item.exact
                      ? location.pathname === item.to || location.pathname === "/admin/"
                      : location.pathname.startsWith(item.to);
                    const showBadge = item.to === "/admin/leads" && counts.novos > 0;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all ${
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        } ${collapsed ? "justify-center" : ""}`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-brand" />
                        )}
                        <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-primary" : ""}`} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {showBadge && (
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                {counts.novos}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer / user / tools */}
          <div className="border-t border-sidebar-border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex justify-center md:justify-start">
                <AudioAlert />
              </div>
              <button
                onClick={toggleHighContrast}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  highContrast 
                    ? "bg-primary text-primary-foreground shadow-glow" 
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
                aria-label="Alternar alto contraste"
                title="Alto Contraste"
              >
                <Contrast className="h-4 w-4" />
              </button>
            </div>
            {!collapsed ? (
              <div className="flex items-center gap-2.5 rounded-xl bg-sidebar-accent/40 p-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">Administrador</p>
                  <p className="truncate text-[11px] text-sidebar-foreground/60">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Sair"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center rounded-lg p-2 text-sidebar-foreground/70 transition-colors hover:bg-destructive/15 hover:text-destructive"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <button
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-sm md:hidden"
        />
      )}

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
