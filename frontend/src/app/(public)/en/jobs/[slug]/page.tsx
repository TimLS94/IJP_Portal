import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import JobDetailClient from "../../../jobs/[slug]/JobDetailClient";
import { jsonLdHtml } from "@/lib/jsonLd";
import { hrefForPositionType } from "../../../stellenangebote/filters";
import {
  type Job,
  getJob,
  getRelatedJobs,
  generateJobPostingSchema,
  hasTranslation,
  overlayTranslation,
} from "../../../jobs/[slug]/jobData";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";

// Englische Kategorie-Labels (interne Verlinkung/SEO)
const CATEGORY_LABELS: Record<string, string> = {
  saisonjob: "seasonal jobs",
  studentenferienjob: "student jobs",
  fachkraft: "skilled worker jobs",
  ausbildung: "apprenticeships",
  workandholiday: "Work & Holiday jobs",
  general: "job offers",
};

// Nur eigene Firmen-Stellen mit echter EN-Übersetzung bekommen eine /en-URL.
// Externe (BA-)Stellen und Stellen ohne EN-Übersetzung -> 404 (kein Thin/Duplicate Content).
function isEligibleForEnglish(job: Job): boolean {
  if (job.is_external) return false;
  return hasTranslation(job, "en");
}

// Baut nur englische URLs für eigene Stellen mit EN-Übersetzung vor.
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/jobs/sitemap/urls`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const urls: { url: string; has_en?: boolean }[] = data.urls || [];
    return urls
      .filter((entry) => entry.has_en)
      .map((entry) => ({ slug: entry.url.replace("/jobs/", "") }));
  } catch (error) {
    console.error("Error generating EN static params:", error);
    return [];
  }
}

// Erlaubt dynamische Routen für neue Stellen (on-demand ISR)
export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);

  if (!job || !isEligibleForEnglish(job)) {
    return { title: "Job not found", robots: { index: false, follow: true } };
  }

  const en = overlayTranslation(job, "en");
  const description = en.description
    ? en.description.replace(/<[^>]*>/g, "").substring(0, 160)
    : `${en.title} at ${job.company.name} in ${job.location}`;

  const deUrl = `https://www.jobonportal.de/jobs/${slug}`;
  const enUrl = `https://www.jobonportal.de/en/jobs/${slug}`;

  return {
    title: `${en.title} - ${job.company.name}`,
    description,
    alternates: {
      canonical: enUrl,
      languages: {
        de: deUrl,
        en: enUrl,
        "x-default": deUrl,
      },
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    openGraph: {
      title: `${en.title} - ${job.company.name}`,
      description,
      type: "website",
      url: enUrl,
      siteName: "JobOn",
      locale: "en_US",
      images: job.company.logo_url ? [{ url: job.company.logo_url, alt: job.company.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${en.title} - ${job.company.name}`,
      description,
    },
  };
}

// Seiten-Komponente (englische URL-Variante)
export default async function EnglishJobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJob(slug);

  // Kein Job, externe Stelle oder keine EN-Übersetzung -> 404 (deutsche URL bleibt gültig).
  if (!job || !isEligibleForEnglish(job)) {
    notFound();
  }

  const relatedJobs = await getRelatedJobs(job.id);

  // JSON-LD auf Basis der englischen Inhalte (Google Jobs, inLanguage: en)
  const enJob = overlayTranslation(job, "en");
  const jsonLd = generateJobPostingSchema(enJob, "en");
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.jobonportal.de/en" },
      { "@type": "ListItem", position: 2, name: "Jobs", item: "https://www.jobonportal.de/jobs" },
      { "@type": "ListItem", position: 3, name: enJob.title, item: `https://www.jobonportal.de/en/jobs/${slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbLd) }}
      />

      {/* forceLang="en" -> Client rendert die Stelle initial (SSR) auf Englisch */}
      <JobDetailClient initialJob={job} slug={slug} forceLang="en" />

      {/* Weitere Stellen (serverseitig für Crawler). Verlinkung auf deutsche URLs,
          da nicht jede verwandte Stelle eine EN-Übersetzung hat. */}
      <section className="border-t border-gray-100 bg-gray-50/60 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex flex-wrap gap-2 mb-8">
            {job.position_type && CATEGORY_LABELS[job.position_type] && (
              <Link
                href={hrefForPositionType(job.position_type)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                All {CATEGORY_LABELS[job.position_type]}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              All job offers
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {relatedJobs.length > 0 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-5">Similar jobs</h2>
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
