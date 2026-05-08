import { Link } from "@tanstack/react-router";
import logo from "@/assets/nexus-logo.png";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Nexus CRM" className="h-7 w-7" width={28} height={28} loading="lazy" />
          <div>
            <p className="text-sm font-semibold tracking-tight">Coonecta Proteção Auto</p>
            <p className="text-xs text-muted-foreground">Atendimento humano. Proteção real.</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">
            Início
          </Link>
          <Link to="/cotacao" className="transition-colors hover:text-foreground">
            Cotação
          </Link>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Acesso interno
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Coonecta. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
