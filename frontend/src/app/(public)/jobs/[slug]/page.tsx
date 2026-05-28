import { Metadata } from "next";
import { notFound } from "next/navigation";
import JobDetailClient from "./JobDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";

// Typen - Backend gibt flache Struktur zurück
interface OtherLanguage {
  language: string;
  level: string;
}

interface JobFromAPI {
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
  salary_min?: number;
  salary_max?: number;
  salary_type?: string;
  employment_type?: string;
  position_type?: string;
  german_required?: string;
  english_required?: string;
  other_languages_required?: OtherLanguage[];
  remote_possible?: boolean;
  accommodation_provided?: boolean;
  start_date?: string;
  end_date?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  updated_at?: string;
  deadline?: string;
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
}

// Transformiertes Format für Client
interface Company {
  id: number;
  name: string;
  logo_url?: string;
  industry?: string;
  city?: string;
  country?: string;
  description?: string;
  website?: string;
}

interface Job {
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
  salary_min?: number;
  salary_max?: number;
  salary_type?: string;
  employment_type?: string;
  position_type?: string;
  german_level?: string;
  english_level?: string;
  other_languages?: OtherLanguage[];
  remote_possible?: boolean;
  accommodation_provided?: boolean;
  start_date?: string;
  end_date?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  updated_at?: string;
  valid_until?: string;
  company: Company;
  translations?: Record<string, Record<string, string>>;
  available_languages?: string[];
}

// Transformiert API-Response zu Client-Format
function transformJob(apiJob: JobFromAPI): Job {
  return {
    ...apiJob,
    german_level: apiJob.german_required,
    english_level: apiJob.english_required,
    other_languages: apiJob.other_languages_required,
    valid_until: apiJob.deadline,
    translations: apiJob.translations,
    available_languages: apiJob.available_languages,
    company: {
      id: apiJob.company_id || 0,
      name: apiJob.company_name || "Unbekannt",
      logo_url: apiJob.company_logo,
      industry: apiJob.company_industry,
      city: apiJob.company_city,
      country: apiJob.company_country,
      description: apiJob.company_description,
      website: apiJob.company_website,
    },
  };
}

// Server-side Daten laden
async function getJob(slug: string): Promise<Job | null> {
  try {
    // Endpoint: /jobs/by-slug/{slug-with-id} z.B. /jobs/by-slug/test-3
    const res = await fetch(`${API_URL}/jobs/by-slug/${slug}`, {
      next: { revalidate: 60 }, // Cache für 1 Minute
    });
    
    if (!res.ok) {
      console.error(`Job fetch failed: ${res.status} for slug: ${slug}`);
      return null;
    }
    
    const apiJob: JobFromAPI = await res.json();
    return transformJob(apiJob);
  } catch (error) {
    console.error("Error fetching job:", error);
    return null;
  }
}

// Alle Job-Slugs für statische Generierung abrufen
// Dies ermöglicht Google, alle Job-Seiten zu indexieren
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/jobs/public`, {
      next: { revalidate: 3600 }, // Cache für 1 Stunde
    });
    
    if (!res.ok) return [];
    
    const data = await res.json();
    const jobs = data.jobs || [];
    
    return jobs.map((job: { slug: string }) => ({
      slug: job.slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

// Ermöglicht auch dynamische Routen für neue Jobs
export const dynamicParams = true;

// Revalidierung alle 60 Sekunden für neue Jobs
export const revalidate = 60;

// Dynamische Metadata für SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);

  if (!job) {
    return {
      title: "Stelle nicht gefunden",
    };
  }

  const description = job.description
    ? job.description.replace(/<[^>]*>/g, "").substring(0, 160)
    : `${job.title} bei ${job.company.name} in ${job.location}`;

  return {
    title: `${job.title} - ${job.company.name}`,
    description,
    alternates: {
      canonical: `https://www.jobon.work/jobs/${job.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    openGraph: {
      title: `${job.title} - ${job.company.name}`,
      description,
      type: "website",
      url: `https://www.jobon.work/jobs/${job.slug}`,
      siteName: "JobOn",
      locale: "de_DE",
      images: job.company.logo_url ? [{ url: job.company.logo_url, alt: job.company.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${job.title} - ${job.company.name}`,
      description,
    },
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

function getAddressRegion(location: string): string | undefined {
  if (!location) return undefined;
  // "City, State" format
  const parts = location.split(",");
  if (parts.length > 1) return parts[1].trim();
  // Lookup by city name
  return CITY_TO_STATE[location.toLowerCase().trim()];
}

// JSON-LD Schema für Google Jobs - erweitert für besseres Ranking
function generateJobPostingSchema(job: Job) {
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
    job.tasks ? `Aufgaben: ${job.tasks.replace(/<[^>]*>/g, "")}` : null,
    job.requirements ? `Anforderungen: ${job.requirements.replace(/<[^>]*>/g, "")}` : null,
    job.benefits ? `Wir bieten: ${job.benefits.replace(/<[^>]*>/g, "")}` : null,
  ].filter(Boolean).join("\n\n");

  // Remote-Arbeit
  const jobLocationType = job.remote_possible ? "TELECOMMUTE" : undefined;

  // Adresse mit mehr Details
  const jobLocation = {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      streetAddress: job.address || undefined,
      addressLocality: job.location,
      addressRegion: getAddressRegion(job.location),
      postalCode: job.postal_code || undefined,
      addressCountry: "DE",
    },
  };

  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: fullDescription || job.title,
    identifier: {
      "@type": "PropertyValue",
      name: job.company.name,
      value: job.id.toString(),
    },
    datePosted: job.created_at,
    validThrough: job.valid_until || undefined,
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
    directApply: true,
    employerOverview: job.company.description || undefined,
    jobBenefits: job.benefits?.replace(/<[^>]*>/g, "") || undefined,
    responsibilities: job.tasks?.replace(/<[^>]*>/g, "") || undefined,
    qualifications: job.requirements?.replace(/<[^>]*>/g, "") || undefined,
    // Unterkunft als Benefit hervorheben
    ...(job.accommodation_provided && {
      specialCommitments: "Unterkunft wird gestellt",
    }),
  };
}

// Seiten-Komponente
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJob(slug);

  if (!job) {
    notFound();
  }

  const jsonLd = generateJobPostingSchema(job);

  return (
    <>
      {/* JSON-LD Schema für Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Client Component für interaktive Elemente */}
      <JobDetailClient initialJob={job} slug={slug} />
    </>
  );
}
