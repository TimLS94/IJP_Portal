"use client";

import { useState, useEffect, useCallback } from "react";
import { insuranceAPI, adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Heart,
  Loader2,
  Trash2,
  Save,
  FileCheck2,
  Plus,
  ExternalLink,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";

interface Signup {
  id: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  needs_embassy_proof: boolean;
  language: string | null;
  status: string;
  admin_note: string | null;
  created_at: string | null;
}

interface ManualLink {
  title?: string;
  url?: string;
  description?: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Neu",
  contacted: "Kontaktiert",
  registered: "Angemeldet",
  done: "Erledigt",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  registered: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
};

export default function AdminInsurancePage() {
  const [tab, setTab] = useState<"signups" | "settings">("signups");

  // --- Signups ---
  const [signups, setSignups] = useState<Signup[]>([]);
  const [summary, setSummary] = useState({ total: 0, embassy_needed: 0 });
  const [loading, setLoading] = useState(true);
  const [onlyEmbassy, setOnlyEmbassy] = useState(false);

  const loadSignups = useCallback(async () => {
    setLoading(true);
    try {
      const r = await insuranceAPI.adminGetSignups(
        onlyEmbassy ? { needs_embassy_proof: true } : {}
      );
      setSignups(r.data.signups || []);
      setSummary({ total: r.data.total || 0, embassy_needed: r.data.embassy_needed || 0 });
    } catch {
      toast.error("Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, [onlyEmbassy]);

  useEffect(() => {
    loadSignups();
  }, [loadSignups]);

  const changeStatus = async (row: Signup, status: string) => {
    try {
      await insuranceAPI.adminUpdateSignup(row.id, { status });
      setSignups((prev) => prev.map((s) => (s.id === row.id ? { ...s, status } : s)));
    } catch {
      toast.error("Speichern fehlgeschlagen");
    }
  };

  const saveNote = async (row: Signup, note: string) => {
    try {
      await insuranceAPI.adminUpdateSignup(row.id, { admin_note: note });
      toast.success("Notiz gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    }
  };

  const remove = async (row: Signup) => {
    if (!confirm(`Anmeldung von ${row.full_name || row.email} löschen?`)) return;
    try {
      await insuranceAPI.adminDeleteSignup(row.id);
      setSignups((prev) => prev.filter((s) => s.id !== row.id));
    } catch {
      toast.error("Löschen fehlgeschlagen");
    }
  };

  // --- Settings ---
  const [cfg, setCfg] = useState({
    barmer_signup_url: "",
    insurance_partner_name: "BARMER",
    insurance_partner_url: "https://www.barmer.de",
    arbeitnehmer_hub_tag: "arbeitnehmer",
    krankenkasse_tag: "krankenkasse",
  });
  const [hubLinks, setHubLinks] = useState<ManualLink[]>([]);
  const [kkLinks, setKkLinks] = useState<ManualLink[]>([]);
  const [cfgLoading, setCfgLoading] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);

  const loadSettings = useCallback(async () => {
    setCfgLoading(true);
    try {
      const r = await adminAPI.getSettings();
      const d = r.data || {};
      const get = (k: string, fb: any) => (d[k]?.value ?? fb);
      setCfg({
        barmer_signup_url: get("barmer_signup_url", ""),
        insurance_partner_name: get("insurance_partner_name", "BARMER"),
        insurance_partner_url: get("insurance_partner_url", "https://www.barmer.de"),
        arbeitnehmer_hub_tag: get("arbeitnehmer_hub_tag", "arbeitnehmer"),
        krankenkasse_tag: get("krankenkasse_tag", "krankenkasse"),
      });
      setHubLinks(Array.isArray(get("arbeitnehmer_manual_links", [])) ? get("arbeitnehmer_manual_links", []) : []);
      setKkLinks(Array.isArray(get("krankenkasse_manual_links", [])) ? get("krankenkasse_manual_links", []) : []);
    } catch {
      toast.error("Einstellungen laden fehlgeschlagen");
    } finally {
      setCfgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "settings") loadSettings();
  }, [tab, loadSettings]);

  const saveSettings = async () => {
    setSavingCfg(true);
    try {
      await Promise.all([
        adminAPI.setSetting("barmer_signup_url", cfg.barmer_signup_url.trim()),
        adminAPI.setSetting("insurance_partner_name", cfg.insurance_partner_name.trim()),
        adminAPI.setSetting("insurance_partner_url", cfg.insurance_partner_url.trim()),
        adminAPI.setSetting("arbeitnehmer_hub_tag", cfg.arbeitnehmer_hub_tag.trim()),
        adminAPI.setSetting("krankenkasse_tag", cfg.krankenkasse_tag.trim()),
        adminAPI.setSetting("arbeitnehmer_manual_links", hubLinks.filter((l) => (l.url || "").trim())),
        adminAPI.setSetting("krankenkasse_manual_links", kkLinks.filter((l) => (l.url || "").trim())),
      ]);
      toast.success("Gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSavingCfg(false);
    }
  };

  const LinkEditor = ({
    links,
    setLinks,
    label,
  }: {
    links: ManualLink[];
    setLinks: (l: ManualLink[]) => void;
    label: string;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="font-medium text-gray-900">{label}</label>
        <button
          type="button"
          onClick={() => setLinks([...links, { title: "", url: "", description: "" }])}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
        >
          <Plus className="h-4 w-4" /> Link hinzufügen
        </button>
      </div>
      <div className="space-y-3">
        {links.length === 0 && (
          <p className="text-sm text-gray-400">Keine manuellen Links – Artikel kommen automatisch per Tag.</p>
        )}
        {links.map((l, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 grid sm:grid-cols-2 gap-2">
              <input
                value={l.title || ""}
                onChange={(e) => {
                  const n = [...links];
                  n[i] = { ...n[i], title: e.target.value };
                  setLinks(n);
                }}
                placeholder="Titel"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={l.url || ""}
                onChange={(e) => {
                  const n = [...links];
                  n[i] = { ...n[i], url: e.target.value };
                  setLinks(n);
                }}
                placeholder="https://…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={l.description || ""}
                onChange={(e) => {
                  const n = [...links];
                  n[i] = { ...n[i], description: e.target.value };
                  setLinks(n);
                }}
                placeholder="Kurzbeschreibung (optional)"
                className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
          <Heart className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Krankenversicherung (BARMER)</h1>
      </div>
      <p className="text-gray-500 mb-6">
        Anmeldungen zur Krankenversicherung und Einstellungen für die Arbeitnehmer-Seiten.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("signups")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
            tab === "signups"
              ? "border-rose-500 text-rose-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="h-4 w-4" /> Anmeldungen
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
            tab === "settings"
              ? "border-rose-500 text-rose-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <SettingsIcon className="h-4 w-4" /> Einstellungen
        </button>
      </div>

      {tab === "signups" ? (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-white border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Anmeldungen gesamt</p>
              <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
              <p className="text-sm text-amber-700 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4" /> Brauchen Botschafts-Nachweis
              </p>
              <p className="text-3xl font-bold text-amber-800">{summary.embassy_needed}</p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyEmbassy}
              onChange={(e) => setOnlyEmbassy(e.target.checked)}
              className="rounded"
            />
            Nur mit Botschafts-Nachweis anzeigen
          </label>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : signups.length === 0 ? (
            <p className="text-gray-500 py-10 text-center">Noch keine Anmeldungen.</p>
          ) : (
            <div className="space-y-3">
              {signups.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl bg-white border border-gray-200 p-5 flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{s.full_name || "—"}</span>
                      {s.needs_embassy_proof && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                          <FileCheck2 className="h-3 w-3" /> Botschaft
                        </span>
                      )}
                      <span className="text-xs text-gray-400 uppercase">{s.language}</span>
                    </div>
                    <p className="text-sm text-gray-500">{s.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.created_at ? new Date(s.created_at).toLocaleString("de-DE") : ""}
                    </p>
                    <input
                      defaultValue={s.admin_note || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (s.admin_note || "")) saveNote(s, e.target.value);
                      }}
                      placeholder="Notiz …"
                      className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={s.status}
                      onChange={(e) => changeStatus(s, e.target.value)}
                      className={`text-sm font-medium rounded-lg px-3 py-1.5 border-0 ${
                        STATUS_COLORS[s.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => remove(s)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : cfgLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          <div className="rounded-xl bg-white border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">BARMER-Anmeldung</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BARMER-Anmelde-Link (Weiterleitung nach Klick auf „Anmelden")
              </label>
              <input
                value={cfg.barmer_signup_url}
                onChange={(e) => setCfg({ ...cfg, barmer_signup_url: e.target.value })}
                placeholder="https://www.barmer.de/… (leer = Button zeigt 'bald verfügbar')"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Solange leer, ist die Anmeldung für Nutzer deaktiviert (Hinweis „bald verfügbar").
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partner-Name</label>
                <input
                  value={cfg.insurance_partner_name}
                  onChange={(e) => setCfg({ ...cfg, insurance_partner_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partner-Website (Logo-Link)
                </label>
                <input
                  value={cfg.insurance_partner_url}
                  onChange={(e) => setCfg({ ...cfg, insurance_partner_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Logo-Hinweis: Das offizielle BARMER-Logo liegt unter{" "}
              <code>frontend/public/partners/barmer-logo.png</code>. Laut Vertrag erst nach
              Genehmigung durch BARMER öffentlich verwenden. Fehlt die Datei, wird „BARMER" als Schriftzug angezeigt.
            </p>
          </div>

          <div className="rounded-xl bg-white border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Automatische Blog-Artikel (per Tag)</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag „Für Arbeitnehmer"
                </label>
                <input
                  value={cfg.arbeitnehmer_hub_tag}
                  onChange={(e) => setCfg({ ...cfg, arbeitnehmer_hub_tag: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag „Krankenkasse"
                </label>
                <input
                  value={cfg.krankenkasse_tag}
                  onChange={(e) => setCfg({ ...cfg, krankenkasse_tag: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Blog-Artikel mit diesem Tag erscheinen automatisch. Tags im Blog-Editor beim Artikel setzen.
            </p>
          </div>

          <div className="rounded-xl bg-white border border-gray-200 p-6 space-y-6">
            <h2 className="font-semibold text-gray-900">Zusätzliche manuelle Links</h2>
            <LinkEditor links={hubLinks} setLinks={setHubLinks} label={'Seite „Für Arbeitnehmer“'} />
            <LinkEditor links={kkLinks} setLinks={setKkLinks} label={'Seite „Krankenkasse“'} />
          </div>

          <button
            onClick={saveSettings}
            disabled={savingCfg}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold"
          >
            {savingCfg ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Einstellungen speichern
          </button>

          <a
            href="/arbeitnehmer/krankenkasse"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
          >
            Seite ansehen <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
