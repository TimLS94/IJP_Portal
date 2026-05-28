import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Passwort zurücksetzen",
  description: "Setzen Sie Ihr neues Passwort für Ihren JobOn-Account.",
  robots: { index: false, follow: true },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
