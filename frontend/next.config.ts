import type { NextConfig } from "next";

// Content-Security-Policy: allowlistet exakt die real genutzten Fremd-Origins
// (Google-Login/GSI, Google Analytics, Stripe, R2-Bilder, die API). 'unsafe-inline'
// bei script/style ist ein pragmatischer Kompromiss, weil Next.js-Hydration + JSON-LD
// inline laufen; die stärkere Nonce-Variante kommt mit der Middleware (Phase 2).
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
  "img-src 'self' data: blob: https://ijp-portal.onrender.com https://api.jobonportal.de https://*.r2.dev https://*.r2.cloudflarestorage.com https://lh3.googleusercontent.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com",
  "connect-src 'self' https://ijp-portal.onrender.com https://api.jobonportal.de https://accounts.google.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://www.googletagmanager.com https://*.r2.dev https://*.r2.cloudflarestorage.com",
  "frame-src 'self' https://accounts.google.com https://js.stripe.com https://checkout.stripe.com",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  // CSP zunächst nur als Report-Only: blockt NICHTS, meldet aber Verstöße in der
  // Browser-Konsole. So laufen Google-Login/Stripe/GA/Bilder sicher weiter.
  // Umstellen auf "Content-Security-Policy", wenn die Konsole über alle Flows sauber ist.
  { key: "Content-Security-Policy-Report-Only", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ijp-portal.onrender.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
  async headers() {
    return [
      // Sicherheits-Header für ALLE Routen
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      // Verhindert dass 404-Seiten gecacht werden
      // So werden neue Blog-Artikel sofort sichtbar nach Veröffentlichung
      {
        source: "/blog/:slug*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/jobs/:slug*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
