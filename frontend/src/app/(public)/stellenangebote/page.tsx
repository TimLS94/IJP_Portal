import { Metadata } from "next";
import StellenLanding from "./StellenLanding";
import { getRouteBySlug } from "./filters";

const BASE_URL = "https://www.jobon.work";

// Revalidierung alle 60 Sekunden für neue Jobs
export const revalidate = 60;

const route = getRouteBySlug("")!;

export const metadata: Metadata = {
  title: route.title,
  description: route.description,
  alternates: { canonical: `${BASE_URL}/stellenangebote` },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
  openGraph: {
    title: route.title,
    description: route.description,
    type: "website",
    locale: "de_DE",
    url: `${BASE_URL}/stellenangebote`,
    siteName: "JobOn",
  },
};

export default function StellenangebotePage() {
  return <StellenLanding route={route} />;
}
