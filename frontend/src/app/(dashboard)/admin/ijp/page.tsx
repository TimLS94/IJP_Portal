"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FolderOpen, Building2, Plus, Edit, Trash2, FileDown,
  Loader2, Search, ChevronDown, X, Save, Users, RotateCcw,
  Eye, Code2
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

interface TemplateVar {
  key: string;
  label: string;
}

interface DocType {
  value: string;
  label: string;
}

const EMPTY_BETRIEB: Omit<Betrieb, "id"> = {
  name: "", contact_person: "", street: "", postal_code: "", city: "",
  betriebsnummer: "", phone: "", email: "",
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminIJPPage() {
  const [tab, setTab] = useState<"betriebe" | "dokument">("betriebe");
  const [betriebe, setBetriebe] = useState<Betrieb[]>([]);
  const [loadingBetriebe, setLoadingBetriebe] = useState(true);

  useEffect(() => { loadBetriebe(); }, []);

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
      <div className="flex items-center gap-3 mb-8">
        <FolderOpen className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IJP Dokumentenservice</h1>
          <p className="text-gray-600">Betriebe verwalten und Dokumente erstellen</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(["betriebe", "dokument"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 font-medium text-sm border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              tab === t
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "betriebe" ? <><Building2 className="h-4 w-4" />Betriebe ({betriebe.length})</> : <><FileDown className="h-4 w-4" />Dokument erstellen</>}
          </button>
        ))}
      </div>

      {tab === "betriebe" ? (
        <BetriebeTab betriebe={betriebe} loading={loadingBetriebe} onRefresh={loadBetriebe} />
      ) : (
        <DokumentTab betriebe={betriebe} />
      )}
    </div>
  );
}

// ── Betriebe Tab ──────────────────────────────────────────────────────────────

function BetriebeTab({ betriebe, loading, onRefresh }: { betriebe: Betrieb[]; loading: boolean; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Betrieb | null>(null);
  const [form, setForm] = useState(EMPTY_BETRIEB);
  const [saving, setSaving] = useState(false);

  const openEdit = (b: Betrieb) => {
    setEditing(b);
    setForm({ name: b.name, contact_person: b.contact_person, street: b.street, postal_code: b.postal_code, city: b.city, betriebsnummer: b.betriebsnummer || "", phone: b.phone || "", email: b.email || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.contact_person || !form.street || !form.postal_code || !form.city) { toast.error("Pflichtfelder ausfüllen"); return; }
    setSaving(true);
    try {
      editing ? await ijpAPI.updateBetrieb(editing.id, form) : await ijpAPI.createBetrieb(form);
      toast.success(editing ? "Betrieb aktualisiert" : "Betrieb hinzugefügt");
      setShowForm(false);
      onRefresh();
    } catch { toast.error("Fehler beim Speichern"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Betrieb "${name}" wirklich löschen?`)) return;
    try { await ijpAPI.deleteBetrieb(id); toast.success("Gelöscht"); onRefresh(); }
    catch { toast.error("Fehler beim Löschen"); }
  };

  const f = (field: keyof typeof EMPTY_BETRIEB) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setEditing(null); setForm(EMPTY_BETRIEB); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Betrieb hinzufügen
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editing ? "Betrieb bearbeiten" : "Neuer Betrieb"}</h3>
            <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400 hover:text-gray-600" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="label">Betriebsname *</label><input className="input" value={form.name} onChange={f("name")} placeholder="z.B. Flotten Happen" /></div>
            <div className="sm:col-span-2"><label className="label">Ansprechpartner / Unterzeichner *</label><input className="input" value={form.contact_person} onChange={f("contact_person")} placeholder="z.B. Reiner Schmidt" /></div>
            <div className="sm:col-span-2"><label className="label">Straße und Hausnummer *</label><input className="input" value={form.street} onChange={f("street")} placeholder="z.B. Hauptstraße 27" /></div>
            <div><label className="label">PLZ *</label><input className="input" value={form.postal_code} onChange={f("postal_code")} placeholder="26465" /></div>
            <div><label className="label">Ort *</label><input className="input" value={form.city} onChange={f("city")} placeholder="Langeoog" /></div>
            <div><label className="label">Betriebsnummer</label><input className="input" value={form.betriebsnummer} onChange={f("betriebsnummer")} placeholder="optional" /></div>
            <div><label className="label">Telefon</label><input className="input" value={form.phone} onChange={f("phone")} placeholder="optional" /></div>
            <div className="sm:col-span-2"><label className="label">E-Mail</label><input className="input" value={form.email} onChange={f("email")} placeholder="optional" /></div>
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

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>
      ) : betriebe.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p>Noch keine Betriebe hinterlegt.</p>
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
                  <td className="px-5 py-3 text-gray-600 hidden md:table-cell text-sm">{b.street}, {b.postal_code} {b.city}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(b)} className="p-2 text-gray-400 hover:text-primary-600"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(b.id, b.name)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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
  // Doc type
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [docType, setDocType] = useState("wohnungsbestaetigung");

  // Template
  const [template, setTemplate] = useState("");
  const [defaultTemplate, setDefaultTemplate] = useState("");
  const [templateVars, setTemplateVars] = useState<TemplateVar[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Selectors
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedBetriebId, setSelectedBetriebId] = useState<number | "">("");
  const [gender, setGender] = useState<"female" | "male">("female");

  // State
  const [generating, setGenerating] = useState(false);

  // Load doc types on mount
  useEffect(() => {
    ijpAPI.getDocumentTypes().then((r) => setDocTypes(r.data || [])).catch(() => {});
  }, []);

  // Load template when doc type changes
  useEffect(() => {
    setLoadingTemplate(true);
    ijpAPI.getTemplate(docType)
      .then((r) => {
        setTemplate(r.data.template);
        setDefaultTemplate(r.data.template);
        setTemplateVars(r.data.variables || []);
      })
      .catch(() => toast.error("Vorlage konnte nicht geladen werden"))
      .finally(() => setLoadingTemplate(false));
  }, [docType]);

  // Computed variables for substitution
  const currentVars = useMemo<Record<string, string>>(() => {
    const betrieb = betriebe.find((b) => b.id === selectedBetriebId);
    const appName = selectedApplicant ? `${selectedApplicant.first_name} ${selectedApplicant.last_name}`.trim() : "";
    return {
      betrieb_name:      betrieb?.name || "",
      contact_person:    betrieb?.contact_person || "",
      street:            betrieb?.street || "",
      postal_code:       betrieb?.postal_code || "",
      city:              betrieb?.city || "",
      applicant_name:    appName,
      gender_article:    gender === "female" ? "die Arbeitnehmerin" : "der Arbeitnehmer",
      gender_possessive: gender === "female" ? "ihrer" : "seiner",
    };
  }, [betriebe, selectedBetriebId, selectedApplicant, gender]);

  // Live-Vorschau: Platzhalter ersetzen
  const preview = useMemo(() => {
    let result = template;
    for (const [key, value] of Object.entries(currentVars)) {
      result = result.replaceAll(`{{${key}}}`, value || `[${key}]`);
    }
    return result;
  }, [template, currentVars]);

  // Bewerber suchen
  const searchApplicants = useCallback(async (term: string) => {
    setSearching(true);
    try {
      const res = await ijpAPI.getApplicants(term);
      setApplicants(res.data || []);
      setShowDropdown(true);
    } catch { toast.error("Fehler beim Suchen"); }
    finally { setSearching(false); }
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setSelectedApplicant(null);
    if (val.length >= 2) searchApplicants(val);
    else setShowDropdown(false);
  };

  const selectApplicant = (a: Applicant) => {
    setSelectedApplicant(a);
    setSearch(`${a.first_name} ${a.last_name}`);
    setShowDropdown(false);
    if (a.gender === "female") setGender("female");
    else if (a.gender === "male") setGender("male");
  };

  // Variable an Cursor-Position einfügen
  const insertVariable = (varKey: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? template.length;
    const end = ta.selectionEnd ?? template.length;
    const insert = `{{${varKey}}}`;
    const newText = template.slice(0, start) + insert + template.slice(end);
    setTemplate(newText);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + insert.length;
      ta.focus();
    }, 0);
  };

  // PDF generieren
  const handleGenerate = async () => {
    if (!selectedApplicant) { toast.error("Bitte einen Bewerber auswählen"); return; }
    if (!selectedBetriebId) { toast.error("Bitte einen Betrieb auswählen"); return; }
    setGenerating(true);
    try {
      const res = await ijpAPI.generateDocument({
        doc_type: docType,
        betrieb_id: selectedBetriebId,
        applicant_id: selectedApplicant.id,
        gender,
        custom_template: template !== defaultTemplate ? template : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      const name = `${selectedApplicant.first_name}_${selectedApplicant.last_name}`.replace(/\s+/g, "_");
      link.download = `${docType}_${name}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("PDF heruntergeladen");
    } catch { toast.error("Fehler beim Erstellen des PDFs"); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-5">
      {/* Dokument-Typ + Selektoren */}
      <div className="card">
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Dokument-Typ */}
          <div>
            <label className="label">Dokument-Typ</label>
            <div className="relative">
              <select className="input appearance-none pr-10" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {docTypes.map((dt) => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Bewerber */}
          <div>
            <label className="label">Bewerber *</label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="Name oder E-Mail..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => search && applicants.length > 0 && setShowDropdown(true)}
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
              </div>
              {showDropdown && applicants.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                  {applicants.map((a) => (
                    <button key={a.id} type="button" onClick={() => selectApplicant(a)}
                      className="w-full px-4 py-2.5 text-left hover:bg-primary-50 text-sm">
                      <span className="font-medium">{a.first_name} {a.last_name}</span>
                      <span className="text-gray-400 ml-2 text-xs">{a.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedApplicant && (
              <p className="text-xs text-green-600 mt-1">✓ {selectedApplicant.first_name} {selectedApplicant.last_name}</p>
            )}
          </div>

          {/* Betrieb */}
          <div>
            <label className="label">Betrieb *</label>
            <div className="relative">
              <select className="input appearance-none pr-10" value={selectedBetriebId} onChange={(e) => setSelectedBetriebId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">— Betrieb wählen —</option>
                {betriebe.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.city})</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Geschlecht */}
        <div className="mt-4 flex items-center gap-6">
          <span className="label mb-0">Geschlecht:</span>
          {(["female", "male"] as const).map((g) => (
            <label key={g} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={g} checked={gender === g} onChange={() => setGender(g)} className="accent-primary-600" />
              <span className="text-sm">
                {g === "female" ? <>Weiblich <span className="text-xs text-gray-400">„die Arbeitnehmerin … ihrer"</span></> : <>Männlich <span className="text-xs text-gray-400">„der Arbeitnehmer … seiner"</span></>}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Split: Editor | Vorschau */}
      {loadingTemplate ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* ── Editor ─────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary-600" /> Vorlage bearbeiten
              </h3>
              <button
                onClick={() => setTemplate(defaultTemplate)}
                className="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1"
                title="Auf Standard zurücksetzen"
              >
                <RotateCcw className="h-3 w-3" /> Zurücksetzen
              </button>
            </div>

            {/* Variable chips */}
            <div className="flex flex-wrap gap-1.5">
              {templateVars.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  title={`${v.label} einfügen`}
                  className="px-2 py-0.5 bg-primary-50 text-primary-700 border border-primary-200 rounded text-xs font-mono hover:bg-primary-100 transition-colors"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full flex-1 min-h-[480px] p-4 font-mono text-sm border-2 border-gray-200 rounded-xl
                         focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100
                         resize-none leading-relaxed bg-gray-50"
              spellCheck={false}
            />
            <p className="text-xs text-gray-400">
              Klicke auf eine Variable um sie an der Cursor-Position einzufügen. Platzhalter werden in der Vorschau ersetzt.
            </p>
          </div>

          {/* ── Vorschau ──────────────────────────── */}
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary-600" /> Vorschau
            </h3>
            <div
              className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-auto"
              style={{ minHeight: 480 }}
            >
              <div className="px-10 py-8 font-serif text-sm leading-relaxed text-gray-800 min-h-full">
                {preview.split("\n").map((line, i) => {
                  const isBold = line.trim().startsWith("Betreff:");
                  const isBlank = !line.trim();
                  const hasPlaceholder = /\[[\w_]+\]/.test(line);
                  return (
                    <p
                      key={i}
                      className={`${isBlank ? "mb-4" : "mb-0"} ${isBold ? "font-bold" : ""}`}
                    >
                      {isBlank ? " " : line.split(/(\[[\w_]+\])/g).map((part, j) =>
                        /^\[[\w_]+\]$/.test(part)
                          ? <span key={j} className="bg-yellow-100 text-yellow-700 rounded px-0.5">{part}</span>
                          : part
                      )}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download */}
      <button
        onClick={handleGenerate}
        disabled={generating || !selectedApplicant || !selectedBetriebId}
        className="btn-primary flex items-center gap-2 disabled:opacity-50"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        {generating ? "PDF wird erstellt..." : "PDF herunterladen"}
      </button>
    </div>
  );
}
