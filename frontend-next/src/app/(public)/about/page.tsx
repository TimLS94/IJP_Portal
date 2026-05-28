import { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "Über uns - Internationale Jobvermittlung",
  description: "JobOn - Internationale Jobvermittlung mit persönlicher Betreuung. Wir verbinden Fachkräfte aus aller Welt mit deutschen Unternehmen. Erfahren Sie mehr über unser Team und unsere Mission.",
  keywords: ["Über JobOn", "Jobvermittlung", "Team", "Mission", "Internationale Arbeitsvermittlung"],
  openGraph: {
    title: "Über uns | JobOn",
    description: "Internationale Jobvermittlung mit persönlicher Betreuung.",
    type: "website",
    locale: "de_DE",
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
