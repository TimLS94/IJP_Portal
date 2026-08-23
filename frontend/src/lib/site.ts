// Zentrale Quelle der öffentlichen Domain (Canonical / OG / JSON-LD / Sitemap).
// In Produktion via NEXT_PUBLIC_SITE_URL setzbar; Fallback = aktuelle Domain.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jobonportal.de"
).replace(/\/+$/, "");
