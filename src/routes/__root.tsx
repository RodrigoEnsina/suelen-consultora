import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TrackingProvider } from "@/components/TrackingProvider";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="aura-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative max-w-md text-center">
        <h1 className="text-gradient-brand text-8xl font-bold">404</h1>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  headers: () => ({
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://www.facebook.com https://api.fipe.org",
      "frame-src 'self' https://www.facebook.com https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nexus CRM — Coonecta Proteção Auto" },
      {
        name: "description",
        content:
          "Cotação de proteção veicular rápida, transparente e atendimento humano com a corretora Suelen. Faça sua cotação online em minutos.",
      },
      { name: "author", content: "Coonecta Proteção Auto" },
      { property: "og:title", content: "Nexus CRM — Coonecta Proteção Auto" },
      {
        property: "og:description",
        content: "Cotação de proteção veicular online com atendimento humano e transparente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Nexus CRM — Coonecta Proteção Auto" },
      { name: "description", content: "A digital space for Consultora Suelen, featuring a clean, branded landing page." },
      { property: "og:description", content: "A digital space for Consultora Suelen, featuring a clean, branded landing page." },
      { name: "twitter:description", content: "A digital space for Consultora Suelen, featuring a clean, branded landing page." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e2866b6c-23e5-4e5b-a49a-cd423abc27a1/id-preview-aa53e472--dc74fe9c-0c2a-4bc0-a386-677e2adc4235.lovable.app-1777513956512.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e2866b6c-23e5-4e5b-a49a-cd423abc27a1/id-preview-aa53e472--dc74fe9c-0c2a-4bc0-a386-677e2adc4235.lovable.app-1777513956512.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        {/* DSL:hide-lovable-badge */}
        <style id="dsl-hide-badge">
          {`
            lovable-badge,gpt-engineer-badge,
            [class*='lovable-badge' i],[class*='gpt-engineer' i],
            [data-lovable-badge],[data-gpt-engineer],
            [id*='lovable-badge' i],[id*='lovable-edit' i],[id*='gpt-engineer' i],
            a[href*='lovable.dev/projects' i],
            a[href*='lovable.dev' i][target='_blank'],
            a[href*='gptengineer' i],a[href*='gpteng.co' i]{
              display:none !important;visibility:hidden !important;
              opacity:0 !important;pointer-events:none !important;
              width:0 !important;height:0 !important;
              max-width:0 !important;max-height:0 !important;
              position:fixed !important;left:-99999px !important;top:-99999px !important;
              transform:scale(0) !important;clip-path:inset(100%) !important;
            }
          `}
        </style>
        <script>
          {`
            (function(){
              var MARKER='DSL:hide-lovable-badge';
              var BADGE_TAGS=['lovable-badge','gpt-engineer-badge'];
              // 1) Bloqueia o registro do custom element ANTES do script da Lovable rodar
              try{
                var origDefine=window.customElements&&window.customElements.define;
                if(origDefine){
                  window.customElements.define=function(name){
                    if(BADGE_TAGS.indexOf((name||'').toLowerCase())>-1)return;
                    return origDefine.apply(this,arguments);
                  };
                }
              }catch(e){}
              // 2) Bloqueia scripts da Lovable/gptengineer que injetam o badge
              try{
                var origCreate=document.createElement.bind(document);
                document.createElement=function(tag){
                  var el=origCreate.apply(document,arguments);
                  if((tag||'').toLowerCase()==='script'){
                    try{
                      var setSrc=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
                      Object.defineProperty(el,'src',{
                        set:function(v){
                          if(/lovable\\.dev|gptengineer|gpteng\\.co/i.test(String(v||''))){return;}
                          setSrc.set.call(this,v);
                        },
                        get:function(){return setSrc.get.call(this);}
                      });
                    }catch(_){}
                  }
                  return el;
                };
              }catch(e){}
              function kill(el){
                if(!el||el.__dslKilled)return;
                el.__dslKilled=true;
                try{el.remove();}catch(e){
                  try{el.style.cssText='display:none!important;visibility:hidden!important;opacity:0!important;width:0!important;height:0!important;position:fixed!important;left:-99999px!important;top:-99999px!important;';}catch(_){}
                }
              }
              function sweep(root){
                try{
                  root=root||document;
                  var sels=[
                    'lovable-badge','gpt-engineer-badge',
                    '[class*="lovable-badge" i]','[class*="gpt-engineer" i]',
                    '[data-lovable-badge]','[data-gpt-engineer]',
                    '[id*="lovable-badge" i]','[id*="lovable-edit" i]','[id*="gpt-engineer" i]',
                    'a[href*="lovable.dev/projects" i]',
                    'a[href*="lovable.dev" i][target="_blank"]',
                    'a[href*="gptengineer" i]','a[href*="gpteng.co" i]'
                  ];
                  sels.forEach(function(s){
                    try{root.querySelectorAll(s).forEach(kill);}catch(_){}
                  });
                  // Varredura textual + shadow DOM
                  try{
                    root.querySelectorAll('*').forEach(function(el){
                      var t=(el.textContent||'').trim().toLowerCase();
                      if(t==='edit with lovable'||t==='made with lovable'||t==='built with lovable'||t==='powered by lovable'){
                        // sobe pro container clicável
                        var p=el.closest('a,button,div[role="button"]')||el;
                        kill(p);
                      }
                      if(el.shadowRoot)sweep(el.shadowRoot);
                    });
                  }catch(_){}
                }catch(e){}
              }
              sweep(document);
              var obs=new MutationObserver(function(muts){
                muts.forEach(function(m){
                  m.addedNodes&&m.addedNodes.forEach(function(n){
                    if(n.nodeType===1)sweep(n);
                  });
                });
              });
              try{obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true});}catch(e){}
              document.addEventListener('DOMContentLoaded',function(){sweep(document);});
              [100,500,1000,2000,3000,5000,8000].forEach(function(ms){setTimeout(function(){sweep(document);},ms);});
            })();
          `}
        </script>
        {/* DSL:hide-lovable-badge */}
      </head>
      <body>
        {children}
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = Route.useRouterState({ select: (s) => s.location });
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <QueryClientProvider client={queryClient}>
      <TrackingProvider />
      <Outlet />
      {!isAdmin && <WhatsAppFab />}
    </QueryClientProvider>
  );
}
