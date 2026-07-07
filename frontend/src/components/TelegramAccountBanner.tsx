"use client";

import { useEffect, useState } from "react";
import { Send, X } from "lucide-react";
import { telegramAPI } from "@/lib/api";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "telegram_banner_seen";

// Safari wirft bei blockiertem Speicher (ITP / Private Mode / nach Cross-Tab-OAuth)
// einen SecurityError bei localStorage-Zugriff. Immer defensiv kapseln.
function safeGet(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* Speicher nicht verfügbar (Safari) – Banner wird dann ggf. erneut angezeigt, kein Absturz */
  }
}

// Einmaliger, schließbarer Banner im Bewerber-Bereich.
// Wird nur einmal angezeigt (danach dauerhaft in den E-Mail-Einstellungen erreichbar).
export default function TelegramAccountBanner() {
  const { t } = useTranslation();
  const [link, setLink] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (safeGet(STORAGE_KEY)) return; // schon gesehen -> nie wieder
    let active = true;
    telegramAPI
      .getInfo()
      .then((res) => {
        if (active && res.data?.link) {
          setLink(res.data.link);
          setVisible(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const dismiss = () => {
    safeSet(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible || !link) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4">
      <div className="relative flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-4 sm:p-5">
        <button
          onClick={dismiss}
          aria-label={t("telegram.bannerDismiss", "Später")}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-400 hover:bg-white/60 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="bg-sky-500 p-3 rounded-xl shrink-0">
          <Send className="h-6 w-6 text-white" />
        </div>
        <div className="text-center sm:text-left flex-1 pr-6">
          <p className="font-semibold text-gray-900">{t("telegram.bannerTitle")}</p>
          <p className="text-sm text-gray-600">{t("telegram.bannerText")}</p>
        </div>
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          onClick={dismiss}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <Send className="h-4 w-4" />
          {t("telegram.bannerButton")}
        </a>
      </div>
    </div>
  );
}
