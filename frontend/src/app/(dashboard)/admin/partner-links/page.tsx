"use client";

import { useState, useEffect } from "react";
import {
  Link2, Plus, Trash2, Copy, Check, X, Users,
  Loader2, ToggleLeft, ToggleRight, ExternalLink, Shield
} from "lucide-react";
import { adminPartnerLinksAPI, adminAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface ApplicantInvite {
  id: number;
  source_name: string;
  source_country?: string;
  is_active: boolean;
}

interface PartnerLink {
  id: number;
  name: string;
  partner_source: string;
  token: string;
  is_active: boolean;
  notes?: string;
  applicant_count: number;
  created_at: string;
  last_accessed_at?: string;
}

const FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  (typeof window !== "undefined" ? window.location.origin : "https://www.jobon.work");

export default function AdminPartnerLinksPage() {
  const [links, setLinks] = useState<PartnerLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [inviteSources, setInviteSources] = useState<ApplicantInvite[]>([]);

  const [form, setForm] = useState({
    name: "",
    partner_source: "",
    notes: "",
  });

  useEffect(() => {
    loadLinks();
    loadInviteSources();
  }, []);

  const loadInviteSources = async () => {
    try {
      const res = await adminAPI.listApplicantInvites();
      setInviteSources(res.data.invites || []);
    } catch {
      // silent
    }
  };

  const loadLinks = async () => {
    try {
      const res = await adminPartnerLinksAPI.list();
      setLinks(res.data.links);
    } catch {
      toast.error("Fehler beim Laden der Partner-Links");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.partner_source.trim()) {
      toast.error("Name und Partnerquelle sind Pflichtfelder");
      return;
    }
    setCreating(true);
    try {
      await adminPartnerLinksAPI.create({
        name: form.name.trim(),
        partner_source: form.partner_source.trim(),
        notes: form.notes.trim() || null,
      });
      toast.success("Partner-Link erstellt");
      setForm({ name: "", partner_source: "", notes: "" });
      setShowCreate(false);
      loadLinks();
    } catch {
      toast.error("Fehler beim Erstellen");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (link: PartnerLink) => {
    try {
      await adminPartnerLinksAPI.update(link.id, { is_active: !link.is_active });
      toast.success(link.is_active ? "Link deaktiviert" : "Link aktiviert");
      loadLinks();
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleDelete = async (link: PartnerLink) => {
    if (!confirm(`Partner-Link "${link.name}" wirklich löschen? Der Link wird sofort ungültig.`)) return;
    try {
      await adminPartnerLinksAPI.delete(link.id);
      toast.success("Link gelöscht");
      loadLinks();
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const copyLink = (token: string) => {
    const url = `${FRONTEND_URL}/partner/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success("Link kopiert");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatDate = (d?: string | null) => {
    if (!d) return "–";
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link2 className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partner-Links</h1>
            <p className="text-gray-600">
              Read-only Zugriff für externe Partner auf ihre eigenen Bewerber
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Neuer Link
        </button>
      </div>

      {/* Erklärungs-Box */}
      <div className="card mb-6 bg-blue-50 border border-blue-200">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-semibold">So funktionieren Partner-Links:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>Jeder Link ist mit einer Bewerber-Einladung verknüpft und zeigt nur deren Bewerber</li>
              <li>Partner sehen Namen, Dokumentenstatus und IJP-Auftragsstatus – keine Dateien</li>
              <li>Kein Login nötig – Zugriff nur über den geheimen Link-Token</li>
              <li>Links können jederzeit deaktiviert oder gelöscht werden</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Formular: Neuen Link erstellen */}
      {showCreate && (
        <div className="card mb-6 border-2 border-primary-200 bg-primary-50">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary-600" />
            Neuen Partner-Link erstellen
          </h2>
          <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Partnername (Anzeigename)</label>
              <input
                type="text"
                className="input-styled"
                placeholder="z.B. Janara Sprachschule"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Wird dem Partner auf seiner Seite angezeigt
              </p>
            </div>
            <div>
              <label className="label">Partnerquelle (Bewerber-Einladung)</label>
              <select
                className="input-styled"
                value={form.partner_source}
                onChange={(e) => setForm({ ...form, partner_source: e.target.value })}
                required
              >
                <option value="">— Quelle auswählen —</option>
                {inviteSources.map((inv) => (
                  <option key={inv.id} value={inv.source_name}>
                    {inv.source_name}{inv.source_country ? ` (${inv.source_country})` : ""}
                    {!inv.is_active ? " [inaktiv]" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Aus den angelegten Bewerber-Einladungen
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="label">Interne Notiz (optional)</label>
              <input
                type="text"
                className="input-styled"
                placeholder="z.B. Vertrag gültig bis 12/2026"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Link erstellen
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn-secondary"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="card text-center py-16">
          <Link2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Noch keine Partner-Links</p>
          <p className="text-gray-400 text-sm mt-1">
            Erstelle den ersten Link über die Schaltfläche oben
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div
              key={link.id}
              className={`card border-2 transition-colors ${
                link.is_active ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-lg">{link.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        link.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {link.is_active ? "Aktiv" : "Deaktiviert"}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      {link.applicant_count} Bewerber
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    Quelle:{" "}
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
                      {link.partner_source}
                    </code>
                  </p>

                  {link.notes && (
                    <p className="text-sm text-gray-400 mt-1 italic">{link.notes}</p>
                  )}

                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Erstellt: {formatDate(link.created_at)}</span>
                    <span>Letzter Zugriff: {formatDate(link.last_accessed_at)}</span>
                  </div>

                  {/* Link-URL */}
                  <div className="mt-3 flex items-center gap-2">
                    <code className="text-xs bg-gray-100 rounded px-2 py-1 truncate max-w-sm text-gray-600">
                      {FRONTEND_URL}/partner/{link.token}
                    </code>
                    <button
                      onClick={() => copyLink(link.token)}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors shrink-0"
                      title="Link kopieren"
                    >
                      {copiedToken === link.token ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <a
                      href={`/partner/${link.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors shrink-0"
                      title="Link öffnen"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(link)}
                    className={`p-2 rounded-lg transition-colors ${
                      link.is_active
                        ? "text-green-600 hover:bg-green-50"
                        : "text-gray-400 hover:bg-gray-100"
                    }`}
                    title={link.is_active ? "Deaktivieren" : "Aktivieren"}
                  >
                    {link.is_active ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(link)}
                    className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Link löschen"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
