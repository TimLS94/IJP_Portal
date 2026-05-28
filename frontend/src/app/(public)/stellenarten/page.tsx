"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Clock, FileText, Globe, Users, CheckCircle, ArrowRight,
  MapPin, Euro, Info
} from "lucide-react";

interface Category {
  id: string;
  emoji: string;
  gradient: string;
  legalBasisText: string;
  title: string;
  subtitle: string;
  shortDesc: string;
  description: string;
  forWhom: string[];
  docs: string[];
  process: string[];
  durationText: string;
  salaryText: string;
  sectors: string;
}

const CATEGORY_META = [
  { id: "studentenferienjob", emoji: "🎓", gradient: "from-blue-500 to-blue-600", legalBasisText: "§16b AufenthG" },
  { id: "saisonjob", emoji: "🌾", gradient: "from-orange-500 to-orange-600", legalBasisText: "§19c AufenthG" },
  { id: "workandholiday", emoji: "✈️", gradient: "from-teal-500 to-teal-600", legalBasisText: "Bilaterale Abkommen" },
  { id: "fachkraft", emoji: "👔", gradient: "from-purple-500 to-purple-600", legalBasisText: "Fachkräfteeinwanderungsgesetz" },
  { id: "ausbildung", emoji: "📚", gradient: "from-green-500 to-green-600", legalBasisText: "§16a AufenthG" },
];

function CategoryCard({
  category,
  isExpanded,
  onToggle,
  t
}: {
  category: Category;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ${
        isExpanded ? "ring-2 ring-primary-500" : "hover:shadow-xl"
      }`}
    >
      {/* Header */}
      <div
        className={`bg-gradient-to-r ${category.gradient} p-6 text-white cursor-pointer`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <span className="text-3xl">{category.emoji}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold">{category.title}</h3>
            <p className="text-white/80">{category.subtitle}</p>
          </div>
          <ArrowRight className={`h-6 w-6 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </div>
        <p className="mt-4 text-white/90">{category.shortDesc}</p>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-gray-700 leading-relaxed">{category.description}</p>
          </div>

          {/* Grid Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Für wen */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary-600" />
                {t("stellenarten.forWhom")}
              </h4>
              <ul className="space-y-2">
                {category.forWhom.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dokumente */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary-600" />
                {t("stellenarten.requiredDocs")}
              </h4>
              <ul className="space-y-2">
                {category.docs.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">{t("stellenarten.duration")}</p>
              <p className="font-bold text-gray-900 text-sm">{category.durationText}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <Euro className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">{t("stellenarten.salary")}</p>
              <p className="font-bold text-gray-900 text-sm">{category.salaryText}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <Globe className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">{t("stellenarten.legalBasis")}</p>
              <p className="font-bold text-gray-900 text-xs">{category.legalBasisText}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <MapPin className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">{t("stellenarten.sectors")}</p>
              <p className="font-bold text-gray-900 text-xs truncate">{category.sectors}</p>
            </div>
          </div>

          {/* Process */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
            <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-primary-600" />
              {t("stellenarten.howItWorks")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {category.process.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full bg-gradient-to-r ${category.gradient} text-white text-xs flex items-center justify-center font-bold`}>
                    {i + 1}
                  </span>
                  <span className="text-gray-700 text-sm">{step}</span>
                  {i < category.process.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href={`/jobs?type=${category.id}`}
              className={`bg-gradient-to-r ${category.gradient} text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2`}
            >
              {t("stellenarten.findJobs")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold hover:border-primary-500 hover:text-primary-600 transition-all"
            >
              {t("stellenarten.registerNow")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StellenartenPage() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>("studentenferienjob");

  const categories: Category[] = CATEGORY_META.map((meta) => ({
    ...meta,
    title: t(`stellenarten.categories.${meta.id}.title`),
    subtitle: t(`stellenarten.categories.${meta.id}.subtitle`),
    shortDesc: t(`stellenarten.categories.${meta.id}.shortDesc`),
    description: t(`stellenarten.categories.${meta.id}.description`),
    forWhom: t(`stellenarten.categories.${meta.id}.forWhom`, { returnObjects: true }) as string[],
    docs: t(`stellenarten.categories.${meta.id}.docs`, { returnObjects: true }) as string[],
    process: t(`stellenarten.categories.${meta.id}.process`, { returnObjects: true }) as string[],
    durationText: t(`stellenarten.categories.${meta.id}.durationText`),
    salaryText: t(`stellenarten.categories.${meta.id}.salaryText`),
    sectors: t(`stellenarten.categories.${meta.id}.sectors`),
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t("stellenarten.title")}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          {t("stellenarten.subtitle")}
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setExpandedId(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              expandedId === cat.id
                ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg`
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat.emoji} {cat.title}
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="space-y-6 max-w-5xl mx-auto">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isExpanded={expandedId === category.id}
            onToggle={() => setExpandedId(expandedId === category.id ? null : category.id)}
            t={t}
          />
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-center text-white max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">{t("stellenarten.notSure")}</h2>
        <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
          {t("stellenarten.notSureDesc")}
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/contact"
            className="bg-white text-primary-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all"
          >
            {t("stellenarten.contactUs")}
          </Link>
          <Link
            href="/faq"
            className="border-2 border-white text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all"
          >
            {t("stellenarten.faq")}
          </Link>
        </div>
      </div>
    </div>
  );
}
