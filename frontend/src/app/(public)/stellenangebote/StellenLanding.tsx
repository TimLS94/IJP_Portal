import Link from "next/link";
import JobsClient from "../jobs/JobsClient";
import { STELLEN_ROUTES, StellenRoute, stellenHref } from "./filters";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";
const BASE_URL = "https://www.jobon.work";

interface Job {
  id: number;
  slug?: string;
  title: string;
  description?: string;
  location?: string;
  position_type?: string;
  accommodation_provided?: boolean;
  company_name?: string;
  company?: { company_name?: string };
  created_at: string;
}

// Server-seitig (gefilterte) Jobs für SEO / JSON-LD laden
async function getJobs(route: StellenRoute): Promise<Job[]> {
  try {
    const params = new URLSearchParams({ limit: "200" });
    if (route.positionType) params.set("position_type", route.positionType);
    const res = await fetch(`${API_URL}/jobs/public?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    let jobs: Job[] = await res.json();
    if (route.accommodationOnly) {
      jobs = jobs.filter((j) => j.accommodation_provided);
    }
    return jobs;
  } catch {
    return [];
  }
}

function generateJobListSchema(jobs: Job[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: jobs.slice(0, 20).map((job, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE_URL}/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`,
      name: job.title,
    })),
  };
}

export default async function StellenLanding({ route }: { route: StellenRoute }) {
  const jobs = await getJobs(route);
  const jsonLd = generateJobListSchema(jobs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4 pt-8 pb-2">
        {/* SEO-Header */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{route.h1}</h1>
        <p className="mt-3 text-gray-600 max-w-3xl leading-relaxed">{route.intro}</p>

        {/* Filter-Chips (serverseitig gerendert, crawlbare Links) */}
        <nav
          aria-label="Stellenangebote nach Kategorie"
          className="mt-6 -mx-4 px-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        >
          {STELLEN_ROUTES.map((r) => {
            const active = r.slug === route.slug;
            return (
              <Link
                key={r.slug || "all"}
                href={stellenHref(r.slug)}
                className={`whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  active
                    ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {r.chipEmoji ? `${r.chipEmoji} ` : ""}
                {r.chipLabel}
              </Link>
            );
          })}
        </nav>

        {/* SEO-Job-Liste für Crawler (immer im HTML) */}
        <ul className="sr-only">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link href={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`}>
                {job.title} – {job.location} –{" "}
                {job.company_name || job.company?.company_name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Interaktive Job-Liste mit erhaltener Filter-Logik */}
      <JobsClient
        initialJobs={jobs}
        initialPositionType={route.positionType || ""}
        initialAccommodation={!!route.accommodationOnly}
        hideHeader
      />
    </>
  );
}
