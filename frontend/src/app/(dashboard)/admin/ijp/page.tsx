"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FolderOpen, Building2, Plus, Edit, Trash2, FileDown,
  Loader2, Search, ChevronDown, X, Save, RotateCcw,
  Eye, Code2, FileText, ArrowLeft, AlertCircle,
} from "lucide-react";
import { ijpAPI, crmAPI } from "@/lib/api";
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
  bezeichnung?: string;
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

interface TemplateVar { key: string; label: string; }

interface Template {
  id: number;
  doc_type: string;
  label: string;
  template_text: string;
  variables: TemplateVar[];
  created_at: string;
  updated_at: string;
}

const EMPTY_BETRIEB: Omit<Betrieb, "id"> = {
  name: "", contact_person: "", street: "", postal_code: "", city: "",
  betriebsnummer: "", phone: "", email: "",
};

// ── Root Page ─────────────────────────────────────────────────────────────────

export default function AdminIJPPage() {
  const [tab, setTab] = useState<"betriebe" | "dokument" | "vorlagen" | "arbeitgeber">("betriebe");
  const [betriebe, setBetriebe] = useState<Betrieb[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingBetriebe, setLoadingBetriebe] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => { loadBetriebe(); loadTemplates(); }, []);

  const loadBetriebe = async () => {
    setLoadingBetriebe(true);
    try { const r = await ijpAPI.getBetriebe(); setBetriebe(r.data || []); }
    catch { toast.error("Betriebe konnten nicht geladen werden"); }
    finally { setLoadingBetriebe(false); }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try { const r = await ijpAPI.getTemplates(); setTemplates(r.data || []); }
    catch { toast.error("Vorlagen konnten nicht geladen werden"); }
    finally { setLoadingTemplates(false); }
  };

  const tabs = [
    { key: "betriebe",    icon: Building2, label: `Betriebe (${betriebe.length})` },
    { key: "vorlagen",    icon: FileText,  label: `Vorlagen (${templates.length})` },
    { key: "dokument",    icon: FileDown,  label: "Dokument erstellen" },
    { key: "arbeitgeber", icon: Building2, label: "Arbeitgeber-Formular" },
  ] as const;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <FolderOpen className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IJP Dokumentenservice</h1>
          <p className="text-gray-600">Betriebe und Vorlagen verwalten, Dokumente erstellen</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-3 font-medium text-sm border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              tab === key ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {tab === "betriebe"    && <BetriebeTab betriebe={betriebe} loading={loadingBetriebe} onRefresh={loadBetriebe} />}
      {tab === "vorlagen"    && <VorlagenTab templates={templates} loading={loadingTemplates} onRefresh={loadTemplates} />}
      {tab === "dokument"    && <DokumentTab betriebe={betriebe} templates={templates} />}
      {tab === "arbeitgeber" && <ArbeitgeberFormularTab />}
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
  const openNew = () => { setEditing(null); setForm(EMPTY_BETRIEB); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !form.contact_person || !form.street || !form.postal_code || !form.city) { toast.error("Pflichtfelder ausfüllen"); return; }
    setSaving(true);
    try {
      editing ? await ijpAPI.updateBetrieb(editing.id, form) : await ijpAPI.createBetrieb(form);
      toast.success(editing ? "Betrieb aktualisiert" : "Betrieb hinzugefügt");
      setShowForm(false); onRefresh();
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
        <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" />Betrieb hinzufügen</button>
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
            <div><label className="label">Betriebsnummer</label><input className="input" value={form.betriebsnummer} onChange={f("betriebsnummer")} /></div>
            <div><label className="label">Telefon</label><input className="input" value={form.phone} onChange={f("phone")} /></div>
            <div className="sm:col-span-2"><label className="label">E-Mail</label><input className="input" value={form.email} onChange={f("email")} /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Speichern..." : "Speichern"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>
      ) : betriebe.length === 0 ? (
        <div className="card text-center py-12 text-gray-500"><Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p>Noch keine Betriebe hinterlegt.</p></div>
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
                  <td className="px-5 py-3 text-gray-500 text-sm hidden md:table-cell">{b.street}, {b.postal_code} {b.city}</td>
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

// ── Vorlagen Tab ──────────────────────────────────────────────────────────────

function VorlagenTab({ templates, loading, onRefresh }: { templates: Template[]; loading: boolean; onRefresh: () => void }) {
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isNew, setIsNew] = useState(false);

  if (editingTemplate || isNew) {
    return (
      <TemplateEditor
        template={isNew ? null : editingTemplate}
        onSave={() => { setEditingTemplate(null); setIsNew(false); onRefresh(); }}
        onCancel={() => { setEditingTemplate(null); setIsNew(false); }}
      />
    );
  }

  const handleDelete = async (docType: string, label: string) => {
    if (!confirm(`Vorlage "${label}" wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.`)) return;
    try { await ijpAPI.deleteTemplate(docType); toast.success("Vorlage gelöscht"); onRefresh(); }
    catch { toast.error("Fehler beim Löschen"); }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setIsNew(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />Neue Vorlage
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p>Noch keine Vorlagen vorhanden.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.label}</h3>
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{t.doc_type}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {t.variables.length} Variable{t.variables.length !== 1 ? "n" : ""} · zuletzt bearbeitet {new Date(t.updated_at).toLocaleDateString("de-DE")}
              </p>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => setEditingTemplate(t)} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5">
                  <Edit className="h-4 w-4" />Bearbeiten
                </button>
                <button onClick={() => handleDelete(t.doc_type, t.label)} className="p-2 text-gray-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Template Editor ───────────────────────────────────────────────────────────

function TemplateEditor({ template, onSave, onCancel }: { template: Template | null; onSave: () => void; onCancel: () => void }) {
  const isNew = !template;
  const [label, setLabel] = useState(template?.label || "");
  const [docType, setDocType] = useState(template?.doc_type || "");
  const [templateText, setTemplateText] = useState(template?.template_text || "");
  const [variables, setVariables] = useState<TemplateVar[]>(template?.variables || []);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-slug from label (only for new templates)
  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (isNew) {
      setDocType(val.toLowerCase().replace(/[äöüß]/g, (c) => ({ ä:"ae",ö:"oe",ü:"ue",ß:"ss" } as any)[c] || c).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""));
    }
  };

  // Variable management
  const addVar = () => setVariables([...variables, { key: "", label: "" }]);
  const removeVar = (i: number) => setVariables(variables.filter((_, idx) => idx !== i));
  const updateVar = (i: number, field: keyof TemplateVar, val: string) =>
    setVariables(variables.map((v, idx) => idx === i ? { ...v, [field]: val } : v));

  // Insert variable at cursor
  const insertVariable = (varKey: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? templateText.length;
    const end = ta.selectionEnd ?? templateText.length;
    const insert = `{{${varKey}}}`;
    const newText = templateText.slice(0, start) + insert + templateText.slice(end);
    setTemplateText(newText);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + insert.length; ta.focus(); }, 0);
  };

  // Live preview (placeholders shown as [key])
  const preview = useMemo(() => {
    let result = templateText;
    for (const v of variables) {
      if (v.key) result = result.replaceAll(`{{${v.key}}}`, `[${v.key}]`);
    }
    return result;
  }, [templateText, variables]);

  const handleSave = async () => {
    if (!label.trim()) { toast.error("Bitte einen Namen eingeben"); return; }
    if (!docType.trim()) { toast.error("Bitte einen Bezeichner eingeben"); return; }
    if (!templateText.trim()) { toast.error("Bitte einen Vorlagetext eingeben"); return; }
    const validVars = variables.filter((v) => v.key.trim());
    setSaving(true);
    try {
      const payload = { label: label.trim(), template_text: templateText, variables: validVars };
      if (isNew) {
        await ijpAPI.createTemplate({ ...payload, doc_type: docType.trim() });
        toast.success("Vorlage erstellt");
      } else {
        await ijpAPI.updateTemplate(template!.doc_type, payload);
        toast.success("Vorlage gespeichert");
      }
      onSave();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Fehler beim Speichern");
    } finally { setSaving(false); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">{isNew ? "Neue Vorlage erstellen" : `„${template!.label}" bearbeiten`}</h2>
      </div>

      {/* Label + Slug */}
      <div className="card mb-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Name der Vorlage *</label>
            <input className="input" value={label} onChange={(e) => handleLabelChange(e.target.value)} placeholder="z.B. Wohnungsbestätigung" />
          </div>
          <div>
            <label className="label">Bezeichner (slug) *</label>
            <input
              className={`input font-mono text-sm ${!isNew ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
              value={docType}
              onChange={(e) => isNew && setDocType(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              readOnly={!isNew}
              placeholder="z.B. wohnungsbestaetigung"
            />
            {isNew && <p className="text-xs text-gray-400 mt-1">Wird aus dem Namen generiert · nur a–z, 0–9, _ und -</p>}
          </div>
        </div>
      </div>

      {/* Variables */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Variablen</h3>
          <button onClick={addVar} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
            <Plus className="h-4 w-4" />Variable hinzufügen
          </button>
        </div>
        {variables.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Noch keine Variablen definiert. Variablen werden im Text als {"{{"}<span className="font-mono">variable_name</span>{"}}"}  verwendet.</p>
        ) : (
          <div className="space-y-2">
            {variables.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="input flex-1 font-mono text-sm"
                  placeholder="variable_name"
                  value={v.key}
                  onChange={(e) => updateVar(i, "key", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                />
                <input
                  className="input flex-1 text-sm"
                  placeholder="Beschreibung (z.B. Betriebsname)"
                  value={v.label}
                  onChange={(e) => updateVar(i, "label", e.target.value)}
                />
                <button onClick={() => removeVar(i)} className="p-2 text-gray-400 hover:text-red-500 flex-shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {variables.some((v) => !v.key) && (
          <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />Variablen ohne Bezeichner werden nicht gespeichert.
          </p>
        )}
      </div>

      {/* Split Editor / Preview */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Editor */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Code2 className="h-4 w-4 text-primary-600" />Vorlage</h3>
          </div>
          {variables.filter((v) => v.key).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {variables.filter((v) => v.key).map((v) => (
                <button key={v.key} type="button" onClick={() => insertVariable(v.key)}
                  title={`${v.label || v.key} einfügen`}
                  className="px-2 py-0.5 bg-primary-50 text-primary-700 border border-primary-200 rounded text-xs font-mono hover:bg-primary-100 transition-colors">
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
            className="w-full min-h-[500px] p-4 font-mono text-sm border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 resize-none leading-relaxed bg-gray-50"
            placeholder={"Vorlagetext hier eingeben...\n\nVerwende {{variable_name}} für Platzhalter."}
            spellCheck={false}
          />
          <p className="text-xs text-gray-400">Klicke auf einen Chip um ihn an der Cursor-Position einzufügen.</p>
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Eye className="h-4 w-4 text-primary-600" />Vorschau</h3>
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-auto flex-1" style={{ minHeight: 500 }}>
            <div className="px-10 py-8 font-serif text-sm leading-relaxed text-gray-800 min-h-full">
              {preview ? preview.split("\n").map((line, i) => {
                const isBlank = !line.trim();
                const isBold = line.trim().startsWith("Betreff:");
                return (
                  <p key={i} className={`${isBlank ? "mb-4" : "mb-0"} ${isBold ? "font-bold" : ""}`}>
                    {isBlank ? " " : line.split(/(\[[\w_]+\])/g).map((part, j) =>
                      /^\[[\w_]+\]$/.test(part)
                        ? <span key={j} className="bg-yellow-100 text-yellow-700 rounded px-0.5 font-mono text-xs">{part}</span>
                        : part
                    )}
                  </p>
                );
              }) : <p className="text-gray-400 italic">Noch kein Text eingegeben.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Speichern..." : isNew ? "Vorlage erstellen" : "Änderungen speichern"}
        </button>
        <button onClick={onCancel} className="btn-secondary">Abbrechen</button>
      </div>
    </div>
  );
}

// ── Dokument Tab ──────────────────────────────────────────────────────────────

function DokumentTab({ betriebe, templates }: { betriebe: Betrieb[]; templates: Template[] }) {
  const [docType, setDocType] = useState("");
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [templateText, setTemplateText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedBetriebId, setSelectedBetriebId] = useState<number | "">("");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [generating, setGenerating] = useState(false);

  const needsApplicant = useMemo(() =>
    currentTemplate?.variables?.some(v => ["applicant_name", "gender_article", "gender_possessive"].includes(v.key)) ?? true,
  [currentTemplate]);

  // Set default docType when templates load
  useEffect(() => { if (templates.length > 0 && !docType) setDocType(templates[0].doc_type); }, [templates]);

  // Load template text when docType changes
  useEffect(() => {
    if (!docType) return;
    const tmpl = templates.find((t) => t.doc_type === docType);
    if (tmpl) { setCurrentTemplate(tmpl); setTemplateText(tmpl.template_text); setOriginalText(tmpl.template_text); }
  }, [docType, templates]);

  const currentVars = useMemo<Record<string, string>>(() => {
    const betrieb = betriebe.find((b) => b.id === selectedBetriebId);
    const appName = selectedApplicant ? `${selectedApplicant.first_name} ${selectedApplicant.last_name}`.trim() : "";
    return {
      betrieb_name: betrieb?.name || "", contact_person: betrieb?.contact_person || "",
      street: betrieb?.street || "", postal_code: betrieb?.postal_code || "", city: betrieb?.city || "",
      betriebsnummer: betrieb?.betriebsnummer || "",
      betrieb_bezeichnung: betrieb?.bezeichnung || "die Firma",
      date: new Date().toLocaleDateString("de-DE"),
      applicant_name: appName,
      gender_article: gender === "female" ? "die Arbeitnehmerin" : "der Arbeitnehmer",
      gender_possessive: gender === "female" ? "ihrer" : "seiner",
    };
  }, [betriebe, selectedBetriebId, selectedApplicant, gender]);

  const preview = useMemo(() => {
    let result = templateText;
    for (const [key, value] of Object.entries(currentVars))
      result = result.replaceAll(`{{${key}}}`, value || `[${key}]`);
    return result;
  }, [templateText, currentVars]);

  const searchApplicants = useCallback(async (term: string) => {
    setSearching(true);
    try { const r = await ijpAPI.getApplicants(term); setApplicants(r.data || []); setShowDropdown(true); }
    catch { toast.error("Fehler beim Suchen"); } finally { setSearching(false); }
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val); setSelectedApplicant(null);
    if (val.length >= 2) searchApplicants(val); else setShowDropdown(false);
  };

  const selectApplicant = (a: Applicant) => {
    setSelectedApplicant(a); setSearch(`${a.first_name} ${a.last_name}`); setShowDropdown(false);
    if (a.gender === "female") setGender("female"); else if (a.gender === "male") setGender("male");
  };

  const insertVariable = (varKey: string) => {
    const ta = textareaRef.current; if (!ta) return;
    const start = ta.selectionStart ?? templateText.length;
    const end = ta.selectionEnd ?? templateText.length;
    const insert = `{{${varKey}}}`;
    setTemplateText(templateText.slice(0, start) + insert + templateText.slice(end));
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + insert.length; ta.focus(); }, 0);
  };

  const handleGenerate = async () => {
    if (needsApplicant && !selectedApplicant) { toast.error("Bitte einen Bewerber auswählen"); return; }
    if (!selectedBetriebId) { toast.error("Bitte einen Betrieb auswählen"); return; }
    setGenerating(true);
    try {
      const res = await ijpAPI.generateDocument({
        doc_type: docType,
        betrieb_id: selectedBetriebId,
        ...(needsApplicant && selectedApplicant ? { applicant_id: selectedApplicant.id, gender } : {}),
        custom_template: templateText !== originalText ? templateText : undefined,
      });
      const betriebName = betriebe.find(b => b.id === selectedBetriebId)?.name ?? docType;
      const namePart = selectedApplicant ? `${selectedApplicant.first_name}_${selectedApplicant.last_name}` : betriebName.replace(/\s+/g, "_");
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${docType}_${namePart}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("PDF heruntergeladen");
    } catch { toast.error("Fehler beim Erstellen des PDFs"); } finally { setGenerating(false); }
  };

  if (templates.length === 0) {
    return (
      <div className="card text-center py-16 text-gray-500">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="font-medium">Noch keine Vorlagen vorhanden.</p>
        <p className="text-sm mt-1">Erstelle zuerst eine Vorlage im Tab "Vorlagen".</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selektoren */}
      <div className="card">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Dokument-Typ</label>
            <div className="relative">
              <select className="input appearance-none pr-10" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {templates.map((t) => <option key={t.doc_type} value={t.doc_type}>{t.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {needsApplicant && (
          <div>
            <label className="label">Bewerber *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" className="input pl-10" placeholder="Name oder E-Mail..." value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => search && applicants.length > 0 && setShowDropdown(true)} />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
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
            {selectedApplicant && <p className="text-xs text-green-600 mt-1">✓ {selectedApplicant.first_name} {selectedApplicant.last_name}</p>}
          </div>
          )}
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
        {needsApplicant && (
        <div className="mt-4 flex items-center gap-6">
          <span className="label mb-0">Geschlecht:</span>
          {(["female", "male"] as const).map((g) => (
            <label key={g} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={g} checked={gender === g} onChange={() => setGender(g)} className="accent-primary-600" />
              <span className="text-sm">
                {g === "female" ? <>Weiblich <span className="text-xs text-gray-400">„die Arbeitnehmerin"</span></> : <>Männlich <span className="text-xs text-gray-400">„der Arbeitnehmer"</span></>}
              </span>
            </label>
          ))}
        </div>
        )}
      </div>

      {/* Split Editor / Preview */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Code2 className="h-4 w-4 text-primary-600" />Vorlage (bearbeitbar)</h3>
            {templateText !== originalText && (
              <button onClick={() => setTemplateText(originalText)} className="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1">
                <RotateCcw className="h-3 w-3" />Zurücksetzen
              </button>
            )}
          </div>
          {currentTemplate && currentTemplate.variables.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentTemplate.variables.map((v) => (
                <button key={v.key} type="button" onClick={() => insertVariable(v.key)} title={v.label}
                  className="px-2 py-0.5 bg-primary-50 text-primary-700 border border-primary-200 rounded text-xs font-mono hover:bg-primary-100 transition-colors">
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          )}
          <textarea ref={textareaRef} value={templateText} onChange={(e) => setTemplateText(e.target.value)}
            className="w-full min-h-[480px] p-4 font-mono text-sm border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 resize-none leading-relaxed bg-gray-50"
            spellCheck={false} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Eye className="h-4 w-4 text-primary-600" />Vorschau</h3>
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-auto" style={{ minHeight: 480 }}>
            <div className="px-10 py-8 font-serif text-sm leading-relaxed text-gray-800">
              {preview.split("\n").map((line, i) => {
                const isBlank = !line.trim();
                const isBold = line.trim().startsWith("Betreff:");
                return (
                  <p key={i} className={`${isBlank ? "mb-4" : "mb-0"} ${isBold ? "font-bold" : ""}`}>
                    {isBlank ? " " : line.split(/(\[[\w_]+\])/g).map((part, j) =>
                      /^\[[\w_]+\]$/.test(part)
                        ? <span key={j} className="bg-yellow-100 text-yellow-700 rounded px-0.5 font-mono text-xs">{part}</span>
                        : part
                    )}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleGenerate} disabled={generating || !selectedApplicant || !selectedBetriebId}
        className="btn-primary flex items-center gap-2 disabled:opacity-50">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        {generating ? "PDF wird erstellt..." : "PDF herunterladen"}
      </button>
    </div>
  );
}


// ── Arbeitgeber-Formular Tab ──────────────────────────────────────────────────

interface EmployerDoc { id: number; company_id: number; name: string; original_filename: string; created_at: string; }
interface ApplicantOpt { id: number; first_name: string; last_name: string; email: string; }

function ArbeitgeberFormularTab() {
  const [docs, setDocs] = useState<EmployerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<EmployerDoc | null>(null);
  const [search, setSearch] = useState("");
  const [applicants, setApplicants] = useState<ApplicantOpt[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantOpt | null>(null);
  const [filling, setFilling] = useState(false);

  useEffect(() => {
    crmAPI.getAllEmployerDocs().then((r: any) => setDocs(r.data || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search.length < 2) { setApplicants([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { const r = await ijpAPI.getApplicants(search); setApplicants(r.data || []); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleFill = async () => {
    if (!selectedDoc || !selectedApplicant) return;
    setFilling(true);
    try {
      const isPdf = selectedDoc.original_filename.toLowerCase().endsWith(".pdf");
      const ext = isPdf ? "pdf" : "docx";
      const mimeType = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const res = await crmAPI.fillEmployerDoc(selectedDoc.id, selectedApplicant.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedDoc.name}_${selectedApplicant.first_name}_${selectedApplicant.last_name}.${ext}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Dokument heruntergeladen");
    } catch { toast.error("Fehler beim Ausfüllen"); } finally { setFilling(false); }
  };

  if (loading) return <div className="card py-16 text-center text-gray-400">Lädt…</div>;
  if (docs.length === 0) return (
    <div className="card py-16 text-center text-gray-500">
      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p className="font-medium">Keine Arbeitgeber-Formulare hochgeladen.</p>
      <p className="text-sm mt-1">Lade im CRM bei einem Arbeitgeber eine .docx-Vorlage hoch.</p>
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Arbeitgeber-Formular automatisch ausfüllen</h2>

        {/* Dokument auswählen */}
        <div>
          <label className="label">Formular *</label>
          <div className="relative">
            <select className="input appearance-none pr-10" value={selectedDoc?.id ?? ""} onChange={(e) => {
              const d = docs.find(d => d.id === Number(e.target.value)) ?? null;
              setSelectedDoc(d);
            }}>
              <option value="">— Formular wählen —</option>
              {docs.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.original_filename})</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Bewerber suchen */}
        <div>
          <label className="label">Bewerber *</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input className="input pl-10" placeholder="Name oder E-Mail…" value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedApplicant(null); }} />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
          </div>
          {applicants.length > 0 && !selectedApplicant && (
            <div className="mt-1 border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto bg-white">
              {applicants.map((a) => (
                <button key={a.id} type="button" onClick={() => { setSelectedApplicant(a); setSearch(`${a.first_name} ${a.last_name}`); setApplicants([]); }}
                  className="w-full px-4 py-2.5 text-left hover:bg-primary-50 text-sm border-b border-gray-100 last:border-0">
                  <span className="font-medium">{a.first_name} {a.last_name}</span>
                  <span className="text-gray-400 ml-2 text-xs">{a.email}</span>
                </button>
              ))}
            </div>
          )}
          {selectedApplicant && <p className="text-xs text-green-600 mt-1">✓ {selectedApplicant.first_name} {selectedApplicant.last_name}</p>}
        </div>

        <button onClick={handleFill} disabled={!selectedDoc || !selectedApplicant || filling}
          className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {filling ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {filling ? "Wird ausgefüllt…" : "Formular herunterladen"}
        </button>
      </div>
    </div>
  );
}
