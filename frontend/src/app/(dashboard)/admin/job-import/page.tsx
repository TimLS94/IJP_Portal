"use client";

import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Link2, Loader2, Download, CheckCircle2, XCircle, Building2, Sparkles } from "lucide-react";

interface CompanyRow {
  id: number;
  company_name: string;
  email: string | null;
  ijp_managed_posting: boolean;
}

interface ImportResult {
  url: string;
  ok: boolean;
  title?: string;
  jobId?: number;
  error?: string;
}

export default function AdminJobImportPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [selected, setSelected] = useState<number | "">("");
  const [urls, setUrls] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminAPI.listAllCompanies();
      setCompanies(r.data || []);
    } catch {
      toast.error("Firmen konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleManaged = async (c: CompanyRow) => {
    setTogglingId(c.id);
    try {
      await adminAPI.setCompanyIjpManaged(c.id, !c.ijp_managed_posting);
      setCompanies((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, ijp_managed_posting: !x.ijp_managed_posting } : x))
      );
    } catch {
      toast.error("Konnte nicht ändern");
    } finally {
      setTogglingId(null);
    }
  };

  const managed = companies.filter((c) => c.ijp_managed_posting);

  const importAll = async () => {
    if (!selected) {
      toast.error("Bitte eine freigeschaltete Firma wählen");
      return;
    }
    const list = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));
    if (list.length === 0) {
      toast.error("Bitte mindestens eine gültige URL (http/https) eingeben");
      return;
    }
    setImporting(true);
    setResults([]);
    for (const url of list) {
      try {
        const r = await adminAPI.importJobFromUrl(url, Number(selected));
        setResults((prev) => [...prev, { url, ok: true, title: r.data.title, jobId: r.data.job_id }]);
      } catch (err: any) {
        setResults((prev) => [
          ...prev,
          { url, ok: false, error: err?.response?.data?.detail || "Import fehlgeschlagen" },
        ]);
      }
    }
    setImporting(false);
    toast.success("Import abgeschlossen");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-primary-100 text-primary-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Stellen-Import (für Firmen schalten)</h1>
      </div>
      <p className="text-gray-500 mb-6">
        Firma freischalten (Managed Service) und Stellen per URL mit KI als Entwurf anlegen. Die
        Entwürfe erscheinen im Account der Firma und können dort geprüft &amp; veröffentlicht werden.
      </p>

      {/* 1) Firmen freischalten */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary-600" /> Firmen für IJP-Verwaltung
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : companies.length === 0 ? (
          <p className="text-gray-500 text-sm">Keine Firmen vorhanden.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {companies.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{c.company_name}</p>
                  {c.email && <p className="text-xs text-gray-500 truncate">{c.email}</p>}
                </div>
                <button
                  onClick={() => toggleManaged(c)}
                  disabled={togglingId === c.id}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    c.ijp_managed_posting
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {togglingId === c.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : c.ijp_managed_posting ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : null}
                  {c.ijp_managed_posting ? "Freigeschaltet" : "Freischalten"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2) Import */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Link2 className="h-5 w-5 text-primary-600" /> Stellen aus URLs importieren
        </h2>

        <label className="block text-sm font-medium text-gray-700 mb-1">Firma (freigeschaltet)</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value ? Number(e.target.value) : "")}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 bg-white"
        >
          <option value="">— Firma wählen —</option>
          {managed.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
        {managed.length === 0 && (
          <p className="text-xs text-amber-600 -mt-2 mb-4">
            Noch keine Firma freigeschaltet – oben eine Firma „Freischalten".
          </p>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Stellen-URLs (eine pro Zeile)
        </label>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={5}
          placeholder={"https://firma.de/jobs/stelle-1\nhttps://firma.de/jobs/stelle-2"}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono mb-4"
        />

        <button
          onClick={importAll}
          disabled={importing}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          Importieren
        </button>

        {results.length > 0 && (
          <div className="mt-5 space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                  r.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                }`}
              >
                {r.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  {r.ok ? (
                    <p className="text-green-800">
                      Entwurf angelegt: <strong>{r.title}</strong> (ID {r.jobId})
                    </p>
                  ) : (
                    <p className="text-red-700">{r.error}</p>
                  )}
                  <p className="text-xs text-gray-400 truncate">{r.url}</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 mt-2">
              Entwürfe liegen unter „Meine Stellen" der Firma – dort prüfen, ggf. ergänzen und
              veröffentlichen.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
