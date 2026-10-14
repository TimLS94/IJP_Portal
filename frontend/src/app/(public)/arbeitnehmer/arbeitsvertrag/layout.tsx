import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arbeitsvertrag in Deutschland – einfach erklärt",
  description:
    "Was muss im Arbeitsvertrag stehen? Probezeit, Befristung, Kündigungsfristen, Mindestlohn und deine Rechte als Arbeitnehmer in Deutschland – kompakt erklärt.",
  keywords: [
    "Arbeitsvertrag Deutschland",
    "Probezeit",
    "Befristung",
    "Kündigungsfrist",
    "Mindestlohn",
    "Nachweisgesetz",
  ],
  openGraph: {
    title: "Arbeitsvertrag in Deutschland – einfach erklärt | JobOn",
    description: "Alles Wichtige zum Arbeitsvertrag in Deutschland – kompakt und verständlich.",
    type: "website",
    locale: "de_DE",
  },
};

export default function ArbeitsvertragLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
