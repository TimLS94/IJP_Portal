"use client";

import { useState, useEffect } from "react";
import {
  Send, CheckCircle, XCircle, RefreshCw, Loader2,
  Users, MessageSquare, Link as LinkIcon, AlertTriangle,
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
  group_chat_id: string | null;
  subscribers_total: number;
  subscribers_active: number;
  webhook: WebhookInfo | null;
}

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
