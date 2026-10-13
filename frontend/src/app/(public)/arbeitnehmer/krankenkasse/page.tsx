"use client";

import { useEffect, useState } from "react";
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

  // Signup state
  const [embassyChoice, setEmbassyChoice] = useState<null | boolean>(null);
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

  const handleSignup = async () => {
    if (embassyChoice === null) return;
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
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-primary-700 text-white">
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_85%_15%,white_1px,transparent_1px)] [background-size:26px_26px]" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24">
          <Link
            href="/arbeitnehmer"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("krankenkasse.backToHub")}
          </Link>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-sm font-medium mb-5">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            {t("krankenkasse.heroBadge")}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold max-w-3xl leading-tight tracking-tight">
            {t("krankenkasse.heroTitle")}
          </h1>
          <p className="mt-6 text-lg text-white/80 max-w-2xl leading-relaxed">
            {t("krankenkasse.heroSubtitle")}
          </p>
          <a
            href="#anmelden"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-primary-800 font-semibold shadow-lg shadow-primary-950/30 hover:-translate-y-0.5 hover:shadow-xl transition-all"
          >
            {t("krankenkasse.startCta")}
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-14 md:py-20 space-y-16">
        {/* What is */}
        <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary-50 text-primary-600 flex-shrink-0 ring-1 ring-primary-100">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {t("krankenkasse.whatIsTitle")}
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">
                {t("krankenkasse.whatIsBody")}
              </p>
            </div>
          </div>
        </section>

        {/* GKV vs PKV */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {t("krankenkasse.typesTitle")}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-7 shadow-sm">
              <div className="inline-flex px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-semibold mb-4">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="inline-flex px-3 py-1 rounded-full bg-slate-600 text-white text-xs font-semibold mb-4">
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
          </div>
        </section>

        {/* Partner: BARMER */}
        <section className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="grid md:grid-cols-5">
            <div className="md:col-span-2 bg-gradient-to-br from-[#0a9b4e] to-[#007a3d] p-8 flex flex-col items-center justify-center text-center gap-4">
              <a
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl px-6 py-4 inline-flex items-center justify-center shadow-md hover:-translate-y-0.5 transition-transform"
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
              <span className="text-white/90 text-xs font-medium uppercase tracking-widest">
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

        {/* Process: so läuft die Anmeldung */}
        <section>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              {t("krankenkasse.processTitle")}
            </h2>
            <p className="mt-3 text-slate-600">{t("krankenkasse.processSubtitle")}</p>
          </div>
          <div className="relative grid md:grid-cols-4 gap-5">
            {/* connecting line */}
            <div className="hidden md:block absolute top-7 left-[12%] right-[12%] h-px bg-gradient-to-r from-primary-200 via-primary-300 to-primary-200" />
            {process.map((step, i) => {
              const Icon = PROCESS_ICONS[i] || FileText;
              return (
                <div key={i} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative z-10 h-14 w-14 rounded-2xl bg-white border border-primary-200 shadow-sm flex items-center justify-center text-primary-600">
                      <Icon className="h-6 w-6" />
                      <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shadow">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex items-start gap-2.5 max-w-2xl mx-auto rounded-xl bg-primary-50 border border-primary-100 p-4 text-sm text-primary-800">
            <Languages className="h-5 w-5 flex-shrink-0 text-primary-500" />
            <span>{t("krankenkasse.processLangNote")}</span>
          </div>
        </section>

        {/* Signup */}
        <section id="anmelden" className="scroll-mt-20">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-700 to-primary-600 px-8 py-6 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/15 ring-1 ring-white/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">{t("krankenkasse.signupTitle")}</h2>
                  <p className="text-white/80 text-sm mt-0.5">{t("krankenkasse.signupBody")}</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* State 1: success */}
              {done ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-lg">
                    <CheckCircle2 className="h-6 w-6" />
                    {t("krankenkasse.successTitle")}
                  </div>
                  <p className="mt-2 text-slate-600">{t("krankenkasse.successBody")}</p>
                  {done.embassy && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
                      <FileCheck2 className="h-5 w-5 flex-shrink-0" />
                      <span>{t("krankenkasse.successEmbassyNote")}</span>
                    </div>
                  )}
                  {done.redirect_url && (
                    <a
                      href={done.redirect_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-colors shadow-sm hover:-translate-y-0.5"
                    >
                      {t("krankenkasse.continueButton")}
                      <ArrowRight className="h-5 w-5" />
                    </a>
                  )}
                </div>
              ) : !isClient ? (
                <div className="h-24 animate-pulse bg-slate-100 rounded-xl" />
              ) : !isAuthenticated ? (
                /* State 2: login required */
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
                  <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                    <LogIn className="h-5 w-5 text-primary-600" />
                    {t("krankenkasse.loginRequiredTitle")}
                  </h3>
                  <p className="mt-2 text-slate-600">{t("krankenkasse.loginRequiredBody")}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/login"
                      className="px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-sm hover:-translate-y-0.5"
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
                /* State 3: not yet available */
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
                  <h3 className="font-semibold text-lg text-slate-900">
                    {t("krankenkasse.notAvailableTitle")}
                  </h3>
                  <p className="mt-2 text-slate-600">{t("krankenkasse.notAvailableBody")}</p>
                </div>
              ) : (
                /* State 4: the form */
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
                          className={`text-left rounded-xl border-2 p-4 transition-all ${
                            selected
                              ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100"
                              : "border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
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
                  <button
                    type="button"
                    onClick={handleSignup}
                    disabled={embassyChoice === null || submitting}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-sm enabled:hover:-translate-y-0.5"
                  >
                    {submitting ? t("krankenkasse.signupLoading") : t("krankenkasse.signupButton")}
                    {!submitting && <ArrowRight className="h-5 w-5" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Articles */}
        {articles.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <BookOpen className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-slate-900">
                {t("krankenkasse.articlesTitle")}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((a) => (
                <Link
                  key={a.id}
                  href={a.path}
                  className="group rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-primary-300 hover:-translate-y-0.5 transition-all"
                >
                  {a.featured_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.featured_image} alt={a.title} className="h-40 w-full object-cover" />
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
