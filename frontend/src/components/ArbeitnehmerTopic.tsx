"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, BookOpen, Lightbulb } from "lucide-react";
import { blogAPI } from "@/lib/api";
import Reveal from "@/components/Reveal";

interface Section {
  heading: string;
  body: string;
}
interface Article {
  id: number;
  title: string;
  excerpt?: string;
  slug: string;
  language?: string;
  featured_image?: string;
}

/**
 * Wiederverwendbare, kompakte Themen-Seite für "Für Arbeitnehmer".
 * Inhalte kommen aus i18n unter arbeitnehmerTopics.<topicKey>.*,
 * passende Blogartikel werden automatisch per Tag geladen.
 */
export default function ArbeitnehmerTopic({
  topicKey,
  tag,
  icon: Icon,
}: {
  topicKey: string;
  tag: string;
  icon: React.ElementType;
}) {
  const { t, i18n } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !tag) return;
    const lang = (i18n.language || "de").split("-")[0];
    const load = async (l: string) => {
      const res = await blogAPI.getPosts({ language: l, search: tag, limit: 6 });
      return (res.data || []) as Article[];
    };
    load(lang)
      .then((rows) => (rows.length === 0 && lang !== "de" ? load("de") : rows))
      .then(setArticles)
      .catch(() => setArticles([]));
  }, [isClient, i18n.language, tag]);

  const base = `arbeitnehmerTopics.${topicKey}`;
  const keyPoints = (t(`${base}.keyPoints`, { returnObjects: true }) as string[]) || [];
  const sections = (t(`${base}.sections`, { returnObjects: true }) as Section[]) || [];

  const articlePath = (a: Article) => {
    const lang = a.language || "de";
    return lang === "de" ? `/blog/${a.slug}` : `/blog/${lang}/${a.slug}`;
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-primary-900 to-primary-800 text-white">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:52px_52px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_72%)]" />
        <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-primary-400/15 blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-4 py-16 md:py-24">
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
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-sm font-medium mb-5">
              <Icon className="h-4 w-4 text-emerald-300" />
              {t(`${base}.badge`)}
            </span>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="text-4xl md:text-5xl font-bold max-w-3xl leading-[1.08] tracking-tight">
              {t(`${base}.title`)}
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-6 text-lg text-white/80 max-w-2xl leading-relaxed">
              {t(`${base}.subtitle`)}
            </p>
          </Reveal>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 space-y-14 md:space-y-16">
        {/* Key points */}
        {keyPoints.length > 0 && (
          <Reveal>
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                {t(`${base}.keyPointsTitle`)}
              </h2>
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                {keyPoints.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 p-4"
                  >
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-primary-600 text-white flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-sm text-slate-700 leading-relaxed">{p}</span>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Explainer sections */}
        {sections.length > 0 && (
          <section className="space-y-5">
            {sections.map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-6 sm:p-7">
                  <h3 className="text-lg font-semibold text-slate-900">{s.heading}</h3>
                  <p className="mt-2 text-slate-600 leading-relaxed">{s.body}</p>
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary-500 to-emerald-400 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                </div>
              </Reveal>
            ))}
          </section>
        )}

        {/* Tip */}
        <Reveal>
          <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <Lightbulb className="h-6 w-6 flex-shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-900">{t(`${base}.tipTitle`)}</p>
              <p className="mt-1 text-sm text-amber-800 leading-relaxed">{t(`${base}.tipBody`)}</p>
            </div>
          </section>
        </Reveal>

        {/* Articles */}
        {articles.length > 0 && (
          <section>
            <Reveal>
              <div className="flex items-center gap-3 mb-8">
                <BookOpen className="h-6 w-6 text-primary-600" />
                <h2 className="text-2xl font-bold text-slate-900">{t(`${base}.articlesTitle`)}</h2>
              </div>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((a, i) => (
                <Reveal key={a.id} delay={i * 70}>
                  <Link
                    href={articlePath(a)}
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

        {/* Back to hub */}
        <Reveal>
          <Link
            href="/arbeitnehmer"
            className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:gap-3 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("krankenkasse.backToHub")}
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
