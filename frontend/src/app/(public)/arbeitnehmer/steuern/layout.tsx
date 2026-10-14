import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Steuern & Sozialabgaben in Deutschland – einfach erklärt",
  description:
    "Lohnsteuer, Steuerklasse, Sozialversicherung und was von deinem Bruttolohn abgeht – kompakt erklärt für Arbeitnehmer in Deutschland.",
  keywords: ["Lohnsteuer", "Steuerklasse", "Sozialabgaben", "Sozialversicherung", "Steuer-ID", "Brutto Netto"],
  openGraph: {
    title: "Steuern & Sozialabgaben in Deutschland | JobOn",
    description: "Was von deinem Lohn abgeht – und was du zurückholen kannst.",
    type: "website",
    locale: "de_DE",
  },
};

export default function SteuernLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
