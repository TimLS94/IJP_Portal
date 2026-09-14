"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { betriebPortalAPI } from "@/lib/api";
import { getNationalityLabel } from "@/data/nationalities";
import { Lock, Loader2, FileText, Download, Users, AlertCircle, ShieldCheck } from "lucide-react";

interface PortalDoc { id: number; type: string | null; name: string; size: number | null; }
interface Student {
  request_id: number;
  name: string;
  nationality: string | null;
  status: string | null;
  status_label: string;
  position_type: string | null;
  preferred_location: string | null;
  semester_break_start: string | null;
  semester_break_end: string | null;
  available_from: string | null;
  available_until: string | null;
  documents: PortalDoc[];
}
interface PortalData { betrieb_name: string | null; students: Student[]; }

function statusPill(status: string | null): string {
  const s = (status || "").toLowerCase();
  if (["placed", "accepted", "contract_signed", "completed", "arrived", "visa_received"].includes(s))
    return "bg-green-100 text-green-800 border-green-200";
  if (["rejected", "ijp_rejected", "cancelled", "on_hold"].includes(s))
    return "bg-red-100 text-red-700 border-red-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtRange(from: string | null, to: string | null): string | null {
  const a = fmtDate(from), b = fmtDate(to);
  if (a && b) return `${a} – ${b}`;
  if (a) return `ab ${a}`;
  if (b) return `bis ${b}`;
  return null;
}
function InfoRow({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 shrink-0">{label}:</span>
      <span className={highlight ? "text-gray-900 font-medium" : "text-gray-700"}>{value}</span>
    </div>
  );
}

export default function BetriebPortalPage() {
  const params = useParams();
  const token = String(params.token || "");
  const storageKey = `betrieb_token_${token}`;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [betriebName, setBetriebName] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [authing, setAuthing] = useState(false);
  const [authError, setAuthError] = useState("");
  const [betriebToken, setBetriebToken] = useState<string | null>(null);

  const [data, setData] = useState<PortalData | null>(null);

  const loadData = useCallback(async (bt: string) => {
    try {
      const d = await betriebPortalAPI.me(bt);
      setData(d);
      setBetriebName(d.betrieb_name);
    } catch {
      // Token abgelaufen/ungültig -> zurück zum Passwort
      try { sessionStorage.removeItem(storageKey); } catch {}
      setBetriebToken(null);
      setData(null);
    }
  }, [storageKey]);

  // Link prüfen + evtl. bestehende Session wiederherstellen
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const info = await betriebPortalAPI.info(token);
        if (!active) return;
        setBetriebName(info.betrieb_name);
        let existing: string | null = null;
        try { existing = sessionStorage.getItem(storageKey); } catch {}
        if (existing) { setBetriebToken(existing); await loadData(existing); }
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token, storageKey, loadData]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthing(true);
    setAuthError("");
    try {
      const res = await betriebPortalAPI.login(token, password);
      const bt = res.access_token as string;
      try { sessionStorage.setItem(storageKey, bt); } catch {}
      setBetriebToken(bt);
      setPassword("");
      await loadData(bt);
    } catch (err: unknown) {
      setAuthError("Falsches Passwort oder Zugang gesperrt.");
    } finally {
      setAuthing(false);
    }
  };

  const openDoc = async (docId: number) => {
    if (!betriebToken) return;
    try {
      const r = await betriebPortalAPI.downloadDocument(docId, betriebToken);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      alert("Dokument konnte nicht geladen werden.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900">Zugang nicht gefunden</h1>
          <p className="text-gray-500 text-sm mt-1">Dieser Link ist ungültig oder wurde deaktiviert.</p>
        </div>
      </div>
    );
  }

  // Passwort-Ansicht
  if (!betriebToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
              <Lock className="h-6 w-6 text-primary-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{betriebName || "Betrieb-Portal"}</h1>
            <p className="text-gray-500 text-sm mt-1">Bitte Passwort eingeben, um Ihre Kandidaten zu sehen.</p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              className="input-field w-full"
            />
            {authError && <p className="text-sm text-red-600">{authError}</p>}
            <button type="submit" disabled={authing || !password} className="btn-primary w-full disabled:opacity-50">
              {authing ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Anmelden"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Daten-Ansicht
  const students = data?.students || [];
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">{betriebName || "Betrieb-Portal"}</h1>
            <p className="text-xs text-gray-500">Ihre vermittelten Kandidaten</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Users className="h-4 w-4" />
          {students.length} {students.length === 1 ? "Kandidat" : "Kandidaten"}
        </div>

        {students.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
            Aktuell sind Ihnen keine Kandidaten zugeordnet.
          </div>
        ) : (
          <div className="space-y-4">
            {students.map((s) => (
              <div key={s.request_id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <h2 className="font-semibold text-gray-900">{s.name}</h2>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${statusPill(s.status)}`}>
                    {s.status_label || "—"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  <InfoRow label="Staatsangehörigkeit" value={s.nationality != null ? (getNationalityLabel(s.nationality, "de") || null) : null} />
                  <InfoRow label="Wunschregion" value={s.preferred_location} />
                  <InfoRow label="Semesterferien" value={fmtRange(s.semester_break_start, s.semester_break_end)} highlight />
                  <InfoRow label="Verfügbar" value={fmtRange(s.available_from, s.available_until)} />
                </div>

                {s.documents.length > 0 && (
                  <div className="mt-4 border-t pt-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Freigegebene Dokumente</p>
                    <div className="flex flex-wrap gap-2">
                      {s.documents.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => openDoc(d.id)}
                          className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition"
                        >
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="truncate max-w-[200px]">{d.name}</span>
                          <Download className="h-4 w-4 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
