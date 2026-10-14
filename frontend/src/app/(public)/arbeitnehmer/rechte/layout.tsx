import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deine Rechte als Arbeitnehmer in Deutschland – einfach erklärt",
  description:
    "Mindestlohn, Urlaub, Lohnfortzahlung im Krankheitsfall, Arbeitszeit, Kündigungsschutz und Gleichbehandlung – deine Rechte als Arbeitnehmer in Deutschland.",
  keywords: ["Arbeitnehmerrechte", "Mindestlohn", "Urlaubsanspruch", "Lohnfortzahlung", "Kündigungsschutz", "AGG"],
  openGraph: {
    title: "Deine Rechte als Arbeitnehmer in Deutschland | JobOn",
    description: "Mindestlohn, Urlaub, Schutz bei Krankheit und faire Behandlung.",
    type: "website",
    locale: "de_DE",
  },
};

export default function RechteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
