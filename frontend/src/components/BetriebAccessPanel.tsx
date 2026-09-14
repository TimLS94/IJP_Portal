"use client";

import { useState, useEffect, useCallback } from "react";
import { betriebAccessAPI } from "@/lib/api";
import {
  Link2, Copy, Check, Loader2, KeyRound, RefreshCw, Trash2,
  Eye, EyeOff, ShieldCheck, ShieldOff,
} from "lucide-react";

interface AccessInfo {
  exists: boolean;
  token?: string;
  url?: string;
  is_active?: boolean;
  last_accessed_at?: string | null;
}
interface StudentDoc { id: number; type: string | null; name: string; shared_with_betrieb: boolean; }
interface StudentRow {
  request_id: number;
  applicant_id: number;
  name: string;
  status_label: string;
  documents: StudentDoc[];
}

export default function BetriebAccessPanel({ companyId }: { companyId: number }) {
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([
        betriebAccessAPI.get(companyId),
        betriebAccessAPI.getStudents(companyId),
      ]);
      setAccess(a.data);
      setStudents(s.data);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const createOrReset = async (reset = false) => {
    if (!access?.exists && !pw) { alert("Bitte ein Passwort setzen."); return; }
    setBusy(true);
    try {
      await betriebAccessAPI.createOrReset(companyId, { password: pw || undefined });
      setPw("");
      await load();
      if (reset) alert("Neuer Link erzeugt – der alte Link funktioniert nicht mehr.");
    } finally { setBusy(false); }
  };

  const changePassword = async () => {
    if (!pw) { alert("Bitte neues Passwort eingeben."); return; }
    setBusy(true);
    try {
      await betriebAccessAPI.update(companyId, { password: pw });
      setPw("");
      alert("Passwort geändert.");
    } finally { setBusy(false); }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      await betriebAccessAPI.update(companyId, { is_active: !access?.is_active });
      await load();
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Zugang wirklich löschen? Der Link wird ungültig.")) return;
    setBusy(true);
    try { await betriebAccessAPI.remove(companyId); await load(); }
    finally { setBusy(false); }
  };

  const copyUrl = () => {
    if (!access?.url) return;
    navigator.clipboard?.writeText(access.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleDoc = async (doc: StudentDoc) => {
    // optimistisch
    setStudents((prev) => prev.map((st) => ({
      ...st,
      documents: st.documents.map((d) => d.id === doc.id ? { ...d, shared_with_betrieb: !d.shared_with_betrieb } : d),
    })));
    try { await betriebAccessAPI.setDocShare(doc.id, !doc.shared_with_betrieb); }
    catch { load(); }
  };

  if (loading) {
    return <div className="py-4 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="mt-6 border-t pt-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Link2 className="h-4 w-4 text-primary-600" /> Firmen-Zugang (passwortgeschützt)
      </h3>

      {!access?.exists ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Passwort für die Firma festlegen"
            className="input-field flex-1 min-w-[200px]"
          />
          <button onClick={() => createOrReset(false)} disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zugang erstellen"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-gray-100 rounded px-2 py-1 flex-1 min-w-[220px] truncate">{access.url}</code>
            <button onClick={copyUrl} className="btn-secondary inline-flex items-center gap-1 text-sm">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Kopiert" : "Link kopieren"}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${access.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
              {access.is_active ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
              {access.is_active ? "Aktiv" : "Gesperrt"}
            </span>
            <button onClick={toggleActive} disabled={busy} className="btn-secondary text-sm disabled:opacity-50">
              {access.is_active ? "Sperren" : "Aktivieren"}
            </button>
            <button onClick={() => createOrReset(true)} disabled={busy} className="btn-secondary text-sm inline-flex items-center gap-1 disabled:opacity-50">
              <RefreshCw className="h-3.5 w-3.5" /> Neuer Link
            </button>
            <button onClick={remove} disabled={busy} className="text-sm text-red-600 inline-flex items-center gap-1 hover:underline disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" /> Löschen
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <KeyRound className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Neues Passwort"
                className="input-field w-full pl-8"
              />
            </div>
            <button onClick={changePassword} disabled={busy || !pw} className="btn-secondary text-sm disabled:opacity-50">
              Passwort ändern
            </button>
          </div>
        </div>
      )}

      {/* Kandidaten + Dokument-Freigabe */}
      <h4 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Zugeteilte Kandidaten &amp; Dokument-Freigabe</h4>
      {students.length === 0 ? (
        <p className="text-sm text-gray-400">Diesem Betrieb sind noch keine Kandidaten zugeteilt (über die Anfragen zuteilen).</p>
      ) : (
        <div className="space-y-3">
          {students.map((st) => (
            <div key={st.request_id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800 text-sm">{st.name}</span>
                <span className="text-xs text-gray-500">{st.status_label}</span>
              </div>
              {st.documents.length === 0 ? (
                <p className="text-xs text-gray-400 mt-1">Keine Dokumente hochgeladen.</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {st.documents.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <button type="button" onClick={() => toggleDoc(d)} className="shrink-0">
                        {d.shared_with_betrieb
                          ? <Eye className="h-4 w-4 text-green-600" />
                          : <EyeOff className="h-4 w-4 text-gray-300" />}
                      </button>
                      <span className={d.shared_with_betrieb ? "text-gray-800" : "text-gray-400"}>{d.name}</span>
                      {d.shared_with_betrieb && <span className="text-[10px] text-green-600 border border-green-200 rounded px-1">sichtbar</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
