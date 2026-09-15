"use client";

import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Shield, Trash2, Loader2, Plus, AlertTriangle } from "lucide-react";

interface Suppression {
  id: number;
  email: string;
  reason: string | null;
  created_at: string | null;
}

export default function EmailBlocklistPage() {
  const [rows, setRows] = useState<Suppression[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminAPI.listEmailSuppressions();
      setRows(r.data || []);
    } catch {
      toast.error("Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!addr || !addr.includes("@")) { toast.error("Bitte gültige E-Mail-Adresse eingeben"); return; }
    setBusy(true);
    try {
      const r = await adminAPI.addEmailSuppression(addr, reason.trim() || undefined);
      toast.success(r.data?.already ? "Adresse war bereits gesperrt" : "Adresse gesperrt – es gehen keine E-Mails mehr raus");
      setEmail(""); setReason("");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Konnte nicht sperren");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Suppression) => {
    if (!confirm(`Sperre für ${row.email} aufheben? Danach können wieder E-Mails an diese Adresse gehen.`)) return;
    try {
      await adminAPI.deleteEmailSuppression(row.id);
      setRows((prev) => prev.filter((x) => x.id !== row.id));
    } catch {
      toast.error("Aufheben fehlgeschlagen");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Shield className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">E-Mail-Sperrliste</h1>
          <p className="text-sm text-gray-500">Adressen hier bekommen <strong>keine</strong> E-Mails mehr – egal welcher Typ.</p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Die Sperre greift sofort und für alle E-Mail-Arten (Transaktion & Kaltakquise). Verwende sie z. B. bei Abmahnung oder Opt-out.</span>
      </div>

      <form onSubmit={add} className="bg-white border rounded-xl p-4 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="adresse@example.com"
            className="input-field flex-1"
          />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Grund (optional, z. B. Abmahnung)"
            className="input-field flex-1"
          />
          <button type="submit" disabled={busy} className="btn-primary inline-flex items-center justify-center gap-1 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Sperren
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-400 py-10">Keine gesperrten Adressen.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 bg-white border rounded-lg p-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{row.email}</p>
                {row.reason && <p className="text-xs text-gray-500 truncate">{row.reason}</p>}
              </div>
              <button
                onClick={() => remove(row)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                title="Sperre aufheben"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
