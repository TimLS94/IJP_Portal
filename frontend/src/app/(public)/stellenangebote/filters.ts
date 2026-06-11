// Geteilte Konfiguration für die SEO-Filter-Routen unter /stellenangebote.
// Server- und Client-tauglich (keine client-only Imports).

export interface ContentSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface FaqItem {
  q: string;
  a: string;
}

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
  sections: ContentSection[];   // ausführlicher SEO-Content (H2-Abschnitte)
  faqs: FaqItem[];              // FAQ-Bereich + FAQPage-Schema
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
    sections: [
      {
        heading: "Jobs in Deutschland für internationale Bewerber",
        paragraphs: [
          "JobOn ist die Plattform, die internationale Bewerberinnen und Bewerber mit Arbeitgebern in Deutschland zusammenbringt. Egal ob du für eine Saison kommst, als Student in den Ferien arbeiten möchtest, eine langfristige Stelle als Fachkraft suchst oder eine Ausbildung beginnen willst – hier findest du passende Stellenangebote aus ganz Deutschland.",
          "Viele Arbeitgeber auf JobOn richten sich gezielt an Bewerber aus dem Ausland. Das bedeutet: Stellen mit geringen oder ohne Deutschkenntnisse, mit Unterstützung bei Visum und Anreise und in vielen Fällen mit angebotener Unterkunft. So gelingt der Einstieg in den deutschen Arbeitsmarkt deutlich leichter.",
        ],
      },
      {
        heading: "Welche Stellenarten gibt es?",
        paragraphs: [
          "Auf JobOn sind die Stellenangebote nach Aufenthaltszweck und Beschäftigungsart geordnet. So findest du schnell die Jobs, die zu deiner Situation passen:",
        ],
        bullets: [
          "Saisonjobs – befristete Beschäftigung in Branchen wie Gastronomie, Hotellerie, Tourismus und Landwirtschaft.",
          "Studentenjobs & Ferienjobs – für internationale Studierende, die in den Semesterferien in Deutschland arbeiten möchten.",
          "Fachkräfte-Jobs – langfristige Anstellungen für qualifizierte Bewerber aus dem Ausland.",
          "Ausbildung – Ausbildungsplätze für den Einstieg in eine Berufslaufbahn in Deutschland.",
          "Jobs mit Unterkunft – Stellen, bei denen der Arbeitgeber eine Unterkunft bereitstellt.",
        ],
      },
      {
        heading: "So bewirbst du dich auf JobOn",
        paragraphs: [
          "Die Bewerbung ist für Bewerber komplett kostenlos. Du legst ein kostenloses Profil an, lädst deine Unterlagen hoch und bewirbst dich mit wenigen Klicks direkt auf passende Stellen. Arbeitgeber sehen dein Profil und melden sich bei Interesse. Filtere die Stellenangebote nach Stellenart, Ort, Deutschkenntnissen oder Unterkunft, um genau die Jobs zu finden, die zu dir passen.",
        ],
      },
    ],
    faqs: [
      {
        q: "Wer kann sich auf JobOn bewerben?",
        a: "JobOn richtet sich an internationale Bewerberinnen und Bewerber, die in Deutschland arbeiten oder eine Ausbildung beginnen möchten. Je nach Stellenart und Herkunftsland gelten unterschiedliche aufenthaltsrechtliche Voraussetzungen, über die wir dich im Bewerbungsprozess informieren.",
      },
      {
        q: "Ist die Nutzung für Bewerber kostenlos?",
        a: "Ja. Das Anlegen eines Profils und die Bewerbung auf Stellenangebote sind für Bewerber vollständig kostenlos.",
      },
      {
        q: "Brauche ich Deutschkenntnisse?",
        a: "Das hängt von der Stelle ab. Viele Saison- und Studentenjobs sind auch mit geringen Deutschkenntnissen möglich. Bei jeder Stellenanzeige findest du die geforderten Sprachkenntnisse, und du kannst die Suche gezielt danach filtern.",
      },
      {
        q: "Wie läuft die Bewerbung ab?",
        a: "Du erstellst ein kostenloses Profil, lädst deine Dokumente hoch und bewirbst dich direkt auf passende Stellen. Der Arbeitgeber prüft deine Bewerbung und meldet sich bei Interesse bei dir.",
      },
    ],
  },
  {
    slug: "mit-unterkunft",
    positionType: "saisonjob",
    accommodationOnly: true,
    chipLabel: "Mit Unterkunft",
    chipEmoji: "🏠",
    title: "Saisonjobs mit Unterkunft in Deutschland | JobOn",
    description:
      "Finde Saisonjobs in Deutschland mit kostenloser Unterkunft. Über 500 internationale Bewerber auf JobOn.work.",
    h1: "Saisonjobs mit Unterkunft",
    intro:
      "Du suchst einen Saisonjob in Deutschland und brauchst eine Unterkunft? Auf JobOn findest du aktuelle Stellen in Hotels, Gastronomie und Tourismus — inklusive Unterkunft direkt vom Arbeitgeber.",
    sections: [
      {
        heading: "Saisonjobs mit Unterkunft – der einfache Start in Deutschland",
        paragraphs: [
          "Eine der größten Hürden bei einem Saisonjob im Ausland ist die Wohnungssuche. Genau deshalb bieten viele Arbeitgeber in Deutschland ihren Saisonkräften eine Unterkunft an – häufig direkt am Arbeitsplatz oder in unmittelbarer Nähe. Das spart Zeit, Geld und den oft schwierigen Weg über den deutschen Wohnungsmarkt.",
          "Auf dieser Seite findest du gezielt Saisonjobs, bei denen der Arbeitgeber eine Unterkunft bereitstellt. So kannst du dich auf das Wesentliche konzentrieren: Geld verdienen, Arbeitserfahrung sammeln und Deutschland kennenlernen.",
        ],
      },
      {
        heading: "In welchen Branchen gibt es Unterkunft?",
        paragraphs: [
          "Unterkunft wird besonders häufig in Branchen mit saisonalem Bedarf angeboten, in denen Arbeitskräfte flexibel und vor Ort gebraucht werden:",
        ],
        bullets: [
          "Hotellerie – Stellen an der Rezeption, im Housekeeping oder im Service, oft mit Personalzimmer.",
          "Gastronomie – Küche, Service und Bar in Restaurants, Cafés und Betrieben in Tourismusregionen.",
          "Tourismus – Saisonbetriebe in den Bergen, an Seen oder an der Küste.",
          "Landwirtschaft – Erntehelfer und Saisonkräfte, häufig mit Unterbringung auf dem Hof.",
        ],
      },
      {
        heading: "Was bedeutet \"Unterkunft inklusive\"?",
        paragraphs: [
          "Die genauen Konditionen legt jeder Arbeitgeber selbst fest und gibt sie in der Stellenanzeige an. In vielen Fällen ist die Unterkunft kostenlos oder wird zu einem geringen Betrag bereitgestellt. Achte in der jeweiligen Anzeige auf die Details zu Art der Unterkunft, Kosten und Lage – und frag im Zweifel direkt beim Arbeitgeber nach.",
        ],
      },
    ],
    faqs: [
      {
        q: "Ist die Unterkunft wirklich kostenlos?",
        a: "Das hängt vom Arbeitgeber ab. Viele Betriebe stellen die Unterkunft kostenlos oder gegen einen geringen Beitrag zur Verfügung. Die genauen Konditionen findest du in der jeweiligen Stellenanzeige.",
      },
      {
        q: "In welchen Regionen gibt es Saisonjobs mit Unterkunft?",
        a: "Solche Stellen gibt es in ganz Deutschland, besonders häufig in Tourismusregionen wie den Alpen, an der Nord- und Ostsee, in Weinregionen und in ländlichen Gebieten mit Landwirtschaft.",
      },
      {
        q: "Wie lange dauert ein Saisonjob?",
        a: "Saisonjobs sind befristet und dauern je nach Branche und Saison typischerweise einige Wochen bis mehrere Monate. Die genaue Dauer steht in der Stellenanzeige.",
      },
      {
        q: "Welche Dokumente brauche ich für die Bewerbung?",
        a: "In der Regel benötigst du einen gültigen Reisepass und einen Lebenslauf. Je nach Stelle und Herkunftsland können weitere Dokumente erforderlich sein – die genauen Anforderungen siehst du in deinem Profil bei der Bewerbung.",
      },
    ],
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
      "Saisonjobs in Deutschland bieten internationalen Bewerbern die Chance, Arbeitserfahrung zu sammeln und Deutschland kennenzulernen. Finde aktuelle Stellen in Gastronomie, Hotellerie und Tourismus.",
    sections: [
      {
        heading: "Was ist ein Saisonjob?",
        paragraphs: [
          "Ein Saisonjob ist eine zeitlich befristete Beschäftigung, die an eine bestimmte Jahreszeit oder Hochsaison gebunden ist. In Deutschland werden Saisonkräfte vor allem in Branchen gebraucht, in denen die Nachfrage stark schwankt – etwa im Tourismus während der Sommer- und Wintersaison oder in der Landwirtschaft zur Erntezeit.",
          "Für internationale Bewerber sind Saisonjobs ein idealer Einstieg: Sie sind befristet, oft auch mit geringen Deutschkenntnissen möglich und in vielen Fällen mit angebotener Unterkunft verbunden.",
        ],
      },
      {
        heading: "Branchen und typische Tätigkeiten",
        bullets: [
          "Hotellerie – Rezeption, Housekeeping, Frühstücksservice.",
          "Gastronomie – Küchenhilfe, Service, Spülküche, Bar.",
          "Tourismus – Saisonbetriebe in Urlaubsregionen.",
          "Landwirtschaft – Ernte, Verpackung, Hofarbeit.",
        ],
      },
      {
        heading: "Voraussetzungen und Aufenthalt",
        paragraphs: [
          "Welche aufenthaltsrechtlichen Voraussetzungen für einen Saisonjob gelten, hängt von deinem Herkunftsland ab. Bürger der EU können ohne zusätzliche Genehmigung in Deutschland arbeiten. Für Bewerber aus anderen Ländern ist in der Regel ein passendes Visum bzw. ein Aufenthaltstitel erforderlich. Wir informieren dich im Bewerbungsprozess über die nötigen Schritte; verbindliche Auskünfte erhältst du bei der zuständigen deutschen Auslandsvertretung.",
        ],
      },
    ],
    faqs: [
      {
        q: "Wie lange dauert ein Saisonjob in Deutschland?",
        a: "Saisonjobs sind befristet und dauern je nach Branche und Saison meist einige Wochen bis mehrere Monate. Die genaue Dauer ist in der jeweiligen Stellenanzeige angegeben.",
      },
      {
        q: "Brauche ich Deutschkenntnisse für einen Saisonjob?",
        a: "Viele Saisonjobs sind auch mit geringen Deutschkenntnissen möglich. Die geforderten Sprachkenntnisse stehen in jeder Stellenanzeige, und du kannst die Suche danach filtern.",
      },
      {
        q: "Gibt es Saisonjobs mit Unterkunft?",
        a: "Ja, viele Arbeitgeber bieten ihren Saisonkräften eine Unterkunft an. Nutze dafür den Filter \"Mit Unterkunft\" oder die Seite Saisonjobs mit Unterkunft.",
      },
      {
        q: "Wie bewerbe ich mich auf einen Saisonjob?",
        a: "Lege ein kostenloses Profil auf JobOn an, lade deine Unterlagen hoch und bewirb dich direkt auf passende Stellen. Der Arbeitgeber meldet sich bei Interesse bei dir.",
      },
    ],
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
      "Als internationaler Student kannst du in Deutschland während der Ferien arbeiten. Finde passende Ferienjobs in Hotels, Restaurants und mehr.",
    sections: [
      {
        heading: "Ferienjobs für internationale Studierende",
        paragraphs: [
          "Ein Studentenferienjob ist die ideale Möglichkeit, in der vorlesungsfreien Zeit Geld zu verdienen, deine Deutschkenntnisse zu verbessern und das Land kennenzulernen. Internationale Studierende können in den Semesterferien in Deutschland arbeiten – häufig in Branchen mit hohem saisonalem Bedarf wie Gastronomie, Hotellerie oder Logistik.",
          "Viele Ferienjobs sind auch mit überschaubaren Deutschkenntnissen möglich und teilweise mit angebotener Unterkunft verbunden, was den Aufenthalt zusätzlich erleichtert.",
        ],
      },
      {
        heading: "Wo internationale Studenten arbeiten",
        bullets: [
          "Gastronomie – Service, Küchenhilfe, Aushilfe in Cafés und Restaurants.",
          "Hotellerie – Housekeeping, Rezeption, Frühstücksservice.",
          "Logistik & Lager – Kommissionierung, Verpackung, Versand.",
          "Tourismus – Saisonbetriebe in Urlaubsregionen.",
        ],
      },
      {
        heading: "Was du zum Aufenthalt wissen solltest",
        paragraphs: [
          "Für eine Ferienbeschäftigung internationaler Studierender in Deutschland gelten besondere Regeln, etwa zur maximalen Beschäftigungsdauer. Die konkreten Bedingungen hängen von deinem Status und deinem Herkunftsland ab. Wir begleiten dich im Bewerbungsprozess; verbindliche Auskünfte zu Visum und Aufenthalt erhältst du bei der zuständigen deutschen Auslandsvertretung.",
        ],
      },
    ],
    faqs: [
      {
        q: "Wie lange dürfen internationale Studierende in den Ferien arbeiten?",
        a: "Für die Ferienbeschäftigung internationaler Studierender gelten gesetzliche Grenzen für die maximale Beschäftigungsdauer. Die genauen Bedingungen hängen von deinem Status und Herkunftsland ab – informiere dich dazu bei der zuständigen deutschen Auslandsvertretung.",
      },
      {
        q: "Brauche ich für einen Studentenjob Deutschkenntnisse?",
        a: "Viele Ferienjobs sind auch mit geringen Deutschkenntnissen möglich. Die geforderten Sprachkenntnisse stehen in jeder Stellenanzeige.",
      },
      {
        q: "Gibt es Studentenjobs mit Unterkunft?",
        a: "Ja, einige Arbeitgeber bieten auch für Ferienjobs eine Unterkunft an. Du kannst die Suche mit dem Filter \"Mit Unterkunft\" eingrenzen.",
      },
      {
        q: "Ist die Bewerbung kostenlos?",
        a: "Ja, das Anlegen eines Profils und die Bewerbung auf Studentenjobs sind für Bewerber kostenlos.",
      },
    ],
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
    sections: [
      {
        heading: "Als Fachkraft nach Deutschland",
        paragraphs: [
          "Deutschland hat in vielen Branchen einen hohen Bedarf an qualifizierten Fachkräften und ist auf Bewerber aus dem Ausland angewiesen. Mit einer abgeschlossenen Berufsausbildung oder Berufserfahrung hast du gute Chancen auf eine langfristige Anstellung – häufig verbunden mit einer dauerhaften Aufenthaltsperspektive.",
          "Auf JobOn findest du Stellen von Arbeitgebern, die gezielt internationale Fachkräfte suchen und beim Einstieg unterstützen.",
        ],
      },
      {
        heading: "Gefragte Branchen für Fachkräfte",
        bullets: [
          "Gastronomie & Hotellerie – Köche, Servicekräfte, Restaurant- und Hotelfachleute.",
          "Logistik – Lager, Transport, Disposition.",
          "Handwerk und technische Berufe.",
          "Pflege und weitere Mangelberufe.",
        ],
      },
      {
        heading: "Qualifikation und Anerkennung",
        paragraphs: [
          "Für eine Beschäftigung als Fachkraft ist in der Regel eine anerkannte Qualifikation erforderlich. Ob und wie deine im Ausland erworbene Ausbildung in Deutschland anerkannt wird, hängt vom Beruf ab. Wir unterstützen dich dabei, den passenden Arbeitgeber zu finden; verbindliche Auskünfte zu Anerkennung, Visum und Aufenthalt erhältst du bei den zuständigen deutschen Stellen.",
        ],
      },
    ],
    faqs: [
      {
        q: "Welche Voraussetzungen muss ich als Fachkraft erfüllen?",
        a: "In der Regel benötigst du eine abgeschlossene Berufsausbildung oder einschlägige Berufserfahrung. Je nach Beruf kann eine Anerkennung deiner Qualifikation in Deutschland erforderlich sein.",
      },
      {
        q: "Muss meine ausländische Ausbildung anerkannt werden?",
        a: "Das hängt vom jeweiligen Beruf ab. Bei reglementierten Berufen ist eine Anerkennung notwendig, bei anderen ist sie hilfreich, aber nicht immer Pflicht. Informiere dich dazu bei den zuständigen Anerkennungsstellen.",
      },
      {
        q: "Brauche ich Deutschkenntnisse als Fachkraft?",
        a: "Für viele Fachkräfte-Stellen werden Deutschkenntnisse erwartet, das Niveau variiert je nach Beruf. Die Anforderungen findest du in der jeweiligen Stellenanzeige.",
      },
      {
        q: "Wie finde ich als Fachkraft einen Job in Deutschland?",
        a: "Lege ein kostenloses Profil auf JobOn an, hinterlege deine Qualifikationen und bewirb dich auf passende Stellen. Arbeitgeber, die Fachkräfte suchen, können dich so direkt finden.",
      },
    ],
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
    sections: [
      {
        heading: "Ausbildung in Deutschland – Karriere mit Perspektive",
        paragraphs: [
          "Das deutsche Ausbildungssystem ist weltweit anerkannt: Die duale Ausbildung verbindet praktische Arbeit im Betrieb mit theoretischem Unterricht in der Berufsschule. Für internationale Bewerber ist eine Ausbildung ein attraktiver Weg, eine qualifizierte Berufslaufbahn in Deutschland aufzubauen – mit Ausbildungsvergütung und langfristiger Aufenthaltsperspektive.",
          "Auf JobOn findest du Ausbildungsplätze von Betrieben, die offen für internationale Auszubildende sind und beim Start unterstützen.",
        ],
      },
      {
        heading: "Beliebte Ausbildungsbereiche",
        bullets: [
          "Hotellerie und Gastronomie – z. B. Hotelfachleute und Köche.",
          "Pflege und Gesundheit.",
          "Handwerk und technische Berufe.",
          "Handel und Logistik.",
        ],
      },
      {
        heading: "Voraussetzungen, Visum und Bewerbung",
        paragraphs: [
          "Für eine Ausbildung in Deutschland brauchst du in der Regel einen Ausbildungsvertrag mit einem Betrieb, ausreichende Deutschkenntnisse sowie – je nach Herkunftsland – ein entsprechendes Visum bzw. einen Aufenthaltstitel. Wir helfen dir, einen passenden Ausbildungsbetrieb zu finden; verbindliche Informationen zu Visum, Anerkennung von Schulabschlüssen und Aufenthalt erhältst du bei der zuständigen deutschen Auslandsvertretung.",
        ],
      },
    ],
    faqs: [
      {
        q: "Welche Voraussetzungen brauche ich für eine Ausbildung in Deutschland?",
        a: "In der Regel benötigst du einen Schulabschluss, ausreichende Deutschkenntnisse und einen Ausbildungsvertrag mit einem Betrieb. Je nach Herkunftsland ist zusätzlich ein Visum erforderlich.",
      },
      {
        q: "Welche Deutschkenntnisse sind für eine Ausbildung nötig?",
        a: "Für die meisten Ausbildungen werden solide Deutschkenntnisse erwartet, da der Berufsschulunterricht auf Deutsch stattfindet. Das genaue Niveau hängt vom Beruf und Betrieb ab.",
      },
      {
        q: "Verdiene ich während der Ausbildung Geld?",
        a: "Ja, Auszubildende erhalten in Deutschland eine monatliche Ausbildungsvergütung. Die Höhe hängt von Beruf, Branche und Ausbildungsjahr ab.",
      },
      {
        q: "Wie bewerbe ich mich auf einen Ausbildungsplatz?",
        a: "Lege ein kostenloses Profil auf JobOn an, lade deine Unterlagen hoch und bewirb dich auf passende Ausbildungsplätze. Der Betrieb meldet sich bei Interesse bei dir.",
      },
    ],
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
