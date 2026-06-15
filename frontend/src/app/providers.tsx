"use client";

import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { I18nProvider } from "@/components/I18nProvider";
import { CookieBanner } from "@/components/CookieBanner";
import SourceTracker from "@/components/SourceTracker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <SourceTracker />
        {children}
        <Toaster position="top-right" />
        <CookieBanner />
      </AuthProvider>
    </I18nProvider>
  );
}
