import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import JobDetailClient from "./JobDetailClient";
import { jsonLdHtml } from "@/lib/jsonLd";
import { hrefForPositionType } from "../../stellenangebote/filters";
import {
  getJob,
  getRelatedJobs,
  generateJobPostingSchema,
  hasTranslation,
} from "./jobData";

// Stellenart -> Label für Kategorie-Links (interne Verlinkung/SEO)
const CATEGORY_LABELS: Record<string, string> = {
  saisonjob: "Saisonjobs",
  studentenferienjob: "Studentenjobs",
  fachkraft: "Fachkräfte-Jobs",
  ausbildung: "Ausbildungsplätze",
  workandholiday: "Work & Holiday Jobs",
  general: "Stellenangebote",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";


// Alle Job-Slugs für statische Generierung abrufen
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/jobs/sitemap/urls`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const urls: { url: string }[] = data.urls || [];

    // url format: "/jobs/slug-id" → extract "slug-id" as the [slug] param
    return urls.map((entry) => ({
      slug: entry.url.replace("/jobs/", ""),
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

  const pageUrl = `https://www.jobonportal.de/jobs/${slug}`;

  // hreflang nur bei eigenen Stellen mit echter EN-Übersetzung: dann existiert
  // unter /en/jobs/<slug> eine englische Variante. Externe (BA-)Stellen bekommen
  // keine Sprach-Alternativen (noindex, keine Übersetzung).
  const hasEn = !job.is_external && hasTranslation(job, "en");
  const languageAlternates = hasEn
    ? {
        de: pageUrl,
        en: `https://www.jobonportal.de/en/jobs/${slug}`,
        "x-default": pageUrl,
      }
    : undefined;

  return {
    title: `${job.title} - ${job.company.name}`,
    description,
    alternates: {
      canonical: pageUrl,
      ...(languageAlternates ? { languages: languageAlternates } : {}),
    },
    robots: {
      // Externe (BA-)Stellen sind Duplicate Content -> nicht indexieren,
      // damit Google das Crawl-Budget auf eigene Stellen konzentriert.
      index: !job.is_external,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    openGraph: {
      title: `${job.title} - ${job.company.name}`,
      description,
      type: "website",
      url: pageUrl,
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

  const relatedJobs = await getRelatedJobs(job.id);

  const jsonLd = generateJobPostingSchema(job);
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Startseite", item: "https://www.jobonportal.de" },
      { "@type": "ListItem", position: 2, name: "Stellenangebote", item: "https://www.jobonportal.de/jobs" },
      { "@type": "ListItem", position: 3, name: job.title, item: `https://www.jobonportal.de/jobs/${slug}` },
    ],
  };

  return (
    <>
      {/* JSON-LD Schema für Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbLd) }}
      />

      {/* Client Component für interaktive Elemente */}
      <JobDetailClient initialJob={job} slug={slug} />

      {/* Weitere Stellen: Kategorie-Verlinkung + "Ähnliche Stellen" (serverseitig für Crawler) */}
      <section className="border-t border-gray-100 bg-gray-50/60 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* Kategorie-Chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            {job.position_type && CATEGORY_LABELS[job.position_type] && (
              <Link
                href={hrefForPositionType(job.position_type)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Alle {CATEGORY_LABELS[job.position_type]}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Alle Stellenangebote
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {relatedJobs.length > 0 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-5">Ähnliche Stellenangebote</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {relatedJobs.map((rj) => (
                  <Link
                    key={rj.id}
                    href={rj.url}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-300 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-primary-700 transition-colors">
                        {rj.title}
                      </p>
                      {rj.location && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                          <MapPin className="h-4 w-4 text-primary-500 shrink-0" />
                          <span className="truncate">{rj.location}</span>
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-300 shrink-0 mt-0.5 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
