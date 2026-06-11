import { Metadata } from "next";
import { notFound } from "next/navigation";
import StellenLanding from "../StellenLanding";
import { getRouteBySlug, FILTER_SLUGS } from "../filters";

const BASE_URL = "https://www.jobon.work";

// Revalidierung alle 60 Sekunden für neue Jobs
export const revalidate = 60;

// Bekannte Filter-Routen vorab statisch generieren
export function generateStaticParams() {
  return FILTER_SLUGS.map((filter) => ({ filter }));
}

// Nur bekannte Slugs erlauben (unbekannte -> 404)
export const dynamicParams = false;

interface Props {
  params: Promise<{ filter: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { filter } = await params;
  const route = getRouteBySlug(filter);
  if (!route) return {};

  const url = `${BASE_URL}/stellenangebote/${filter}`;
  return {
    title: route.title,
    description: route.description,
    alternates: { canonical: url },
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
      url,
      siteName: "JobOn",
    },
  };
}

export default async function StellenangeboteFilterPage({ params }: Props) {
  const { filter } = await params;
  const route = getRouteBySlug(filter);
  if (!route) notFound();
  return <StellenLanding route={route} />;
}
