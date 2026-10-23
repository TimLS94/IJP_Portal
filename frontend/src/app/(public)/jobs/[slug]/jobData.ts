// Gemeinsame Daten- und Schema-Logik für die Job-Detailseiten.
// Genutzt von der deutschen Seite (/jobs/[slug]) UND den sprach-spezifischen
// SEO-URLs (z.B. /en/jobs/[slug]), damit JSON-LD/Fetch-Logik nur EINMAL existiert.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";

// HTML in sauberen Text wandeln: Listenpunkte/Absätze als ", " trennen
// (verhindert zusammengeklebte Wörter in den strukturierten Daten)
export function htmlToText(html?: string): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<\/(li|p|div|h[1-6])>/gi, ", ")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

// Relative Datei-URLs (/api/v1/files/...) in absolute Backend-URLs wandeln
export function absUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_URL.replace(/\/api\/v1\/?$/, "");
  return url.startsWith("/") ? `${origin}${url}` : `${origin}/${url}`;
}

export interface OtherLanguage {
  language: string;
  level: string;
}

export interface JobFromAPI {
  id: number;
  slug: string;
  title: string;
  description: string;
  tasks?: string;
  requirements?: string;
  benefits?: string;
  location: string;
  address?: string;
  postal_code?: string;
  country?: string;
  salary_min?: number;
  salary_max?: number;
  salary_type?: string;
  employment_type?: string;
  position_type?: string;
  german_required?: string;
  english_required?: string;
  german_importance?: string;
  english_importance?: string;
  other_languages_required?: OtherLanguage[];
  remote_possible?: boolean;
  accommodation_provided?: boolean;
  start_date?: string;
  end_date?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  published_at?: string;
  updated_at?: string;
  deadline?: string;
  valid_through?: string;
  company_id?: number;
  company_name?: string;
  company_logo?: string;
  company_industry?: string;
  company_city?: string;
  company_country?: string;
  company_description?: string;
  company_website?: string;
  translations?: Record<string, Record<string, string>>;
  available_languages?: string[];
  is_external?: boolean;
}

export interface Company {
  id: number;
  name: string;
  logo_url?: string;
  industry?: string;
  city?: string;
  country?: string;
  description?: string;
  website?: string;
}

export interface Job {
  id: number;
  slug: string;
  title: string;
  description: string;
  tasks?: string;
  requirements?: string;
  benefits?: string;
  location: string;
  address?: string;
  postal_code?: string;
  country?: string;
  salary_min?: number;
  salary_max?: number;
  salary_type?: string;
  employment_type?: string;
  position_type?: string;
  german_level?: string;
  english_level?: string;
  german_importance?: string;
  english_importance?: string;
  other_languages?: OtherLanguage[];
  remote_possible?: boolean;
  accommodation_provided?: boolean;
  start_date?: string;
  end_date?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  published_at?: string;
  updated_at?: string;
  valid_until?: string;
  company: Company;
  translations?: Record<string, Record<string, string>>;
  available_languages?: string[];
  is_external?: boolean;
}

// Transformiert API-Response zu Client-Format
export function transformJob(apiJob: JobFromAPI): Job {
  return {
    ...apiJob,
    german_level: apiJob.german_required,
    english_level: apiJob.english_required,
    german_importance: apiJob.german_importance,
    english_importance: apiJob.english_importance,
    other_languages: apiJob.other_languages_required,
    valid_until: apiJob.valid_through || apiJob.deadline,
    translations: apiJob.translations,
    available_languages: apiJob.available_languages,
    company: {
      id: apiJob.company_id || 0,
      name: apiJob.company_name || "Unbekannt",
      logo_url: absUrl(apiJob.company_logo),
      industry: apiJob.company_industry,
      city: apiJob.company_city,
      country: apiJob.company_country,
      description: apiJob.company_description,
      website: apiJob.company_website,
    },
  };
}

// Server-side Daten laden
export async function getJob(slug: string): Promise<Job | null> {
  // Endpoint: /jobs/by-slug/{slug-with-id} z.B. /jobs/by-slug/test-3
  const res = await fetch(`${API_URL}/jobs/by-slug/${slug}`, {
    next: { revalidate: 60 }, // Cache für 1 Minute
  });

  // Stelle existiert nicht mehr (404) oder ist abgelaufen (410) -> sauberes notFound()
  if (res.status === 404 || res.status === 410) {
    return null;
  }

  // Andere Fehler (Backend down / Cold-Start / 5xx): NICHT als "nicht gefunden" cachen,
  // sondern werfen -> Seite liefert 500 (von Google später erneut versucht) statt Soft-404.
  if (!res.ok) {
    throw new Error(`Job fetch failed: ${res.status} for slug: ${slug}`);
  }

  const apiJob: JobFromAPI = await res.json();
  return transformJob(apiJob);
}

export interface RelatedJob {
  id: number;
  title: string;
  location?: string;
  position_type?: string;
  url: string;
}

// Ähnliche Stellen für interne Verlinkung (SEO)
export async function getRelatedJobs(jobId: number): Promise<RelatedJob[]> {
  try {
    const res = await fetch(`${API_URL}/jobs/related/${jobId}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.jobs || [];
  } catch {
    return [];
  }
}

// Prüft, ob für eine Sprache eine verwertbare Übersetzung existiert (Titel + Beschreibung).
export function hasTranslation(job: Job, lang: string): boolean {
  const t = job.translations?.[lang];
  return !!(t && (t.title?.trim() || t.description?.trim()));
}

// Legt die übersetzten Felder über den Job (für Metadata/JSON-LD der Sprach-URLs).
// lang === "de" -> unveränderter Job.
export function overlayTranslation(job: Job, lang: string): Job {
  if (lang === "de") return job;
  const t = job.translations?.[lang];
  if (!t) return job;
  return {
    ...job,
    title: t.title?.trim() || job.title,
    description: t.description?.trim() || job.description,
    tasks: t.tasks?.trim() || job.tasks,
    requirements: t.requirements?.trim() || job.requirements,
    benefits: t.benefits?.trim() || job.benefits,
  };
}

// City → Bundesland lookup for addressRegion in JobPosting schema
const CITY_TO_STATE: Record<string, string> = {
  berlin: "Berlin", münchen: "Bayern", munich: "Bayern",
  hamburg: "Hamburg", köln: "Nordrhein-Westfalen", cologne: "Nordrhein-Westfalen",
  frankfurt: "Hessen", stuttgart: "Baden-Württemberg", düsseldorf: "Nordrhein-Westfalen",
  dortmund: "Nordrhein-Westfalen", essen: "Nordrhein-Westfalen", leipzig: "Sachsen",
  bremen: "Bremen", dresden: "Sachsen", hannover: "Niedersachsen",
  nürnberg: "Bayern", duisburg: "Nordrhein-Westfalen", bochum: "Nordrhein-Westfalen",
  wuppertal: "Nordrhein-Westfalen", bielefeld: "Nordrhein-Westfalen", bonn: "Nordrhein-Westfalen",
  münster: "Nordrhein-Westfalen", karlsruhe: "Baden-Württemberg", mannheim: "Baden-Württemberg",
  augsburg: "Bayern", wiesbaden: "Hessen", gelsenkirchen: "Nordrhein-Westfalen",
  mönchengladbach: "Nordrhein-Westfalen", braunschweig: "Niedersachsen", kiel: "Schleswig-Holstein",
  chemnitz: "Sachsen", aachen: "Nordrhein-Westfalen", halle: "Sachsen-Anhalt",
  magdeburg: "Sachsen-Anhalt", freiburg: "Baden-Württemberg", krefeld: "Nordrhein-Westfalen",
  mainz: "Rheinland-Pfalz", lübeck: "Schleswig-Holstein", erfurt: "Thüringen",
  oberhausen: "Nordrhein-Westfalen", rostock: "Mecklenburg-Vorpommern", kassel: "Hessen",
  hagen: "Nordrhein-Westfalen", hamm: "Nordrhein-Westfalen", saarbrücken: "Saarland",
  potsdam: "Brandenburg", mülheim: "Nordrhein-Westfalen", osnabrück: "Niedersachsen",
  heidelberg: "Baden-Württemberg", darmstadt: "Hessen", regensburg: "Bayern",
  ingolstadt: "Bayern", würzburg: "Bayern", ulm: "Baden-Württemberg",
  wolfsburg: "Niedersachsen", göttingen: "Niedersachsen",
};

export function getAddressRegion(location: string): string | undefined {
  if (!location) return undefined;
  // "City, State" format
  const parts = location.split(",");
  if (parts.length > 1) return parts[1].trim();
  // Lookup by city name
  return CITY_TO_STATE[location.toLowerCase().trim()];
}

// Label-Texte für die zusammengesetzte JSON-LD-Beschreibung je Sprache
const SCHEMA_LABELS: Record<string, { tasks: string; requirements: string; benefits: string; accommodation: string }> = {
  de: { tasks: "Aufgaben", requirements: "Anforderungen", benefits: "Wir bieten", accommodation: "Unterkunft wird gestellt" },
  en: { tasks: "Tasks", requirements: "Requirements", benefits: "We offer", accommodation: "Accommodation provided" },
};

// JSON-LD Schema für Google Jobs - erweitert für besseres Ranking.
// `lang` steuert Label-Texte in der zusammengesetzten Beschreibung + inLanguage.
export function generateJobPostingSchema(job: Job, lang: string = "de") {
  const labels = SCHEMA_LABELS[lang] || SCHEMA_LABELS.de;

  const salaryValue = job.salary_min || job.salary_max
    ? {
        "@type": "MonetaryAmount",
        currency: "EUR",
        value: {
          "@type": "QuantitativeValue",
          minValue: job.salary_min || job.salary_max,
          maxValue: job.salary_max || job.salary_min,
          unitText: job.salary_type === "hourly" ? "HOUR" : job.salary_type === "monthly" ? "MONTH" : "YEAR",
        },
      }
    : undefined;

  const employmentType = {
    fulltime: "FULL_TIME",
    parttime: "PART_TIME",
    both: ["FULL_TIME", "PART_TIME"],
  }[job.employment_type || "fulltime"] || "FULL_TIME";

  // Beschreibung zusammensetzen aus allen Feldern
  const fullDescription = [
    job.description?.replace(/<[^>]*>/g, ""),
    job.tasks ? `${labels.tasks}: ${job.tasks.replace(/<[^>]*>/g, "")}` : null,
    job.requirements ? `${labels.requirements}: ${job.requirements.replace(/<[^>]*>/g, "")}` : null,
    job.benefits ? `${labels.benefits}: ${job.benefits.replace(/<[^>]*>/g, "")}` : null,
  ].filter(Boolean).join("\n\n");

  // Remote-Arbeit
  const jobLocationType = job.remote_possible ? "TELECOMMUTE" : undefined;

  // Adresse mit mehr Details. Ländercode aus job.country (DE/AT/CH), Fallback DE.
  // addressRegion-Lookup gilt nur für DE (deutsche Bundesländer).
  const countryCode = (job.country || "DE").toUpperCase();
  const jobLocation = {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      streetAddress: job.address || undefined,
      addressLocality: job.location,
      addressRegion: countryCode === "DE" ? getAddressRegion(job.location) : undefined,
      postalCode: job.postal_code || undefined,
      addressCountry: countryCode,
    },
  };

  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: fullDescription || job.title,
    inLanguage: lang,
    identifier: {
      "@type": "PropertyValue",
      name: job.company.name,
      value: job.id.toString(),
    },
    // Google erwartet ISO 8601 (Datum). Rohes created_at (mit Mikrosekunden, ohne
    // Zeitzone) ist ungültig -> als YYYY-MM-DD formatieren.
    datePosted: job.created_at ? new Date(job.created_at).toISOString().split("T")[0] : undefined,
    validThrough: job.valid_until
      ? new Date(job.valid_until).toISOString().split("T")[0]
      : undefined,
    employmentType,
    jobLocationType,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company.name,
      sameAs: job.company.website || undefined,
      logo: job.company.logo_url || undefined,
    },
    jobLocation,
    baseSalary: salaryValue,
    // Zusätzliche SEO-relevante Felder
    // Nur true bei eigenen Stellen (Bewerbung direkt auf jobonportal.de).
    // Externe (BA-)Stellen leiten zum Arbeitgeber weiter -> false (Google-Richtlinie).
    directApply: !job.is_external,
    employerOverview: job.company.description || undefined,
    jobBenefits: htmlToText(job.benefits),
    responsibilities: htmlToText(job.tasks),
    qualifications: htmlToText(job.requirements),
    // Unterkunft als Benefit hervorheben
    ...(job.accommodation_provided && {
      specialCommitments: labels.accommodation,
    }),
  };
}
