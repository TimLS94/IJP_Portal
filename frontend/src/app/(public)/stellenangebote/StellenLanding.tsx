import Link from "next/link";
import JobsClient from "../jobs/JobsClient";
import { STELLEN_ROUTES, StellenRoute, stellenHref } from "./filters";
import { jsonLdHtml } from "@/lib/jsonLd";

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

function generateFaqSchema(route: StellenRoute) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: route.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export default async function StellenLanding({ route }: { route: StellenRoute }) {
  const jobs = await getJobs(route);
  const jsonLd = generateJobListSchema(jobs);
  const faqLd = generateFaqSchema(route);
  // Verwandte Kategorien für interne Verlinkung (alle außer der aktuellen)
  const relatedRoutes = STELLEN_ROUTES.filter((r) => r.slug !== route.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqLd) }}
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

      {/* SEO-Content: ausführliche Textabschnitte */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="space-y-10">
            {route.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
                {section.paragraphs?.map((p, j) => (
                  <p key={j} className="text-gray-700 leading-relaxed mb-3">
                    {p}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-2 space-y-2">
                    {section.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-2 text-gray-700">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* FAQ */}
          {route.faqs.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Häufige Fragen</h2>
              <div className="space-y-4">
                {route.faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="group bg-white rounded-xl border border-gray-200 p-5"
                  >
                    <summary className="flex items-center justify-between cursor-pointer font-semibold text-gray-900 list-none">
                      {faq.q}
                      <span className="ml-4 text-primary-600 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-gray-700 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Interne Verlinkung zu verwandten Kategorien */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Weitere Stellenangebote</h2>
            <div className="flex flex-wrap gap-3">
              {relatedRoutes.map((r) => (
                <Link
                  key={r.slug || "all"}
                  href={stellenHref(r.slug)}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:border-primary-300 hover:text-primary-600 transition-all"
                >
                  {r.chipEmoji ? `${r.chipEmoji} ` : ""}
                  {r.h1}
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">Jetzt kostenlos auf JobOn bewerben</h2>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              Erstelle dein kostenloses Profil, lade deine Unterlagen hoch und
              bewirb dich direkt auf passende Stellen in Deutschland.
            </p>
            <Link
              href="/register"
              className="inline-block bg-white text-primary-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all"
            >
              Kostenlos registrieren
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
