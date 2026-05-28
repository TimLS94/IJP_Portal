import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontaktieren Sie JobOn - Wir helfen Ihnen bei Fragen zu Jobs in Deutschland, Bewerbungen und Visa. Schnelle Antwort innerhalb von 24 Stunden.",
  keywords: ["Kontakt", "JobOn Kontakt", "Hilfe", "Anfrage", "Support"],
  openGraph: {
    title: "Kontakt | JobOn",
    description: "Kontaktieren Sie uns - Wir helfen Ihnen gerne weiter.",
    type: "website",
    locale: "de_DE",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
