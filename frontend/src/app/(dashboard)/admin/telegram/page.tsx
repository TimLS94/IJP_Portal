"use client";

import { useState, useEffect } from "react";
import {
  Send, CheckCircle, XCircle, RefreshCw, Loader2,
  Users, MessageSquare, Link as LinkIcon, AlertTriangle, Megaphone, Copy,
} from "lucide-react";
import { telegramAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface WebhookInfo {
  url?: string;
  pending_update_count?: number;
  last_error_message?: string;
}

interface Status {
  configured: boolean;
  bot_link: string | null;
  group_chat_id: string | null;
  group_language: string;
  supported_languages: string[];
  promo_enabled: boolean;
  promo_hour: number;
  promo_days: number[];
  subscribers_total: number;
  subscribers_active: number;
  webhook: WebhookInfo | null;
}

const LANGUAGE_NAMES: Record<string, string> = {
  de: "🇩🇪 Deutsch",
  en: "🇬🇧 English",
  es: "🇪🇸 Español",
  ru: "🇷🇺 Русский",
};

export default function AdminTelegramPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [testing, setTesting] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await telegramAPI.getStatus();
      setStatus(res.data);
    } catch {
      toast.error("Status konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSetWebhook = async () => {
    setSettingWebhook(true);
    try {
      await telegramAPI.setWebhook();
      toast.success("Webhook gesetzt");
      await loadStatus();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Webhook konnte nicht gesetzt werden");
    } finally {
      setSettingWebhook(false);
    }
  };

  const [promoSaving, setPromoSaving] = useState(false);

  const savePromo = async (enabled: boolean, hour: number, days: number[]) => {
    setPromoSaving(true);
    try {
      await telegramAPI.setPromoSettings(enabled, hour, days);
      toast.success("Werbe-Einstellungen gespeichert");
      await loadStatus();
    } catch {
      toast.error("Konnte nicht gespeichert werden");
    } finally {
      setPromoSaving(false);
    }
  };

  // Wochentage: Montag=0 … Sonntag=6 (Python-Konvention, passend zum Backend)
  const WEEKDAYS = [
    { d: 0, label: "Mo" }, { d: 1, label: "Di" }, { d: 2, label: "Mi" },
    { d: 3, label: "Do" }, { d: 4, label: "Fr" }, { d: 5, label: "Sa" }, { d: 6, label: "So" },
  ];
  const toggleDay = (enabled: boolean, hour: number, current: number[], day: number) => {
    const set = new Set(current);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    savePromo(enabled, hour, [...set].sort((a, b) => a - b));
  };

  const handlePromoNow = async () => {
    try {
      await telegramAPI.promoNow();
      toast.success("Werbung in die Gruppe gepostet");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Konnte nicht gepostet werden");
    }
  };

  const handleGroupLanguage = async (language: string) => {
    try {
      await telegramAPI.setGroupLanguage(language);
      toast.success("Gruppen-Sprache gespeichert");
      await loadStatus();
    } catch {
      toast.error("Sprache konnte nicht gespeichert werden");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await telegramAPI.test();
      if (res.data?.ok) toast.success("Testnachricht an die Gruppe gesendet");
      else toast.error("Senden fehlgeschlagen – ist der Bot in der Gruppe?");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Testnachricht fehlgeschlagen");
    } finally {
      setTesting(false);
    }
  };

  const StatusRow = ({ ok, label, value }: { ok: boolean; label: string; value?: string }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="flex items-center gap-2 text-sm font-medium">
        {value && <span className="text-gray-500">{value}</span>}
        {ok ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
      </span>
    </div>
  );

  const webhookOk = !!status?.webhook?.url;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-sky-500 p-2 rounded-lg">
          <Send className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telegram-Bot</h1>
          <p className="text-sm text-gray-600">
            Neue Stellen automatisch in die Gruppe und an Abonnenten posten
          </p>
        </div>
        <button
          onClick={loadStatus}
          className="ml-auto p-2 rounded-lg hover:bg-gray-100"
          title="Aktualisieren"
        >
          <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !status ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : status ? (
        <>
          {/* Status */}
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Status</h2>
            <StatusRow ok={status.configured} label="Bot-Token (TELEGRAM_BOT_TOKEN)" />
            <StatusRow ok={webhookOk} label="Webhook aktiv" value={webhookOk ? "verbunden" : "nicht gesetzt"} />
            <StatusRow
              ok={!!status.group_chat_id}
              label="Ziel-Gruppe verbunden"
              value={status.group_chat_id || "keine"}
            />
            {status.webhook?.last_error_message && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Letzter Webhook-Fehler: {status.webhook.last_error_message}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-center p-4 bg-sky-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-sky-700">
                  <Users className="h-5 w-5" />
                  {status.subscribers_active}
                </div>
                <p className="text-xs text-gray-600 mt-1">Aktive Abonnenten</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">{status.subscribers_total}</div>
                <p className="text-xs text-gray-600 mt-1">Abonnenten gesamt</p>
              </div>
            </div>

            {status.bot_link && (
              <div className="flex items-center justify-between gap-2 p-3 bg-sky-50 rounded-lg">
                <div className="min-w-0">
                  <p className="text-xs text-gray-600">Bot-Link zum Teilen</p>
                  <a href={status.bot_link} target="_blank" rel="noreferrer"
                     className="text-sm font-medium text-sky-700 truncate block">
                    {status.bot_link}
                  </a>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(status.bot_link!); toast.success("Link kopiert"); }}
                  className="p-2 rounded-lg hover:bg-sky-100 shrink-0"
                  title="Link kopieren"
                >
                  <Copy className="h-4 w-4 text-sky-700" />
                </button>
              </div>
            )}
          </div>

          {/* Aktionen */}
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Aktionen</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSetWebhook}
                disabled={!status.configured || settingWebhook}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {settingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                Webhook setzen
              </button>
              <button
                onClick={handleTest}
                disabled={!status.group_chat_id || testing}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Testnachricht an Gruppe
              </button>
            </div>
          </div>

          {/* Gruppen-Sprache */}
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Gruppen-Sprache</h2>
            <p className="text-sm text-gray-600">
              In welcher Sprache Stellen in die Gruppe gepostet werden. Abonnenten wählen ihre
              Sprache selbst beim Bot.
            </p>
            <select
              value={status.group_language}
              onChange={(e) => handleGroupLanguage(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full max-w-xs"
            >
              {(status.supported_languages || ["de"]).map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_NAMES[code] || code}
                </option>
              ))}
            </select>
          </div>

          {/* Abo-Werbung */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-sky-600" />
              <h2 className="text-lg font-semibold text-gray-900">Abo-Werbung</h2>
            </div>
            <p className="text-sm text-gray-600">
              Der Bot postet an ausgewählten Wochentagen eine kurze Werbung in die Gruppe
              („Abonniere den Bot…“) – in der Gruppen-Sprache, mit Link zum Bot.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={status.promo_enabled}
                disabled={promoSaving}
                onChange={(e) => savePromo(e.target.checked, status.promo_hour, status.promo_days)}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-800">Werbung aktiv</span>
            </label>

            {/* Wochentage */}
            <div>
              <span className="text-sm text-gray-700 block mb-1.5">Wochentage:</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((w) => {
                  const active = (status.promo_days || []).includes(w.d);
                  return (
                    <button
                      key={w.d}
                      disabled={promoSaving}
                      onClick={() => toggleDay(status.promo_enabled, status.promo_hour, status.promo_days || [], w.d)}
                      className={`w-10 h-9 rounded-lg text-sm font-medium ${
                        active ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Tipp: 1–2 Tage reichen (z.B. Mo &amp; Do).</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Uhrzeit:</span>
              <select
                value={status.promo_hour}
                disabled={promoSaving}
                onChange={(e) => savePromo(status.promo_enabled, parseInt(e.target.value), status.promo_days)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00 UTC</option>
                ))}
              </select>
              <button
                onClick={handlePromoNow}
                disabled={!status.group_chat_id}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50 ml-auto"
              >
                <Send className="h-4 w-4" />
                Jetzt posten
              </button>
            </div>
          </div>

          {/* Anleitung */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Einrichtung (einmalig)</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>
                <b>Webhook setzen:</b> Oben auf „Webhook setzen“ klicken. Danach sollte „Webhook aktiv“ grün sein.
              </li>
              <li>
                <b>Bot in die Gruppe holen:</b> In Telegram die Gruppe öffnen → Mitglied hinzufügen → deinen Bot
                suchen und hinzufügen (bei eingeschränkten Gruppen als Admin).
              </li>
              <li>
                <b>Gruppe verbinden:</b> In der Gruppe die Nachricht <code className="bg-gray-100 px-1 rounded">/hier_posten</code> senden.
                Der Bot bestätigt und „Ziel-Gruppe verbunden“ wird grün.
              </li>
              <li>
                <b>Testen:</b> „Testnachricht an Gruppe“ klicken – es sollte eine Nachricht in der Gruppe erscheinen.
              </li>
            </ol>
            <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2">Abonnenten (persönliche Stellen)</h3>
            <p className="text-sm text-gray-700">
              Nutzer schreiben dem Bot privat <code className="bg-gray-100 px-1 rounded">/start</code>, wählen
              Stellenart &amp; Ort und bekommen ab dann passende neue Stellen als persönliche Nachricht.
              Ändern mit <code className="bg-gray-100 px-1 rounded">/filter</code>, pausieren mit{" "}
              <code className="bg-gray-100 px-1 rounded">/stop</code>.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
