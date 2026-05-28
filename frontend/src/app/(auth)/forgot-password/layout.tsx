import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Passwort vergessen",
  description: "Setzen Sie Ihr JobOn-Passwort zurück. Geben Sie Ihre E-Mail-Adresse ein und erhalten Sie einen Link zum Zurücksetzen.",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
