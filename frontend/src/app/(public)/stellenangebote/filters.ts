// Geteilte Konfiguration für die SEO-Filter-Routen unter /stellenangebote.
// Server- und Client-tauglich (keine client-only Imports).

export interface StellenRoute {
  slug: string;                 // Route-Segment ("" = Index /stellenangebote)
  positionType?: string;        // Backend position_type Filter
  accommodationOnly?: boolean;  // Filter "nur mit Unterkunft"
  chipLabel: string;            // Beschriftung im Filter-Chip
  chipEmoji: string;            // Emoji im Filter-Chip
  // SEO
  title: string;                // <title>
  description: string;          // meta description
  h1: string;                   // sichtbare H1
  intro: string;                // Intro-Text
}

export const STELLEN_ROUTES: StellenRoute[] = [
  {
    slug: "",
    chipLabel: "Alle",
    chipEmoji: "",
    title: "Stellenangebote in Deutschland für internationale Bewerber | JobOn",
    description:
      "Aktuelle Stellenangebote in Deutschland: Saisonjobs, Studentenjobs, Fachkräfte und Ausbildung. Jetzt kostenlos bewerben auf JobOn.work.",
    h1: "Stellenangebote in Deutschland",
    intro:
      "Finde aktuelle Jobs in Deutschland für internationale Bewerber – von Saisonjobs über Studentenjobs bis hin zu Fachkräften und Ausbildungsplätzen. Jetzt kostenlos auf JobOn bewerben.",
  },
  {
    slug: "mit-unterkunft",
    accommodationOnly: true,
    chipLabel: "Mit Unterkunft",
    chipEmoji: "🏠",
    title: "Saisonjobs mit Unterkunft in Deutschland | JobOn",
    description:
      "Finde Saisonjobs in Deutschland mit kostenloser Unterkunft. Über 500 internationale Bewerber auf JobOn.work.",
    h1: "Saisonjobs mit Unterkunft",
    intro:
      "Du suchst einen Saisonjob in Deutschland und brauchst eine Unterkunft? Auf JobOn findest du aktuelle Stellen in Hotels, Gastronomie und Tourismus — inklusive kostenloser Unterkunft direkt vom Arbeitgeber.",
  },
  {
    slug: "saisonjobs",
    positionType: "saisonjob",
    chipLabel: "Saison",
    chipEmoji: "🌿",
    title: "Saisonjobs in Deutschland für internationale Bewerber | JobOn",
    description:
      "Aktuelle Saisonjobs in Hotels, Restaurants und Tourismus in Deutschland. Jetzt kostenlos bewerben auf JobOn.work.",
    h1: "Saisonjobs in Deutschland",
    intro:
      "Saisonjobs in Deutschland bieten internationale Bewerber die Chance, Arbeitserfahrung zu sammeln und Deutschland kennenzulernen. Finde aktuelle Stellen in Gastronomie, Hotellerie und Tourismus.",
  },
  {
    slug: "studentenjobs",
    positionType: "studentenferienjob",
    chipLabel: "Student",
    chipEmoji: "🎓",
    title: "Studentenjobs & Ferienjobs in Deutschland | JobOn",
    description:
      "Ferienjobs und Studentenjobs in Deutschland für internationale Studierende. Jetzt bewerben auf JobOn.work.",
    h1: "Studentenjobs in Deutschland",
    intro:
      "Als internationaler Student kannst du in Deutschland während der Ferien bis zu 90 Tage arbeiten. Finde passende Ferienjobs in Hotels, Restaurants und mehr.",
  },
  {
    slug: "fachkraefte",
    positionType: "fachkraft",
    chipLabel: "Fachkraft",
    chipEmoji: "💼",
    title: "Fachkräfte Jobs Deutschland für internationale Bewerber | JobOn",
    description:
      "Fachkräfte aus dem Ausland finden hier passende Jobs in Deutschland. Jetzt Profil anlegen auf JobOn.work.",
    h1: "Fachkräfte Jobs in Deutschland",
    intro:
      "Deutschland sucht qualifizierte Fachkräfte aus dem Ausland. Ob Gastronomie, Hotellerie oder Logistik — finde deinen nächsten Job in Deutschland und starte deine Karriere.",
  },
  {
    slug: "ausbildung",
    positionType: "ausbildung",
    chipLabel: "Ausbildung",
    chipEmoji: "📚",
    title: "Ausbildungsplätze in Deutschland für internationale Bewerber | JobOn",
    description:
      "Ausbildungsplätze in Deutschland für internationale Bewerber. Alle Infos zu Visum und Bewerbung auf JobOn.work.",
    h1: "Ausbildung in Deutschland",
    intro:
      "Eine Ausbildung in Deutschland ist der perfekte Einstieg in eine langfristige Karriere. Finde aktuelle Ausbildungsplätze und erfahre alles über Visum, Bewerbung und Voraussetzungen.",
  },
];

export const BASE_PATH = "/stellenangebote";

export const stellenHref = (slug: string): string =>
  slug ? `${BASE_PATH}/${slug}` : BASE_PATH;

export const getRouteBySlug = (slug: string): StellenRoute | undefined =>
  STELLEN_ROUTES.find((r) => r.slug === slug);

// Slugs der Filter-Unterseiten (ohne Index) — für generateStaticParams & Sitemap
export const FILTER_SLUGS: string[] = STELLEN_ROUTES.filter((r) => r.slug).map(
  (r) => r.slug
);

// Backend position_type -> Route-Href. Ohne passende Route: Index (alle Jobs).
export const hrefForPositionType = (positionType: string): string => {
  const route = STELLEN_ROUTES.find((r) => r.positionType === positionType);
  return stellenHref(route ? route.slug : "");
};
