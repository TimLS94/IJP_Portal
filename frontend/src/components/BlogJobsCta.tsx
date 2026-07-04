import Link from "next/link";
import { hrefForPositionType } from "@/app/(public)/stellenangebote/filters";

type Lang = "de" | "en" | "es" | "ru";

const T: Record<Lang, { title: string; all: string; cats: Record<string, string> }> = {
  de: {
    title: "Passende Stellenangebote",
    all: "Alle Stellenangebote",
    cats: {
      saisonjob: "Saisonjobs",
      studentenferienjob: "Studentenjobs",
      fachkraft: "Fachkräfte-Jobs",
      ausbildung: "Ausbildungsplätze",
    },
  },
  en: {
    title: "Matching jobs",
    all: "All jobs",
    cats: {
      saisonjob: "Seasonal jobs",
      studentenferienjob: "Student jobs",
      fachkraft: "Skilled worker jobs",
      ausbildung: "Apprenticeships",
    },
  },
  es: {
    title: "Ofertas de empleo relacionadas",
    all: "Todas las ofertas",
    cats: {
      saisonjob: "Trabajos de temporada",
      studentenferienjob: "Trabajos para estudiantes",
      fachkraft: "Empleos cualificados",
      ausbildung: "Formación profesional",
    },
  },
  ru: {
    title: "Подходящие вакансии",
    all: "Все вакансии",
    cats: {
      saisonjob: "Сезонные вакансии",
      studentenferienjob: "Студенческие вакансии",
      fachkraft: "Вакансии для специалистов",
      ausbildung: "Обучение (Ausbildung)",
    },
  },
};

// Serverseitig gerenderter "Passende Stellen"-Block für Blog-Artikel.
// Verlinkt intern auf die Kategorie-Hubs + Stellenübersicht (SEO).
export default function BlogJobsCta({ lang = "de" }: { lang?: Lang }) {
  const t = T[lang] || T.de;
  return (
    <nav
      aria-label={t.title}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.title}</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(t.cats).map(([key, label]) => (
            <Link
              key={key}
              href={hrefForPositionType(key)}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-primary-200 text-primary-700 text-sm font-medium hover:bg-primary-100"
            >
              {label} →
            </Link>
          ))}
          <Link
            href="/jobs"
            className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            {t.all} →
          </Link>
        </div>
      </div>
    </nav>
  );
}
