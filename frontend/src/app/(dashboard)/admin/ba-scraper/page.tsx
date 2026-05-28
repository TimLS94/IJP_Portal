"use client";

import { useState, useEffect } from "react";
import {
  Download, Play, Trash2, Settings, CheckCircle,
  AlertTriangle, RefreshCw, ExternalLink, Loader2, Sparkles, XCircle,
} from "lucide-react";
import { baScraperAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface Config {
  keywords: string[];
  location: string;
  radius: number;
  max_jobs: number;
  angebotsart: number;
  ai_provider: string;
}

interface Stats {
  total_external_jobs: number;
  last_run: string | null;
  last_imported: number;
  last_skipped: number;
  last_errors: number;
}

interface ConfigCheck {
  ba_api_configured: boolean;
  openai_configured: boolean;
  anthropic_configured: boolean;
  gemini_configured: boolean;
  registration_url: string;
}

interface RunResult {
  imported: number;
  skipped: number;
  errors: number;
  ai_enhanced: number;
  timestamp: string;
}

const ANGEBOTSART_OPTIONS = [
  { value: 1, label: "Arbeit (Vollzeit / Teilzeit)" },
  { value: 2, label: "Ausbildung / Praktikum" },
  { value: 4, label: "Selbstständigkeit" },
];

export default function BaScraperPage() {
  const [config, setConfig] = useState<Config>({
    keywords: [],
    location: "",
    radius: 50,
    max_jobs: 100,
    angebotsart: 1,
    ai_provider: "none",
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [check, setCheck] = useState<ConfigCheck | null>(null);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cfgRes, statsRes, checkRes] = await Promise.all([
        baScraperAPI.getConfig(),
        baScraperAPI.getStats(),
        baScraperAPI.check(),
      ]);
      const cfg: Config = cfgRes.data;
      setConfig({ ...cfg, ai_provider: cfg.ai_provider ?? "none" });
      setKeywordsInput((cfg.keywords || []).join(", "));
      setStats(statsRes.data);
      setCheck(checkRes.data);
    } catch {
      toast.error("Daten konnten nicht geladen werden");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const keywords = keywordsInput.split(",").map((k) => k.trim()).filter(Boolean);
      const updated = { ...config, keywords };
      await baScraperAPI.updateConfig(updated);
      setConfig(updated);
      toast.success("Konfiguration gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!check?.ba_api_configured) {
      toast.error("BA_CLIENT_ID und BA_CLIENT_SECRET müssen in .env konfiguriert sein");
      return;
    }
    setRunning(true);
    setLastResult(null);
    try {
      const res = await baScraperAPI.run();
      const result: RunResult = res.data;
      setLastResult(result);
      await loadData();
      toast.success(`${result.imported} neue Jobs importiert`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Scraper-Fehler";
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await baScraperAPI.deleteAll();
      toast.success(`${res.data.deleted} externe Jobs gelöscht`);
      setShowDeleteConfirm(false);
      await loadData();
    } catch {
      toast.error("Löschen fehlgeschlagen");
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "–";
    return new Date(iso).toLocaleString("de-DE");
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Download className="h-6 w-6 text-blue-600" />
            BA-Stellenscraper
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Offizielle Jobsuche-API der Bundesagentur für Arbeit
          </p>
        </div>
        <a
          href="https://jobsuche.api.bund.dev/"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          API-Portal <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Setup Status */}
      {check && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Konfigurationsstatus</h2>

          {/* BA API */}
          <div className={`flex items-start gap-3 p-3 rounded-lg ${check.ba_api_configured ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            {check.ba_api_configured
              ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              : <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />}
            <div>
              <p className={`font-medium text-sm ${check.ba_api_configured ? "text-green-800" : "text-red-800"}`}>
                BA API ({check.ba_api_configured ? "konfiguriert" : "nicht konfiguriert"})
              </p>
              {!check.ba_api_configured && (
                <div className="text-xs text-red-700 mt-1 space-y-1">
                  <p>1. Zugangsdaten registrieren unter: <a href={check.registration_url} target="_blank" rel="noreferrer" className="underline font-medium">{check.registration_url}</a></p>
                  <p>2. In <code className="bg-red-100 px-1 rounded">backend/.env</code> eintragen:</p>
                  <pre className="bg-red-100 rounded p-2 text-xs mt-1">BA_CLIENT_ID=deine-client-id{"\n"}BA_CLIENT_SECRET=dein-client-secret</pre>
                  <p>3. Backend neu starten</p>
                </div>
              )}
            </div>
          </div>

          {/* OpenAI */}
          <div className={`flex items-start gap-3 p-3 rounded-lg ${check.openai_configured ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
            {check.openai_configured
              ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              : <AlertTriangle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />}
            <div>
              <p className={`font-medium text-sm ${check.openai_configured ? "text-green-800" : "text-gray-600"}`}>
                OpenAI / ChatGPT ({check.openai_configured ? "konfiguriert" : "nicht konfiguriert"})
              </p>
              {!check.openai_configured && (
                <pre className="bg-gray-100 rounded p-2 text-xs mt-1 text-gray-600">OPENAI_API_KEY=sk-...</pre>
              )}
            </div>
          </div>

          {/* Anthropic */}
          <div className={`flex items-start gap-3 p-3 rounded-lg ${check.anthropic_configured ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
            {check.anthropic_configured
              ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              : <AlertTriangle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />}
            <div>
              <p className={`font-medium text-sm ${check.anthropic_configured ? "text-green-800" : "text-gray-600"}`}>
                Anthropic / Claude ({check.anthropic_configured ? "konfiguriert" : "nicht konfiguriert"})
              </p>
              {!check.anthropic_configured && (
                <pre className="bg-gray-100 rounded p-2 text-xs mt-1 text-gray-600">ANTHROPIC_API_KEY=sk-ant-...</pre>
              )}
            </div>
          </div>

          {/* Gemini */}
          <div className={`flex items-start gap-3 p-3 rounded-lg ${check.gemini_configured ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
            {check.gemini_configured
              ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              : <AlertTriangle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />}
            <div>
              <p className={`font-medium text-sm ${check.gemini_configured ? "text-green-800" : "text-gray-600"}`}>
                Google Gemini ({check.gemini_configured ? "konfiguriert" : "nicht konfiguriert"})
                <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">Kostenlos</span>
              </p>
              {!check.gemini_configured && (
                <div className="text-xs text-gray-600 mt-1 space-y-1">
                  <p>API-Key kostenlos unter <span className="font-mono">aistudio.google.com/app/apikey</span></p>
                  <pre className="bg-gray-100 rounded p-2 text-xs">GOOGLE_AI_API_KEY=AIza...</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Aktive externe Jobs", value: stats.total_external_jobs, color: "blue" },
            { label: "Letzter Import", value: stats.last_imported ?? "–", color: "green" },
            { label: "Übersprungen", value: stats.last_skipped ?? "–", color: "yellow" },
            { label: "Fehler", value: stats.last_errors ?? "–", color: "red" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
            </div>
          ))}
        </div>
      )}
      {stats?.last_run && (
        <p className="text-xs text-gray-400">Letzter Lauf: {formatDate(stats.last_run)}</p>
      )}

      {/* Last run result */}
      {lastResult && (
        <div className={`rounded-lg p-4 border-2 ${lastResult.errors > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
          <div className="flex items-center gap-2 font-semibold mb-2">
            {lastResult.errors > 0
              ? <AlertTriangle className="h-5 w-5 text-yellow-500" />
              : <CheckCircle className="h-5 w-5 text-green-500" />}
            Scrape abgeschlossen
          </div>
          <div className="text-sm space-y-1 text-gray-700">
            <p>Importiert: <strong>{lastResult.imported}</strong></p>
            {lastResult.ai_enhanced > 0 && (
              <p className="flex items-center gap-1 text-purple-700">
                <Sparkles className="h-4 w-4" />
                KI-aufbereitet: <strong>{lastResult.ai_enhanced}</strong>
              </p>
            )}
            <p>Übersprungen (Duplikate): <strong>{lastResult.skipped}</strong></p>
            {lastResult.errors > 0 && <p className="text-red-600">Fehler: <strong>{lastResult.errors}</strong></p>}
          </div>
        </div>
      )}

      {/* Config */}
      <div className="card space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" />
          Suchparameter
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Suchbegriffe <span className="text-gray-400 font-normal">(kommagetrennt, leer = alle)</span>
          </label>
          <input
            type="text"
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            placeholder="z.B. Koch, Elektriker, Pfleger"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
            <input
              type="text"
              value={config.location}
              onChange={(e) => setConfig({ ...config, location: e.target.value })}
              placeholder="z.B. Berlin"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Umkreis (km)</label>
            <input
              type="number" min={5} max={500} value={config.radius}
              onChange={(e) => setConfig({ ...config, radius: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max. Jobs pro Lauf</label>
            <input
              type="number" min={1} max={1000} value={config.max_jobs}
              onChange={(e) => setConfig({ ...config, max_jobs: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Angebotsart</label>
            <select
              value={config.angebotsart}
              onChange={(e) => setConfig({ ...config, angebotsart: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ANGEBOTSART_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KI-Anbieter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-purple-600" />
            KI-Aufbereitung
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: "none", label: "Keine KI", desc: "BA-Originaltext", free: false, configured: true },
              { value: "gemini", label: "Gemini", desc: "Google · kostenlos", free: true, configured: !!check?.gemini_configured },
              { value: "openai", label: "ChatGPT", desc: "OpenAI · kostenpflichtig", free: false, configured: !!check?.openai_configured },
              { value: "anthropic", label: "Claude", desc: "Anthropic · kostenpflichtig", free: false, configured: !!check?.anthropic_configured },
            ].map((opt) => {
              const isActive = config.ai_provider === opt.value;
              const isDisabled = !opt.configured;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !isDisabled && setConfig({ ...config, ai_provider: opt.value })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isActive
                      ? "border-purple-500 bg-purple-50"
                      : isDisabled
                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                      : "border-gray-200 hover:border-gray-300 bg-white cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className={`font-medium text-sm ${isActive ? "text-purple-800" : "text-gray-700"}`}>{opt.label}</p>
                    {opt.free && <span className="text-xs font-semibold px-1 rounded bg-green-100 text-green-700">free</span>}
                  </div>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </button>
              );
            })}
          </div>
          {config.ai_provider !== "none" && (
            <p className="text-xs text-gray-500 mt-2">
              Beschreibung, Aufgaben, Anforderungen und Benefits werden automatisch strukturiert und ausformuliert.
            </p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
          Konfiguration speichern
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleRun}
          disabled={running || !check?.ba_api_configured}
          className="flex-1 min-w-[180px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
        >
          {running
            ? <><Loader2 className="h-5 w-5 animate-spin" /> Läuft...</>
            : <><Play className="h-5 w-5" /> Scraper starten</>}
        </button>
        <button onClick={loadData} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" title="Aktualisieren">
          <RefreshCw className="h-5 w-5 text-gray-500" />
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
        >
          <Trash2 className="h-5 w-5" />
          Alle löschen
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-bold text-gray-900">Alle BA-Jobs löschen?</h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Alle importierten Stellen werden unwiderruflich gelöscht.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Abbrechen</button>
              <button onClick={handleDeleteAll} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
