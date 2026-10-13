import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Für Arbeitnehmer – Arbeiten & Leben in Deutschland",
  description:
    "Wichtige Infos für Arbeitnehmer und Arbeitssuchende in Deutschland: Krankenversicherung, Arbeitsvertrag, Steuern, Anmeldung und mehr. Mit passenden Ratgeber-Artikeln.",
  keywords: [
    "Arbeitnehmer Deutschland",
    "Arbeiten in Deutschland",
    "Krankenversicherung",
    "Arbeitsvertrag",
    "Steuern Deutschland",
    "Anmeldung Wohnsitz",
  ],
  openGraph: {
    title: "Für Arbeitnehmer – Arbeiten & Leben in Deutschland | JobOn",
    description:
      "Alles, was du als Arbeitnehmer in Deutschland wissen musst – klar erklärt.",
    type: "website",
    locale: "de_DE",
  },
};

export default function ArbeitnehmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
