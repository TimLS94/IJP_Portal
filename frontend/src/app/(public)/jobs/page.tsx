import { Metadata } from "next";
import JobsClient from "./JobsClient";
import Link from "next/link";
import { jsonLdHtml } from "@/lib/jsonLd";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";

export const metadata: Metadata = {
  title: "Stellenangebote - Jobs in Deutschland finden",
  description: "Finden Sie Ihren Traumjob bei JobOn. Aktuelle Stellenangebote für internationale Fachkräfte in Deutschland - Saisonjobs, Studentenferienjobs, Fachkräfte und Ausbildung.",
  keywords: ["Jobs Deutschland", "Stellenangebote", "Saisonjobs", "Studentenferienjobs", "Fachkräfte", "Ausbildung", "Arbeit in Deutschland"],
  alternates: {
    canonical: "https://www.jobon.work/jobs",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
  openGraph: {
    title: "Stellenangebote - Jobs in Deutschland | JobOn",
    description: "Aktuelle Stellenangebote für internationale Fachkräfte in Deutschland.",
    type: "website",
    locale: "de_DE",
    url: "https://www.jobon.work/jobs",
    siteName: "JobOn",
  },
};

// Revalidierung alle 60 Sekunden für neue Jobs
export const revalidate = 60;

interface Job {
  id: number;
  slug: string;
  title: string;
  description?: string;
  location?: string;
  position_type?: string;
  company_name?: string;
  created_at: string;
}

// Server-side Jobs laden für SEO
async function getJobs(): Promise<Job[]> {
  try {
    const res = await fetch(`${API_URL}/jobs/public`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.jobs || [];
  } catch {
    return [];
  }
}

// Position Type Labels
const positionTypeLabels: Record<string, string> = {
  studentenferienjob: "Studentenferienjob",
  saisonjob: "Saisonjob",
  workandholiday: "Work & Holiday",
  fachkraft: "Fachkraft",
  ausbildung: "Ausbildung",
};

// JSON-LD für Job-Liste
function generateJobListSchema(jobs: Job[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": jobs.slice(0, 20).map((job, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://www.jobon.work/jobs/${job.slug}`,
      "name": job.title,
    })),
  };
}

export default async function JobsPage() {
  const jobs = await getJobs();
  const jsonLd = generateJobListSchema(jobs);

  return (
    <>
      {/* JSON-LD Schema für Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      
      {/* SEO-freundliche Job-Liste (für Crawler sichtbar) */}
      <noscript>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Stellenangebote in Deutschland</h1>
          <p className="mb-6">
            Finden Sie aktuelle Jobs für internationale Fachkräfte: Saisonjobs, 
            Studentenferienjobs, Fachkräfte-Stellen und Ausbildungsplätze.
          </p>
          <div className="space-y-4">
            {jobs.map((job) => (
              <article key={job.id} className="border p-4 rounded">
                <h2>
                  <Link href={`/jobs/${job.slug}`} className="text-blue-600 hover:underline">
                    {job.title}
                  </Link>
                </h2>
                <p>📍 {job.location}</p>
                {job.position_type && <p>📋 {positionTypeLabels[job.position_type] || job.position_type}</p>}
                {job.company_name && <p>🏢 {job.company_name}</p>}
              </article>
            ))}
          </div>
        </div>
      </noscript>
      
      {/* Versteckte Links für Crawler (immer sichtbar im HTML) */}
      <div className="sr-only" aria-hidden="true">
        <h1>Stellenangebote - {jobs.length} aktuelle Jobs in Deutschland</h1>
        <ul>
          {jobs.map((job) => (
            <li key={job.id}>
              <Link href={`/jobs/${job.slug}`}>
                {job.title} - {job.location} - {job.company_name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Client Component für interaktive Elemente */}
      <JobsClient initialJobs={jobs} />
    </>
  );
}
