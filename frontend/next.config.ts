import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Verhindert dass 404-Seiten gecacht werden
  // So werden neue Blog-Artikel sofort sichtbar nach Veröffentlichung
  async headers() {
    return [
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
