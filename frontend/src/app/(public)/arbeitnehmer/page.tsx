"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Heart,
  FileText,
  Euro,
  Home,
  Building2,
  Shield,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Briefcase,
} from "lucide-react";
import { insuranceAPI } from "@/lib/api";
import Reveal from "@/components/Reveal";

const ICONS: Record<string, React.ElementType> = {
  heart: Heart,
  file: FileText,
  euro: Euro,
  home: Home,
  building: Building2,
  shield: Shield,
};

// Zielseiten je Thema (Reihenfolge wie in i18n arbeitnehmer.topics).
// undefined = noch keine eigene Seite (Karte ist dann nicht verlinkt).
const TOPIC_HREFS: (string | undefined)[] = [
  "/arbeitnehmer/krankenkasse",
  "/arbeitnehmer/arbeitsvertrag",
  "/arbeitnehmer/steuern",
  "/arbeitnehmer/anmeldung",
  "/arbeitnehmer/bankkonto",
  "/arbeitnehmer/rechte",
];

interface Topic {
  icon: string;
  title: string;
  desc: string;
  cta?: string;
}
interface Article {
  id: number;
  title: string;
  excerpt?: string;
  path: string;
  featured_image?: string;
}
interface ManualLink {
  title: string;
  url: string;
  description?: string;
}

export default function ArbeitnehmerPage() {
  const { t, i18n } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [manualLinks, setManualLinks] = useState<ManualLink[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    insuranceAPI.track("view_arbeitnehmer");
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const lang = (i18n.language || "de").split("-")[0];
    insuranceAPI
      .getContent("hub", lang)
      .then((res) => {
        setArticles(res.data.articles || []);
        setManualLinks(res.data.manual_links || []);
      })
      .catch(() => {
        setArticles([]);
        setManualLinks([]);
      });
  }, [isClient, i18n.language]);

  const topics = (t("arbeitnehmer.topics", { returnObjects: true }) as Topic[]) || [];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-primary-900 to-primary-800 text-white">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:52px_52px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_72%)]" />
        <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-primary-400/15 blur-3xl" />
        <div className="absolute top-24 -left-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-sm font-medium mb-6">
              <Briefcase className="h-4 w-4 text-emerald-300" />
              {t("arbeitnehmer.heroBadge")}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="text-4xl md:text-6xl font-bold max-w-3xl leading-[1.05] tracking-tight">
              {t("arbeitnehmer.heroTitle")}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">
              {t("arbeitnehmer.heroSubtitle")}
            </p>
          </Reveal>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20 space-y-16">
        {/* Intro + Krankenkasse Highlight */}
        <section className="grid md:grid-cols-5 gap-8 items-stretch">
          <Reveal className="md:col-span-3 self-center">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              {t("arbeitnehmer.introTitle")}
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">{t("arbeitnehmer.introBody")}</p>
          </Reveal>
          <Reveal delay={120} className="md:col-span-2">
            <Link
              href="/arbeitnehmer/krankenkasse"
              className="group relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-7 flex flex-col justify-between shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <Heart className="h-9 w-9 mb-4" />
                <h3 className="text-xl font-bold">{topics[0]?.title}</h3>
                <p className="mt-2 text-white/90 text-sm">{topics[0]?.desc}</p>
              </div>
              <span className="relative mt-6 inline-flex items-center gap-2 font-semibold">
                {topics[0]?.cta || t("arbeitnehmer.readMore")}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </Reveal>
        </section>

        {/* Topics */}
        <section>
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">
              {t("arbeitnehmer.topicsTitle")}
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic, idx) => {
              const Icon = ICONS[topic.icon] || FileText;
              const href = TOPIC_HREFS[idx];
              const isKk = idx === 0;
              const inner = (
                <div
                  className={`h-full relative overflow-hidden rounded-2xl border p-6 transition-all ${
                    href ? "hover:-translate-y-1 hover:shadow-lg" : ""
                  } ${
                    isKk
                      ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300"
                      : "border-slate-200 bg-white hover:border-primary-300"
                  }`}
                >
                  <div
                    className={`inline-flex p-3 rounded-xl mb-4 transition-transform ${
                      href ? "group-hover:scale-105" : ""
                    } ${isKk ? "bg-emerald-100 text-emerald-700" : "bg-primary-50 text-primary-600"}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-lg">{topic.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{topic.desc}</p>
                  {href && (
                    <span
                      className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${
                        isKk ? "text-emerald-700" : "text-primary-600"
                      }`}
                    >
                      {topic.cta || t("arbeitnehmer.readMore")}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                  {href && (
                    <span
                      className={`absolute inset-x-0 bottom-0 h-1 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ${
                        isKk
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : "bg-gradient-to-r from-primary-500 to-emerald-400"
                      }`}
                    />
                  )}
                </div>
              );
              return (
                <Reveal key={idx} delay={(idx % 3) * 70}>
                  {href ? (
                    <Link href={href} className="group block h-full">
                      {inner}
                    </Link>
                  ) : (
                    <div className="h-full">{inner}</div>
                  )}
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Blog articles */}
        <section>
          <Reveal>
            <div className="flex items-center gap-3 mb-8">
              <BookOpen className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-slate-900">
                {t("arbeitnehmer.articlesTitle")}
              </h2>
            </div>
          </Reveal>
          {articles.length === 0 ? (
            <p className="text-slate-500">{t("arbeitnehmer.articlesEmpty")}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((a, i) => (
                <Reveal key={a.id} delay={(i % 3) * 70}>
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
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600">
                        {t("arbeitnehmer.readMore")}
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </section>

        {/* Manual links */}
        {manualLinks.length > 0 && (
          <section>
            <Reveal>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {t("arbeitnehmer.moreLinksTitle")}
              </h2>
            </Reveal>
            <div className="grid sm:grid-cols-2 gap-4">
              {manualLinks.map((link, idx) => (
                <Reveal key={idx} delay={(idx % 2) * 70}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-xl bg-white border border-slate-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all"
                  >
                    <ExternalLink className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium text-slate-900 block">{link.title}</span>
                      {link.description && (
                        <span className="text-sm text-slate-600">{link.description}</span>
                      )}
                    </span>
                  </a>
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
