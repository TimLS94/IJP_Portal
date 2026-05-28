import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.jobon.work"),
  title: {
    default: "JobOn — Personalvermittlung Gastronomie, Hotel & Logistik | International",
    template: "%s | JobOn",
  },
  description: "JobOn vermittelt internationale Fach- und Hilfskräfte an Hotels, Restaurants und Logistikunternehmen in Deutschland. Kostenlos für Bewerber ✓ Persönliche Betreuung ✓ Visa-Unterstützung",
  keywords: ["Personalvermittlung Gastronomie", "Personalvermittlung Hotel", "Kellner gesucht", "Küchenhilfe gesucht", "Saisonjobs Deutschland", "Aushilfe Logistik", "Jobs Deutschland", "internationale Fachkräfte"],
  authors: [{ name: "JobOn" }],
  creator: "JobOn",
  publisher: "JobOn",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    other: [
      { rel: "icon", type: "image/svg+xml", url: "/logo.svg" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "https://www.jobon.work",
    siteName: "JobOn",
    title: "JobOn — Personalvermittlung für Gastronomie, Hotel & Logistik",
    description: "Internationale Fach- und Hilfskräfte für Hotels, Restaurants und Logistik. Kostenlos für Bewerber, persönliche Betreuung.",
    images: [
      {
        url: "https://www.jobon.work/logo-512x512.png",
        width: 512,
        height: 512,
        alt: "JobOn - Internationale Jobvermittlung für Jobs in Deutschland",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "JobOn — Personalvermittlung für Gastronomie, Hotel & Logistik",
    description: "Internationale Fach- und Hilfskräfte für Hotels, Restaurants und Logistik. Kostenlos für Bewerber.",
    images: ["https://www.jobon.work/logo-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://www.jobon.work",
  },
  other: {
    "theme-color": "#2563eb",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "EmploymentAgency",
  "name": "JobOn",
  "url": "https://www.jobon.work",
  "logo": "https://www.jobon.work/logo-512x512.png",
  "description": "Personalvermittlung für Gastronomie, Hotellerie und Logistik in Deutschland. Internationale Fach- und Hilfskräfte.",
  "areaServed": {
    "@type": "Country",
    "name": "Germany"
  },
  "serviceType": ["Personalvermittlung", "Jobvermittlung", "Visa-Unterstützung", "Fachkräftevermittlung"],
  "knowsLanguage": ["de", "en", "es", "ru"],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "info@jobon.work",
    "availableLanguage": ["German", "English", "Spanish", "Russian"]
  },
  "sameAs": []
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${inter.variable} h-full`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
