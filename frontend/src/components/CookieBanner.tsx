"use client";

import { useState, useEffect } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { useTranslation } from "react-i18next";
import Link from "next/link";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const CONSENT_KEY = "ga_consent";

export type ConsentValue = "granted" | "denied" | null;

export function getStoredConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(CONSENT_KEY) as ConsentValue) ?? null;
}

export function CookieBanner() {
  const { t } = useTranslation();
  const [consent, setConsent] = useState<ConsentValue>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
    } else {
      // Kurze Verzögerung damit der Banner nicht beim ersten Paint flackert
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "granted");
    setConsent("granted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "denied");
    setConsent("denied");
    setVisible(false);
  };

  return (
    <>
      {/* Google Analytics – nur laden wenn Zustimmung erteilt */}
      {consent === "granted" && GA_ID && <GoogleAnalytics gaId={GA_ID} />}

      {/* Cookie-Banner */}
      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {t("cookieBanner.title")}
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t("cookieBanner.text")}{" "}
                  <Link href="/datenschutz" className="text-primary-600 hover:underline">
                    {t("cookieBanner.privacyLink")}
                  </Link>
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={decline}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t("cookieBanner.decline")}
                </button>
                <button
                  onClick={accept}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                >
                  {t("cookieBanner.accept")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
