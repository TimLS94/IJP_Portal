"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  FileCheck2,
  BookOpen,
  LogIn,
  MousePointerClick,
  FileText,
  CheckCircle2,
  Languages,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { insuranceAPI } from "@/lib/api";

interface Article {
  id: number;
  title: string;
  excerpt?: string;
  path: string;
  featured_image?: string;
}
interface Partner {
  name: string;
  url: string;
  signup_available: boolean;
}
interface Step {
  title: string;
  desc: string;
}

const PROCESS_ICONS = [LogIn, MousePointerClick, FileText, CheckCircle2];

/** Dezentes Einblenden beim Scrollen (fade + leichtes Hochgleiten). */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
        transition: `opacity .7s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .7s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function KrankenkassePage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [partner, setPartner] = useState<Partner>({
    name: "BARMER",
    url: "https://www.barmer.de",
    signup_available: false,
  });
  const [logoError, setLogoError] = useState(false);

  const [embassyChoice, setEmbassyChoice] = useState<null | boolean>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { redirect_url: string | null; embassy: boolean }>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const lang = (i18n.language || "de").split("-")[0];
    insuranceAPI
      .getContent("krankenkasse", lang)
      .then((res) => {
        setArticles(res.data.articles || []);
        if (res.data.partner) setPartner(res.data.partner);
      })
      .catch(() => {});
  }, [isClient, i18n.language]);

  const partnerName = partner.name || "BARMER";
  const gkvPoints = (t("krankenkasse.gkvPoints", { returnObjects: true }) as string[]) || [];
  const pkvPoints = (t("krankenkasse.pkvPoints", { returnObjects: true }) as string[]) || [];
  const process = (t("krankenkasse.process", { returnObjects: true }) as Step[]) || [];
  const heroPoints = (t("krankenkasse.heroPoints", { returnObjects: true }) as string[]) || [];
  const formSteps = (t("krankenkasse.formSteps", { returnObjects: true }) as string[]) || [];
  const marquee = (t("krankenkasse.marquee", { returnObjects: true }) as string[]) || [];

  const handleSignup = async () => {
    if (embassyChoice === null || !privacyAccepted) return;
    setSubmitting(true);
    try {
      const lang = (i18n.language || "de").split("-")[0];
      const res = await insuranceAPI.signup(embassyChoice, lang);
      setDone({ redirect_url: res.data.redirect_url || null, embassy: embassyChoice });
      if (res.data.redirect_url && !embassyChoice) {
        setTimeout(() => {
          window.location.href = res.data.redirect_url;
        }, 1800);
      }
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-primary-900 to-primary-800 text-white">
        <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-28">
          <Reveal>
            <Link
              href="/arbeitnehmer"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-7 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("krankenkasse.backToHub")}
            </Link>
          </Reveal>
          <Reveal delay={60}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-sm font-medium mb-6">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              {t("krankenkasse.heroBadge")}
            </span>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="text-4xl md:text-6xl font-bold max-w-3xl leading-[1.05] tracking-tight">
              {t("krankenkasse.heroTitle")}
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-6 text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">
              {t("krankenkasse.heroSubtitle")}
            </p>
          </Reveal>
          <Reveal delay={280}>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-5">
              <a
                href="#anmelden"
                className="kk-sheen relative overflow-hidden inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-primary-800 font-semibold shadow-lg shadow-primary-950/40 hover:-translate-y-0.5 hover:shadow-xl transition-all"
              >
                {t("krankenkasse.startCta")}
                <ArrowRight className="h-5 w-5" />
              </a>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {heroPoints.map((p, i) => (
                  <li key={i} className="inline-flex items-center gap-2 text-sm text-white/85">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
        {/* soft fade into page */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-b from-transparent to-slate-50" />
      </section>

      {/* Partner-Band: BARMER-Logo fest, Vertrauens-Punkte laufen dezent durch */}
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4 sm:gap-6">
          <a
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 shrink-0 pr-4 sm:pr-6 border-r border-slate-200"
            title={partnerName}
          >
            <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {t("krankenkasse.partnerStripLabel")}
            </span>
            {!logoError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/partners/barmer-logo.png"
                alt={partnerName}
                className="h-6 w-auto"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-[#0a9b4e] font-extrabold text-lg tracking-tight">
                {partnerName}
              </span>
            )}
          </a>
          <div className="kk-marquee-mask relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
            <div className="kk-marquee-track">
              {[...marquee, ...marquee].map((m, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 px-5 text-sm font-medium text-slate-600"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  {m}
                  <span className="ml-3 h-1.5 w-1.5 rounded-full bg-slate-200" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-14 md:py-20 space-y-20">
        {/* What is */}
        <Reveal>
          <section className="group rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-primary-50 text-primary-600 flex-shrink-0 ring-1 ring-primary-100 group-hover:scale-105 transition-transform">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t("krankenkasse.whatIsTitle")}</h2>
                <p className="mt-3 text-slate-600 leading-relaxed">{t("krankenkasse.whatIsBody")}</p>
              </div>
            </div>
          </section>
        </Reveal>

        {/* GKV vs PKV */}
        <section>
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
              {t("krankenkasse.typesTitle")}
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6">
            <Reveal delay={60}>
              <div className="h-full relative rounded-3xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-7 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="inline-flex px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-semibold mb-4 tracking-wide">
                  GKV
                </div>
                <h3 className="font-bold text-lg text-slate-900">{t("krankenkasse.gkvTitle")}</h3>
                <ul className="mt-4 space-y-3">
                  {gkvPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check className="h-5 w-5 text-primary-600 flex-shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div className="h-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="inline-flex px-3 py-1 rounded-full bg-slate-600 text-white text-xs font-semibold mb-4 tracking-wide">
                  PKV
                </div>
                <h3 className="font-bold text-lg text-slate-900">{t("krankenkasse.pkvTitle")}</h3>
                <ul className="mt-4 space-y-3">
                  {pkvPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Partner: BARMER */}
        <Reveal>
          <section className="group rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow">
            <div className="grid md:grid-cols-5">
              <div className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#0a9b4e] to-[#007a3d] p-8 flex flex-col items-center justify-center text-center gap-4">
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl kk-float" />
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative bg-white rounded-xl px-6 py-4 inline-flex items-center justify-center shadow-md hover:-translate-y-0.5 transition-transform"
                  title={partnerName}
                >
                  {!logoError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/partners/barmer-logo.png"
                      alt={partnerName}
                      className="h-9 w-auto"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <span className="text-[#0a9b4e] font-extrabold text-2xl tracking-tight">
                      {partnerName}
                    </span>
                  )}
                </a>
                <span className="relative text-white/90 text-xs font-medium uppercase tracking-widest">
                  {t("krankenkasse.partnerBadge")}
                </span>
              </div>
              <div className="md:col-span-3 p-8">
                <h2 className="text-2xl font-bold text-slate-900">
                  {t("krankenkasse.partnerTitle", { name: partnerName })}
                </h2>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  {t("krankenkasse.partnerBody", { name: partnerName })}
                </p>
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-primary-600 font-semibold hover:gap-3 transition-all"
                >
                  {t("krankenkasse.partnerCta", { name: partnerName })}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Process: explained timeline */}
        <section>
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                {t("krankenkasse.processTitle")}
              </h2>
              <p className="mt-3 text-slate-600">{t("krankenkasse.processSubtitle")}</p>
            </div>
          </Reveal>

          <div className="max-w-3xl mx-auto">
            {process.map((step, i) => {
              const Icon = PROCESS_ICONS[i] || FileText;
              const isLast = i === process.length - 1;
              const isFormStep = i === 2;
              return (
                <Reveal key={i} delay={i * 90}>
                  <div className="flex gap-5">
                    {/* left rail */}
                    <div className="flex flex-col items-center">
                      <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/30 ring-4 ring-slate-50 flex items-center justify-center">
                        <Icon className="h-6 w-6" />
                        <span className="absolute inset-0 rounded-2xl bg-primary-400/40 blur-md -z-10" />
                      </div>
                      {!isLast && (
                        <div className="w-0.5 flex-1 my-2 bg-gradient-to-b from-primary-300 to-primary-100" />
                      )}
                    </div>
                    {/* content card */}
                    <div className={`flex-1 ${isLast ? "pb-0" : "pb-8"}`}>
                      <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                        <span className="pointer-events-none absolute top-2 right-4 text-6xl leading-none font-black text-slate-100 select-none">
                          {i + 1}
                        </span>
                        <div className="relative">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-500">
                              {t("krankenkasse.stepLabel")} {i + 1}
                            </span>
                          </div>
                          <h3 className="mt-1 text-lg font-semibold text-slate-900">{step.title}</h3>
                          <p className="mt-1.5 text-slate-600 leading-relaxed">{step.desc}</p>

                          {isFormStep && (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                {t("krankenkasse.formStepsIntro")}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {formSteps.map((f, fi) => (
                                  <span
                                    key={fi}
                                    className="inline-flex items-center gap-2 rounded-full bg-white text-primary-700 ring-1 ring-primary-100 shadow-sm px-3 py-1.5 text-sm font-medium hover:ring-primary-300 transition-all"
                                  >
                                    <span className="h-4 w-4 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
                                      {fi + 1}
                                    </span>
                                    {f}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                                <Languages className="h-5 w-5 flex-shrink-0 text-amber-500" />
                                <span>{t("krankenkasse.processLangNote")}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary-500 to-emerald-400 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Rechtlicher Hinweis: keine Beratung */}
        <Reveal>
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <Info className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">{t("krankenkasse.legalTitle")}</p>
              <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                {t("krankenkasse.legalBody", { name: partnerName })}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Signup */}
        <Reveal>
          <section id="anmelden" className="scroll-mt-24">
            <div className="rounded-[28px] bg-white border border-slate-200 shadow-xl shadow-slate-300/40 overflow-hidden">
              <div className="relative overflow-hidden bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 px-8 py-7 text-white">
                <div className="absolute -top-12 right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl kk-float" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-white/15 ring-1 ring-white/20">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold">{t("krankenkasse.signupTitle")}</h2>
                    <p className="text-white/80 text-sm mt-0.5">{t("krankenkasse.signupBody")}</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {done ? (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold text-lg">
                      <CheckCircle2 className="h-6 w-6" />
                      {t("krankenkasse.successTitle")}
                    </div>
                    <p className="mt-2 text-slate-600">{t("krankenkasse.successBody")}</p>
                    {done.embassy && (
                      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
                        <FileCheck2 className="h-5 w-5 flex-shrink-0" />
                        <span>{t("krankenkasse.successEmbassyNote")}</span>
                      </div>
                    )}
                    {done.redirect_url && (
                      <a
                        href={done.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="kk-sheen relative overflow-hidden mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all shadow-sm hover:-translate-y-0.5"
                      >
                        {t("krankenkasse.continueButton")}
                        <ArrowRight className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                ) : !isClient ? (
                  <div className="h-24 animate-pulse bg-slate-100 rounded-xl" />
                ) : !isAuthenticated ? (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6">
                    <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                      <LogIn className="h-5 w-5 text-primary-600" />
                      {t("krankenkasse.loginRequiredTitle")}
                    </h3>
                    <p className="mt-2 text-slate-600">{t("krankenkasse.loginRequiredBody")}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href="/login"
                        className="kk-sheen relative overflow-hidden px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all shadow-sm hover:-translate-y-0.5"
                      >
                        {t("krankenkasse.loginButton")}
                      </Link>
                      <Link
                        href="/register"
                        className="px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:border-primary-300 hover:text-primary-700 transition-colors"
                      >
                        {t("krankenkasse.registerButton")}
                      </Link>
                    </div>
                  </div>
                ) : !partner.signup_available ? (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6">
                    <h3 className="font-semibold text-lg text-slate-900">
                      {t("krankenkasse.notAvailableTitle")}
                    </h3>
                    <p className="mt-2 text-slate-600">{t("krankenkasse.notAvailableBody")}</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <p className="font-medium text-slate-900">{t("krankenkasse.embassyQuestion")}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[true, false].map((choice) => {
                        const selected = embassyChoice === choice;
                        return (
                          <button
                            key={String(choice)}
                            type="button"
                            onClick={() => setEmbassyChoice(choice)}
                            className={`text-left rounded-2xl border-2 p-4 transition-all ${
                              selected
                                ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100 shadow-sm"
                                : "border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50 hover:-translate-y-0.5"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  selected ? "border-primary-600 bg-primary-600" : "border-slate-300"
                                }`}
                              >
                                {selected && <Check className="h-3 w-3 text-white" />}
                              </span>
                              <span className="text-sm text-slate-700">
                                {choice ? t("krankenkasse.embassyYes") : t("krankenkasse.embassyNo")}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <input
                        type="checkbox"
                        checked={privacyAccepted}
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-600 leading-relaxed">
                        {t("krankenkasse.privacyConsent")}{" "}
                        <Link href="/datenschutz" className="text-primary-600 underline hover:text-primary-700">
                          {t("krankenkasse.privacyPolicyLink")}
                        </Link>
                        .
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleSignup}
                      disabled={embassyChoice === null || !privacyAccepted || submitting}
                      className="kk-sheen relative overflow-hidden inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-sm enabled:hover:-translate-y-0.5"
                    >
                      {submitting ? t("krankenkasse.signupLoading") : t("krankenkasse.signupButton")}
                      {!submitting && <ArrowRight className="h-5 w-5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </Reveal>

        {/* Articles */}
        {articles.length > 0 && (
          <section>
            <Reveal>
              <div className="flex items-center gap-3 mb-8">
                <BookOpen className="h-6 w-6 text-primary-600" />
                <h2 className="text-2xl font-bold text-slate-900">
                  {t("krankenkasse.articlesTitle")}
                </h2>
              </div>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((a, i) => (
                <Reveal key={a.id} delay={i * 70}>
                  <Link
                    href={a.path}
                    className="group block h-full rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-primary-300 hover:-translate-y-1 transition-all"
                  >
                    {a.featured_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.featured_image}
                        alt={a.title}
                        className="h-40 w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    )}
                    <div className="p-5">
                      <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="mt-2 text-sm text-slate-600 line-clamp-3">{a.excerpt}</p>
                      )}
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 text-center max-w-2xl mx-auto">
          {t("krankenkasse.disclaimer", { name: partnerName })}
        </p>
      </div>
    </div>
  );
}
