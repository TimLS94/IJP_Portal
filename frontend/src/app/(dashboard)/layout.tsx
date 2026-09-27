"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import LanguagePrompt from "@/components/LanguagePrompt";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Ziel-URL (inkl. Query, z.B. ?application=) für Redirect nach Login merken
      const search = typeof window !== "undefined" ? window.location.search : "";
      const target = `${pathname}${search}`;
      const redirectParam = target && target !== "/" ? `?redirect=${encodeURIComponent(target)}` : "";
      router.push(`/login${redirectParam}`);
    }
  }, [isAuthenticated, loading, router, pathname]);

  // Zu welchem Bereich gehört der Pfad – und wer darf rein.
  // Admin ist Superuser (darf zur Inspektion überall hin).
  const sectionRole = pathname?.startsWith("/admin")
    ? "admin"
    : pathname?.startsWith("/company")
    ? "company"
    : pathname?.startsWith("/applicant")
    ? "applicant"
    : null;
  const roleMismatch =
    isAuthenticated && !!user && !!sectionRole && user.role !== "admin" && user.role !== sectionRole;

  const homeForUser = () => {
    if (user?.role === "admin") return "/admin/dashboard";
    if (user?.role === "company") return "/company/dashboard";
    if (user?.portal === "ijp") return "/applicant/ijp-auftrag";
    return "/applicant/profile";
  };

  useEffect(() => {
    // SICHERHEIT: Nutzer dürfen nur in den zu ihrer Rolle passenden Bereich.
    // Verhindert z.B., dass ein Bewerber /admin/* öffnet.
    if (!loading && roleMismatch) {
      router.replace(homeForUser());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, roleMismatch, router]);

  useEffect(() => {
    // IJP-Bewerber haben nur Profil/Dokumente/IJP-Auftrag – JobOn-Seiten sind gesperrt.
    if (!loading && isAuthenticated && user?.portal === "ijp") {
      const blocked = ["/applicant/applications", "/applicant/liked-jobs"];
      if (blocked.some((p) => pathname?.startsWith(p))) {
        router.replace("/applicant/ijp-auftrag");
      }
    }
  }, [isAuthenticated, loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Falscher Bereich für diese Rolle: nichts rendern (Redirect läuft im Effect),
  // damit die fremde Seite (z.B. Admin-Hülle) nicht kurz aufblitzt.
  if (roleMismatch) {
    return null;
  }

  return (
    <>
      <Navbar />
      <LanguagePrompt />
      <main className="flex-1 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </>
  );
}
