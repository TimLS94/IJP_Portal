"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar, Plus, Trash2, Loader2, CheckCircle2, Clock,
  Pencil, X, Save, Users, FileText, Upload, ExternalLink, Link2,
} from "lucide-react";
import { adminInterviewCandidatesAPI, adminPartnerLinksAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface LinkedStudent {
  applicant_id: number;
  user_id?: number;
  name: string;
  email?: string | null;
}

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  german_level?: string | null;
  english_level?: string | null;
  notes?: string | null;
  interview_done: boolean;
  interview_date?: string | null;
  has_cv?: boolean;
  cv_filename?: string | null;
  partner_source?: string | null;
  partner_name?: string | null;
  applicant_id?: number | null;
  linked_student?: LinkedStudent | null;
  created_at: string;
  updated_at?: string;
}

interface PartnerLinkLite { id: number; name: string; partner_source: string; }
interface StudentOption { applicant_id: number; name: string; email?: string | null; }

const LANG_LEVELS = ["", "A1", "A2", "B1", "B2", "C1", "C2", "Muttersprache"];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  german_level: "",
  english_level: "",
  notes: "",
  interview_done: false,
  interview_date: "",
  partner_source: "",
  applicant_id: "",
};

export default function AdminInterviewCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });

  const [partnerLinks, setPartnerLinks] = useState<PartnerLinkLite[]>([]);
  const [filterPartner, setFilterPartner] = useState("");
  // Studenten des aktuell gewählten Partners (im Anlege- bzw. Bearbeiten-Formular)
  const [createStudents, setCreateStudents] = useState<StudentOption[]>([]);
  const [editStudents, setEditStudents] = useState<StudentOption[]>([]);

  const load = useCallback(async (partnerSource?: string) => {
    setLoading(true);
    try {
      const res = await adminInterviewCandidatesAPI.list(partnerSource || undefined);
      setCandidates(res.data.candidates || []);
    } catch {
      toast.error("Fehler beim Laden der Kandidaten");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filterPartner);
  }, [filterPartner, load]);

  useEffect(() => {
    adminPartnerLinksAPI.list()
      .then((r) => setPartnerLinks((r.data.links || []).map((l: PartnerLinkLite) => ({ id: l.id, name: l.name, partner_source: l.partner_source }))))
      .catch(() => {});
  }, []);

  // Lädt die Studenten eines Partners für die Verknüpfungs-Auswahl
  const loadStudents = async (partnerSource: string, target: "create" | "edit") => {
    if (!partnerSource) { target === "create" ? setCreateStudents([]) : setEditStudents([]); return; }
    try {
      const res = await adminInterviewCandidatesAPI.listPartnerStudents(partnerSource);
      const list = res.data.students || [];
      target === "create" ? setCreateStudents(list) : setEditStudents(list);
    } catch {
      target === "create" ? setCreateStudents([]) : setEditStudents([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Vor- und Nachname sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      const res = await adminInterviewCandidatesAPI.create({
        ...form,
        interview_date: form.interview_date || null,
        partner_source: form.partner_source || null,
        applicant_id: form.applicant_id ? Number(form.applicant_id) : null,
      });
      // Optional direkt ausgewählten Lebenslauf anhängen
      if (cvFile && res?.data?.id) {
        const fd = new FormData();
        fd.append("file", cvFile);
        try { await adminInterviewCandidatesAPI.uploadCv(res.data.id, fd); }
        catch { toast.error("Kandidat angelegt, aber Lebenslauf-Upload fehlgeschlagen"); }
      }
      toast.success("Kandidat angelegt");
      setForm({ ...EMPTY_FORM });
      setCvFile(null);
      setCreateStudents([]);
      setShowCreate(false);
      load(filterPartner);
    } catch {
      toast.error("Fehler beim Anlegen");
    } finally {
      setSaving(false);
    }
  };

  const openCv = async (id: number) => {
    try {
      const res = await adminInterviewCandidatesAPI.downloadCv(id);
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error("Lebenslauf konnte nicht geladen werden");
    }
  };

  const uploadCvFor = async (id: number, file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Nur PDF-Dateien sind erlaubt");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      await adminInterviewCandidatesAPI.uploadCv(id, fd);
      toast.success("Lebenslauf angehängt");
      load(filterPartner);
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Upload fehlgeschlagen");
    }
  };

  const removeCv = async (id: number) => {
    if (!confirm("Lebenslauf entfernen?")) return;
    try {
      await adminInterviewCandidatesAPI.deleteCv(id);
      load(filterPartner);
    } catch {
      toast.error("Fehler beim Entfernen");
    }
  };

  const startEdit = (c: Candidate) => {
    setEditId(c.id);
    setEditForm({
      first_name: c.first_name,
      last_name: c.last_name,
      german_level: c.german_level || "",
      english_level: c.english_level || "",
      notes: c.notes || "",
      interview_done: c.interview_done,
      interview_date: c.interview_date || "",
      partner_source: c.partner_source || "",
      applicant_id: c.applicant_id ? String(c.applicant_id) : "",
    });
    loadStudents(c.partner_source || "", "edit");
  };

  const saveEdit = async (id: number) => {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      toast.error("Vor- und Nachname sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      await adminInterviewCandidatesAPI.update(id, {
        ...editForm,
        interview_date: editForm.interview_date || "",
        partner_source: editForm.partner_source || null,
        // 0 = Verknüpfung lösen (Backend interpretiert 0 als "entfernen")
        applicant_id: editForm.applicant_id ? Number(editForm.applicant_id) : 0,
      });
      toast.success("Gespeichert");
      setEditId(null);
      load(filterPartner);
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (c: Candidate) => {
    const next = !c.interview_done;
    try {
      await adminInterviewCandidatesAPI.update(c.id, {
        interview_done: next,
        // Beim Abhaken ohne Datum automatisch heute setzen
        interview_date: next && !c.interview_date ? new Date().toISOString().slice(0, 10) : (c.interview_date || ""),
      });
      load(filterPartner);
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleDelete = async (c: Candidate) => {
    if (!confirm(`Kandidat "${c.first_name} ${c.last_name}" wirklich löschen?`)) return;
    try {
      await adminInterviewCandidatesAPI.delete(c.id);
      toast.success("Gelöscht");
      load(filterPartner);
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const formatDate = (d?: string | null) => {
    if (!d) return "–";
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const openCount = candidates.filter((c) => !c.interview_done).length;
  const doneCount = candidates.filter((c) => c.interview_done).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gesprächs-Kandidaten</h1>
            <p className="text-gray-600">Kandidaten für Bewerbungsgespräche – intern oder von Partnern angelegt</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Kandidat anlegen
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center py-4">
          <p className="text-3xl font-bold text-gray-900">{candidates.length}</p>
          <p className="text-sm text-gray-500">Gesamt</p>
        </div>
        <div className="card text-center py-4 bg-amber-50 border border-amber-100">
          <p className="text-3xl font-bold text-amber-700">{openCount}</p>
          <p className="text-sm text-amber-600">Offen</p>
        </div>
        <div className="card text-center py-4 bg-green-50 border border-green-100">
          <p className="text-3xl font-bold text-green-700">{doneCount}</p>
          <p className="text-sm text-green-600">Gespräch durchgeführt</p>
        </div>
      </div>

      {/* Partner-Filter */}
      <div className="card mb-6 flex items-center gap-3 flex-wrap py-3">
        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Users className="h-4 w-4" /> Partner-Filter:
        </span>
        <select className="input-styled max-w-xs" value={filterPartner}
          onChange={(e) => setFilterPartner(e.target.value)}>
          <option value="">Alle (inkl. IJP intern)</option>
          {partnerLinks.map((p) => (
            <option key={p.id} value={p.partner_source}>{p.name}</option>
          ))}
        </select>
        {filterPartner && (
          <button onClick={() => setFilterPartner("")} className="text-sm text-gray-500 hover:text-gray-700 underline">
            zurücksetzen
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-6 border-2 border-primary-200 bg-primary-50">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary-600" />
            Neuen Kandidaten anlegen
          </h2>
          <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Vorname *</label>
              <input className="input-styled" value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Name *</label>
              <input className="input-styled" value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Deutsch</label>
              <select className="input-styled" value={form.german_level}
                onChange={(e) => setForm({ ...form, german_level: e.target.value })}>
                {LANG_LEVELS.map((l) => <option key={l} value={l}>{l || "— keine Angabe —"}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Englisch</label>
              <select className="input-styled" value={form.english_level}
                onChange={(e) => setForm({ ...form, english_level: e.target.value })}>
                {LANG_LEVELS.map((l) => <option key={l} value={l}>{l || "— keine Angabe —"}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Partner (optional)</label>
              <select className="input-styled" value={form.partner_source}
                onChange={(e) => { const ps = e.target.value; setForm({ ...form, partner_source: ps, applicant_id: "" }); loadStudents(ps, "create"); }}>
                <option value="">— kein Partner (IJP intern) —</option>
                {partnerLinks.map((p) => <option key={p.id} value={p.partner_source}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Mit Student verknüpfen (optional)</label>
              <select className="input-styled" value={form.applicant_id} disabled={!form.partner_source}
                onChange={(e) => {
                  const id = e.target.value;
                  const stu = createStudents.find((s) => String(s.applicant_id) === id);
                  setForm({
                    ...form,
                    applicant_id: id,
                    ...(stu ? { first_name: stu.name.split(" ")[0] || form.first_name, last_name: stu.name.split(" ").slice(1).join(" ") || form.last_name } : {}),
                  });
                }}>
                <option value="">— keiner —</option>
                {createStudents.map((s) => <option key={s.applicant_id} value={s.applicant_id}>{s.name}{s.email ? ` (${s.email})` : ""}</option>)}
              </select>
              {form.partner_source && createStudents.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Keine Studenten für diesen Partner gefunden.</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="label">Notizen</label>
              <textarea className="input-styled" rows={3} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="done-new" className="accent-primary-600 h-4 w-4"
                checked={form.interview_done}
                onChange={(e) => setForm({ ...form, interview_done: e.target.checked })} />
              <label htmlFor="done-new" className="text-sm text-gray-700">Gespräch durchgeführt</label>
            </div>
            <div>
              <label className="label">Datum des Gesprächs</label>
              <input type="date" className="input-styled" value={form.interview_date}
                onChange={(e) => setForm({ ...form, interview_date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Lebenslauf (PDF, optional)</label>
              <input type="file" accept="application/pdf"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                className="block text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200" />
              {cvFile && <p className="text-xs text-gray-500 mt-1">Ausgewählt: {cvFile.name}</p>}
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Anlegen
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Abbrechen</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 text-primary-600 animate-spin" /></div>
      ) : candidates.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Noch keine Kandidaten</p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <div key={c.id} className="card border border-gray-200">
              {editId === c.id ? (
                /* ---- Edit mode ---- */
                <div className="grid md:grid-cols-2 gap-3">
                  <input className="input-styled" placeholder="Vorname" value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
                  <input className="input-styled" placeholder="Name" value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
                  <select className="input-styled" value={editForm.german_level}
                    onChange={(e) => setEditForm({ ...editForm, german_level: e.target.value })}>
                    {LANG_LEVELS.map((l) => <option key={l} value={l}>{l ? `Deutsch: ${l}` : "Deutsch: — keine —"}</option>)}
                  </select>
                  <select className="input-styled" value={editForm.english_level}
                    onChange={(e) => setEditForm({ ...editForm, english_level: e.target.value })}>
                    {LANG_LEVELS.map((l) => <option key={l} value={l}>{l ? `Englisch: ${l}` : "Englisch: — keine —"}</option>)}
                  </select>
                  <textarea className="input-styled md:col-span-2" rows={2} placeholder="Notizen" value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="accent-primary-600 h-4 w-4" checked={editForm.interview_done}
                      onChange={(e) => setEditForm({ ...editForm, interview_done: e.target.checked })} />
                    Gespräch durchgeführt
                  </label>
                  <input type="date" className="input-styled" value={editForm.interview_date}
                    onChange={(e) => setEditForm({ ...editForm, interview_date: e.target.value })} />
                  <select className="input-styled" value={editForm.partner_source}
                    onChange={(e) => { const ps = e.target.value; setEditForm({ ...editForm, partner_source: ps, applicant_id: "" }); loadStudents(ps, "edit"); }}>
                    <option value="">Partner: — kein (IJP intern) —</option>
                    {partnerLinks.map((p) => <option key={p.id} value={p.partner_source}>Partner: {p.name}</option>)}
                  </select>
                  <select className="input-styled" value={editForm.applicant_id} disabled={!editForm.partner_source}
                    onChange={(e) => setEditForm({ ...editForm, applicant_id: e.target.value })}>
                    <option value="">Student: — keiner —</option>
                    {editStudents.map((s) => <option key={s.applicant_id} value={s.applicant_id}>{s.name}{s.email ? ` (${s.email})` : ""}</option>)}
                  </select>
                  <div className="md:col-span-2 flex gap-2">
                    <button onClick={() => saveEdit(c.id)} disabled={saving}
                      className="btn-primary flex items-center gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
                    </button>
                    <button onClick={() => setEditId(null)} className="btn-secondary flex items-center gap-2">
                      <X className="h-4 w-4" /> Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                /* ---- View mode ---- */
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-lg">{c.first_name} {c.last_name}</h3>
                      {c.interview_done ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Durchgeführt {c.interview_date ? `am ${formatDate(c.interview_date)}` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          <Clock className="h-3.5 w-3.5" /> Offen
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {c.partner_name ? `Partner: ${c.partner_name}` : "IJP intern"}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-gray-600">
                      <span>Deutsch: <strong>{c.german_level || "–"}</strong></span>
                      <span>Englisch: <strong>{c.english_level || "–"}</strong></span>
                    </div>
                    {c.notes && <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{c.notes}</p>}
                    {c.linked_student && (
                      <div className="mt-1.5">
                        <Link
                          href={`/admin/users?search=${encodeURIComponent(c.linked_student.email || c.linked_student.name)}`}
                          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline font-medium"
                          title="Verknüpftes Studenten-Konto in der Nutzerverwaltung öffnen"
                        >
                          <Link2 className="h-4 w-4" /> Verknüpfter Student: {c.linked_student.name}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}
                    <div className="mt-2">
                      {c.has_cv ? (
                        <span className="inline-flex items-center gap-3 text-sm">
                          <button onClick={() => openCv(c.id)} className="text-blue-600 hover:underline inline-flex items-center gap-1">
                            <FileText className="h-4 w-4" /> Lebenslauf ansehen
                          </button>
                          <button onClick={() => removeCv(c.id)} className="text-red-400 hover:text-red-600 inline-flex items-center gap-1" title="Lebenslauf entfernen">
                            <X className="h-3.5 w-3.5" /> entfernen
                          </button>
                        </span>
                      ) : (
                        <label className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700 cursor-pointer">
                          <Upload className="h-4 w-4" /> Lebenslauf (PDF) anhängen
                          <input type="file" accept="application/pdf" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCvFor(c.id, f); e.target.value = ""; }} />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleDone(c)}
                      className={`p-2 rounded-lg transition-colors ${c.interview_done ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                      title={c.interview_done ? "Als offen markieren" : "Als durchgeführt markieren"}>
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <button onClick={() => startEdit(c)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" title="Bearbeiten">
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50" title="Löschen">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
