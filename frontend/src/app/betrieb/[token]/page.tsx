"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { betriebPortalAPI } from "@/lib/api";
import { getNationalityLabel } from "@/data/nationalities";
import { Lock, Loader2, FileText, Download, Users, AlertCircle, ShieldCheck, ChevronDown, FileDown, FileSpreadsheet } from "lucide-react";

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
  date_of_birth: string | null;
  field_of_study: string | null;
  current_semester: number | null;
  studying_since: string | null;
  profession: string | null;
  work_experience_years: number | null;
  german_level: string | null;
  english_level: string | null;
  documents: PortalDoc[];
}

const POSITION_LABELS: Record<string, string> = {
  studentenferienjob: "Studentenferienjob",
  saisonjob: "Saisonjob",
  fachkraft: "Fachkraft",
  ausbildung: "Ausbildung",
  workandholiday: "Work & Holiday",
  general: "Stelle",
};
function langLabel(v: string | null): string | null {
  if (!v) return null;
  if (v === "native") return "Muttersprachlich";
  return v.toUpperCase();
}
function ageFrom(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
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

  // Karten ein-/ausklappen (standardmäßig eingeklappt)
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleStudent = (id: number) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  // Alle freigegebenen Dokumente eines Studenten als ZIP herunterladen
  const [zipLoading, setZipLoading] = useState<Set<number>>(new Set());
  const downloadStudentZip = async (s: Student) => {
    if (!betriebToken) return;
    setZipLoading((prev) => new Set(prev).add(s.request_id));
    try {
      const r = await betriebPortalAPI.downloadStudentZip(s.request_id, betriebToken);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${s.name}_dokumente.zip`.replace(/\s+/g, "_");
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      alert("Download fehlgeschlagen.");
    } finally {
      setZipLoading((prev) => { const n = new Set(prev); n.delete(s.request_id); return n; });
    }
  };

  // CSV-Export der Kandidatenliste (clientseitig aus den geladenen Daten)
  const exportCsv = () => {
    const rows = data?.students || [];
    if (rows.length === 0) return;
    const headers = ["Name", "Staatsangehörigkeit", "Alter", "Status", "Stellenart", "Wunschregion", "Studienfach", "Fachsemester", "Studium seit", "Beruf/Qualifikation", "Berufserfahrung (Jahre)", "Deutsch", "Englisch", "Semesterferien", "Verfügbar", "Dokumente"];
    const esc = (v: string | null | undefined) => {
      const s = (v ?? "").toString().replace(/"/g, '""');
      return /[";\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = rows.map((s) => {
      const age = ageFrom(s.date_of_birth);
      return [
        s.name,
        s.nationality != null ? (getNationalityLabel(s.nationality, "de") || s.nationality) : "",
        age != null ? String(age) : "",
        s.status_label || "",
        s.position_type ? (POSITION_LABELS[s.position_type] || s.position_type) : "",
        s.preferred_location || "",
        s.field_of_study || "",
        s.current_semester != null ? String(s.current_semester) : "",
        fmtDate(s.studying_since) || "",
        s.profession || "",
        s.work_experience_years != null ? String(s.work_experience_years) : "",
        langLabel(s.german_level) || "",
        langLabel(s.english_level) || "",
        fmtRange(s.semester_break_start, s.semester_break_end) || "",
        fmtRange(s.available_from, s.available_until) || "",
        String(s.documents.length),
      ].map(esc).join(";");
    });
    // BOM, damit Excel UTF-8 korrekt erkennt
    const csv = "﻿" + [headers.join(";"), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kandidaten_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            {students.length} {students.length === 1 ? "Kandidat" : "Kandidaten"}
          </div>
          {students.length > 0 && (
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-primary-400 hover:bg-primary-50 transition text-gray-700"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              CSV-Export
            </button>
          )}
        </div>

        {students.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
            Aktuell sind Ihnen keine Kandidaten zugeordnet.
          </div>
        ) : (
          <div className="space-y-4">
            {students.map((s) => {
              const isOpen = expanded.has(s.request_id);
              return (
              <div key={s.request_id} className="bg-white rounded-xl border overflow-hidden">
                {/* Kopf – anklickbar zum Auf-/Zuklappen */}
                <button
                  onClick={() => toggleStudent(s.request_id)}
                  className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChevronDown className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 truncate">{s.name}</h2>
                      <p className="text-xs text-gray-500 truncate">
                        {[
                          s.nationality != null ? getNationalityLabel(s.nationality, "de") : null,
                          s.documents.length > 0 ? `${s.documents.length} Dokument(e)` : null,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${statusPill(s.status)}`}>
                    {s.status_label || "—"}
                  </span>
                </button>

                {/* Details – nur wenn aufgeklappt */}
                {isOpen && (() => {
                  const age = ageFrom(s.date_of_birth);
                  const rows: { label: string; value: string | null; highlight?: boolean }[] = [
                    { label: "Staatsangehörigkeit", value: s.nationality != null ? (getNationalityLabel(s.nationality, "de") || null) : null },
                    { label: "Stellenart", value: s.position_type ? (POSITION_LABELS[s.position_type] || s.position_type) : null },
                    { label: "Alter", value: age != null ? `${age} Jahre` : null },
                    { label: "Wunschregion", value: s.preferred_location },
                    { label: "Studienfach", value: s.field_of_study },
                    { label: "Fachsemester", value: s.current_semester != null ? String(s.current_semester) : null },
                    { label: "Studium seit", value: fmtDate(s.studying_since) },
                    { label: "Beruf/Qualifikation", value: s.profession },
                    { label: "Berufserfahrung", value: s.work_experience_years ? `${s.work_experience_years} Jahre` : null },
                    { label: "Deutsch", value: langLabel(s.german_level) },
                    { label: "Englisch", value: langLabel(s.english_level) },
                    { label: "Semesterferien", value: fmtRange(s.semester_break_start, s.semester_break_end), highlight: true },
                    { label: "Verfügbar", value: fmtRange(s.available_from, s.available_until) },
                  ];
                  const hasAny = rows.some((r) => r.value);
                  return (
                  <div className="px-5 pb-5 pt-0">
                    {hasAny ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                        {rows.map((r) => <InfoRow key={r.label} label={r.label} value={r.value} highlight={r.highlight} />)}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Keine weiteren Angaben hinterlegt.</p>
                    )}

                    {s.documents.length > 0 && (
                      <div className="mt-4 border-t pt-3">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <p className="text-xs font-medium text-gray-500">Freigegebene Dokumente</p>
                          <button
                            onClick={() => downloadStudentZip(s)}
                            disabled={zipLoading.has(s.request_id)}
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition text-gray-700 disabled:opacity-50"
                          >
                            {zipLoading.has(s.request_id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                            Alle als ZIP
                          </button>
                        </div>
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
                  );
                })()}
              </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
