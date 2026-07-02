"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { telegramAPI } from "@/lib/api";
import { useTranslation } from "react-i18next";

export default function TelegramSubscribeBanner() {
  const { t } = useTranslation();
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    telegramAPI
      .getInfo()
      .then((res) => {
        if (active && res.data?.link) setLink(res.data.link);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!link) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4">
      <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-4 sm:p-5">
        <div className="bg-sky-500 p-3 rounded-xl shrink-0">
          <Send className="h-6 w-6 text-white" />
        </div>
        <div className="text-center sm:text-left flex-1">
          <p className="font-semibold text-gray-900">
            {t("telegram.bannerTitle", "Neue Jobs sofort per Telegram")}
          </p>
          <p className="text-sm text-gray-600">
            {t(
              "telegram.bannerText",
              "Abonniere unseren Bot und bekomme passende neue Stellen direkt aufs Handy – gefiltert nach Stellenart & Ort, in deiner Sprache.",
            )}
          </p>
        </div>
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <Send className="h-4 w-4" />
          {t("telegram.bannerButton", "Jetzt abonnieren")}
        </a>
      </div>
    </div>
  );
}
