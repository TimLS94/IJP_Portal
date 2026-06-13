"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { crmAPI } from "@/lib/api";
import {
  Building2, User, Phone, Mail, Globe, MapPin, Briefcase,
  Plus, Pencil, Trash2, X, Search, ChevronRight, Star,
  Smartphone, Tag, StickyNote, Hash, ArrowLeft,
  Upload, FileText, Loader2, Download,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: number;
  company_id: number;
  first_name: string | null;
  last_name: string | null;
  salutation: string | null;
  title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
}

interface Company {
  id: number;
  name: string;
  contact_person: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  betriebsnummer: string | null;
  bezeichnung: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  industry: string | null;
  status: string | null;
  notes: string | null;
  contacts: Contact[];
}

const EMPTY_COMPANY: Omit<Company, "id" | "contacts"> = {
  name: "", contact_person: null, street: null, postal_code: null,
  city: null, country: null, betriebsnummer: null, bezeichnung: null, phone: null,
  email: null, website: null, industry: null, status: null, notes: null,
};

const EMPTY_CONTACT: Omit<Contact, "id" | "company_id"> = {
  first_name: null, last_name: null, salutation: null, title: null,
  department: null, email: null, phone: null, mobile: null, is_primary: false,
};

interface CompanyDoc {
  id: number;
  company_id: number;
  name: string;
  original_filename: string;
  created_at: string;
}

interface ApplicantOption {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

const STATUS_COLORS: Record<string, string> = {
  "Aktiv": "bg-green-100 text-green-700",
  "Akquiriert": "bg-blue-100 text-blue-700",
  "Möglicher Kunde": "bg-yellow-100 text-yellow-700",
  "Inaktiv": "bg-gray-100 text-gray-500",
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const cls = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-gray-500 text-xs block">{label}</span>
        <span className="text-gray-800">{value}</span>
      </div>
    </div>
  );
}

// ── Contact Card ──────────────────────────────────────────────────────────────

function ContactCard({
  contact, onEdit, onDelete,
}: {
  contact: Contact;
  onEdit: (c: Contact) => void;
  onDelete: (id: number) => void;
}) {
  const fullName = [contact.salutation, contact.first_name, contact.last_name].filter(Boolean).join(" ");
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm leading-tight">{fullName || "Unbekannt"}</p>
            {contact.is_primary && (
              <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5" /> Primärkontakt
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(contact)} className="p-1 text-gray-400 hover:text-primary-600 rounded">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(contact.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-1 pl-10">
        {contact.title && <p className="text-xs text-gray-500">{contact.department ? `${contact.title}, ${contact.department}` : contact.title}</p>}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
            <Mail className="h-3 w-3" /> {contact.email}
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-gray-600">
            <Phone className="h-3 w-3" /> {contact.phone}
          </a>
        )}
        {contact.mobile && (
          <a href={`tel:${contact.mobile}`} className="flex items-center gap-1 text-xs text-gray-600">
            <Smartphone className="h-3 w-3" /> {contact.mobile}
          </a>
        )}
      </div>
    </div>
  );
}

// ── Company Documents Section ─────────────────────────────────────────────────

function CompanyDocuments({ company }: { company: Company }) {
  const [docs, setDocs] = useState<CompanyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try { const r = await crmAPI.getDocuments(company.id); setDocs(r.data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [company.id]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = window.prompt("Anzeigename für dieses Dokument:", file.name.replace(".docx", ""));
    if (!name) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name);
      await crmAPI.uploadDocument(company.id, fd);
      await load();
    } catch { alert("Upload fehlgeschlagen"); } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDownload = async (doc: CompanyDoc) => {
    try {
      const res = await crmAPI.downloadDocument(company.id, doc.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.original_filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch { alert("Download fehlgeschlagen"); }
  };

  const handleDelete = async (doc: CompanyDoc) => {
    if (!confirm(`„${doc.name}" wirklich löschen?`)) return;
    await crmAPI.deleteDocument(company.id, doc.id);
    await load();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Dokument-Vorlagen ({docs.length})
        </h3>
        <label className={`flex items-center gap-1 text-xs font-medium cursor-pointer ${uploading ? "text-gray-400" : "text-primary-600 hover:text-primary-700"}`}>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploading ? "Lädt…" : "Hochladen"}
          <input ref={fileRef} type="file" accept=".docx,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {loading ? (
        <p className="text-xs text-gray-400">Lädt…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Noch keine Vorlagen hochgeladen.</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <FileText className={`h-4 w-4 flex-shrink-0 ${doc.original_filename.toLowerCase().endsWith('.pdf') ? 'text-red-400' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                <p className="text-xs text-gray-400 truncate">{doc.original_filename}</p>
              </div>
              <button onClick={() => handleDownload(doc)} title="Original herunterladen" className="p-1 text-gray-400 hover:text-primary-600 flex-shrink-0">
                <Download className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(doc)} className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Company Detail Panel ──────────────────────────────────────────────────────

function CompanyDetail({
  company,
  onEdit,
  onDelete,
  onAddContact,
  onEditContact,
  onDeleteContact,
  onBack,
}: {
  company: Company;
  onEdit: () => void;
  onDelete: () => void;
  onAddContact: () => void;
  onEditContact: (c: Contact) => void;
  onDeleteContact: (id: number) => void;
  onBack: () => void;
}) {
  const address = [company.street, [company.postal_code, company.city].filter(Boolean).join(" "), company.country]
    .filter(Boolean).join(", ");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="md:hidden p-1 -ml-1 text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg leading-tight">{company.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {company.industry && <span className="text-xs text-gray-500">{company.industry}</span>}
              <StatusBadge status={company.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Bearbeiten">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Löschen">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Company info */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Firmendaten</h3>
          <div className="space-y-2">
            {address && <Field icon={MapPin} label="Adresse" value={address} />}
            <Field icon={Phone} label="Telefon" value={company.phone} />
            <Field icon={Mail} label="E-Mail" value={company.email} />
            <Field icon={Globe} label="Website" value={company.website} />
            <Field icon={Hash} label="Betriebsnummer" value={company.betriebsnummer} />
          </div>
        </div>

        {company.notes && (
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notizen</h3>
            <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-lg p-3 whitespace-pre-wrap">{company.notes}</p>
          </div>
        )}

        {/* Company Documents */}
        <CompanyDocuments company={company} />

        {/* Contacts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Kontakte ({company.contacts.length})
            </h3>
            <button
              onClick={onAddContact}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="h-3 w-3" /> Hinzufügen
            </button>
          </div>
          {company.contacts.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Noch keine Kontakte eingetragen.</p>
          ) : (
            <div className="space-y-2">
              {company.contacts.map((c) => (
                <ContactCard key={c.id} contact={c} onEdit={onEditContact} onDelete={onDeleteContact} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Company Form Modal ────────────────────────────────────────────────────────

function CompanyModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<Company> | null;
  onSave: (data: typeof EMPTY_COMPANY) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<typeof EMPTY_COMPANY>({
    ...EMPTY_COMPANY,
    ...(initial ?? {}),
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof EMPTY_COMPANY, value: string) =>
    setForm((f) => ({ ...f, [key]: value || null }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{initial?.id ? "Firma bearbeiten" : "Neue Firma"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Firmenname *</label>
            <input required className="input-field" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Muster GmbH" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Branche</label>
              <input className="input-field" value={form.industry ?? ""} onChange={(e) => set("industry", e.target.value)} placeholder="Hotel, Landwirtschaft …" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select className="input-field" value={form.status ?? ""} onChange={(e) => set("status", e.target.value)}>
                <option value="">—</option>
                <option>Aktiv</option>
                <option>Akquiriert</option>
                <option>Möglicher Kunde</option>
                <option>Inaktiv</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Straße</label>
            <input className="input-field" value={form.street ?? ""} onChange={(e) => set("street", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">PLZ</label>
              <input className="input-field" value={form.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Ort</label>
              <input className="input-field" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Land</label>
            <input className="input-field" value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} placeholder="Deutschland" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
              <input className="input-field" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail</label>
              <input className="input-field" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
            <input className="input-field" value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Betriebsnummer</label>
            <input className="input-field" value={form.betriebsnummer ?? ""} onChange={(e) => set("betriebsnummer", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bezeichnung (für Vollmacht)</label>
            <input className="input-field" value={form.bezeichnung ?? ""} onChange={(e) => set("bezeichnung", e.target.value)} placeholder="z.B. das Restaurant, der Betrieb, das Hotel" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notizen</label>
            <textarea rows={3} className="input-field resize-none" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </form>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button onClick={handleSubmit as any} disabled={saving || !form.name} className="btn-primary disabled:opacity-50">
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Contact Form Modal ────────────────────────────────────────────────────────

function ContactModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<Contact> | null;
  onSave: (data: typeof EMPTY_CONTACT) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<typeof EMPTY_CONTACT>({
    ...EMPTY_CONTACT,
    ...(initial ?? {}),
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof EMPTY_CONTACT, value: any) =>
    setForm((f) => ({ ...f, [key]: value === "" ? null : value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{initial?.id ? "Kontakt bearbeiten" : "Neuer Kontakt"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Anrede</label>
              <select className="input-field" value={form.salutation ?? ""} onChange={(e) => set("salutation", e.target.value)}>
                <option value="">—</option>
                <option>Herr</option>
                <option>Frau</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vorname</label>
              <input className="input-field" value={form.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nachname</label>
              <input className="input-field" value={form.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Position / Titel</label>
              <input className="input-field" value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Abteilung</label>
              <input className="input-field" value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail</label>
            <input className="input-field" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
              <input className="input-field" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobil</label>
              <input className="input-field" value={form.mobile ?? ""} onChange={(e) => set("mobile", e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.is_primary} onChange={(e) => set("is_primary", e.target.checked)} className="rounded" />
            Primärkontakt
          </label>
        </form>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button onClick={handleSubmit as any} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showDetail, setShowDetail] = useState(false); // mobile state
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCompanies = useCallback(async (q?: string, ind?: string, stat?: string) => {
    try {
      const params: Record<string, string> = {};
      if (q) params.search = q;
      if (ind) params.industry = ind;
      if (stat) params.status = stat;
      const res = await crmAPI.getCompanies(params);
      setCompanies(res.data);
      // refresh selected if open
      setSelected((prev) => prev ? (res.data.find((c: Company) => c.id === prev.id) ?? prev) : null);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [metaRes] = await Promise.all([crmAPI.getMeta(), loadCompanies()]);
        setIndustries(metaRes.data.industries);
        setStatuses(metaRes.data.statuses);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCompanies]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadCompanies(val, filterIndustry, filterStatus), 300);
  };

  const handleFilter = (ind: string, stat: string) => {
    setFilterIndustry(ind);
    setFilterStatus(stat);
    loadCompanies(search, ind, stat);
  };

  // ── Company CRUD ────────────────────────────────────────────────────────────

  const handleSaveCompany = async (data: typeof EMPTY_COMPANY) => {
    if (editingCompany) {
      await crmAPI.updateCompany(editingCompany.id, data);
    } else {
      await crmAPI.createCompany(data);
    }
    setShowCompanyModal(false);
    setEditingCompany(null);
    await loadCompanies(search, filterIndustry, filterStatus);
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Firma "${company.name}" wirklich löschen?`)) return;
    await crmAPI.deleteCompany(company.id);
    setSelected(null);
    setShowDetail(false);
    await loadCompanies(search, filterIndustry, filterStatus);
  };

  // ── Contact CRUD ────────────────────────────────────────────────────────────

  const handleSaveContact = async (data: typeof EMPTY_CONTACT) => {
    if (!selected) return;
    if (editingContact) {
      await crmAPI.updateContact(editingContact.id, data);
    } else {
      await crmAPI.createContact(selected.id, data);
    }
    setShowContactModal(false);
    setEditingContact(null);
    await loadCompanies(search, filterIndustry, filterStatus);
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!confirm("Kontakt wirklich löschen?")) return;
    await crmAPI.deleteContact(contactId);
    await loadCompanies(search, filterIndustry, filterStatus);
  };

  const selectCompany = (c: Company) => {
    setSelected(c);
    setShowDetail(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">CRM</h1>
          <p className="text-sm text-gray-500">{companies.length} Firmen</p>
        </div>
        <button
          onClick={() => { setEditingCompany(null); setShowCompanyModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Neue Firma
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Firma, Ort, Branche …"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-40"
          value={filterIndustry}
          onChange={(e) => handleFilter(e.target.value, filterStatus)}
        >
          <option value="">Alle Branchen</option>
          {industries.map((i) => <option key={i}>{i}</option>)}
        </select>
        <select
          className="input-field w-36 hidden sm:block"
          value={filterStatus}
          onChange={(e) => handleFilter(filterIndustry, e.target.value)}
        >
          <option value="">Alle Status</option>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Company list */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0 ${showDetail ? "hidden md:flex" : "flex"}`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">Laden…</div>
          ) : companies.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 p-8 text-center">
              <Building2 className="h-12 w-12 text-gray-200" />
              <p className="text-sm">Keine Firmen gefunden</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCompany(c)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-3 ${selected?.id === c.id ? "bg-primary-50 border-l-2 border-l-primary-500" : ""}`}
                >
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.city && <span className="text-xs text-gray-400 truncate">{c.city}</span>}
                      {c.industry && <span className="text-xs text-gray-400">· {c.industry}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={c.status} />
                      {c.contacts.length > 0 && (
                        <span className="text-[10px] text-gray-400">{c.contacts.length} Kontakt{c.contacts.length !== 1 ? "e" : ""}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className={`flex-1 overflow-hidden ${!showDetail && !selected ? "hidden md:flex md:items-center md:justify-center" : showDetail ? "flex flex-col" : "hidden md:flex flex-col"}`}>
          {selected ? (
            <CompanyDetail
              company={selected}
              onEdit={() => { setEditingCompany(selected); setShowCompanyModal(true); }}
              onDelete={() => handleDeleteCompany(selected)}
              onAddContact={() => { setEditingContact(null); setShowContactModal(true); }}
              onEditContact={(c) => { setEditingContact(c); setShowContactModal(true); }}
              onDeleteContact={handleDeleteContact}
              onBack={() => setShowDetail(false)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Building2 className="h-16 w-16 text-gray-200" />
              <p className="text-sm">Firma auswählen</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCompanyModal && (
        <CompanyModal
          initial={editingCompany}
          onSave={handleSaveCompany}
          onClose={() => { setShowCompanyModal(false); setEditingCompany(null); }}
        />
      )}
      {showContactModal && (
        <ContactModal
          initial={editingContact}
          onSave={handleSaveContact}
          onClose={() => { setShowContactModal(false); setEditingContact(null); }}
        />
      )}
    </div>
  );
}
