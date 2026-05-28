import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stellenarten - Arbeiten in Deutschland",
  description: "Übersicht aller Stellenarten: Studentenferienjob, Saisonjob, Work & Holiday, Fachkraft und Ausbildung. Erfahren Sie mehr über Voraussetzungen, Dokumente und Verdienstmöglichkeiten.",
  keywords: ["Stellenarten", "Studentenferienjob", "Saisonjob", "Work and Holiday", "Fachkraft", "Ausbildung Deutschland", "Arbeitsvisum"],
  openGraph: {
    title: "Stellenarten - Arbeiten in Deutschland | JobOn",
    description: "Alle Möglichkeiten in Deutschland zu arbeiten im Überblick.",
    type: "website",
    locale: "de_DE",
  },
};

export default function StellenartenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
