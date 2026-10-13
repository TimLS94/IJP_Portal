"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Heart,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  FileCheck2,
  BookOpen,
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
  const steps = (t("krankenkasse.steps", { returnObjects: true }) as Step[]) || [];
  const gkvPoints = (t("krankenkasse.gkvPoints", { returnObjects: true }) as string[]) || [];
  const pkvPoints = (t("krankenkasse.pkvPoints", { returnObjects: true }) as string[]) || [];

  const handleSignup = async () => {
    if (embassyChoice === null) return;
    setSubmitting(true);
    try {
      const lang = (i18n.language || "de").split("-")[0];
      const res = await insuranceAPI.signup(embassyChoice, lang);
      setDone({ redirect_url: res.data.redirect_url || null, embassy: embassyChoice });
      // Direkt weiterleiten, wenn kein Botschafts-Hinweis nötig ist und ein Link existiert
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
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_80%_20%,white_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24">
          <Link
            href="/arbeitnehmer"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("krankenkasse.backToHub")}
          </Link>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur text-sm font-medium mb-5">
            <Heart className="h-4 w-4" />
            {t("krankenkasse.heroBadge")}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold max-w-3xl leading-tight">
            {t("krankenkasse.heroTitle")}
          </h1>
          <p className="mt-6 text-lg text-white/90 max-w-2xl">
            {t("krankenkasse.heroSubtitle")}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-14 md:py-20 space-y-16">
        {/* What is */}
        <section className="rounded-2xl bg-white border border-gray-200 p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary-50 text-primary-600 flex-shrink-0">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t("krankenkasse.whatIsTitle")}
              </h2>
              <p className="mt-3 text-gray-600 leading-relaxed">
                {t("krankenkasse.whatIsBody")}
              </p>
            </div>
          </div>
        </section>

        {/* GKV vs PKV */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {t("krankenkasse.typesTitle")}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-7">
              <div className="inline-flex px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-semibold mb-4">
                GKV
              </div>
              <h3 className="font-bold text-lg text-gray-900">{t("krankenkasse.gkvTitle")}</h3>
              <ul className="mt-4 space-y-3">
                {gkvPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check className="h-5 w-5 text-primary-600 flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-7">
              <div className="inline-flex px-3 py-1 rounded-full bg-gray-700 text-white text-xs font-semibold mb-4">
                PKV
              </div>
              <h3 className="font-bold text-lg text-gray-900">{t("krankenkasse.pkvTitle")}</h3>
              <ul className="mt-4 space-y-3">
                {pkvPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            {t("krankenkasse.stepsTitle")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative rounded-2xl bg-white border border-gray-200 p-6">
                <div className="absolute -top-4 left-6 h-9 w-9 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center shadow">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Partner: BARMER */}
        <section className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
          <div className="grid md:grid-cols-5">
            <div className="md:col-span-2 bg-gradient-to-br from-[#0a9b4e] to-[#007a3d] p-8 flex flex-col items-center justify-center text-center gap-4">
              <a
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl px-6 py-4 inline-flex items-center justify-center shadow"
                title={partnerName}
              >
                {!logoError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/partners/barmer-logo.png"
                    alt={partnerName}
                    className="h-10 w-auto"
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
              <h2 className="text-2xl font-bold text-gray-900">
                {t("krankenkasse.partnerTitle", { name: partnerName })}
              </h2>
              <p className="mt-3 text-gray-600 leading-relaxed">
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

        {/* Signup */}
        <section
          id="anmelden"
          className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 md:p-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
            <h2 className="text-2xl font-bold">{t("krankenkasse.signupTitle")}</h2>
          </div>
          <p className="text-white/80 max-w-2xl">{t("krankenkasse.signupBody")}</p>

          {/* State 1: success */}
          {done ? (
            <div className="mt-8 rounded-xl bg-white/10 border border-white/15 p-6">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-lg">
                <Check className="h-6 w-6" />
                {t("krankenkasse.successTitle")}
              </div>
              <p className="mt-2 text-white/85">{t("krankenkasse.successBody")}</p>
              {done.embassy && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-500/15 border border-amber-400/30 p-4 text-amber-100 text-sm">
                  <FileCheck2 className="h-5 w-5 flex-shrink-0" />
                  <span>{t("krankenkasse.successEmbassyNote")}</span>
                </div>
              )}
              {done.redirect_url && (
                <a
                  href={done.redirect_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
                >
                  {t("krankenkasse.continueButton")}
                  <ArrowRight className="h-5 w-5" />
                </a>
              )}
            </div>
          ) : !isClient ? null : !isAuthenticated ? (
            /* State 2: login required */
            <div className="mt-8 rounded-xl bg-white/10 border border-white/15 p-6">
              <h3 className="font-semibold text-lg">{t("krankenkasse.loginRequiredTitle")}</h3>
              <p className="mt-2 text-white/80">{t("krankenkasse.loginRequiredBody")}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors"
                >
                  {t("krankenkasse.loginButton")}
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-3 rounded-xl bg-white/15 border border-white/25 font-semibold hover:bg-white/25 transition-colors"
                >
                  {t("krankenkasse.registerButton")}
                </Link>
              </div>
            </div>
          ) : !partner.signup_available ? (
            /* State 3: not yet available */
            <div className="mt-8 rounded-xl bg-white/10 border border-white/15 p-6">
              <h3 className="font-semibold text-lg">{t("krankenkasse.notAvailableTitle")}</h3>
              <p className="mt-2 text-white/80">{t("krankenkasse.notAvailableBody")}</p>
            </div>
          ) : (
            /* State 4: the form */
            <div className="mt-8 space-y-5">
              <p className="font-medium">{t("krankenkasse.embassyQuestion")}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEmbassyChoice(true)}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    embassyChoice === true
                      ? "border-emerald-400 bg-emerald-500/15"
                      : "border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        embassyChoice === true ? "border-emerald-400 bg-emerald-400" : "border-white/40"
                      }`}
                    >
                      {embassyChoice === true && <Check className="h-3 w-3 text-gray-900" />}
                    </span>
                    <span className="text-sm">{t("krankenkasse.embassyYes")}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setEmbassyChoice(false)}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    embassyChoice === false
                      ? "border-emerald-400 bg-emerald-500/15"
                      : "border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        embassyChoice === false ? "border-emerald-400 bg-emerald-400" : "border-white/40"
                      }`}
                    >
                      {embassyChoice === false && <Check className="h-3 w-3 text-gray-900" />}
                    </span>
                    <span className="text-sm">{t("krankenkasse.embassyNo")}</span>
                  </div>
                </button>
              </div>
              <button
                type="button"
                onClick={handleSignup}
                disabled={embassyChoice === null || submitting}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {submitting ? t("krankenkasse.signupLoading") : t("krankenkasse.signupButton")}
                {!submitting && <ArrowRight className="h-5 w-5" />}
              </button>
            </div>
          )}
        </section>

        {/* Articles */}
        {articles.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <BookOpen className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                {t("krankenkasse.articlesTitle")}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((a) => (
                <Link
                  key={a.id}
                  href={a.path}
                  className="group rounded-2xl bg-white border border-gray-200 overflow-hidden hover:shadow-md hover:border-primary-300 transition-all"
                >
                  {a.featured_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.featured_image} alt={a.title} className="h-40 w-full object-cover" />
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {a.title}
                    </h3>
                    {a.excerpt && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3">{a.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center max-w-2xl mx-auto">
          {t("krankenkasse.disclaimer", { name: partnerName })}
        </p>
      </div>
    </div>
  );
}
