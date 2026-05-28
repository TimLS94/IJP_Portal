import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrieren",
  description: "Registrieren Sie sich kostenlos bei JobOn als Bewerber oder Unternehmen. Finden Sie Ihren Traumjob oder die perfekten Mitarbeiter.",
  keywords: ["Registrieren", "Anmelden", "JobOn Account", "Bewerber registrieren", "Unternehmen registrieren"],
  openGraph: {
    title: "Kostenlos registrieren | JobOn",
    description: "Registrieren Sie sich kostenlos und starten Sie Ihre Karriere in Deutschland.",
    type: "website",
    locale: "de_DE",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
