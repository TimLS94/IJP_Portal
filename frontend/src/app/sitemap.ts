import { MetadataRoute } from "next";
import { STELLEN_ROUTES, stellenHref } from "./(public)/stellenangebote/filters";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";
import { SITE_URL } from "@/lib/site";
const BASE_URL = SITE_URL;

// Sitemap wird alle 30 Sekunden neu generiert → neue Jobs erscheinen sehr schnell
export const revalidate = 30;

interface SitemapJob {
  url: string;     // "/jobs/slug-id" — bereits korrekt formatiert vom Backend
  lastmod: string; // "2026-05-28"
  title: string;
  id: number;
  has_en?: boolean; // eigene Stelle mit echter EN-Übersetzung -> /en/jobs/<slug> existiert
}

interface SitemapBlogPost {
  slug: string;
  language: string;
  path: string;   // "/blog/slug" | "/blog/es/slug" | "/blog/en/slug"
  lastmod: string;
}

async function getJobs(): Promise<SitemapJob[]> {
  try {
    // /jobs/sitemap/urls gibt ALLE aktiven, nicht archivierten Jobs zurück (kein Limit)
    const res = await fetch(`${API_URL}/jobs/sitemap/urls`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.urls || [];
  } catch {
    return [];
  }
}

async function getBlogPosts(): Promise<SitemapBlogPost[]> {
  try {
    const res = await fetch(`${API_URL}/blog/sitemap/urls`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.urls || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jobs, blogPosts] = await Promise.all([getJobs(), getBlogPosts()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/jobs`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/stellenarten`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/arbeitgeber`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    // "Für Arbeitnehmer"-Infobereich (Hub + Themen)
    { url: `${BASE_URL}/arbeitnehmer`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    { url: `${BASE_URL}/arbeitnehmer/krankenkasse`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/arbeitnehmer/arbeitsvertrag`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/arbeitnehmer/steuern`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/arbeitnehmer/anmeldung`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/arbeitnehmer/bankkonto`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/arbeitnehmer/rechte`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    // SEO-Filter-Routen für Stellenangebote (Index + Kategorien)
    ...STELLEN_ROUTES.map((r) => ({
      url: `${BASE_URL}${stellenHref(r.slug)}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: r.slug ? 0.85 : 0.9,
    })),
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/impressum`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/datenschutz`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/agb`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Jobs: Backend liefert URL bereits als "/jobs/slug-id" — kein Limit, alle aktiven Jobs
  const jobPages: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${BASE_URL}${job.url}`,
    lastModified: new Date(job.lastmod),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Englische URL-Varianten für eigene Stellen mit EN-Übersetzung (/en/jobs/<slug>).
  // job.url ist "/jobs/<slug>" -> daraus "/en/jobs/<slug>".
  const enJobPages: MetadataRoute.Sitemap = jobs
    .filter((job) => job.has_en)
    .map((job) => ({
      url: `${BASE_URL}/en${job.url}`,
      lastModified: new Date(job.lastmod),
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}${post.path}`,
    lastModified: new Date(post.lastmod),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...jobPages, ...enJobPages, ...blogPages];
}
