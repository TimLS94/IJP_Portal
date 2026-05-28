import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Melden Sie sich bei JobOn an, um auf Ihr Dashboard zuzugreifen. Bewerber, Unternehmen und Administratoren.",
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
