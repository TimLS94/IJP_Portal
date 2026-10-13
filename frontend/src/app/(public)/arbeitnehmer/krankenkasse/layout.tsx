import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Krankenversicherung in Deutschland – einfach erklärt",
  description:
    "Wie funktioniert die Krankenversicherung in Deutschland? Gesetzlich vs. privat, Anmeldung und Nachweis für die Botschaft – einfach erklärt, mit unserem Partner BARMER.",
  keywords: [
    "Krankenversicherung Deutschland",
    "gesetzliche Krankenversicherung",
    "BARMER",
    "Krankenkasse anmelden",
    "Versicherungsnachweis Botschaft",
    "Krankenversicherung Visum",
  ],
  openGraph: {
    title: "Krankenversicherung in Deutschland – einfach erklärt | JobOn",
    description:
      "Alles zur Krankenversicherung in Deutschland – mit unserem Partner BARMER.",
    type: "website",
    locale: "de_DE",
  },
};

export default function KrankenkasseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
