"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen, Building2, Plus, Edit, Trash2, FileDown,
  Loader2, Search, ChevronDown, X, Save, Users
} from "lucide-react";
import { ijpAPI } from "@/lib/api";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Betrieb {
  id: number;
  name: string;
  contact_person: string;
  street: string;
  postal_code: string;
  city: string;
  betriebsnummer?: string;
  phone?: string;
  email?: string;
}

interface Applicant {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  gender?: string;
}

const EMPTY_BETRIEB: Omit<Betrieb, "id"> = {
  name: "",
  contact_person: "",
  street: "",
  postal_code: "",
  city: "",
  betriebsnummer: "",
  phone: "",
  email: "",
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminIJPPage() {
  const [tab, setTab] = useState<"betriebe" | "dokument">("betriebe");
  const [betriebe, setBetriebe] = useState<Betrieb[]>([]);
  const [loadingBetriebe, setLoadingBetriebe] = useState(true);

  useEffect(() => {
    loadBetriebe();
  }, []);

  const loadBetriebe = async () => {
    setLoadingBetriebe(true);
    try {
      const res = await ijpAPI.getBetriebe();
      setBetriebe(res.data || []);
    } catch {
      toast.error("Fehler beim Laden der Betriebe");
    } finally {
      setLoadingBetriebe(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <FolderOpen className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IJP Dokumentenservice</h1>
          <p className="text-gray-600">Betriebe verwalten und Dokumente erstellen</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("betriebe")}
          className={`px-5 py-3 font-medium text-sm border-b-2 -mb-px transition-colors ${
            tab === "betriebe"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Betriebe ({betriebe.length})
          </span>
        </button>
        <button
          onClick={() => setTab("dokument")}
          className={`px-5 py-3 font-medium text-sm border-b-2 -mb-px transition-colors ${
            tab === "dokument"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Dokument erstellen
          </span>
        </button>
      </div>

      {/* Tab content */}
      {tab === "betriebe" ? (
        <BetriebeTab
          betriebe={betriebe}
          loading={loadingBetriebe}
          onRefresh={loadBetriebe}
        />
      ) : (
        <DokumentTab betriebe={betriebe} />
      )}
    </div>
  );
}

// ── Betriebe Tab ──────────────────────────────────────────────────────────────

function BetriebeTab({
  betriebe,
  loading,
  onRefresh,
}: {
  betriebe: Betrieb[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Betrieb | null>(null);
  const [form, setForm] = useState(EMPTY_BETRIEB);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_BETRIEB);
    setShowForm(true);
  };

  const openEdit = (b: Betrieb) => {
    setEditing(b);
    setForm({
      name: b.name,
      contact_person: b.contact_person,
      street: b.street,
      postal_code: b.postal_code,
      city: b.city,
      betriebsnummer: b.betriebsnummer || "",
      phone: b.phone || "",
      email: b.email || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.contact_person || !form.street || !form.postal_code || !form.city) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await ijpAPI.updateBetrieb(editing.id, form);
        toast.success("Betrieb aktualisiert");
      } else {
        await ijpAPI.createBetrieb(form);
        toast.success("Betrieb hinzugefügt");
      }
      setShowForm(false);
      onRefresh();
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Betrieb "${name}" wirklich löschen?`)) return;
    try {
      await ijpAPI.deleteBetrieb(id);
      toast.success("Betrieb gelöscht");
      onRefresh();
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Betrieb hinzufügen
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card mb-6 border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {editing ? "Betrieb bearbeiten" : "Neuer Betrieb"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Betriebsname *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Flotten Happen" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Ansprechpartner / Unterzeichner *</label>
              <input className="input" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="z.B. Reiner Schmidt" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Straße und Hausnummer *</label>
              <input className="input" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="z.B. Hauptstraße 27" />
            </div>
            <div>
              <label className="label">PLZ *</label>
              <input className="input" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="z.B. 26465" />
            </div>
            <div>
              <label className="label">Ort *</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="z.B. Langeoog" />
            </div>
            <div>
              <label className="label">Betriebsnummer</label>
              <input className="input" value={form.betriebsnummer} onChange={(e) => setForm({ ...form, betriebsnummer: e.target.value })} placeholder="optional" />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="optional" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">E-Mail</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="optional" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Speichern..." : "Speichern"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      ) : betriebe.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p>Noch keine Betriebe hinterlegt.</p>
          <p className="text-sm mt-1">Klicke auf "Betrieb hinzufügen" um zu starten.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Betrieb</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Ansprechpartner</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Adresse</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {betriebe.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{b.name}</td>
                  <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">{b.contact_person}</td>
                  <td className="px-5 py-3 text-gray-600 hidden md:table-cell text-sm">
                    {b.street}, {b.postal_code} {b.city}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(b)} className="p-2 text-gray-400 hover:text-primary-600">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(b.id, b.name)} className="p-2 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Dokument Tab ──────────────────────────────────────────────────────────────

function DokumentTab({ betriebe }: { betriebe: Betrieb[] }) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedBetriebId, setSelectedBetriebId] = useState<number | "">("");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [generating, setGenerating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchApplicants = async (term: string) => {
    setSearching(true);
    try {
      const res = await ijpAPI.getApplicants(term);
      setApplicants(res.data || []);
      setShowDropdown(true);
    } catch {
      toast.error("Fehler beim Suchen");
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (!val) {
      setSelectedApplicant(null);
      setShowDropdown(false);
      return;
    }
    searchApplicants(val);
  };

  const selectApplicant = (a: Applicant) => {
    setSelectedApplicant(a);
    setSearch(`${a.first_name} ${a.last_name} (${a.email})`);
    setShowDropdown(false);
    // Vorausfüllen aus Profil
    if (a.gender === "female") setGender("female");
    else if (a.gender === "male") setGender("male");
  };

  const handleGenerate = async () => {
    if (!selectedApplicant) { toast.error("Bitte einen Bewerber auswählen"); return; }
    if (!selectedBetriebId) { toast.error("Bitte einen Betrieb auswählen"); return; }

    setGenerating(true);
    try {
      const res = await ijpAPI.generateWohnungsbestaetigung({
        betrieb_id: selectedBetriebId,
        applicant_id: selectedApplicant.id,
        gender,
      });
      // Blob herunterladen
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      const name = `${selectedApplicant.first_name}_${selectedApplicant.last_name}`.replace(/\s+/g, "_");
      link.download = `Wohnungsbestaetigung_${name}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("PDF wurde erstellt und heruntergeladen");
    } catch {
      toast.error("Fehler beim Erstellen des PDFs");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="card space-y-5">
        <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
          <FileDown className="h-5 w-5 text-primary-600" />
          Wohnungsbestätigung erstellen
        </h3>

        {/* Bewerber-Suche */}
        <div>
          <label className="label">Bewerber *</label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="input pl-10"
                placeholder="Name oder E-Mail eingeben..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => search && setShowDropdown(true)}
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
            {showDropdown && applicants.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                {applicants.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectApplicant(a)}
                    className="w-full px-4 py-2.5 text-left hover:bg-primary-50 transition-colors text-sm"
                  >
                    <span className="font-medium text-gray-900">{a.first_name} {a.last_name}</span>
                    <span className="text-gray-500 ml-2">{a.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedApplicant && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <Users className="h-3 w-3" />
              {selectedApplicant.first_name} {selectedApplicant.last_name} ausgewählt
            </p>
          )}
        </div>

        {/* Geschlecht */}
        <div>
          <label className="label">Geschlecht (für korrekte Formulierung)</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="female"
                checked={gender === "female"}
                onChange={() => setGender("female")}
                className="accent-primary-600"
              />
              <span className="text-sm">Weiblich<br /><span className="text-xs text-gray-400">„die Arbeitnehmerin … ihrer …"</span></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="male"
                checked={gender === "male"}
                onChange={() => setGender("male")}
                className="accent-primary-600"
              />
              <span className="text-sm">Männlich<br /><span className="text-xs text-gray-400">„der Arbeitnehmer … seiner …"</span></span>
            </label>
          </div>
        </div>

        {/* Betrieb */}
        <div>
          <label className="label">Betrieb (Arbeitgeber) *</label>
          {betriebe.length === 0 ? (
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
              Noch keine Betriebe hinterlegt. Wechsle zum Tab "Betriebe" und füge einen hinzu.
            </p>
          ) : (
            <div className="relative">
              <select
                className="input appearance-none pr-10"
                value={selectedBetriebId}
                onChange={(e) => setSelectedBetriebId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">— Betrieb wählen —</option>
                {betriebe.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.contact_person} — {b.postal_code} {b.city}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Vorschau */}
        {selectedApplicant && selectedBetriebId && (() => {
          const b = betriebe.find((x) => x.id === selectedBetriebId);
          const name = `${selectedApplicant.first_name} ${selectedApplicant.last_name}`;
          const art = gender === "female" ? "die Arbeitnehmerin" : "der Arbeitnehmer";
          const poss = gender === "female" ? "ihrer" : "seiner";
          return b ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 space-y-1 font-mono leading-relaxed">
              <p className="font-bold">{b.name}</p>
              <p>{b.contact_person}</p>
              <p>{b.street}</p>
              <p>{b.postal_code} {b.city}</p>
              <p className="mt-3">An die</p>
              <p>Deutsche Botschaft</p>
              <p className="mt-3 font-semibold">Betreff: Bestätigung zur Unterkunft und Übernahme der Anreisekosten</p>
              <p className="mt-3">Sehr geehrte Damen und Herren,</p>
              <p className="mt-2">hiermit bestätigen wir, dass <strong>{art} {name}</strong> für den gesamten Zeitraum {poss} Beschäftigung in unserem Betrieb eine Unterkunft erhält…</p>
            </div>
          ) : null;
        })()}

        {/* Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !selectedApplicant || !selectedBetriebId}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {generating ? "PDF wird erstellt..." : "Wohnungsbestätigung als PDF herunterladen"}
        </button>
      </div>
    </div>
  );
}
