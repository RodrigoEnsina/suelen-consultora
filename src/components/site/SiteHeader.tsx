import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { track } from "@/lib/tracking";
import logo from "@/assets/nexus-logo.png";

export function SiteHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-3 z-40 mx-auto w-full max-w-6xl px-3 sm:top-4 sm:px-4"
    >
      <div className="glass-strong flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 shadow-card sm:px-4 sm:py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center sm:h-10 sm:w-10">
            <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-60 blur-md" aria-hidden="true" />
            <span className="glass relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/30 sm:h-10 sm:w-10">
              <img src={logo} alt="Coonecta" className="h-6 w-6 object-contain sm:h-7 sm:w-7" width={28} height={28} />
            </span>
          </span>
          <span className="truncate text-sm font-semibold tracking-tight sm:text-base">
            Coonecta<span className="text-gradient-brand"> Auto</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Início
          </Link>
          <Link
            to="/cotacao"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Cotação
          </Link>
          <a
            href="#sobre"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sobre
          </a>
        </nav>

        <Link
          to="/cotacao"
          onClick={() => track("cta_quote_click", { source: "header" })}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-brand px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] sm:px-5 sm:text-sm"
        >
          <span className="hidden sm:inline">Fazer Cotação</span>
          <span className="sm:hidden">Cotar</span>
        </Link>
      </div>
    </motion.header>
  );
}
