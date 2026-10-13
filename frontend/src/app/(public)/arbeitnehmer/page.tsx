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

const ICONS: Record<string, React.ElementType> = {
  heart: Heart,
  file: FileText,
  euro: Euro,
  home: Home,
  building: Building2,
  shield: Shield,
};

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
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-700 text-white">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur text-sm font-medium mb-6">
            <Briefcase className="h-4 w-4" />
            {t("arbeitnehmer.heroBadge")}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold max-w-3xl leading-tight">
            {t("arbeitnehmer.heroTitle")}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl">
            {t("arbeitnehmer.heroSubtitle")}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-14 md:py-20 space-y-16">
        {/* Intro + Krankenkasse Highlight */}
        <section className="grid md:grid-cols-5 gap-8 items-stretch">
          <div className="md:col-span-3">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("arbeitnehmer.introTitle")}
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              {t("arbeitnehmer.introBody")}
            </p>
          </div>
          <Link
            href="/arbeitnehmer/krankenkasse"
            className="md:col-span-2 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white p-7 flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow"
          >
            <div>
              <Heart className="h-9 w-9 mb-4" />
              <h3 className="text-xl font-bold">{topics[0]?.title}</h3>
              <p className="mt-2 text-white/90 text-sm">{topics[0]?.desc}</p>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold">
              {topics[0]?.cta || t("arbeitnehmer.readMore")}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </section>

        {/* Topics */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            {t("arbeitnehmer.topicsTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic, idx) => {
              const Icon = ICONS[topic.icon] || FileText;
              const isKk = idx === 0;
              const card = (
                <div
                  className={`h-full rounded-2xl border p-6 transition-all ${
                    isKk
                      ? "border-rose-200 bg-rose-50 hover:border-rose-300"
                      : "border-gray-200 bg-white hover:border-primary-300 hover:shadow-md"
                  }`}
                >
                  <div
                    className={`inline-flex p-3 rounded-xl mb-4 ${
                      isKk ? "bg-rose-100 text-rose-600" : "bg-primary-50 text-primary-600"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg">{topic.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{topic.desc}</p>
                  {isKk && (
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600">
                      {topic.cta || t("arbeitnehmer.readMore")}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              );
              return isKk ? (
                <Link key={idx} href="/arbeitnehmer/krankenkasse">
                  {card}
                </Link>
              ) : (
                <div key={idx}>{card}</div>
              );
            })}
          </div>
        </section>

        {/* Blog articles */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="h-6 w-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {t("arbeitnehmer.articlesTitle")}
            </h2>
          </div>
          {articles.length === 0 ? (
            <p className="text-gray-500">{t("arbeitnehmer.articlesEmpty")}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((a) => (
                <Link
                  key={a.id}
                  href={a.path}
                  className="group rounded-2xl bg-white border border-gray-200 overflow-hidden hover:shadow-md hover:border-primary-300 transition-all"
                >
                  {a.featured_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.featured_image}
                      alt={a.title}
                      className="h-40 w-full object-cover"
                    />
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {a.title}
                    </h3>
                    {a.excerpt && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3">{a.excerpt}</p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600">
                      {t("arbeitnehmer.readMore")}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Manual links */}
        {manualLinks.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {t("arbeitnehmer.moreLinksTitle")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {manualLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-xl bg-white border border-gray-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all"
                >
                  <ExternalLink className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="font-medium text-gray-900 block">{link.title}</span>
                    {link.description && (
                      <span className="text-sm text-gray-600">{link.description}</span>
                    )}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
