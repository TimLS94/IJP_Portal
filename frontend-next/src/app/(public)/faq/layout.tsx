import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ - Häufig gestellte Fragen",
  description: "Antworten auf häufig gestellte Fragen zu JobOn, Arbeit in Deutschland, Visa-Anforderungen und dem Bewerbungsprozess. Für Bewerber und Unternehmen.",
  keywords: ["FAQ", "Häufige Fragen", "JobOn Hilfe", "Arbeit Deutschland FAQ", "Visa Fragen"],
  openGraph: {
    title: "FAQ - Häufig gestellte Fragen | JobOn",
    description: "Antworten auf häufig gestellte Fragen zu JobOn und Arbeit in Deutschland.",
    type: "website",
    locale: "de_DE",
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
