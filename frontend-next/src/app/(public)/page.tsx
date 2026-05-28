import { Metadata } from "next";
import HomeClient from "./HomeClient";
import Link from "next/link";

export const metadata: Metadata = {
  title: "JobOn — Personalvermittlung Gastronomie, Hotel & Logistik | International",
  description: "JobOn vermittelt internationale Fach- und Hilfskräfte an Hotels, Restaurants und Logistikunternehmen in Deutschland. Kostenlos für Bewerber, persönliche Betreuung, volle Visa-Begleitung.",
  keywords: ["Personalvermittlung Gastronomie", "Personalvermittlung Hotel", "Saisonjobs Deutschland", "Kellner gesucht", "Küchenhilfe gesucht", "Aushilfe Logistik", "Jobs Deutschland", "internationale Fachkräfte"],
  alternates: {
    canonical: "https://www.jobon.work",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
  openGraph: {
    title: "JobOn — Personalvermittlung für Gastronomie, Hotel & Logistik",
    description: "Internationale Fach- und Hilfskräfte für Hotels, Restaurants und Logistik. Kostenlos für Bewerber.",
    type: "website",
    locale: "de_DE",
    url: "https://www.jobon.work",
    siteName: "JobOn",
  },
};

// JSON-LD Schema für Organisation
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "JobOn",
  "url": "https://www.jobon.work",
  "logo": "https://www.jobon.work/logo.png",
  "description": "Personalvermittlung für internationale Fach- und Hilfskräfte in Deutschland",
  "sameAs": [],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": ["German", "English", "Russian"],
  },
};

// JSON-LD Schema für Website
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "JobOn",
  "url": "https://www.jobon.work",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.jobon.work/jobs?search={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default function Home() {
  return (
    <>
      {/* JSON-LD Schemas für Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      
      {/* SEO-freundlicher Content für Crawler (noscript fallback) */}
      <noscript>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-4">JobOn — Personalvermittlung für internationale Fachkräfte</h1>
          <p className="text-xl mb-8">
            Wir vermitteln internationale Fach- und Hilfskräfte an Hotels, Restaurants und 
            Logistikunternehmen in Deutschland. Kostenlos für Bewerber, mit persönlicher 
            Betreuung und voller Visa-Begleitung.
          </p>
          
          <h2 className="text-2xl font-bold mb-4">Unsere Stellenarten</h2>
          <ul className="mb-8">
            <li><Link href="/jobs?position_type=studentenferienjob">Studentenferienjobs</Link> - Für Studierende aus dem Ausland</li>
            <li><Link href="/jobs?position_type=saisonjob">Saisonjobs</Link> - 8-monatige Beschäftigung</li>
            <li><Link href="/jobs?position_type=fachkraft">Fachkräfte</Link> - Langfristige Anstellung</li>
            <li><Link href="/jobs?position_type=ausbildung">Ausbildung</Link> - Berufsausbildung in Deutschland</li>
          </ul>
          
          <h2 className="text-2xl font-bold mb-4">Für Bewerber</h2>
          <p className="mb-4">
            Registrieren Sie sich kostenlos und finden Sie Ihren Traumjob in Deutschland. 
            Wir unterstützen Sie bei Visum, Unterkunft und Arbeitsvertrag.
          </p>
          <Link href="/register" className="text-blue-600">Jetzt registrieren</Link>
          
          <h2 className="text-2xl font-bold mb-4 mt-8">Für Arbeitgeber</h2>
          <p className="mb-4">
            Finden Sie qualifizierte internationale Mitarbeiter für Ihr Unternehmen. 
            Wir übernehmen den gesamten Rekrutierungsprozess.
          </p>
          <Link href="/arbeitgeber" className="text-blue-600">Mehr erfahren</Link>
          
          <h2 className="text-2xl font-bold mb-4 mt-8">Aktuelle Stellenangebote</h2>
          <Link href="/jobs" className="text-blue-600">Alle Jobs ansehen</Link>
        </div>
      </noscript>
      
      {/* Versteckter SEO-Content (immer im HTML) */}
      <div className="sr-only" aria-hidden="true">
        <h1>JobOn - Personalvermittlung für internationale Fachkräfte in Deutschland</h1>
        <p>
          JobOn ist Ihr Partner für die Vermittlung von internationalen Fach- und Hilfskräften 
          an Hotels, Restaurants und Logistikunternehmen in Deutschland. Wir bieten 
          Studentenferienjobs, Saisonjobs, Fachkräfte-Stellen und Ausbildungsplätze.
        </p>
        <nav>
          <Link href="/jobs">Stellenangebote</Link>
          <Link href="/stellenarten">Stellenarten</Link>
          <Link href="/arbeitgeber">Für Arbeitgeber</Link>
          <Link href="/register">Registrieren</Link>
          <Link href="/login">Anmelden</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Kontakt</Link>
        </nav>
      </div>
      
      {/* Client Component für interaktive Elemente */}
      <HomeClient />
    </>
  );
}
