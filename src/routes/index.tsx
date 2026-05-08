import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Shield,
  Award,
  ArrowRight,
  Star,
  Phone,
  Truck,
  ShieldAlert,
  Wrench,
  Car,
  Clock,
  CheckCircle2,
  Quote,
  Loader2,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useConsultorWhatsapp, buildWhatsappUrl } from "@/hooks/useConsultorWhatsapp";
import { track } from "@/lib/tracking";
import suelenPhoto from "@/assets/suelen-broker.jpg";
import suelenPhoto320 from "@/assets/suelen-broker-320.jpg";
import suelenPhoto480 from "@/assets/suelen-broker-480.jpg";
import suelenPhoto720 from "@/assets/suelen-broker-720.jpg";
import suelenPhoto960 from "@/assets/suelen-broker-960.jpg";

const suelenSrcSet = `${suelenPhoto320} 320w, ${suelenPhoto480} 480w, ${suelenPhoto720} 720w, ${suelenPhoto960} 960w`;
const suelenSizes = "(max-width: 640px) 80vw, (max-width: 1024px) 22rem, 26rem";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Coonecta Proteção Auto — Cotação online em 2 minutos" },
      {
        name: "description",
        content:
          "Proteção veicular com atendimento humano. Cotação online em 2 minutos com a corretora Suelen — guincho 24h, cobertura roubo e furto, danos a terceiros e carro reserva.",
      },
      { property: "og:title", content: "Coonecta Proteção Auto — Cotação em 2 minutos" },
      {
        property: "og:description",
        content:
          "Atendimento humano e proteção real para o seu veículo. Faça sua cotação online em 2 minutos.",
      },
    ],
    links: [
      {
        rel: "preload",
        as: "image",
        href: suelenPhoto480,
        imageSrcSet: suelenSrcSet,
        imageSizes: suelenSizes,
        fetchPriority: "high",
      },
    ],
  }),
  component: HomePage,
});

const benefits = [
  {
    icon: Truck,
    title: "Guincho 24h",
    description: "Reboque ilimitado em todo o Brasil, com acionamento direto pelo app ou WhatsApp.",
  },
  {
    icon: ShieldAlert,
    title: "Roubo & Furto",
    description: "Cobertura completa contra roubo e furto, com indenização ágil e sem burocracia.",
  },
  {
    icon: Wrench,
    title: "Danos & Colisão",
    description: "Reparos em oficinas parceiras de qualidade, incluindo danos materiais e a terceiros.",
  },
  {
    icon: Car,
    title: "Carro Reserva",
    description: "Veículo reserva por até 30 dias para você não ficar a pé enquanto o seu é reparado.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function HomePage() {
  const [showFab, setShowFab] = useState(false);
  const { number: consultorNumber, loading: waLoading, updating: waUpdating } = useConsultorWhatsapp();
  const suelenWhatsappUrl = buildWhatsappUrl(
    consultorNumber,
    "Olá Suelen! Vim pelo site e quero conversar sobre uma cotação de proteção veicular. 🚗",
  );
  useEffect(() => {
    const onScroll = () => setShowFab(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* GLOBAL ANIMATED AURAS */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="animate-float-slow animate-pulse-glow absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.58 0.24 295 / 0.45), transparent 65%)" }}
          aria-hidden="true"
        />
        <div
          className="animate-float-slower animate-pulse-glow absolute top-1/3 -right-40 h-[40rem] w-[40rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.62 0.21 255 / 0.4), transparent 65%)" }}
          aria-hidden="true"
        />
        <div
          className="animate-float-slow absolute bottom-0 left-1/3 h-[32rem] w-[32rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.22 290 / 0.3), transparent 65%)" }}
          aria-hidden="true"
        />
      </div>

      <SiteHeader />

      {/* HERO */}
      <section className="relative pt-12 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.span
              variants={fadeUp}
              custom={0}
              className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium text-foreground/80 shadow-card sm:px-4 sm:text-xs"
            >
              <Clock className="h-3.5 w-3.5 text-primary" />
              Cotação online em 2 minutos
            </motion.span>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display mt-4 text-[1.625rem] font-extrabold leading-[1.1] tracking-tight xs:text-3xl sm:mt-6 sm:text-6xl md:text-7xl"
            >
              Proteção veicular{" "}
              <br className="hidden sm:block" />
              com <span className="text-gradient-brand">atendimento humano</span>,{" "}
              <br className="hidden sm:block" />
              do seu jeito.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
            >
              Sem robôs, sem letras miúdas. A corretora Suelen cuida da sua cotação pessoalmente
              e encontra a melhor proteção para o seu veículo em poucos minutos.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center"
            >
              <Link
                to="/cotacao"
                onClick={() => {
                  // Limpa progresso anterior para garantir que comece do zero
                  localStorage.removeItem("cotacao-funnel-v1");
                  track("cta_quote_click", { source: "hero" });
                }}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:scale-[1.03] sm:w-auto sm:px-7"
              >
                Fazer Cotação grátis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#beneficios"
                className="glass inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold transition-all hover:bg-card sm:w-auto sm:px-7"
              >
                Ver coberturas
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={4}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <span>+1.200 clientes protegidos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Sem compromisso</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="beneficios" className="relative py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-5xl">
              Coberturas que <span className="text-gradient-brand">cuidam de você</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
              Tudo que o seu veículo precisa, com a tranquilidade que você merece.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {benefits.map((b, i) => (
              <motion.article
                key={b.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                whileHover={{ scale: 1.04 }}
                transition={{ type: "spring", stiffness: 280, damping: 20 }}
                className="glass group relative overflow-hidden rounded-2xl p-6 shadow-card transition-shadow hover:shadow-glow"
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
                  style={{ background: "var(--gradient-brand)" }}
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* SOBRE A CORRETORA — CARD GLASS DIVIDIDO */}
      <section id="sobre" className="relative py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative overflow-hidden rounded-3xl shadow-elevated"
          >
            <div className="aura-bg pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative grid items-center gap-8 p-6 sm:gap-10 sm:p-8 md:grid-cols-2 md:p-14">
              {/* FOTO COM ANÉIS DE BRILHO */}
              <div className="flex justify-center">
                <div className="relative aspect-square w-[min(70vw,16rem)] sm:w-80 md:w-[22rem] lg:w-[26rem]">
                  <div
                    className="animate-spin-slow absolute -inset-6 rounded-full opacity-50 blur-2xl sm:-inset-8"
                    style={{ background: "conic-gradient(from 0deg, var(--brand-purple), var(--brand-blue), var(--brand-purple))" }}
                    aria-hidden="true"
                  />
                  <div className="absolute -inset-4 animate-pulse-glow rounded-full bg-gradient-brand opacity-40 blur-xl" />
                  <div className="absolute -inset-1 rounded-full bg-gradient-brand opacity-90 blur-sm" />
                  <img
                    src={suelenPhoto}
                    srcSet={suelenSrcSet}
                    sizes={suelenSizes}
                    alt="Corretora Suelen — Coonecta Proteção Auto"
                    width={520}
                    height={520}
                    decoding="async"
                    fetchPriority="high"
                    className="relative h-full w-full rounded-full object-cover shadow-elevated ring-4 ring-background"
                    style={{ objectPosition: "50% 22%" }}
                  />
                </div>
              </div>

              {/* TEXTO + SELOS */}
              <div>
                <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  6 anos de experiência
                </span>
                <h2 className="font-display mt-4 text-2xl font-extrabold tracking-tight sm:text-4xl">
                  Oi, eu sou a <span className="text-gradient-brand">Suelen</span>
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  Há <strong className="text-foreground">6 anos</strong> atuo no mercado de proteção
                  veicular ajudando famílias e empresas a encontrar a cobertura ideal — sem
                  complicação e sem letra miúda. Meu compromisso é simples:{" "}
                  <strong className="text-foreground">cuidar do seu carro como se fosse meu</strong>.
                </p>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Cada cotação é feita pensando na sua realidade: rotina, perfil de uso e orçamento.
                  Conte comigo do começo ao fim.
                </p>

                {/* SELOS DE CONFIANÇA */}
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="glass flex items-center gap-3 rounded-xl px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Corretora certificada</p>
                      <p className="text-xs text-muted-foreground">SUSEP regularizada</p>
                    </div>
                  </div>
                  <div className="glass flex items-center gap-3 rounded-xl px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Atendimento 5 estrelas</p>
                      <p className="text-xs text-muted-foreground">+1.200 clientes</p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/cotacao"
                    onClick={() => {
                      // Limpa progresso anterior para garantir que comece do zero
                      localStorage.removeItem("cotacao-funnel-v1");
                      track("cta_quote_click", { source: "suelen_section" });
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
                  >
                    Quero minha cotação
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={suelenWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (waLoading) { e.preventDefault(); return; }
                      track("whatsapp_click", { source: "suelen_section" });
                    }}
                    aria-label={
                      waLoading
                        ? "Carregando contato da Suelen no WhatsApp"
                        : waUpdating
                          ? "Atualizando número do WhatsApp"
                          : "Falar com a Suelen no WhatsApp"
                    }
                    aria-busy={waLoading || waUpdating}
                    aria-disabled={waLoading}
                    className={`glass inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${waLoading ? "cursor-progress opacity-70" : ""}`}
                  >
                    {waLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Phone className={`h-4 w-4 ${waUpdating ? "animate-pulse" : ""}`} />
                    )}
                    {waLoading ? "Carregando..." : waUpdating ? "Atualizando..." : "WhatsApp"}
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA FINAL — BANNER COM DEPOIMENTO */}
      <section className="relative py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl shadow-elevated"
            style={{ background: "var(--gradient-brand)" }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(60% 60% at 20% 30%, oklch(1 0 0 / 0.3), transparent 60%), radial-gradient(50% 50% at 80% 70%, oklch(0 0 0 / 0.25), transparent 65%)",
              }}
              aria-hidden="true"
            />

            <div className="relative grid items-center gap-8 p-6 text-primary-foreground sm:gap-10 sm:p-10 md:grid-cols-[1.2fr_1fr] md:p-14">
              <div>
                <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                  Pronto para proteger
                  <br />o seu veículo?
                </h2>
                <p className="mt-4 max-w-md text-base text-primary-foreground/85">
                  Sua cotação é gratuita, online e sem compromisso. Receba um plano sob medida em
                  poucos minutos.
                </p>
                <Link
                  to="/cotacao"
                  onClick={() => track("cta_quote_click", { source: "footer_cta" })}
                  className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-background px-6 py-3.5 text-sm font-bold text-foreground shadow-elevated transition-transform hover:scale-[1.04] sm:mt-8 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                >
                  Fazer cotação agora
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* DEPOIMENTO MARINA R. */}
              <figure className="glass-dark relative rounded-2xl p-6 text-primary-foreground shadow-card">
                <Quote className="absolute -top-3 -left-3 h-10 w-10 rounded-full bg-background p-2 text-primary shadow-card" />
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-primary-foreground/95">
                  "A Suelen me atendeu pelo WhatsApp num domingo à noite. Em 2 minutos eu tinha a
                  cotação na mão e fechei na hora. Atendimento que não existe mais."
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-sm font-bold">
                    MR
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Marina R.</p>
                    <p className="text-xs text-primary-foreground/70">Cliente desde 2024</p>
                  </div>
                </figcaption>
              </figure>
            </div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />

      {/* CTA flutuante mobile — leva ao funil de cotação */}
      <Link
        to="/cotacao"
        aria-label="Fazer cotação"
        onClick={() => track("cta_quote_click", { source: "mobile_fab" })}
        className={`fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-300 hover:scale-105 md:hidden ${
          showFab ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <Shield className="h-4 w-4" />
        Cotar agora
      </Link>
    </div>
  );
}
