import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  title: string;
  highlight?: string;
  emoji?: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, highlight, emoji, subtitle, breadcrumbs, actions, children }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="px-6 pl-16 pt-4 md:pl-8">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="breadcrumb" className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className={i === breadcrumbs.length - 1 ? "text-foreground" : ""}>{c.label}</span>
              </span>
            ))}
          </nav>
        )}
      </div>
      <div className="flex flex-col gap-3 px-6 py-4 pl-16 md:flex-row md:items-center md:justify-between md:pl-8 md:pr-8">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold leading-tight tracking-tight sm:text-[26px]">
            {title} {highlight && <span className="text-gradient-brand">{highlight}</span>} {emoji && <span>{emoji}</span>}
          </h1>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="border-t border-border/40 px-6 py-3 pl-16 md:pl-8 md:pr-8">{children}</div>}
    </header>
  );
}
