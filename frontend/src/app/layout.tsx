import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import FeedbackButton from "@/components/FeedbackButton";
import { jsonLdHtml } from "@/lib/jsonLd";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.jobon.work"),
  title: {
    default: "JobOn | Internationale Saisonkräfte für Hotels & Gastronomie finden",
    template: "%s | JobOn",
  },
  description: "JobOn ist das Portal für internationale Saisonkräfte in Deutschland. Arbeitgeber finden qualifizierte Mitarbeiter für Hotel, Gastronomie & Logistik. Bewerber finden Jobs mit Unterkunft.",
  keywords: ["Saisonkräfte finden", "Mitarbeiter Gastronomie", "Personal Hotel", "Kellner gesucht", "Küchenhilfe gesucht", "Saisonjobs Deutschland", "Studentenferienjobs", "internationale Fachkräfte"],
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
    title: "JobOn | Internationale Saisonkräfte für Hotels & Gastronomie finden",
    description: "Das Portal für Arbeitgeber und Bewerber. Finden Sie qualifizierte Saisonkräfte für Hotel, Gastronomie & Logistik in Deutschland.",
    images: [
      {
        url: "https://www.jobon.work/logo-512x512.png",
        width: 512,
        height: 512,
        alt: "JobOn - Portal für Saisonkräfte in Deutschland",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "JobOn | Internationale Saisonkräfte für Hotels & Gastronomie",
    description: "Das Portal für Arbeitgeber und Bewerber. Saisonkräfte für Hotel, Gastronomie & Logistik.",
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
        {/* Schnellerer Abruf des Google-Sign-In-Scripts */}
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
        <link rel="preconnect" href="https://www.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(organizationSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {children}
          <FeedbackButton />
        </Providers>
      </body>
    </html>
  );
}
