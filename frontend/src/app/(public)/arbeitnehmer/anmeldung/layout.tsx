import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anmeldung & Wohnung in Deutschland – einfach erklärt",
  description:
    "Wohnsitz beim Bürgeramt anmelden, Wohnungsgeberbestätigung, Meldebescheinigung und Tipps zur Wohnungssuche – kompakt für Arbeitnehmer in Deutschland.",
  keywords: ["Anmeldung", "Bürgeramt", "Meldebescheinigung", "Wohnungsgeberbestätigung", "Wohnungssuche", "Kaution"],
  openGraph: {
    title: "Anmeldung & Wohnung in Deutschland | JobOn",
    description: "Wohnsitz anmelden und Wohnung finden – Schritt für Schritt.",
    type: "website",
    locale: "de_DE",
  },
};

export default function AnmeldungLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
