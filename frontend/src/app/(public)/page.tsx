import { Metadata } from "next";
import HomeClient from "./HomeClient";
import Link from "next/link";
import { jsonLdHtml } from "@/lib/jsonLd";

export const metadata: Metadata = {
  title: "JobOn | Internationale Saisonkräfte für Hotels & Gastronomie finden",
  description: "JobOn ist das Portal für internationale Saisonkräfte in Deutschland. Arbeitgeber finden qualifizierte Mitarbeiter für Hotel, Gastronomie & Logistik. Bewerber finden Jobs mit Unterkunft.",
  keywords: ["Saisonkräfte finden", "Mitarbeiter Gastronomie", "Personal Hotel", "Saisonjobs Deutschland", "Kellner gesucht", "Küchenhilfe gesucht", "Jobs Deutschland", "internationale Fachkräfte"],
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
    title: "JobOn | Internationale Saisonkräfte für Hotels & Gastronomie finden",
    description: "Das Portal für Arbeitgeber und Bewerber. Finden Sie qualifizierte Saisonkräfte für Hotel, Gastronomie & Logistik in Deutschland.",
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
  "description": "Portal für internationale Saisonkräfte in Hotel, Gastronomie & Logistik in Deutschland",
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
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(websiteSchema) }}
      />
      
      {/* SEO-freundlicher Content für Crawler (noscript fallback) */}
      <noscript>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-4">JobOn | Internationale Saisonkräfte für Hotels & Gastronomie</h1>
          <p className="text-xl mb-8">
            Das Portal für internationale Saisonkräfte in Deutschland. Arbeitgeber finden 
            qualifizierte Mitarbeiter, Bewerber finden Jobs mit Unterkunft und Unterstützung.
          </p>
          
          <h2 className="text-2xl font-bold mb-4">Unsere Stellenarten</h2>
          <ul className="mb-8">
            <li><Link href="/stellenangebote/studentenjobs">Studentenferienjobs</Link> - Für Studierende aus dem Ausland</li>
            <li><Link href="/stellenangebote/saisonjobs">Saisonjobs</Link> - 8-monatige Beschäftigung</li>
            <li><Link href="/stellenangebote/fachkraefte">Fachkräfte</Link> - Langfristige Anstellung</li>
            <li><Link href="/stellenangebote/ausbildung">Ausbildung</Link> - Berufsausbildung in Deutschland</li>
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
        <h1>JobOn - Portal für internationale Saisonkräfte in Deutschland</h1>
        <p>
          JobOn ist das Portal für internationale Saisonkräfte in Hotel, Gastronomie und 
          Logistik in Deutschland. Arbeitgeber finden qualifizierte Mitarbeiter, Bewerber 
          finden Studentenferienjobs, Saisonjobs, Fachkräfte-Stellen und Ausbildungsplätze.
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
