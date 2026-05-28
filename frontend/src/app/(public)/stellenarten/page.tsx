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
  title: string;
  subtitle: string;
  shortDesc: string;
  description: string;
  forWhom: string[];
  docs: string[];
  process: string[];
  durationText: string;
  salaryText: string;
  legalBasisText: string;
  sectors: string;
}

const categories: Category[] = [
  {
    id: "studentenferienjob",
    emoji: "🎓",
    gradient: "from-blue-500 to-blue-600",
    title: "Studentenferienjob",
    subtitle: "Für Studierende in den Semesterferien",
    shortDesc: "Verdienen Sie Geld während Ihrer Semesterferien und sammeln Sie wertvolle Berufserfahrung in Deutschland.",
    description: "Studentenferienjobs sind ideal für Studierende aus dem Ausland, die während ihrer Semesterferien in Deutschland arbeiten möchten. Sie können bis zu 90 Tage oder 180 halbe Tage pro Jahr arbeiten und dabei wertvolle Erfahrungen sammeln.",
    forWhom: [
      "Eingeschriebene Studierende an einer Hochschule",
      "Mindestalter 18 Jahre",
      "Gute Deutschkenntnisse von Vorteil"
    ],
    docs: [
      "Gültiger Reisepass",
      "Immatrikulationsbescheinigung",
      "Arbeitserlaubnis (je nach Herkunftsland)",
      "Krankenversicherungsnachweis"
    ],
    process: [
      "Registrierung",
      "Profil erstellen",
      "Bewerbung",
      "Vermittlung",
      "Arbeitsstart"
    ],
    durationText: "1-3 Monate",
    salaryText: "12-15€/Stunde",
    legalBasisText: "§16b AufenthG",
    sectors: "Produktion, Logistik, Gastronomie"
  },
  {
    id: "saisonjob",
    emoji: "🌾",
    gradient: "from-orange-500 to-orange-600",
    title: "Saisonjob",
    subtitle: "Saisonale Beschäftigung",
    shortDesc: "Arbeiten Sie in der Landwirtschaft, im Tourismus oder in anderen saisonalen Branchen.",
    description: "Saisonjobs bieten flexible Beschäftigungsmöglichkeiten in Branchen mit saisonalem Arbeitskräftebedarf. Typische Einsatzgebiete sind Landwirtschaft, Weinbau, Tourismus und Gastronomie.",
    forWhom: [
      "Arbeitssuchende aus EU und Drittstaaten",
      "Körperlich belastbar",
      "Flexibel und teamfähig"
    ],
    docs: [
      "Gültiger Reisepass",
      "Arbeitserlaubnis",
      "Gesundheitszeugnis (je nach Branche)",
      "Führerschein (von Vorteil)"
    ],
    process: [
      "Registrierung",
      "Profil erstellen",
      "Vermittlung",
      "Visum beantragen",
      "Arbeitsstart"
    ],
    durationText: "3-9 Monate",
    salaryText: "12-14€/Stunde",
    legalBasisText: "§19c AufenthG",
    sectors: "Landwirtschaft, Tourismus, Gastronomie"
  },
  {
    id: "workandholiday",
    emoji: "✈️",
    gradient: "from-teal-500 to-teal-600",
    title: "Work & Holiday",
    subtitle: "Arbeiten und Reisen kombinieren",
    shortDesc: "Kombinieren Sie Arbeit und Urlaub in Deutschland mit dem Work & Holiday Visum.",
    description: "Das Work & Holiday Programm ermöglicht jungen Menschen, Deutschland zu bereisen und gleichzeitig zu arbeiten. Ideal für alle, die Kultur und Berufserfahrung verbinden möchten.",
    forWhom: [
      "18-30 Jahre alt (je nach Abkommen)",
      "Aus teilnehmenden Ländern",
      "Grundkenntnisse Deutsch oder Englisch"
    ],
    docs: [
      "Gültiger Reisepass",
      "Work & Holiday Visum",
      "Finanznachweis",
      "Rückflugticket oder Nachweis"
    ],
    process: [
      "Visum beantragen",
      "Registrierung",
      "Job suchen",
      "Arbeiten & Reisen",
      "Erfahrungen sammeln"
    ],
    durationText: "Bis 12 Monate",
    salaryText: "12-16€/Stunde",
    legalBasisText: "Bilaterale Abkommen",
    sectors: "Gastronomie, Tourismus, Au-pair"
  },
  {
    id: "fachkraft",
    emoji: "👔",
    gradient: "from-purple-500 to-purple-600",
    title: "Fachkraft",
    subtitle: "Qualifizierte Beschäftigung",
    shortDesc: "Starten Sie Ihre Karriere als qualifizierte Fachkraft in Deutschland.",
    description: "Als Fachkraft haben Sie die Möglichkeit, eine unbefristete Stelle in Deutschland anzutreten. Wir vermitteln qualifizierte Fachkräfte in verschiedene Branchen mit Perspektive auf dauerhafte Beschäftigung.",
    forWhom: [
      "Abgeschlossene Berufsausbildung oder Studium",
      "Berufserfahrung von Vorteil",
      "Deutschkenntnisse B1-B2"
    ],
    docs: [
      "Anerkannte Qualifikation",
      "Lebenslauf und Zeugnisse",
      "Sprachzertifikat",
      "Arbeitsvertrag für Visum"
    ],
    process: [
      "Qualifikation prüfen",
      "Anerkennung beantragen",
      "Stellensuche",
      "Visum beantragen",
      "Arbeitsstart"
    ],
    durationText: "Unbefristet",
    salaryText: "2.500-5.000€/Monat",
    legalBasisText: "Fachkräfteeinwanderungsgesetz",
    sectors: "Pflege, IT, Handwerk, Technik"
  },
  {
    id: "ausbildung",
    emoji: "📚",
    gradient: "from-green-500 to-green-600",
    title: "Ausbildung",
    subtitle: "Duale Berufsausbildung",
    shortDesc: "Starten Sie eine duale Ausbildung in Deutschland und erwerben Sie einen anerkannten Berufsabschluss.",
    description: "Die duale Ausbildung in Deutschland kombiniert praktische Arbeit im Betrieb mit theoretischem Unterricht in der Berufsschule. Sie erhalten eine Vergütung und einen international anerkannten Abschluss.",
    forWhom: [
      "Schulabschluss (mind. Hauptschule)",
      "17-35 Jahre alt",
      "Deutschkenntnisse mind. B1"
    ],
    docs: [
      "Schulzeugnisse (übersetzt)",
      "Sprachzertifikat B1",
      "Motivationsschreiben",
      "Ausbildungsvertrag für Visum"
    ],
    process: [
      "Deutsch lernen",
      "Ausbildungsplatz suchen",
      "Vertrag unterschreiben",
      "Visum beantragen",
      "Ausbildung starten"
    ],
    durationText: "2-3,5 Jahre",
    salaryText: "800-1.200€/Monat",
    legalBasisText: "§16a AufenthG",
    sectors: "Pflege, Handwerk, Gastronomie, IT"
  }
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
