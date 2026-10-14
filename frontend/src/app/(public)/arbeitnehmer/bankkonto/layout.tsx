import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bankkonto & Steuer-ID in Deutschland – einfach erklärt",
  description:
    "Girokonto eröffnen, Basiskonto, Steuer-Identifikationsnummer und warum dein Arbeitgeber beides braucht – kompakt für Arbeitnehmer in Deutschland.",
  keywords: ["Girokonto", "Bankkonto", "Basiskonto", "Steuer-ID", "Steueridentifikationsnummer", "IBAN"],
  openGraph: {
    title: "Bankkonto & Steuer-ID in Deutschland | JobOn",
    description: "Damit dein Gehalt ankommt und richtig besteuert wird.",
    type: "website",
    locale: "de_DE",
  },
};

export default function BankkontoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
